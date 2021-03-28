import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AlertController, IonRouterOutlet, LoadingController, Platform } from '@ionic/angular';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Plugins, Capacitor } from '@capacitor/core';
import { from, Observable, Subject } from 'rxjs';
import { SubSink } from 'subsink';
import { AuthService } from '../auth/auth.service';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { filter, map, mergeMap, reduce, switchMap } from 'rxjs/operators';
import { Address } from './users/users';
import { UsersService } from './users/users.service';
import { ELocalNotificationTriggerUnit, LocalNotifications } from '@ionic-native/local-notifications/ngx';
import firebase from 'firebase/app';
import { NotificationsService } from './notifications/notifications.service';
import { Notifications } from './notifications/notifications';
import { BookingsService } from './bookings/bookings.service';
import { TransactionsService } from './transactions/transactions.service';
import { Coordinates } from './bookings/bookings';
const { App } = Plugins;
@Component({
  selector: 'app-pages',
  templateUrl: './pages.page.html',
  styleUrls: ['./pages.page.scss'],
})
export class PagesPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(IonRouterOutlet, { static : true }) routerOutlet: IonRouterOutlet;

  public user$: Observable<firebase.User>;
  public currenctBalance: number;
  public notifications$: Observable<Notifications[]>;
  private notificationListener = new Subject<any>();
  private transactionListener = new Subject<any>();
  public subs = new SubSink();
  public isClient: boolean;
  public isPro: boolean;
  public isAdmin: boolean;
  constructor(
    private router: Router,
    private http: HttpClient,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private authService: AuthService,
    private usersService: UsersService,
    private platform: Platform,
    private location: Location,
    private notificationsService: NotificationsService,
    private localNotifications: LocalNotifications,
    private transactionsService: TransactionsService,
    private bookingsService: BookingsService
  ) {
    this.platform.ready().then(() => {
      // get all new notifications
      this.getNotifications();

      this.localNotifications.on('click').subscribe((res) => {
        this.localNotifications.clear(res.id).then(() => {
          this.router.navigate(['/pages/notifications']);
        });
      });

      this.localNotifications.on('accept').subscribe((res) => {
        // check wallet balance if greaterthan the offer continue else redirect payments
        // this.subs.sink = from(this.bookingsService.update(res.data.refferenceId, { status: 'accepted' })).subscribe(() => {
        //   this.bookingsService.setBookingStatus('');
        //   this.router.navigate(['/pages']);
        // }, (error: any) => {
        //   this.presentAlert(error.code, error.message);
        // });
      });

      this.getTransactions();

      this.platform.backButton.subscribeWithPriority(10, (processNextHandler) => {
        if (this.location.isCurrentPathEqualTo('/pages/dashboard')) {
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
    });
  }

  getNotificationListener() {
    return this.notificationListener.asObservable();
  }

  getTransactionListener() {
    return this.transactionListener.asObservable();
  }

  getNotifications() {
    from(this.authService.getCurrentUser()).pipe(
      // get all notifications
      switchMap((user) => this.usersService.getSubCollection(user.uid, 'notifications').pipe(
        // notifications response
        mergeMap((notificationMap: any[]) => {
          // merge collection
          return from(notificationMap).pipe(
            mergeMap((notificationSubCollection) => {
              return this.notificationsService.getOne(notificationSubCollection.id).pipe(
                // map to combine user notifications sub-collection to collection
                map(notificationCollection => ({notificationSubCollection, notificationCollection})),
                // filter by status
                filter(notificationStatus => notificationStatus.notificationCollection.status === 'unread')
              );
            }),
            reduce((a, i) => [...a, i], [])
          );
        }),
      ))
    ).subscribe((notifications) => {
      this.notificationListener.next(notifications);
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

    this.getNotificationListener().subscribe((notifications) => {
      for (const notification of notifications) {
        this.scheduleNotification(notification.notificationCollection.title, notification.notificationCollection.content, notification);
      }
    });

    // compute total transaction balances
    this.subs.sink = this.getTransactionListener().subscribe((transactions) => {
      let balance = 0;
      transactions.forEach(transaction => {
        balance += transaction.transactionSubCollection.balance;
      });
      // set current balance observable value
      this.transactionsService.setBalance(balance);
    });
  }

  getTransactions() {
    from(this.authService.getCurrentUser()).pipe(
      // get all transactions
      switchMap((user) => this.usersService.getSubCollection(user.uid, 'transactions').pipe(
        // transactions response
        mergeMap((transactionMap: any[]) => {
          // merge collection
          return from(transactionMap).pipe(
            mergeMap((transactionSubCollection) => {
              return this.transactionsService.getOne(transactionSubCollection.id.trim()).pipe(
                // map to combine user transactions sub-collection to collection
                map(transactionCollection => ({transactionSubCollection, transactionCollection})),
                // filter by status
                filter(bookingStatus => bookingStatus.transactionCollection.status === 'completed'),
              );
            }),
            reduce((a, i) => [...a, i], [])
          );
        }),
      ))
    ).subscribe((transactions) => {
      this.transactionListener.next(transactions);
    });
  }

  ngAfterViewInit() {
    this.subs.sink = this.transactionsService.getBalance().subscribe((balance) => {
      this.currenctBalance = balance;
    });
  }

  scheduleNotification(notificationTitle: string, notificationText: string, data: any) {
    const notificationActions = [];

    this.bookingsService.getOne(data.notificationSubCollection.id).subscribe((r) => {
      console.log(r);
    });
    // [
    //   { id: 'accept', title: 'Accept'},
    //   { id: 'decline', title: 'Decline'}
    // ]
    this.localNotifications.schedule({
      id: Math.floor(Math.random() * 5),
      title: notificationTitle,
      text: notificationText,
      data: {
        page: '/pages/notifications',
        refferenceId: data.notificationSubCollection.id
      },
      foreground: true,
      vibrate: true,
      // icon: "res:///not_icon",
      actions: notificationActions
    });
  }

  showExitConfirm() {
    this.subs.sink = from(this.alertController.create({
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
    })).subscribe((alert) => {
      alert.present();
    });
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
      this.updateLocation(address, coordinates);
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
  }

  private updateLocation(address: Address, coord: any) {
    const currentAddress = {
        city: address.city,
        country: address.country,
        state: address.state,
        coordinates: {
          lat: coord.latitude,
          lng: coord.longitude
        }
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
