importScripts('./elliptic.min.js', './sha256.min.js');

const EC = elliptic.ec;
const ec = new EC('secp256k1');

let fullchain = [];
let onChainTransactions = [];
let chainDepth = {};
let maxValidDepth = -1;
let depthOffset = 0;
let blockchainMeta;
let blocks;

onmessage = function(e) {
  run(e.data[0], e.data[1]);
};


function run(b, meta) {
  blocks = b;
  blockchainMeta = meta;

  if (!blocks.length) return false;

  let genesis = blocks[0];
  let balanceMap = {};


  if (blockchainMeta.truncated) {
    genesis = blocks.find(el => el._id == blockchainMeta.truncated.id);
    balanceMap = blockchainMeta.truncated.previousBalance;
    depthOffset = blockchainMeta.truncated.depth;
  }


  checkBlock(genesis, 0, balanceMap);

  fullChain = Object.values(chainDepth);

  let lastBlock = fullChain[maxValidDepth];

  lastBlock.sort((a, b) => {
    if (b.valid > a.valid) return 1;
    if (b.valid < a.valid) return -1;

    if (new Date(a.createdAt).getTime() > new Date(b.createdAt).getTime()) return 1;
    if (new Date(a.createdAt).getTime() < new Date(b.createdAt).getTime()) return -1;
  });

  fullChain[maxValidDepth] = lastBlock;

  if (lastBlock.length) lastBlock = lastBlock[0];

  // if (!lastBlock.balanceMap[name]) lastBlock.balanceMap[name] = 0.00
  lastBlock.head = true;
  lastBlock.isLast = true;

  markLongestChain(lastBlock);

  //sort longest chain to top
  for (let column of fullChain) {
    column.sort((a, b) => {
      if (b.isLongest > a.isLongest) return 1;
      if (b.isLongest < a.isLongest) return -1;

      if (b.valid > a.valid) return 1;
      if (b.valid < a.valid) return -1;

      if (new Date(a.createdAt).getTime() > new Date(b.createdAt).getTime()) return 1;
      if (new Date(a.createdAt).getTime() < new Date(b.createdAt).getTime()) return -1;
    });
  }


  postMessage([fullChain, onChainTransactions, lastBlock, depthOffset, blocks]);
}


function checkBlock(block, depth, balanceMap) {
  block.head = false;
  block.valid = false;
  block.isLongest = false;
  block.isLast = false;
  block.depth = depth;

  //check Hash
  let hash = checkHash(block);
  if (!hash.valid) {
    // console.log("Invalid Hash.")
    block.invalidHash = true;
  }

  // verify transactions
  let signaturesValid = verifySignatures(block.transactions);
  if (!signaturesValid) {
    // console.log("Invalid Signatures.")
    block.invalidSignatures = true;
  }

  // update balances
  balanceMap = updateBalanceMap(balanceMap, block.transactions);
  if (!balanceMap.valid) {
    // console.log("Negative Balances.")
    block.balanceInvalid = true;
  }

  block.balanceMap = balanceMap.value;

  if (hash.valid && signaturesValid && balanceMap.valid && !block.invalidChain) {
    block.valid = true;
    if (maxValidDepth < depth) maxValidDepth = depth;
  }

  block.hash = hash.value;

  if (chainDepth[depth]) block.valid ? chainDepth[depth].unshift(block) : chainDepth[depth].push(block);
  else chainDepth[depth] = [block];

  // let blocks = JSON.parse(JSON.stringify(blocks))
  let nextBlocks = blocks.filter((b) => b.previoushash === hash.value);

  for (let b of nextBlocks) {
    if (!block.valid) b.invalidChain = true;
    checkBlock(b, depth + 1, balanceMap.value);
  }
}


function calculateHash(block) {
  let transactionIDs = block.transactions.map((e) => e._id);
  transactionIDs.shift();
  let hashData = {
    transactions: transactionIDs,
    miner: {
      name: block.miner.name,
      publicKey: block.miner.publicKey
    },
    previoushash: block.previoushash,
    nonce: block.nonce,
    difficulty: block.difficulty,
    timestamp: block.timestamp
  };

  return sha256(JSON.stringify(hashData));
}

function checkHash(block) {
  let hash = calculateHash(block);

  let zeros = 0;
  for (let i = 0; i < blockchainMeta.difficulty; i++) {
    if (hash.charAt(i) == 0) zeros++;
  }

  if (zeros !== blockchainMeta.difficulty) {
    return { valid: false, value: hash };
  }

  return { valid: true, value: hash };
}

function verifySignatures(transactions) {
  for (let t of transactions) {
    if (t.sender.name === 'coinbase') continue;

    let key = ec.keyFromPublic(t.sender.publicKey, 'hex');

    let hashTransaction = {
      sender: t.sender.name,
      recipient: t.recipient.name,
      amount: parseInt(t.amount),
      blockchain: t.blockchain,
      timestamp: t.timestamp
    };

    let hash = sha256(JSON.stringify(hashTransaction));

    if (!key.verify(hash, t.signature)) {
      //console.log("wrong signature at" + t._id)
      return false;
    }
  }

  return true;
}

function updateBalanceMap(balanceMap, transactions) {
  balanceMap = JSON.parse(JSON.stringify(balanceMap));

  for (let t of transactions) {
    if (t.sender.name !== 'coinbase') {
      if (balanceMap[t.sender.name]) balanceMap[t.sender.name] -= t.amount;
      else balanceMap[t.sender.name] = -t.amount;
    }

    if (balanceMap[t.recipient.name]) balanceMap[t.recipient.name] += t.amount;
    else balanceMap[t.recipient.name] = t.amount;
  }

  let balanceArray = Object.values(balanceMap);

  if (balanceArray.every((value) => Math.round(value * 100) / 100 >= 0)) return { valid: true, value: balanceMap };
  return { valid: false, value: balanceMap };
}

function markLongestChain(b) {
  if (!b) return false;
  b.isLongest = true;
  for (let t of b.transactions) {
    onChainTransactions.push(t._id);
  }
  let next = blocks.find((el) => el.hash === b.previoushash);
  markLongestChain(next);
}
