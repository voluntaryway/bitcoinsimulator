import { inject, bindable } from 'aurelia-framework';
import { state } from './state';

@inject(state)
export class resetkeysmodal {
  constructor(state) {
    this.state = state;
  }

  reset() {
    localStorage.removeItem('credentials');
    location.reload();
  }
}
