import { inject, bindable } from 'aurelia-framework';
import { state } from './state';

@inject(state)
export class Blockchain {
  constructor(state) {
    this.state = state;
    this.JSON = JSON;
    this.moment = moment;
  }

  async activate(params) {
    if (params.de) {
      this.state.l = 'ger';
      localStorage.german = true;
    }
    if (!params.chain) return false;
    if (this.state.blockchain.name == params.chain) return false;

    let res = await this.state.fetch('connectToBlockchain', { name: params.chain });
    if (res.exists) {
      this.state.socket.emit('changeChain', { prev: this.state.blockchain.name, new: res.data.name });
      this.state.blockchain = res.data;
      localStorage.blockchain = JSON.stringify(res.data);
      this.state.downloadBlockchain();
    }
  }

  attached() {
    this.state.updatePages('blockchain');
    this.state.router.navigateToRoute(
      'blockchain',
      { 'chain': this.state.blockchain.name },
      { trigger: false, replace: true }
    );
    this.scrollToEnd();
  }

  setAsLast(block) {
    this.state.lastBlock.isLast = false;
    this.state.lastBlock = block;
    block.isLast = true;
  }


  scroll(amount) {
    this.state.blockchainScrollContainer.scrollBy({
      left: amount,
      behavior: 'smooth'
    });
  }

  scrollToEnd() {
    this.state.blockchainScrollContainer.scrollLeft = this.state.blockchainScrollContainer.scrollWidth;
  }
}

