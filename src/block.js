import { inject, bindable } from 'aurelia-framework';
const sha256 = require('sha256');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');
import { state } from './state';

@inject(state)
export class Block {
  constructor(state) {
    this.Math = Math;
    this.state = state;
    this.moment = moment;
    this.autoflag = false;

    if (!this.state.privateKey) {
      this.state.router.navigate('wallet');
    } else if (!this.state.lastBlock) {
      this.state.router.navigate('blockchain');
    } else {
      this.blockTransactions = [];
      this.transactions = [];

      if (this.state.lastBlock.balanceMap) this.transactionBalanceMap = JSON.parse(JSON.stringify(this.state.lastBlock.balanceMap));
    }
  }

  attached() {
    this.state.updatePages('block');
    this.getTransactions();
  }


  async getTransactions() {
    let data = await this.state.fetch('getTransactions', { name: this.state.blockchain.name });
    let transactions = data.transactions;

    for (let t of this.state.onChainTransactions) {
      let index = transactions.findIndex((el) => el._id === t);
      if (index >= 0) transactions.splice(index, 1);
    }
    this.state.mempool = transactions;
  }

  async submitBlock() {
    this.block.blockchain = this.state.blockchain.name;
    this.block.transactions = this.transactions;
    this.block.difficulty = this.state.blockchain.difficulty;

    this.blockSent = true;
    let res = await this.state.fetch('newBlock', this.block);
  }


  calculateHash() {
    if (!this.nonce) {
      this.hash = '';
      return false;
    }

    this.block = {
      transactions: this.blockTransactions,
      miner: {
        name: this.state.name,
        publicKey: this.state.publicKey
      },
      previoushash: this.state.lastBlock.hash,
      nonce: parseInt(this.nonce),
      difficulty: this.state.blockchain.difficulty,
      timestamp: Date.now()
    };

    let stringifiedBlock = JSON.stringify(this.block);
    this.hash = sha256(stringifiedBlock);


    let zeros = 0;
    for (let i = 0; i < this.state.blockchain.difficulty; i++) {
      if (this.hash.charAt(i) == 0) zeros++;
    }
    if (zeros === this.state.blockchain.difficulty) {
      this.blockMined = true;
      if (!this.auto) {
        this.nonceTrace = this.nonce;
        this.nonceInput.blur();
        this.nonce = this.nonceTrace;
      }
      return true;
    }
    this.blockMined = false;
    return false;
  }

  async autoMine() {
    this.autoflag = !this.autoflag;
    if (!this.autoflag) return false;

    let delay;
    let d = this.state.blockchain.difficulty;
    switch (d) {
    case 2:
      delay = 50;
      break;
    case 3:
      delay = 25;
      break;
    case 4:
      delay = 10;
      break;
    case 5:
      delay = 1;
      break;
    default:
      delay = 0;
    }

    if (!this.nonce) this.nonce = 0;
    while (this.autoflag && !this.blockMined) {
      this.nonce++;
      this.calculateHash();
      await new Promise(r => setTimeout(r, delay));
    }
  }

  verifySignature(transaction) {
    transaction.checked = true;
    let key = ec.keyFromPublic(transaction.sender.publicKey, 'hex');

    let hashTransaction = {
      sender: transaction.sender.name,
      recipient: transaction.recipient.name,
      amount: parseInt(transaction.amount),
      blockchain: transaction.blockchain,
      timestamp: transaction.timestamp
    };

    let hash = sha256(JSON.stringify(hashTransaction));
    transaction.signatureValid = key.verify(hash, transaction.signature);
    transaction.valid = transaction.signatureValid;
  }

  addToBlockSingle(t) {
    this.state.mempool.splice(this.state.mempool.findIndex((el) => el._id === t._id), 1);
    this.transactions.push(t);
    this.blockTransactions.push(t._id);

    this.resetBlockHash();
  }

  addToBlock(t, single) {
    if (!t.valid) return false;
    if (!this.transactionBalanceMap[t.sender.name]) this.transactionBalanceMap[t.sender.name] = 0.00;

    if (Math.round(this.transactionBalanceMap[t.sender.name] * 100) / 100 < t.amount) {
      t.valid = false;
      return false;
    }
    this.transactionBalanceMap[t.sender.name] -= t.amount;

    if (single) {
      this.state.mempool.splice(this.state.mempool.findIndex((el) => el._id === t._id), 1);
      this.transactions.push(t);
      this.blockTransactions.push(t._id);
    } else {
      this.toBeSpliced.push(t._id);
      this.transactions.push(t);
      this.blockTransactions.push(t._id);
    }

    this.resetBlockHash();
  }

  addAllToBlock() {
    this.toBeSpliced = [];
    for (let t of this.state.mempool) {
      this.verifySignature(t);
      this.addToBlock(t);
    }

    for (let t of this.toBeSpliced) {
      this.state.mempool.splice(this.state.mempool.findIndex((el) => el._id === t), 1);
    }
  }

  resetBlockHash() {
    this.blockMined = false;
    if (this.autoflag) {
      this.autoflag = false;
      this.autoMine();
    }
  }


  updateReward() {
    if (this.state.lastBlock.dummy) this.reward = this.state.blockchain.genesisReward + this.blockTransactions.length * 0.1;
    else this.reward = this.state.blockchain.blockReward + this.blockTransactions.length * 0.1;
  }
}
