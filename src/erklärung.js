import { inject, bindable } from 'aurelia-framework';

import { state } from './state';

const sha256 = require('sha256');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

@inject(state)
export class Erklärung {
  constructor(state) {
    this.state = state;

    this.menu = this.getMenu();
    this.transaction = {
      sender: 'Ich'
    };
  }

  determineActivationStrategy() {
    return 'invoke-lifecycle';
  }

  activate(params) {
    if (params.page) this.page = parseInt(params.page);
    this.page = this.page || parseInt(localStorage.page) || '0';
  }

  attached() {
    this.state.updatePages('erklärung');
    this.update();
    this.state.l = 'ger';
    localStorage.german = true;
  }

  switchLanguage() {
    this.state.router.navigate('explanation');
  }

  getMenu() {
    return [
      'Warum wir Bitcoin brauchen',
      'Denzentralisierung',
      'Erstelle eine Bitcoin Wallet',
      'Ein schwieriges Matheproblem',
      'Elliptische Kurven: Einführung',
      'Elliptische Kurven: Schlüsselerzeugung',
      'Digitale Signaturen',
      'Transaktionsspeicher',
      'Konsens finden',
      'Kryptographischer Hash',
      'Blöcke bauen',
      'Die Blockchain',
      'Abschließende Worte'
    ];
  }

  nextPage() {
    this.page++;
    this.update();
  }

  goToPage(p) {
    this.shownav = false;
    this.page = p + 1;
    this.update();
  }

  update() {
    window.scrollTo(0, 0);
    if (this.page > 3 && !this.rand16) {
      this.genRand();
    }

    localStorage.page = this.page;

    this.state.router.navigateToRoute(
      'erklärung',
      { 'page': this.page },
      { trigger: true, replace: false }
    );
  }

  genRand() {
    let s = '';
    for (let i = 0; i < 256; i++) {
      s += Math.round(Math.random());
    }

    this.rand2 = s;
    this.rand10 = parseInt(s, 2).toString(10);
    this.rand16 = convertBase(s, 2, 16);

    let keyPair = ec.keyFromPrivate(this.rand16, 'hex');
    this.publicKey = keyPair.getPublic().encode('hex');
    this.transaction.publicKey = this.publicKey;
  }

  calculateHash() {
    this.hash = sha256(this.hashText);

    this.mined = false;
    if (this.hash.charAt(0) == 0) {
      this.mined = true;
    }
  }

  sign() {
    let hashTransaction = {
      sender: this.transaction.sender,
      receiver: this.transaction.receiver,
      amount: this.transaction.amount
    };

    let hash = sha256(JSON.stringify(hashTransaction));

    let key = ec.keyFromPrivate(this.rand16, 'hex');
    let signatureDER = key.sign(hash).toDER();

    let hexSignature = '';
    for (let b of signatureDER) {
      let substring = b.toString(16);
      if (substring.length < 2) substring = '0' + substring;
      hexSignature += substring;
    }

    this.transaction.signature = hexSignature;
  }

  verify() {
    let key = ec.keyFromPublic(this.transaction.publicKey, 'hex');

    let hashTransaction = {
      sender: this.transaction.sender,
      receiver: this.transaction.receiver,
      amount: this.transaction.amount
    };

    let hash = sha256(JSON.stringify(hashTransaction));

    this.transaction.valid = key.verify(hash, this.transaction.signature);
    this.transaction.invalid = !this.transaction.valid;
  }

  fakeTransaction() {
    this.transaction.sender = 'Alice';
    this.transaction.receiver = 'Ich';
    let s = '';
    for (let i = 0; i < 256; i++) {
      s += Math.round(Math.random());
    }

    let keyPair = ec.keyFromPrivate(convertBase(s, 2, 16), 'hex');
    this.transaction.publicKey = keyPair.getPublic().encode('hex');
    this.transaction.signature = undefined;
    this.transaction.valid = false;
  }
}
function parseBigInt(bigint, base) {
  //convert bigint string to array of digit values
  for (var values = [], i = 0; i < bigint.length; i++) {
    values[i] = parseInt(bigint.charAt(i), base);
  }
  return values;
}

function formatBigInt(values, base) {
  //convert array of digit values to bigint string
  for (var bigint = '', i = 0; i < values.length; i++) {
    bigint += values[i].toString(base);
  }
  return bigint;
}

function convertBase(bigint, inputBase, outputBase) {
  //takes a bigint string and converts to different base
  let inputValues = parseBigInt(bigint, inputBase);
  let outputValues = []; //output array, little-endian/lsd order
  let remainder;
  let len = inputValues.length;
  let pos = 0;
  let i;
  while (pos < len) { //while digits left in input array
    remainder = 0; //set remainder to 0
    for (i = pos; i < len; i++) {
      //long integer division of input values divided by output base
      //remainder is added to output array
      remainder = inputValues[i] + remainder * inputBase;
      inputValues[i] = Math.floor(remainder / outputBase);
      remainder -= inputValues[i] * outputBase;
      if (inputValues[i] == 0 && i == pos) {
        pos++;
      }
    }
    outputValues.push(remainder);
  }
  outputValues.reverse(); //transform to big-endian/msd order
  return formatBigInt(outputValues, outputBase);
}
