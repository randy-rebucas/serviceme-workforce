import { Component, OnDestroy, OnInit } from '@angular/core';
import { AlertController, IonItemSliding, IonRouterOutlet, LoadingController, ModalController } from '@ionic/angular';

import { BehaviorSubject, from, Observable, Subject } from 'rxjs';
import { filter, map, mergeMap, reduce, switchMap } from 'rxjs/operators';

import { AuthService } from 'src/app/auth/auth.service';
import { AdminFunctionService } from 'src/app/shared/services/admin-function.service';
import { SettingsService } from '../settings/settings.service';
import { UsersService } from '../users/users.service';
import { BookingsService } from './bookings.service';

import { environment } from 'src/environments/environment';
import { SubSink } from 'subsink';
import { Bookings } from './bookings';

import { PreviewComponent } from './preview/preview.component';

@Component({
  selector: 'app-bookings',
  templateUrl: './bookings.page.html',
  styleUrls: ['./bookings.page.scss'],
})
export class BookingsPage implements OnInit, OnDestroy {
  public defaultCurrency: string;
  public bookings$: Observable<any[]>;
  public bookingStatus$: BehaviorSubject<string|null>;
  private bookingListener = new Subject<any[]>();
  public bookingStatus: string;
  private subs = new SubSink();
  constructor(
    private alertController: AlertController,
    private modalController: ModalController,
    private loadingController: LoadingController,
    private authService: AuthService,
    private bookingsService: BookingsService,
    private usersService: UsersService,
    private adminFunctionService: AdminFunctionService,
    private settingsService: SettingsService,
    private routerOutlet: IonRouterOutlet,
  ) {
    this.bookingStatus$ = new BehaviorSubject('');

    // tslint:disable-next-line: deprecation
    this.subs.sink = this.bookingStatus$.subscribe((bookingStatus) => {
      this.bookingStatus = bookingStatus;
    });

    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        return this.settingsService.getOne(user.uid);
      })
    // tslint:disable-next-line: deprecation
    ).subscribe((settings) => {
      this.defaultCurrency = (settings) ? settings.currency : environment.defaultCurrency;
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
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
    this.subs.sink = this.bookingStatus$.pipe(
      switchMap((status) => {
        return from(this.authService.getCurrentUser()).pipe(
          // get all bookings
          switchMap((user) => this.getSubCollection(user.uid, 'bookings', status))
        );
      })
    // tslint:disable-next-line: deprecation
    ).subscribe((bookings) => {
      const formatedBooking = [];
      bookings.forEach(booking => {
        formatedBooking.push({
          bookingDetails: {...booking.bookingDetail.booking.bookingCollection, ...booking.bookingDetail.booking.bookingSubCollection},
          userDetail: {...booking.usersCollection, ...booking.bookingDetail.admin.user}
        });
      });
      this.bookingListener.next(formatedBooking);
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
  }

  ngOnInit() {
    // initialize bookings
    this.initialized();

    // get booking listener from booking observables
    this.bookings$ = this.getBookingListener();
  }

  statusChanged(event: any) {
    // update status
    this.bookingStatus$.next(event.detail.value);
  }

  onDelete(booking: Bookings, ionItemSliding: IonItemSliding) {
    this.subs.sink = from(this.loadingController.create({
      message: 'Deleting...'
    // tslint:disable-next-line: deprecation
    })).subscribe(loadingEl => {
      loadingEl.present();
      this.doDelete(booking.id, ionItemSliding);
    });
  }

  doDelete(bookingId: string, ionItemSliding: IonItemSliding) {
    // tslint:disable-next-line: deprecation
    from(this.bookingsService.delete(bookingId)).subscribe(() => {
      this.loadingController.dismiss();
      ionItemSliding.closeOpened();
    }, (error: any) => {
      this.loadingController.dismiss();
      this.presentAlert(error.code, error.message);
    });
  }

  onCancel(booking: Bookings, ionItemSliding: IonItemSliding) {
    this.subs.sink = from(this.loadingController.create({
      message: 'Canceling...'
    // tslint:disable-next-line: deprecation
    })).subscribe(loadingEl => {
      loadingEl.present();
      this.doCancel(booking.id, ionItemSliding);
    });
  }

  doCancel(bookingId: string, ionItemSliding: IonItemSliding) {
    // tslint:disable-next-line: deprecation
    this.subs.sink = from(this.bookingsService.update(bookingId, { status: 'canceled' })).subscribe(() => {
      this.loadingController.dismiss();
      ionItemSliding.closeOpened();
    }, (error: any) => {
      this.loadingController.dismiss();
      this.presentAlert(error.code, error.message);
    });
  }

  onPreview(booking: any, ionItemSliding: IonItemSliding) {
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

  onChange(event: CustomEvent) {
    const searchKey = event.detail.value;
  }

  onClear() {
    this.initialized();
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
