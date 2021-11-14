import { inject, bindable } from 'aurelia-framework';
import { state } from './state';


@inject(state)
export class App {
  constructor(state) {
    this.state = state;
  }


  attached() {
    // this.serviceWorker()
  }

  configureRouter(config) {
    config.title = 'Bitcoin Simulator';
    config.options.pushState = true;
    config.options.root = '/';
    config.map([
      { route: 'wallet', name: 'wallet', moduleId: PLATFORM.moduleName('new-wallet'), title: 'Create Wallet' },
      { route: 'transaction', name: 'transaction', moduleId: PLATFORM.moduleName('transaction'), title: 'New Transaction' },
      { route: 'block', name: 'block', moduleId: PLATFORM.moduleName('block'), title: 'Mining' },
      { route: 'blockchain', name: 'blockchain', moduleId: PLATFORM.moduleName('blockchain'), title: 'Blockchain' },
      { route: 'explanation', name: 'explanation', moduleId: PLATFORM.moduleName('explanation'), title: 'Tutorial' },
      { route: 'erklärung', name: 'erklärung', moduleId: PLATFORM.moduleName('erklärung'), title: 'Tutorial' },
      { route: '', redirect: 'blockchain' }
    ]);
    config.mapUnknownRoutes({ redirect: 'blockchain' });
  }


  routeTutorial() {
    if (this.state.l == 'eng') this.state.router.navigate('explanation');
    else this.state.router.navigate('erklärung');
  }

  changeLanguage(l) {
    this.state.l = l;
    localStorage.german = l == 'ger';
    if (l == 'ger' && this.state.page.explanation) {
      this.state.router.navigate('erklärung');
    }
    if (l == 'eng' && this.state.page.erklärung) {
      this.state.router.navigate('explanation');
    }
  }

  serviceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('../dist/service-worker.js').then((reg) => {
        reg.onupdatefound = () => {
          // The updatefound event implies that reg.installing is set; see
          // https://w3c.github.io/ServiceWorker/#service-worker-registration-updatefound-event
          let installingWorker = reg.installing;

          installingWorker.onstatechange = () => {
            switch (installingWorker.state) {
            case 'installed':

              if (navigator.serviceWorker.controller) {
                //   this.notification = {
                //       show: true,
                //       time: 10000,
                //       heading: 'Update available',
                //       text:"A new and improved version is available and has already been updated in the background. Reload this page to activate it now.",
                //       confirm: {
                //          text: 'Reload Now',
                //          function: () => {location.reload()}

                //       }


                // }


                console.log('New or updated content is available.');
              } else {
                // At this po int, everything has been precached.
                // It's the perfect time to display a "Content is cached for offline use." message.
                console.log('Content is now available offline!');
              }
              break;

            case 'redundant':
              console.error('The installing service worker became redundant.');
              break;
            }
          };
        };
      }).catch(function(e) {
        console.error('Error during service worker registration:', e);
      });
    }
  }
}

export class KeysValueConverter {
  toView(obj) {
    return Object.values(obj);
  }
}
