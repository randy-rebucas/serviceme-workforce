import { TitleCasePipe } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormGroupDirective, Validators } from '@angular/forms';
import { AlertController, LoadingController, ModalController, NavParams } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Plugins, Capacitor } from '@capacitor/core';

import { BehaviorSubject, from, Observable } from 'rxjs';
import { filter, find, map, mergeMap, reduce, switchMap } from 'rxjs/operators';

import { AuthService } from 'src/app/auth/auth.service';
import { SettingsService } from '../../settings/settings.service';
import { BookingsService } from '../bookings.service';
import { UsersService } from '../../users/users.service';

import { environment } from 'src/environments/environment';
import { Offers } from '../../offers/offers';
import { SubSink } from 'subsink';

import firebase from 'firebase/app';
import { DocumentReference } from '@angular/fire/firestore';
import { NotificationsService } from '../../notifications/notifications.service';
import { AdminFunctionService } from 'src/app/shared/services/admin-function.service';
import { Notifications } from '../../notifications/notifications';
@Component({
  selector: 'app-form',
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.scss'],
})
export class FormComponent implements OnInit, OnDestroy {
  public form: FormGroup;
  public title: string;
  public state: boolean;
  public submited: boolean;
  public currentLocation: any;
  public option: string;
  private proId: string;
  private coord: any;
  public bookings$: Observable<any[]>;
  public locationOption$: BehaviorSubject<boolean>;
  public offerItems$: Observable<Offers[]>;
  public offerItems: Offers[];

  public currentDate: Date;
  public maxDate: Date;
  public totalCharges: number;
  public defaultCurrency: string;
  public currentPosition$: Observable<any>;
  private subs = new SubSink();

  constructor(
    private navParams: NavParams,
    private modalController: ModalController,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private bookingsService: BookingsService,
    private authService: AuthService,
    private userService: UsersService,
    private adminFunctionService: AdminFunctionService,
    private settingsService: SettingsService,
    private notificationsService: NotificationsService,
    private titlecasePipe: TitleCasePipe,
    private http: HttpClient,
  ) {
    this.title = this.navParams.data.title;
    this.state = this.navParams.data.state;
    this.proId = this.navParams.data.prof;
    this.currentDate = new Date();
    this.currentLocation = null;
    this.submited = false;
    this.coord = null;
    this.maxDate = new Date(new Date().setDate(new Date().getDate() + 7));

    this.totalCharges = 0;
    this.locationOption$ = new BehaviorSubject(false);

    this.option = 'form';
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

  getTotal() {
    // tslint:disable-next-line: deprecation
    this.subs.sink = this.offerItems$.subscribe((offerItems) => {
      if (offerItems.length === 0) {
        this.onDismiss(true);
      }
      let sum = 0;
      offerItems.forEach(offerItem => {
        sum += Number(offerItem.charges) * offerItem.quantity;
      });
      this.totalCharges = sum;
      this.offerItems = offerItems;
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
  }

  getCurrenctLocation() {
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
      this.coord = geoPosition.geometry.location;
      this.currentLocation = geoPosition.formatted_address;
    }, (error: any) => {
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
          return geoData.results[0];
        })
      );
  }

  ngOnInit() {
    this.getCurrenctLocation();

    this.offerItems$ = this.bookingsService.getOffers();

    this.getTotal();

    this.form = new FormGroup({
      scheduleDate: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required]
      }),
      scheduleTime: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required]
      }),
      notes: new FormControl(null)
    });

    this.initializedBookings();

    // get booking listener from booking observables
    this.bookings$ = this.bookingsService.getBookingListener();
  }

  get formCtrls() { return this.form.controls; }

  onPickAddress(event: any) {
    this.locationOption$.next(event.detail.checked);
  }

  private setSubCollection(userId: string, collection: string, customId: string, payload: any) {
    return from(this.userService.setSubCollection(userId, collection, customId, payload ));
  }

  private setClientBookingCollection(userId: string, collection: string, customId: string, payload: any) {
    // tslint:disable-next-line: deprecation
    this.subs.sink = this.setSubCollection(userId, collection, customId, payload).subscribe(() => {
      const clientId = userId;
      this.setProfessionalBookingCollection(payload.userId, collection, customId, { userId: clientId });
    });
  }

  private setProfessionalBookingCollection(userId: string, collection: string, customId: string, payload: any) {
    // tslint:disable-next-line: deprecation
    this.subs.sink = this.setSubCollection(userId, collection, customId, payload).pipe(
      switchMap(() => {
        return this.userService.getOne(userId).pipe(
          switchMap((userResponse) => {
            const notificationData  = {
              title: 'New Booking offer!',
              content: 'You have received an offer from ' + userResponse.name.firstname + ' ' + userResponse.name.lastname,
              status: 'unread',
              timestamp: firebase.firestore.Timestamp.fromDate(new Date()),
              type: 'booking'
            };
            return this.setNotificationData(userId, notificationData);
          })
        );
      })
    // tslint:disable-next-line: deprecation
    ).subscribe(() => {
      this.form.reset();
      this.onDismiss(true);
      this.bookingsService.setOffers([]);
      this.presentAlert('Booking', 'Your booking was successfully set.');
    });
  }

  private setNotificationData(clientId: string, notificationData: Notifications) {
    const randId = (Date.now().toString(36) + Math.random().toString(36).substr(2, 5)).toUpperCase();
    return this.userService.setSubCollection(clientId, 'notifications', randId, notificationData );
  }

  /**
   *
   * @Todo
   * Create bookings collections
   * Set to my booking collections
   */
  onSubmit(event: string, form: FormGroupDirective) {
    this.submited = true;
    this.subs.sink = from(this.authService.getCurrentUser())
    // tslint:disable-next-line: deprecation
    .subscribe((user) => {
      const bookingData  = {
        offers: this.offerItems,
        location: this.currentLocation,
        coordinates: this.coord,
        charges: Number(this.totalCharges),
        scheduleDate: firebase.firestore.Timestamp.fromDate(new Date(this.form.value.scheduleDate)),
        scheduleTime: firebase.firestore.Timestamp.fromDate(new Date(this.form.value.scheduleTime)),
        notes: this.form.value.notes,
        status: 'pending',
      };

      // tslint:disable-next-line: deprecation
      this.subs.sink = from(this.bookingsService.insert(bookingData)).subscribe((booking) => {
        this.setClientBookingCollection(user.uid, 'bookings', booking.id, { userId: this.proId });
      }, (error: any) => {
        this.loadingController.dismiss();
        this.presentAlert(error.code, error.message);
      });
    });
  }

  checkAvailability(event: any) {
    // 2021-03-28T10:00:58.073+08:00
    console.log(event.detail.value);
  }

  optionChanged(event: any) {
    this.option = event.detail.value;
  }

  increaseQuantity(selectedOffer: Offers) {
    from(this.offerItems$).pipe(
      map(offers => offers.find(offer => offer.id === selectedOffer.id))
    // tslint:disable-next-line: deprecation
    ).subscribe((existItem) => {
      existItem.quantity += 1;
      this.getTotal();
    });
  }

  decreaseQuantity(selectedOffer: Offers) {
    from(this.offerItems$).pipe(
      map(offers => offers.find(offer => offer.id === selectedOffer.id))
    // tslint:disable-next-line: deprecation
    ).subscribe((existItem) => {
      existItem.quantity -= 1;
      if (existItem.quantity < 1) {
        const updatedItems = this.offerItems.filter(item => item.id !== selectedOffer.id);
        this.bookingsService.setOffers(updatedItems);
      }
      this.getTotal();
    });
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

  onDismiss(state: boolean) {
    this.modalController.dismiss({
      dismissed: state
    });
  }

  // get user data to retrive names
  getUser(bookingDetail: any, subCollectionForiegnKeyId: string) {
    return this.userService.getOne(subCollectionForiegnKeyId).pipe(
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
    return this.userService.getSubCollection(documentRef, collectionRef).pipe(
      // bookings response
      mergeMap((bookingMap: any[]) => {
        return this.getCollection(bookingMap, status);
      })
    );
  }

  // initialize
  initializedBookings() {
    // tslint:disable-next-line: deprecation
    this.getSubCollection(this.proId, 'bookings', 'accepted').subscribe((bookings) => {
      this.bookingsService.setBookingListener(bookings);
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
