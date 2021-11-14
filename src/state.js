import { inject, singleton } from 'aurelia-framework';
import { HttpClient, json } from 'aurelia-fetch-client';
import io from 'socket.io-client';
import translation from './resources/translation.js';

const sha256 = require('sha256');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

import { Router } from 'aurelia-router';

@inject(HttpClient, Router, translation, json)
@singleton()
export class state {
  constructor(http, router, translation) {
    this.http = http;
    this.router = router;

    this.updatePages('blockchain');

    this.t = translation;
    if (localStorage.german) this.l = JSON.parse(localStorage.german) ? 'ger' : 'eng';
    else this.l = 'eng';

    this.publicChainObject = {
      name: 'public',
      difficulty: 4,
      blockReward: 6.25,
      genesisReward: 6.25
    };

    this.mempool = [];

    if (localStorage.blockchain) {
      this.blockchain = JSON.parse(localStorage.blockchain);
      if (this.blockchain.name == 'public') this.blockchain = this.publicChainObject;
    } else {
      this.setPublic();
    }

    if (localStorage.credentials) {
      let credentials = JSON.parse(localStorage.credentials);
      this.name = credentials.name;
      this.publicKey = credentials.publicKey;
      this.privateKey = credentials.privateKey;
      this.router.navigate('transaction');
    }
    this.walletsOnline = [];


    this.websocketConnect();
    this.downloadBlockchain();

    console.log(this);
  }

  setPublic() {
    localStorage.removeItem('blockchain');

    this.blockchain = this.publicChainObject;
  }

  async downloadBlockchain() {
    this.onChainTransactions = [];
    this.fullChain = [];
    this.lastBlock = null;
    this.depthOffset = 0;

    let data = await this.fetch('getBlockchain', { name: this.blockchain.name });
    this.blocks = data.blockchain;
    this.blockchainMeta = data.meta;
    this.constructMainChain(this.blocks, this.blockchainMeta);


    if (!data.blockchain.length) {
      this.lastBlock = {
        dummy: true,
        hash: '0',
        balanceMap: {}
      };
    }
  }

  constructMainChain(blocks, blockchainMeta) {
    if (!this.blocks.length) return false;

    let worker = new Worker('../external/worker.js');

    worker.postMessage([blocks, blockchainMeta]);

    worker.onmessage = (e) => {
      this.fullChain = e.data[0];
      this.onChainTransactions = e.data[1];
      this.lastBlock = e.data[2];
      this.depthOffset = e.data[3];
      this.blocks = e.data[4];

      this.isConstructing = false;


      if (!this.lastBlock.balanceMap[this.name]) this.lastBlock.balanceMap[this.name] = 0.00;

      setTimeout(() => {
        this.blockchainScrollContainer.scrollLeft = this.blockchainScrollContainer.scrollWidth;
      }, 10);
    };
  }

  showFullChain() {
    this.blockchainMeta.truncated = undefined;
    this.isConstructing = true;

    setTimeout(() => {
      this.constructMainChain(this.blocks, this.blockchainMeta);
    }, 10);
  }


  calculateHash(block) {
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

  async curtailChain(depth) {
    let truncatedDepth = 0;
    if (this.blockchainMeta && this.blockchainMeta.truncated) {
      truncatedDepth = this.blockchainMeta.truncated.depth;
    }


    let curtailed = this.blocks.find(el => {
      return el.isLongest && (el.depth + truncatedDepth === depth);
    });


    let previous = this.blocks.find(el => {
      return el.hash === curtailed.previoushash;
    });

    let truncated = {
      id: curtailed._id,
      depth: depth,
      previousBalance: previous.balanceMap

    };

    console.log(JSON.stringify(truncated));

    await this.fetch('curtailChain', { name: this.blockchainMeta.name, truncated: truncated, key: this.privateKey });
  }

  updatePages(p) {
    this.page = {
      explanation: false,
      blockchain: false,
      transaction: false,
      wallet: false,
      block: false,
      erklärung: false
    };

    if (p) this.page[p] = true;
  }

  websocketConnect() {
    // this.router.navigate('wallet')

    this.socket = io();

    this.socket.on('connect', socket => {
      console.log('connect');
      this.socket.emit('join', this.blockchain.name);
      if (this.name) this.socket.emit('online', { name: this.name });
    });

    this.socket.on('reconnect', socket => {
      console.log('reconnect');
      this.downloadBlockchain();
    });

    this.socket.on('newTransaction', t => {
      // console.log(t.transaction)
      this.mempool.push(t.transaction);
    });

    this.socket.on('updateUserList', clients => {
      // console.log(clients)
      this.walletsOnline = clients;
    });

    this.socket.on('newBlock', res => {
      if (!this.page.explanation && !this.page.erklärung) {
        this.receivedBlock = res.block;
        this.receivedBlock.hash = this.calculateHash(res.block);
      }
      this.blocks.push(res.block);
      this.constructMainChain(this.blocks, this.blockchainMeta);
    });
  }

  async fetch(endpoint, body) {
    if (!endpoint) return false;

    let options = {
      method: 'post'
    };

    if (body) options.body = json(body);

    this.fetching = true;

    try {
      let res = await this.http.fetch(endpoint, options);
      if (!res.ok) throw 'Invalid Response';
      res = await res.json();
      this.fetching = false;
      return res;
    } catch (err) {
      console.log(err);
      this.fetching = false;
    }
  }
}
