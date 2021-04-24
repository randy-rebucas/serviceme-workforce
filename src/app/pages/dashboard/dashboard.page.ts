import { AfterViewInit, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ActionSheetController, AlertController, IonItemSliding, ModalController } from '@ionic/angular';

import { BehaviorSubject, combineLatest, from, Observable, of, scheduled, Subject } from 'rxjs';
import { filter, map, mergeMap, reduce, switchMap } from 'rxjs/operators';

import { AuthService } from 'src/app/auth/auth.service';
import { UsersService } from '../users/users.service';
import { AdminFunctionService } from 'src/app/shared/services/admin-function.service';
import { PaymentsService } from '../payments/payments.service';
import { TransactionsService } from '../transactions/transactions.service';
import { SettingsService } from '../settings/settings.service';
import { BookingsService } from '../bookings/bookings.service';
import { NotificationsService } from '../notifications/notifications.service';

import { Users } from '../users/users';
import { environment } from 'src/environments/environment';
import { SubSink } from 'subsink';
import firebase from 'firebase/app';
import { Classification } from 'src/app/shared/classes/classification';
import { ClassificationsService } from 'src/app/shared/services/classifications.service';
import { DetailComponent } from '../bookings/detail/detail.component';
import { Plugins, Capacitor } from '@capacitor/core';
import { HttpClient } from '@angular/common/http';
const { App } = Plugins;
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit, AfterViewInit, OnDestroy {
  public currentUser$: Observable<firebase.User>;
  public user: Users[];
  public defaultCurrency: string;
  public notificationCount$: Observable<number>;
  public transactionBalance$: Observable<number>;
  public classifications: Classification[];
  public searchKey: string;
  public classification: string;
  public length$: Observable<number>;
  public professionals$: Observable<Users[]>;
  public currentPosition$: Observable<any>;
  private currentLocation$: BehaviorSubject<string|null>;
  private currentPoint$: BehaviorSubject<string>;
  private notificationListener = new Subject<any>();

  private classification$: BehaviorSubject<string|null>;
  private searchKey$: BehaviorSubject<string|null>;
  private subs = new SubSink();

  constructor(
    private alertController: AlertController,
    private modalController: ModalController,
    private actionSheetController: ActionSheetController,
    private router: Router,
    private authService: AuthService,
    private usersService: UsersService,
    private paymentsService: PaymentsService,
    private transactionsService: TransactionsService,
    private notificationsService: NotificationsService,
    private settingsService: SettingsService,
    private classificationsService: ClassificationsService,
    private bookingsService: BookingsService,
    private http: HttpClient
  ) {
    this.searchKey$ = new BehaviorSubject(null);
    this.classification$ = new BehaviorSubject(null);
    this.currentLocation$ = new BehaviorSubject(null);
    this.currentPoint$ = new BehaviorSubject('more');
    this.length$ = of(0);

    // current user observable
    this.currentUser$ = from(this.authService.getCurrentUser());

    this.subs.sink = from(this.currentUser$).pipe(
      switchMap((user) => {
        return this.settingsService.getOne(user.uid);
      })
    // tslint:disable-next-line: deprecation
    ).subscribe((settings) => {
      this.defaultCurrency = (settings) ? settings.currency : environment.defaultCurrency;
    });

    // tslint:disable-next-line: deprecation
    this.notificationCount$ = this.getNotificationListener().pipe(
      map((notifications) => {
        return notifications.length;
      })
    );

    // tslint:disable-next-line: deprecation
    this.subs.sink = this.classificationsService.getAll().subscribe((classifications) => {
      this.classifications = classifications;
    });

    this.length$ = this.usersService.getSize().pipe(
      map((response) => {
        return response.size;
      })
    );

    // tslint:disable-next-line: deprecation
    from(this.bookingsService.getCurrentPosition()).subscribe((currenctLocation) => {
      this.currentLocation$.next(currenctLocation);
    });
  }

  private getNotifications() {
    from(this.authService.getCurrentUser()).pipe(
      // get all notifications
      switchMap((user) => this.usersService.getSubCollection(user.uid, 'notifications').pipe(
        map((notifications) => {
          return notifications.filter(notificationStatus => notificationStatus.status === 'unread');
        })
      ))
    // tslint:disable-next-line: deprecation
    ).subscribe((notifications) => {
      this.notificationListener.next(notifications);
    });
  }

  private getNotificationListener() {
    return this.notificationListener.asObservable();
  }

  private getBalance() {
    return from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        return this.usersService.getSubCollection(user.uid, 'receipts').pipe(
          map((receipts) => {
            let balance = 0;
            receipts.forEach(receipt => {
              balance += receipt.amount;
            });
            return balance;
          })
        );
      })
    );
  }

  private checkRoles() {
    // tslint:disable-next-line: deprecation
    this.subs.sink = from(this.currentUser$).subscribe((user) => {
      user.getIdTokenResult().then((idTokenResult) => {
        if (!idTokenResult.claims.client) {
          from(this.alertController.create(
            {
              header: 'Account checking!',
              message: 'This is for Client App only. Please contact our support team!',
              buttons: [
                {
                  text: 'Exit',
                  handler: () => {
                    // tslint:disable-next-line: deprecation
                    this.subs.sink = from(this.authService.signOut()).subscribe(() => {
                      this.router.navigate(['auth']);
                    });
                  }
                }
              ],
              backdropDismiss: false,
              keyboardClose: false
            }
          // tslint:disable-next-line: deprecation
          )).subscribe((alertEl) => {
            alertEl.present();
          });
        } else {
          // check verification
          this.verificationCheck();
        }
      });
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
  }

  private verificationCheck() {
    // tslint:disable-next-line: deprecation
    this.subs.sink = from(this.currentUser$).subscribe((user) => {
      if (!user.emailVerified) {
        from(this.alertController.create(
          {
            header: 'Verification!',
            message: 'Your account is not yet verified! Please check your email.',
            buttons: [
              {
                text: 'Cancel',
                role: 'cancel',
                cssClass: 'secondary',
                handler: () => {}
              }, {
                text: 'Ok',
                handler: () => {
                  this.authService.signOut();
                }
              }
            ]
          }
        // tslint:disable-next-line: deprecation
        )).subscribe((alertEl) => {
          alertEl.present();
        });
      }
    });
  }

  ngOnInit() {
    // check roles
    this.checkRoles();

    // get all notifications
    this.getNotifications();

    // load professionals
    this.professionals$ = this.initProfessionals();

    // get balance
    this.transactionBalance$ = this.getBalance();
  }

  private initProfessionals() {
    return combineLatest([
      this.searchKey$,
      this.classification$,
      this.currentPoint$,
      this.currentLocation$
    ]).pipe(
      switchMap(([searchKey, classification, point, location]) => {
        return this.usersService.getAll(searchKey, classification, point, location)
        .pipe(
          map(users => {
            return users.filter(userClaims => userClaims.roles?.pro === true);
          })
        );
      })
    );
  }

  ngAfterViewInit() {
    // refresh list
    this.onReload();

  }

  onClear() {
    this.searchKey$.next('');
  }

  onChange(event: any) {
    this.searchKey$.next(event.detail.value);
  }

  onFilter() {
    // tslint:disable-next-line: deprecation
    this.subs.sink = this.classificationsService.getAll().subscribe((classifications) => {
      // this.classifications = classifications;
      const customInput = [];
      for (const classification of classifications) {
        customInput.push({
          name: 'classifications',
          type: 'radio',
          label: classification.name,
          value: classification.name
        });
      }

      from(this.alertController.create({
        header: 'Filter',
        subHeader: 'By Classifications',
        inputs: customInput,
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
            cssClass: 'secondary',
            handler: () => {}
          }, {
            text: 'Filter',
            handler: (data) => {
              this.classification$.next(data);
            }
          }
        ]
      // tslint:disable-next-line: deprecation
      })).subscribe((promptEl) => {
        promptEl.present();
      });
    });
  }

  onDeail(userDetail: any, ionItemSliding: IonItemSliding) {
    this.subs.sink = from(this.modalController.create({
      component: DetailComponent,
      componentProps: {
        title: 'Detail',
        userData: userDetail,
        state: false
      }
    // tslint:disable-next-line: deprecation
    })).subscribe((modalEl) => {
      modalEl.present();
      ionItemSliding.closeOpened();
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
          return geoData.results[0];
        })
      );
  }

  onNearby() {
    if (!Capacitor.isPluginAvailable('Geolocation')) {
      return;
    }
    // tslint:disable-next-line: deprecation
    this.subs.sink = from(Plugins.Geolocation.getCurrentPosition()).pipe(
      switchMap((currentPosition) => {
        return this.getAddress(currentPosition.coords.latitude, currentPosition.coords.longitude);
      })
    // tslint:disable-next-line: deprecation
    ).subscribe((geoPosition) => {
      this.currentPoint$.next('nearby');
      const targetLocation = {
        city: geoPosition.address_components[1].long_name,
        state: geoPosition.address_components[2].long_name
      };
      this.bookingsService.setCurrentPosition(targetLocation);
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
  }

  onReload() {
    this.currentPoint$.next('more');
    from(this.authService.getCurrentUser()).pipe(
      switchMap((currentUser) => {
        return this.usersService.getOne(currentUser.uid);
      })
    // tslint:disable-next-line: deprecation
    ).subscribe((user) => {
      const targetLocation = {
        city: user.address.city,
        state: user.address.state
      };
      this.bookingsService.setCurrentPosition(targetLocation);
    });
  }

  onPickMethods() {
    this.subs.sink = from(this.actionSheetController.create(
      {
        header: 'Select Methods',
        cssClass: 'custom-action-sheets',
        buttons: [{
          text: 'Paypal',
          icon: 'logo-paypal',
          handler: () => {
            this.router.navigate(['/pages/payments']);
          }
        }, {
          text: 'Cancel',
          icon: 'close',
          role: 'cancel',
          handler: () => {}
        }]
      }
    // tslint:disable-next-line: deprecation
    )).subscribe(actionEl => {
      actionEl.present();
    });
  }

  onViewReceipt() {
    this.router.navigate(['/pages/receipts']);
  }

  onOpenNotifications() {
    this.router.navigateByUrl('/pages/notifications');
  }

  private presentAlert(alertHeader: string, alertMessage: string) {
    this.subs.sink = from(this.alertController.create({
      header: alertHeader, // alert.code,
      message: alertMessage, // alert.message,
      buttons: ['OK']
    // tslint:disable-next-line: deprecation
    })).subscribe(alertEl => {
        alertEl.present();
    });
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
