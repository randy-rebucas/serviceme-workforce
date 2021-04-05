import { Component, Inject, LOCALE_ID, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, IonItemSliding, IonRouterOutlet, ModalController } from '@ionic/angular';
import { BehaviorSubject, from, Observable, of, Subject } from 'rxjs';
import { filter, map, mergeMap, reduce, switchMap } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { AdminFunctionService } from 'src/app/shared/services/admin-function.service';
import { SubSink } from 'subsink';
import { Bookings } from '../../bookings/bookings';
import { BookingsService } from '../../bookings/bookings.service';
import { PreviewComponent } from '../../bookings/preview/preview.component';
import { Transactions } from '../../transactions/transactions';
import { TransactionsService } from '../../transactions/transactions.service';
import { UsersService } from '../../users/users.service';
import { SettingsService } from '../../settings/settings.service';
import { PaymentsService } from '../../payments/payments.service';
import { CurrencyPipe, formatCurrency, getCurrencySymbol } from '@angular/common';
import { environment } from 'src/environments/environment';
import firebase from 'firebase/app';
import { NotificationsService } from '../../notifications/notifications.service';

@Component({
  selector: 'app-pro',
  templateUrl: './pro.component.html',
  styleUrls: ['./pro.component.scss'],
})
export class ProComponent implements OnInit, OnDestroy {
  public bookings$: Observable<any[]>;
  public bookingStatus: string;
  public serviceCharge: number;
  public currentBalance: number;
  public commissionCharge: number;
  private defaultCurrency: string;
  private commissionPercentage: number;
  private balance: number;
  private subs = new SubSink();

  constructor(
    private modalController: ModalController,
    private alertController: AlertController,
    private authService: AuthService,
    private usersService: UsersService,
    private adminFunctionService: AdminFunctionService,
    private bookingsService: BookingsService,
    private routerOutlet: IonRouterOutlet,
    private router: Router,
    private currencyPipe: CurrencyPipe,
    private userService: UsersService,
    private settingsService: SettingsService,
    private paymentsService: PaymentsService,
    private transactionsService: TransactionsService,
    private notificationsService: NotificationsService,
    @Inject(LOCALE_ID) private locale: string
  ) {
    this.commissionPercentage = environment.commissionPercentage;

    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        return this.settingsService.getOne(user.uid);
      })
    // tslint:disable-next-line: deprecation
    ).subscribe((settings) => {
      this.defaultCurrency = (settings) ? settings.currency : environment.defaultCurrency;
    });

    // tslint:disable-next-line: deprecation
    this.subs.sink = this.bookingsService.getBookingStatus().subscribe((bookingStatus) => {
      this.bookingStatus = bookingStatus;
    });

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

  getUnfilteredSubCollectionDocument(bookingSubCollection: any) {
    return this.bookingsService.getOne(bookingSubCollection.id).pipe(
      // map to combine user booking sub-collection to collection
      map(bookingCollection => ({ bookingSubCollection, bookingCollection })),
      // merge the user auth data to get firebase.User object
      mergeMap((booking) => {
        return this.getAuthUser(booking);
      })
    );
  }

  // get Main Collection {bookings}
  getCollection(booking: any[], status: string) {
    return from(booking).pipe(
      mergeMap((bookingSubCollection) => {
        return (status !== '') ?
        this.getSubCollectionDocument(bookingSubCollection, status) :
        this.getUnfilteredSubCollectionDocument(bookingSubCollection);
      }),
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
    this.subs.sink = this.bookingsService.getBookingStatus().pipe(
      switchMap((status) => {
        return from(this.authService.getCurrentUser()).pipe(
          // get all bookings
          switchMap((user) => this.getSubCollection(user.uid, 'bookings', status))
        );
      })
    // tslint:disable-next-line: deprecation
    ).subscribe((bookings) => {
      console.log(bookings);
      const formatedBooking = [];
      bookings.forEach(booking => {
        formatedBooking.push({
          bookingDetails: {...booking.bookingDetail.booking.bookingCollection, ...booking.bookingDetail.booking.bookingSubCollection},
          userDetail: {...booking.usersCollection, ...booking.bookingDetail.admin.user}
        });
      });
      this.bookingsService.setBookingListener(formatedBooking);
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
  }

  ngOnInit() {
    this.setTransactionData();

    // initialize bookings
    this.initialized();

    // get booking listener from booking observables
    this.bookings$ = this.bookingsService.getBookingListener();

    // tslint:disable-next-line: deprecation
    this.subs.sink = this.bookings$.subscribe((bookingItems) => {
      let sum = 0;
      bookingItems.forEach(bookingItem => {
        sum += Number(bookingItem.bookingDetails.charges);
      });
      // this.serviceCharge = sum;

      this.onCheckBalance(sum);
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
  }

  onCheckBalance(serviceCharge: number) {
    this.currentBalance = Number(this.balance);
    this.commissionCharge = (this.commissionPercentage / 100) * serviceCharge;

    if (this.currentBalance < this.commissionCharge) {
      this.subs.sink = from(this.alertController.create(
        {
          header: 'Insufficient balance!',
          message: 'Please deposit atleast ' + formatCurrency(this.commissionCharge, this.locale, getCurrencySymbol(this.defaultCurrency, 'narrow')) +
          ' as ' +
          this.commissionPercentage +
          '% of ' + formatCurrency(serviceCharge, this.locale, getCurrencySymbol(this.defaultCurrency, 'narrow')) +
          ' as total charges before you can accept services offered.',
          buttons: [
            {
              text: 'Cancel',
              role: 'cancel',
              cssClass: 'secondary',
              handler: () => {}
            }, {
              text: 'Ok',
              handler: () => {
                this.paymentsService.setMethod('paypal', this.commissionCharge);
                this.router.navigate(['/pages/payments']);
              }
            }
          ]
        }
      // tslint:disable-next-line: deprecation
      )).subscribe((alertEl) => {
        alertEl.present();
      });
    }
  }

  statusChanged(event: any) {
    // update status
    this.bookingsService.setBookingStatus(event.detail.value);
  }

  private setSubCollection(userId: string, collection: string, customId: string, payload: any) {
    return from(this.userService.setSubCollection(userId, collection, customId, payload ));
  }

  private setNotiticationCollection(userId: string, collection: string, customId: string, payload: any) {
    // tslint:disable-next-line: deprecation
    this.subs.sink = this.setSubCollection(userId, collection, customId, payload).subscribe(() => {
      this.bookingsService.setOffers([]);
      this.presentAlert('Booking', 'Sevice offer was successfully accepted.');
    });
  }

  private setNotificationData(clientId: string) {
    from(this.authService.getCurrentUser()).pipe(
      mergeMap((auhtUser) => {
        return this.userService.getOne(auhtUser.uid);
      }),
    // tslint:disable-next-line: deprecation
    ).subscribe((userResponse) => {
      const notificationData  = {
        title: 'Booked Accepted!',
        content: 'Booking accepted by ' + userResponse.name.firstname + ' ' + userResponse.name.lastname,
        status: 'unread',
        timestamp: firebase.firestore.Timestamp.fromDate(new Date()),
        type: 'booking'
      };

      // tslint:disable-next-line: deprecation
      this.subs.sink = from(this.notificationsService.insert(notificationData)).subscribe((notification) => {
        // set sub collection notification
        this.setNotiticationCollection(clientId, 'notifications', notification.id, {});
      }, (error: any) => {
        this.presentAlert(error.code, error.message);
      });
    });
  }

  onAccept(booking: any, ionItemSliding: IonItemSliding) {
    const bookingId = booking.bookingDetails.id;
    // tslint:disable-next-line: deprecation
    this.subs.sink = from(this.bookingsService.update(bookingId, { status: 'accepted' })).subscribe(() => {
      this.initialized();
      this.setNotificationData(booking.clientDetail.uid);
      ionItemSliding.closeOpened();
      this.bookingsService.setBookingStatus('');
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
  }

  onDecline(booking: any, ionItemSliding: IonItemSliding) {
    const bookingId = booking.bookingDetails.id;
    // tslint:disable-next-line: deprecation
    this.subs.sink = from(this.bookingsService.update(bookingId, { status: 'declined' })).subscribe(() => {
      this.initialized();
      ionItemSliding.closeOpened();
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
  }

  setTransactionData() {
    // tslint:disable-next-line: deprecation
    this.transactionsService.getBalance().subscribe((balance) => {
      this.balance = balance;
    });
  }

  private setTransactionSubCollection(collectionDocId: string, data: any, ionItemSliding: IonItemSliding) {
    // tslint:disable-next-line: deprecation
    from(this.authService.getCurrentUser()).subscribe((user) => {
      const transactionData = {
        balance: -data.chargesAmount
      };
      // tslint:disable-next-line: deprecation
      this.subs.sink = from(this.userService.setSubCollection(user.uid, 'transactions', collectionDocId, transactionData)).subscribe(() => {
        this.initialized();
        ionItemSliding.closeOpened();
      }, (error: any) => {
        this.presentAlert(error.code, error.message);
      });
    });
  }

  private setTransactionCollection(booking: any, ionItemSliding: IonItemSliding) {
    const bookingId = booking.bookingDetails.id;
    const serviceCharge = Number(booking.bookingDetails.charges);
    const commissionCharge = (this.commissionPercentage / 100) * serviceCharge;

    const transactionData = {
      amount: -Number(commissionCharge),
      currency: this.defaultCurrency,
      description: 'Job done. Booking Id :' + bookingId,
      timestamp: firebase.firestore.Timestamp.fromDate(new Date()),
      ref: bookingId,
      status: 'completed',
      type: 'payment'
    };
    // tslint:disable-next-line: deprecation
    this.subs.sink = from(this.transactionsService.insert(transactionData)).subscribe((transaction) => {
      this.setTransactionSubCollection(transaction.id, { chargesAmount: commissionCharge}, ionItemSliding);
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
  }

  onComplete(booking: any, ionItemSliding: IonItemSliding) {
    const bookingId = booking.bookingDetails.id;
    // tslint:disable-next-line: deprecation
    this.subs.sink = from(this.bookingsService.update(bookingId, { status: 'completed' })).subscribe(() => {
      this.setTransactionCollection(booking, ionItemSliding);
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
  }

  onPreview(booking: any, ionItemSliding: IonItemSliding) {
    console.log(booking);
    // bookingDetails: {offers: Array(1), coordinates: {…}, status: "completed", notes: "try", charges: 420, …}
    // clientDetail: {gender: "female", roles: {…}, address: {…}, name: {…}, uid: "QzPARCd9ZrMCY8FnGXu7yYnSnIN2", …}
    this.subs.sink = from(this.modalController.create({
      component: PreviewComponent,
      componentProps: {
        title: 'Preview',
        bookingData: booking
      },
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl
    // tslint:disable-next-line: deprecation
    })).subscribe((modalEl) => {
      modalEl.present();
      ionItemSliding.closeOpened();
    });
  }

  onLocate(booking: any, ionItemSliding: IonItemSliding) {
    this.bookingsService.setBooking(booking);
    ionItemSliding.closeOpened();
    this.router.navigate(['pages/locator']);
  }

  presentAlert(alertHeader: string, alertMessage: string) {
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
