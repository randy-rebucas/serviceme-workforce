import { Component, OnDestroy } from '@angular/core';
import { Plugins } from '@capacitor/core';

import { AlertController, Platform } from '@ionic/angular';
import { Network } from '@ionic-native/network/ngx';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';

import { AuthService } from './auth/auth.service';
import { SubSink } from 'subsink';

const { App } = Plugins;

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnDestroy {
  private subs = new SubSink();

  constructor(
    private platform: Platform,
    private authService: AuthService,
    private alertController: AlertController,
    private splashScreen: SplashScreen,
    private network: Network
  ) {
    this.initializeApp();
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.splashScreen.hide();
      // check network if available.
      // tslint:disable-next-line: deprecation
      this.subs.sink =  this.network.onDisconnect().subscribe(() => {
        this.alertController.create({
          cssClass: 'my-custom-class',
          header: 'cutsonwheel close',
          message: 'network was disconnected',
          buttons: [
           {
              text: 'Exit',
              handler: () => {
                this.authService.signOut().then(() => {
                  App.exitApp();
                });
              }
            }
          ]
        }).then((alertEl) => {
          alertEl.present();
        });
      });
    });
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
