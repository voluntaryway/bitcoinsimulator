import { inject, bindable } from 'aurelia-framework';
import { state } from './state';


let EC = require('elliptic').ec;
const ec = new EC('secp256k1');
const chars = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'a', 'b', 'c', 'd', 'e', 'f'];

@inject(state)
// @inject(sha256)
export class newWallet {
  constructor(state) {
    this.state = state;
  }

  attached() {
    this.state.updatePages('wallet');

    this.state.refRouterView.scrollIntoView(true);
  }

  async createWallet() {
    let privateKey = this.randomString(64);
    let keyPair = ec.keyFromPrivate(privateKey, 'hex');
    let publicKey = keyPair.getPublic().encode('hex');

    let data = await this.state.fetch('newUser', { name: this.state.name, publicKey: publicKey });
    if (data.success) {
      this.state.privateKey = privateKey;
      this.state.publicKey = publicKey;
      this.storeCredentials();
    }
    if (data.err) this.err = data.err;
  }

  async recoverWallet() {
    let keyPair = ec.keyFromPrivate(this.key, 'hex');
    let publicKey = keyPair.getPublic().encode('hex');

    let data = await this.state.fetch('loadWallet', { publicKey: publicKey });
    if (data.user) {
      this.state.publicKey = data.user.publicKey;
      this.state.name = data.user.name;
      this.state.privateKey = this.key;

      this.storeCredentials();
    } else {
      this.err2 = "Wallet doesn't exist";
    }
  }

  randomString(l) {
    let r = '';
    for (let i = 0; i < l; i++) {
      r += chars[Math.floor(Math.random() * 16)];
    }
    return r;
  }

  storeCredentials() {
    localStorage.credentials =
      JSON.stringify(
        {
          name: this.state.name,
          publicKey: this.state.publicKey,
          privateKey: this.state.privateKey,
          coinbaseTransaction: this.state.coinbaseTransaction
        });

    if (!this.state.lastBlock.balanceMap[this.state.name]) this.state.lastBlock.balanceMap[this.state.name] = 0;
    this.state.socket.emit('online', { name: this.state.name });
  }


  routeToTransaction() {
    this.state.router.navigate('transaction');
  }
}

