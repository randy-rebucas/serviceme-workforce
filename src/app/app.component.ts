import { Component, ViewChild } from '@angular/core';
import { Plugins } from '@capacitor/core';
import { Location } from '@angular/common';
import { ELocalNotificationTriggerUnit, LocalNotifications } from '@ionic-native/local-notifications/ngx';
import { Network } from '@ionic-native/network/ngx';
import { AlertController, IonRouterOutlet, LoadingController, Platform } from '@ionic/angular';
import { SubSink } from 'subsink';
import { AuthService } from './auth/auth.service';

const { App } = Plugins;
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  @ViewChild(IonRouterOutlet, { static : true }) routerOutlet: IonRouterOutlet;
  private subs = new SubSink();

  constructor(
    private platform: Platform,
    private localNotifications: LocalNotifications,
    private authService: AuthService,
    private loadingCtrl: LoadingController,
    private alertController: AlertController,
    private location: Location,
    private network: Network
  ) {}

  initializeApp() {
    this.platform.ready().then(() => {
      // this.subs.sink = this.localNotifications.on('click').subscribe((res) => {
        //   const notifMessage = res.data ? res.data.secret : '';
        //   // this.showAlert(notifMessage);
        //   this.router.navigate(['/pages/bills']);
        // });
        // this.subs.sink = this.localNotifications.on('trigger').subscribe((res) => {
          //   const notifMessage = res.data ? res.data.secret : '';
          //   // this.showAlert(notifMessage);
          // });
          // this.subs.sink = this.localNotifications.on('paynow').subscribe((res) => {
            //   // pay bills
            //   this.router.navigate(['/pages/bills']);
            // });
            // this.onScheduleNotification();

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

    this.platform.backButton.subscribeWithPriority(10, (processNextHandler) => {
      if (this.location.isCurrentPathEqualTo('/pages')) {
        // Show Exit Alert!
        this.showExitConfirm();
        processNextHandler();
      } else {
        this.loadingCtrl.getTop().then(v => v ? this.loadingCtrl.dismiss() : null);
        // Navigate to back page
        this.location.back();
      }
    });

    this.platform.backButton.subscribeWithPriority(-1, () => {
      if (!this.routerOutlet.canGoBack()) {
        App.exitApp();
      }
    });
  }

  onScheduleNotification() {
    // Schedule a single notification
    this.localNotifications.schedule({
      id: 1,
      title: 'Reminder',
      text: 'Payment Over due\n' + Date.now(),
      data: { secret: 'My secret key' },
      trigger: { in: 5, unit: ELocalNotificationTriggerUnit.SECOND },
      foreground: true,
      actions: [
        { id: 'paynow', title: 'Pay Now'}
      ]
      // trigger: { at: new Date(new Date().getTime() + 5 * 1000) }
    });
  }

  async showExitConfirm() {
    const alert = await this.alertController.create({
      cssClass: 'my-custom-class',
      header: 'cutsonwheel close',
      message: 'Do you want to close the app?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {}
        }, {
          text: 'Exit',
          handler: () => {
            this.authService.signOut().then(() => {
              App.exitApp();
            });
          }
        }
      ]
    });

    await alert.present();
  }
}
