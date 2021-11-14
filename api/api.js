const User = require('./mongoschema/userSchema');
const Transaction = require('./mongoschema/transactionSchema').Transaction;
const Block = require('./mongoschema/blockSchema');
const Blockchain = require('./mongoschema/blockchainSchema');

module.exports = function(app, express, io, clients) {
  app.post('/newUser', async(req, res) => {
    try {
      const newUser = await new User(req.body).save();
      if (newUser) res.status(200).json({ success: true });
    } catch (err) {
      console.log(err);
      if (err.code === 11000) res.status(200).json({ err: 'Username already taken.' });
      else res.status(200).json({ err: 'Irgendetwas ist schief gelaufen.' });
    }
  });

  app.post('/loadWallet', async(req, res) => {
    try {
      const user = await User.findOne({ publicKey: req.body.publicKey });
      if (user) res.status(200).json({ user: user });
      else res.status(200).json({ err: true });
    } catch (err) {
      res.status(200).json({ err: 'Something went wrong.' });
    }
  });

  app.post('/sendTransaction', async(req, res) => {
    const recipient = await User.findOne({ name: req.body.recipient.name });
    if (!recipient) {
      return res.status(200).json({ err: "Receiver doesn't have a wallet." });
    }
    req.body.recipient.publicKey = recipient.publicKey;


    if (!req.body.sender.publicKey) {
      const sender = await User.findOne({ name: req.body.sender.name });
      if (!sender) {
        return res.status(200).json({ err: "Sender doesn't have a wallet." });
      }
      req.body.sender.publicKey = sender.publicKey;
    }

    const newTransaction = await new Transaction(req.body).save();
    if (newTransaction) {
      res.status(200).json({ success: true });
      io.to(newTransaction.blockchain).emit('newTransaction', { transaction: newTransaction });
    } else res.status(200).json({ err: 'Irgendetwas ist schief gelaufen.' });
  });

  app.post('/getTransactions', async(req, res) => {
    const transactions = await Transaction.find({ blockchain: req.body.name });

    if (transactions) {
      res.status(200).json({ transactions: transactions });
    } else {
      res.status(200).json({ err: 'No transactions.' });
    }
  });

  app.post('/newBlock', async(req, res) => {
    delete req.body.genesis;

    let blockchain = await Blockchain
      .findOne({ name: req.body.blockchain });

    if (!blockchain) return res.status(404).json({ success: false });


    req.body.difficulty = blockchain.difficulty;

    let numBlocks = await Block.count({blockchain: blockchain.name});

    let nextReward = numBlocks ? blockchain.blockReward : blockchain.genesisReward;

    const coinbaseTransaction = {
      sender: {
        name: 'coinbase',
        publicKey: 0
      },
      recipient: {
        name: req.body.miner.name,
        publicKey: req.body.miner.publicKey
      },
      signature: '0',
      hash: '0',
      amount: nextReward,
      timestamp: Date.now()
    };

    req.body.transactions.unshift(coinbaseTransaction);

    const newBlock = await new Block(req.body).save();
    if (newBlock) {
      res.status(200).json({ success: true });
      io.to(newBlock.blockchain).emit('newBlock', { block: newBlock });
    }
  });

  app.post('/getBlockchain', async(req, res) => {
    const blocks = await Block
      .find({ blockchain: req.body.name })
      .sort('createdAt')
      .lean();

    let blockchain = await Blockchain
      .findOne({ name: req.body.name });


    res.status(200).json({ blockchain: blocks, meta: blockchain });
  });

  app.post('/connectToBlockchain', async(req, res) => {
    const blockchain = await Blockchain
      .findOne({ name: req.body.name })
      .sort('createdAt');

    if (blockchain) res.status(200).json({ exists: true, data: blockchain });
    else res.status(200).json({ exists: false });
  });

  app.post('/createNewBlockchain', async(req, res) => {
    const blockchain = await new Blockchain(req.body).save();

    if (blockchain) res.status(200).json({ success: true, data: blockchain });
    else res.status(200).json({ success: false });
  });

  app.post('/curtailChain', async(req, res) => {
    // Endpoint to precalculate the Chain up to a certain block height.
    // Call from Browser Console.
    // Paste your Private Key here, so only you will be allowed to use this endpoint.
    const adminPrivateKey = '';
    if (req.body.key == adminPrivateKey) {
      await Blockchain.findOneAndUpdate({ name: req.body.name }, { truncated: req.body.truncated });
      await Transaction.deleteMany({ blockchain: req.body.name });
    }
  });

  io.on('connection', (socket) => {
    socket.on('error', (err) => {
      console.log('err:' + err);
    });

    socket.on('disconnect', function() {
      delete clients[socket.id];
      io.emit('updateUserList', clients);
    });

    socket.on('online', (data) => {
      if (!clients[socket.id]) {
        clients[socket.id] = data.name;
        io.emit('updateUserList', clients);
      }
    });

    socket.on('join', (room) => {
      socket.join(room);
    });

    socket.on('changeChain', (room) => {
      socket.leave(room.prev);
      socket.join(room.new);
    });
  });
};
