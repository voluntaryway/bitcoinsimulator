import { inject, bindable } from 'aurelia-framework';
import { state } from './state';


@inject(state)
export class selectChainModal {
  constructor(state) {
    this.state = state;
  }


  attached() {

  }


  closeModal() {
    this.blockchain = {};
    this.showNewChainOptions = false;
    this.state.showChangeBlockchain = false;
  }

  async connect(pub) {
    let res = await this.state.fetch('connectToBlockchain', { name: pub || this.blockchain.name });
    if (!res.exists) this.showNewChainOptions = true;
    else {
      this.state.socket.emit('changeChain', { prev: this.state.blockchain.name, new: res.data.name });
      this.state.blockchain = res.data;
      localStorage.blockchain = JSON.stringify(res.data);
      this.closeModal();
      this.state.downloadBlockchain();
      this.state.router.navigate('blockchain');
    }
  }

  async createBlockchain() {
    if (!this.ref_form.reportValidity()) return false;
    this.blockchain.genesisReward = this.blockchain.genesisReward || this.blockchain.blockReward;
    let res = await this.state.fetch('createNewBlockchain', this.blockchain);
    if (res.success) {
      this.state.socket.emit('changeChain', { prev: this.state.blockchain.name, new: res.data.name });
      this.state.blockchain = res.data;
      localStorage.blockchain = JSON.stringify(res.data);
      this.closeModal();
      this.state.downloadBlockchain();
      this.state.router.navigate('blockchain');
    }
  }
}
