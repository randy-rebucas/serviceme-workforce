import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, from, Observable, of, Subject } from 'rxjs';
import { AuthService } from 'src/app/auth/auth.service';
import { ActionSheetController, AlertController, ToastController } from '@ionic/angular';
import { UsersService } from '../users/users.service';
import { Users } from '../users/users';
import { AdminFunctionService } from 'src/app/shared/services/admin-function.service';
import { filter, map, mergeMap, reduce, switchMap, toArray } from 'rxjs/operators';
import { SubSink } from 'subsink';
import { Router } from '@angular/router';
import { PaymentsService } from '../payments/payments.service';
import { MyTransactions, Transactions } from '../transactions/transactions';
import { TransactionsService } from '../transactions/transactions.service';
import { SettingsService } from '../settings/settings.service';
import { environment } from 'src/environments/environment';
import { BookingsService } from '../bookings/bookings.service';
import firebase from 'firebase/app';
import { NotificationsService } from '../notifications/notifications.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit, AfterViewInit, OnDestroy {
  public isClient: boolean;
  public isPro: boolean;
  public isAdmin: boolean;
  public currenctBalance: number;
  public currentUser$: Observable<firebase.User>;
  public transactions$: Observable<any[]>;
  public lists$: Observable<any>;
  public bookings$: Observable<any[]>;
  public user: Users[];
  public defaultCurrency: string;
  public commissionCharge: number;
  public notificationCount: number;
  private notificationListener = new Subject<any>();
  private commissionPercentage: number;
  private serviceCharge: number;
  private bookingStatus$: BehaviorSubject<string|null>;
  private bookingListener = new Subject<any>();
  private transactionListener = new Subject<any>();
  private subs = new SubSink();

  constructor(
    private alertController: AlertController,
    private actionSheetController: ActionSheetController,
    private toastController: ToastController,
    private router: Router,
    private authService: AuthService,
    private adminFunctionService: AdminFunctionService,
    private usersService: UsersService,
    private bookingsService: BookingsService,
    private paymentsService: PaymentsService,
    private transactionService: TransactionsService,
    private notificationsService: NotificationsService,
    private settingsService: SettingsService
  ) {
    this.currenctBalance = 0;
    this.notificationCount = 0;
    this.commissionPercentage = environment.commissionPercentage;
    this.bookingStatus$ = new BehaviorSubject('pending');

    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        return this.settingsService.getOne(user.uid);
      })
    ).subscribe((settings) => {
      this.defaultCurrency = (settings) ? settings.currency : environment.defaultCurrency;
    });
  }

  onOpenNotifications() {
    this.router.navigateByUrl('/pages/notifications');
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

  getNotificationListener() {
    return this.notificationListener.asObservable();
  }

  getTransactionListener() {
    return this.transactionListener.asObservable();
  }

  getBookingListener() {
    return this.bookingListener.asObservable();
  }

  // get user data to retrive names
  getUser(bookingDetail: any, subCollectionForiegnKeyId: string) {
    return this.usersService.getOne(subCollectionForiegnKeyId).pipe(
      map(usersCollection => ({ usersCollection, bookingDetail })),
    );
  }
  // get auth user data to retrive photoUrl
  getAuthUser(booking) {
    return this.adminFunctionService.getById(booking.bookingSubCollection.userId).pipe(
      map(admin => ({ booking, admin })),
      // merge user collection to get common user intity object
      mergeMap((bookingDetail) => {
        return this.getUser(bookingDetail, booking.bookingSubCollection.userId);
      })
    );
  }
  // get sub collections
  getSubCollectionDocument(bookingSubCollection: any, status: string) {
    return this.bookingsService.getOne(bookingSubCollection.id).pipe(
      // map to combine user booking sub-collection to collection
      map(bookingCollection => ({ bookingSubCollection, bookingCollection })),
      // filter by status
      filter(bookingStatus => bookingStatus.bookingCollection.status === status),
      // merge the user auth data to get firebase.User object
      mergeMap((booking) => {
        return this.getAuthUser(booking);
      })
    );
  }
  // get Main Collection {bookings}
  getCollection(booking: any[], status: string) {
    return from(booking).pipe(
      mergeMap((bookingSubCollection) => this.getSubCollectionDocument(bookingSubCollection, status)),
      reduce((a, i) => [...a, i], [])
    );
  }

  // get all sub collection bookings from user perspective
  getSubCollection(documentRef: string, collectionRef: string, status: string) {
    return this.usersService.getSubCollection(documentRef, collectionRef).pipe(
      // bookings response
      mergeMap((bookingMap: any[]) => {
        return this.getCollection(bookingMap, status);
      })
    );
  }

  // initialize
  initialized() {
    this.subs.sink = this.bookingStatus$.pipe(
      switchMap((status) => {
        return from(this.authService.getCurrentUser()).pipe(
          // get all bookings
          switchMap((user) => this.getSubCollection(user.uid, 'bookings', status))
        );
      })
    ).subscribe((bookings) => {
      this.bookingListener.next(bookings);
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
  }

  ngOnInit() {
    this.currentUser$ = from(this.authService.getCurrentUser());

    this.subs.sink = this.currentUser$.subscribe((user) => {
      user.getIdTokenResult().then((idTokenResult) => {
        this.isClient = idTokenResult.claims.client;
        this.isPro = idTokenResult.claims.pro;
        this.isAdmin = idTokenResult.claims.admin;
      });
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });

    this.lists$ = this.usersService.getAll().pipe(
      map((users) => {
        return users.filter((usersList) => {
          return usersList.roles.pro === true;
        });
      }),
      mergeMap((usersMerge) => {
        return from(usersMerge).pipe(
          mergeMap((user) => {
            return this.adminFunctionService.getById(user.id).pipe(
              map(admin => ({ user, admin })),
            );
          }),
          reduce((a, i) => [...a, i], []),
        );
      })
    );

    from(this.authService.getCurrentUser()).pipe(
      // get all transactions
      switchMap((user) => this.usersService.getSubCollection(user.uid, 'transactions').pipe(
        // transactions response
        mergeMap((transactionMap: any[]) => {
          // merge collection
          return from(transactionMap).pipe(
            mergeMap((transactionSubCollection) => {
              return this.transactionService.getOne(transactionSubCollection.id.trim()).pipe(
                // map to combine user transactions sub-collection to collection
                map(transactionCollection => ({transactionSubCollection, transactionCollection})),
                // filter by status
                filter(transactionStatus => transactionStatus.transactionCollection.status === 'completed')
              );
            }),
            reduce((a, i) => [...a, i], [])
          );
        })
      ))
    ).subscribe((transactions) => {
      this.transactionListener.next(transactions);
    });

    this.transactions$ = this.getTransactionListener();

    this.subs.sink = from(this.transactions$).subscribe((transactions) => {
      let balance = 0;
      transactions.forEach(transaction => {
        balance += transaction.transactionSubCollection.balance;
      });
      // set current balance observable value
      this.transactionService.setBalance(balance);
    });

    // initialize bookings
    this.initialized();

    // get booking listener from booking observables
    this.bookings$ = this.getBookingListener();

    this.subs.sink = this.bookings$.subscribe((bookingItems) => {
      let sum = 0;
      bookingItems.forEach(bookingItem => {
        sum += Number(bookingItem.bookingDetail.booking.bookingCollection.charges);
      });
      this.serviceCharge = sum;
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });

    this.getNotifications();

    this.getNotificationListener().subscribe((notifications) => {
      this.notificationCount = notifications.length;
    });
  }

  ngAfterViewInit() {
    this.subs.sink = this.transactionService.getBalance().subscribe((balance) => {
      this.currenctBalance = balance;
    });

    this.subs.sink = this.currentUser$.subscribe((user) => {
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
        )).subscribe((alertEl) => {
          alertEl.present();
        });
      }
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

  onPickMethods() {
    this.commissionCharge = (this.commissionPercentage / 100) * this.serviceCharge;

    this.subs.sink = from(this.actionSheetController.create(
      {
        header: 'Select Methods',
        cssClass: 'custom-action-sheets',
        buttons: [{
          text: 'Paypal',
          icon: 'logo-paypal',
          handler: () => {
            this.paymentsService.setMethod('paypal', (this.commissionCharge < environment.initialDeposit) ?
            environment.initialDeposit :
            this.commissionCharge);
            this.router.navigate(['/pages/payments']);
          }
        }, {
          text: 'Remittance',
          icon: 'cash',
          handler: () => {
            this.paymentsService.setMethod('remittance', (this.commissionCharge < environment.initialDeposit) ?
            environment.initialDeposit :
            this.commissionCharge);
            this.router.navigate(['/pages/payments']);
          }
        }, {
          text: 'Cancel',
          icon: 'close',
          role: 'cancel',
          handler: () => {}
        }]
      }
    )).subscribe(actionEl => {
      actionEl.present();
    });
  }

  navigateTo() {
    this.router.navigate(['/pages/payments']);
  }

  onViewTransactions() {
    this.router.navigate(['/pages/transactions']);
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
