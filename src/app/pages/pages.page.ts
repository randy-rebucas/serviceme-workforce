import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AlertController, IonRouterOutlet, LoadingController, Platform } from '@ionic/angular';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Plugins, Capacitor } from '@capacitor/core';
import { from, Observable } from 'rxjs';
import { SubSink } from 'subsink';
import { AuthService } from '../auth/auth.service';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { map, switchMap } from 'rxjs/operators';
import { Address } from './users/users';
import { UsersService } from './users/users.service';
import { ELocalNotificationTriggerUnit, LocalNotifications } from '@ionic-native/local-notifications/ngx';
import firebase from 'firebase/app';
const { App } = Plugins;
@Component({
  selector: 'app-pages',
  templateUrl: './pages.page.html',
  styleUrls: ['./pages.page.scss'],
})
export class PagesPage implements OnInit, OnDestroy {
  public user$: Observable<firebase.User>;
  public subs = new SubSink();
  public isClient: boolean;
  public isPro: boolean;
  public isAdmin: boolean;
  @ViewChild(IonRouterOutlet, { static : true }) routerOutlet: IonRouterOutlet;
  constructor(
    private router: Router,
    private http: HttpClient,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private authService: AuthService,
    private usersService: UsersService,
    private platform: Platform,
    private location: Location,
    private localNotifications: LocalNotifications,
  ) {
    this.platform.ready().then(() => {
      // var pushAppointments = [];

      // pushAppointments.push({
      //     id: id++,
      //     title: translator.translate("Reminder appointment"),
      //     at: at,
      //     text: appointment.description + ": " + dateToShow,
      //     icon: "res:///not_icon",
      // })
      // cordova.plugins.notification.local.schedule(pushAppointments);

      this.localNotifications.schedule({
        id: 1,
        title: 'New Booking',
        text: 'New booking waiting for you.', // + Date.now(),
        data: { page: '/pages' },
        trigger: { in: 5, unit: ELocalNotificationTriggerUnit.SECOND },
        foreground: true,
        // attachments: ['file://img/rb-leipzig.jpg'],
        actions: [
          { id: 'accept', title: 'Accept'},
          { id: 'decline', title: 'Decline'}
        ]
      });

      this.localNotifications.on('click').subscribe((res) => {
        console.log(res);
        // this.router.navigate(['/pages/notifications']);
      });

      this.localNotifications.on('trigger').subscribe((res) => {
        console.log(res);
      });

      this.localNotifications.on('accept').subscribe((res) => {
        console.log(res);
        // actions: (2) [{…}, {…}]
        // attachments: []
        // autoClear: true
        // data: {page: "/pages"}
        // defaults: 0
        // foreground: true
        // groupSummary: false
        // id: 1
        // launch: true
        // led: true
        // lockscreen: true
        // meta: {plugin: "cordova-plugin-local-notification", version: "0.9-beta.2"}
        // number: 0
        // priority: 1
        // progressBar: {enabled: false, value: 0, maxValue: 100, indeterminate: false}
        // showWhen: true
        // silent: false
        // smallIcon: "res://icon"
        // sound: true
        // text: "New booking waiting for you."
        // title: "New Booking"
        // trigger: {in: 5, unit: "second", type: "calendar"}
        // vibrate: false
        // wakeup: true
        // this.router.navigate(['/pages/bills']);
      });
    });
  }

  ngOnInit() {
    this.platform.backButton.subscribeWithPriority(10, (processNextHandler) => {
      if (this.location.isCurrentPathEqualTo('/pages')) {
        // Show Exit Alert!
        this.showExitConfirm();
        processNextHandler();
      } else {
        this.loadingController.getTop().then(v => v ? this.loadingController.dismiss() : null);
        // Navigate to back page
        this.location.back();
      }
    });

    this.platform.backButton.subscribeWithPriority(-1, () => {
      if (!this.routerOutlet.canGoBack()) {
        App.exitApp();
      }
    });

    this.user$ = from(this.authService.getCurrentUser());

    this.subs.sink = this.user$.subscribe((user) => {
      user.getIdTokenResult().then((idTokenResult) => {
        this.isClient = idTokenResult.claims.client;
        this.isPro = idTokenResult.claims.pro;
        this.isAdmin = idTokenResult.claims.admin;
      });
      this.getUserInfo(user.uid);
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

  private getUserInfo(userId: string) {
    this.subs.sink = this.usersService.getOne(userId).subscribe((user) => {
      if (!user.address) {
        this.locateUser();
      }
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
  }

  private locateUser() {
    if (!Capacitor.isPluginAvailable('Geolocation')) {
      return;
    }
    this.subs.sink = from(Plugins.Geolocation.getCurrentPosition()).subscribe((geoPosition) => {
      this.pointLocation(geoPosition.coords);
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
  }

  private pointLocation(coordinates: any) {
    this.subs.sink = this.getAddress(coordinates.latitude, coordinates.longitude).subscribe(address => {
      this.updateLocation(address);
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
  }

  private updateLocation(address: Address) {
    const currentAddress = {
        city: address.city, // 'Noveleta',
        country: address.country, // 'Philippines',
        state: address.state, // 'Cavite'
    };
    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        return this.usersService.update(user.uid, { address: currentAddress });
      })
    ).subscribe(() => {}, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
  }

  private getAddress(lat: number, lng: number) {
    return this.http.get<any>(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${
          environment.googleMapsApiKey
        }`
      ).pipe(
        map(geoData => {
          if (!geoData || !geoData.results || geoData.results.length === 0) {
            return null;
          }
          const addressComponent = geoData.results[0].address_components;
          const address = {
            city: addressComponent[1].long_name,
            state: addressComponent[2].long_name,
            country: addressComponent[4].long_name
          };
          return address;
        })
      );
  }

  onLogout() {
    this.subs.sink = from(this.alertController.create({
      header: 'Confirmation Logout',
      message: 'Are you sure to logout?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {}
        }, {
          text: 'Yes',
          handler: () => {
            this.authService.signOut().then(() => {
              this.router.navigate(['/auth']);
            });
          }
        }
      ]
    })).subscribe((alertEl) => {
      alertEl.present();
    });
  }

  presentAlert(alertHeader: string, alertMessage: string) {
    this.subs.sink = from(this.alertController.create({
      header: alertHeader, // alert.code,
      message: alertMessage, // alert.message,
      buttons: ['OK']
    })).subscribe(alertEl => {
        alertEl.present();
    });
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

}
