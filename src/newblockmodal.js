import { inject, bindable } from 'aurelia-framework';
import { state } from './state';

@inject(state)
export class newblockmodal {
  constructor(state) {
    this.state = state;
    this.moment = moment;
  }

  checkBlockchain() {
    this.state.receivedBlock = undefined;
    this.state.router.navigate('blockchain');
  }
}
