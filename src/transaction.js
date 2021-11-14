import { inject, bindable } from 'aurelia-framework';
import { state } from './state';
const sha256 = require('sha256');

const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

@inject(state)
// @inject(sha256)
export class Transaction {
  constructor(state) {
    this.state = state;

    this.transaction = {
      sender: {},
      recipient: {}
    };

    if (!this.state.privateKey) {
      this.state.router.navigate('wallet');
    } else if (!this.state.lastBlock) {
      this.state.router.navigate('blockchain');
    }
  }

  attached() {
    this.state.updatePages('transaction');
  }


  signTransaction() {
    this.invalidBalance = false;
    this.err = undefined;
    this.transaction.sender = {};

    if (!this.fakeSender) {
      this.transaction.sender.publicKey = this.state.publicKey;
      this.transaction.sender.name = this.state.name;
    } else {
      this.transaction.sender.name = this.inputSenderName;
    }

    this.transaction.timestamp = Date.now();

    let hashTransaction = {
      sender: this.transaction.sender.name,
      recipient: this.transaction.recipient.name,
      amount: parseInt(this.transaction.amount),
      blockchain: this.state.blockchain.name,
      timestamp: this.transaction.timestamp
    };

    let hash = sha256(JSON.stringify(hashTransaction));

    let key = ec.keyFromPrivate(this.state.privateKey);
    let signatureDER = key.sign(hash).toDER();

    let hexSignature = '';
    for (let b of signatureDER) {
      let substring = b.toString(16);
      if (substring.length < 2) substring = '0' + substring;
      hexSignature += substring;
    }

    this.transaction.signature = hexSignature;

    if (Math.round(this.state.lastBlock.balanceMap[this.state.name] * 100) / 100 < this.transaction.amount) {
      this.invalidBalance = true;
    }
  }


  async sendTransaction() {
    this.transaction.blockchain = this.state.blockchain.name;

    let res = await this.state.fetch('sendTransaction', this.transaction);

    if (res.err) {
      this.err = res.err;
    } else {
      this.state.router.navigate('block');
    }
  }
}
