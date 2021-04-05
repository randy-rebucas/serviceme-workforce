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
@Component({
  selector: 'app-form',
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.scss'],
})
export class FormComponent implements OnInit, OnDestroy {
  public form: FormGroup;
  public title: string;
  public state: boolean;
  public currentLocation: any;
  public option: string;
  private proId: string;
  private coord: object;
  public bookings$: Observable<any[]>;
  public locationOption$: BehaviorSubject<boolean>;
  public offerItems$: Observable<Offers[]>;
  public offerItems: Offers[];

  public currentDate: Date;
  public maxDate: Date;
  public totalCharges: number;
  public defaultCurrency: string;
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
    this.coord = null;
    this.maxDate = new Date(new Date().setDate(new Date().getDate() + 7));

    this.totalCharges = 0;
    this.locationOption$ = new BehaviorSubject(false);

    this.option = 'form';
    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        return this.settingsService.getOne(user.uid);
      })
    ).subscribe((settings) => {
      this.defaultCurrency = (settings) ? settings.currency : environment.defaultCurrency;
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
  }

  getTotal() {
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

  ngOnInit() {

    // tslint:disable-next-line: deprecation
    from(Plugins.Geolocation.requestPermissions()).subscribe(() => {
      this.locateUser();
    });

    this.offerItems$ = this.bookingsService.getOffers();

    this.getTotal();

    this.subs.sink = this.locationOption$.subscribe((locationOption) => {
      if (locationOption) {
        this.useMyLocation();
      } else {
        this.locateUser();
      }
    });

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

  private useMyLocation() {
    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      switchMap((auhtUser) => {
        return this.userService.getOne(auhtUser.uid);
      })
    ).subscribe((user) => {
      let addressLine1 = '';
      let addressLine2 = '';
      let addressLine3 = '';
      const address1 = (user.address) ? this.titlecasePipe.transform(user.address.address1) : null;
      const address2 = (user.address) ? this.titlecasePipe.transform(user.address.address2) : null;
      const city = (user.address) ? this.titlecasePipe.transform(user.address.city) : null;
      const country = (user.address) ? this.titlecasePipe.transform(user.address.country) : null;
      const postalCode = (user.address) ? this.titlecasePipe.transform(user.address.postalCode) : null;
      const state = (user.address) ? this.titlecasePipe.transform(user.address.state) : null;
      // check address 1 Unit/Floor + House/Building Name
      if (address1) {
        addressLine1 = address1;
      }
      // check address 2 Street Number/Name
      if (address2) {
        addressLine1 = addressLine1.concat(', ', address2);
      }
      // check State/Brangay/District
      if (state) {
        addressLine2 = state;
      }
      // check City
      if (city) {
        addressLine2 = addressLine2.concat(', ', city);
      }
      // check PostalCode
      if (postalCode) {
        addressLine3 = postalCode;
      }
      // check Country
      if (country) {
        addressLine3 = addressLine3.concat(', ', country);
      }
      this.currentLocation = addressLine1.concat(', ', addressLine2.concat(', ', addressLine3));
    }, (error: any) => {
      this.loadingController.dismiss();
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
      this.coord = {
        lat: coordinates.latitude,
        lng: coordinates.longitude
      };
      this.currentLocation = address.formatted_address;
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

  private setSubCollection(userId: string, collection: string, customId: string, payload: any) {
    return from(this.userService.setSubCollection(userId, collection, customId, payload ));
  }

  private setClientBookingCollection(userId: string, collection: string, customId: string, payload: any) {
    this.subs.sink = this.setSubCollection(userId, collection, customId, payload).subscribe(() => {
      const clientId = userId;
      this.setProfessionalBookingCollection(payload.userId, collection, customId, { userId: clientId });
    });
  }

  private setProfessionalBookingCollection(userId: string, collection: string, customId: string, payload: any) {
    this.subs.sink = this.setSubCollection(userId, collection, customId, payload).subscribe(() => {
      this.setNotificationData(userId, payload);
    });
  }

  private setNotiticationCollection(userId: string, collection: string, customId: string, payload: any) {
    this.subs.sink = this.setSubCollection(userId, collection, customId, payload).subscribe(() => {
      this.form.reset();
      this.onDismiss(true);
      this.bookingsService.setOffers([]);
      this.presentAlert('Booking', 'Your booking was successfully set.');
    });
  }

  private setNotificationData(proId: string, payload: any) {
    this.userService.getOne(payload.userId).subscribe((userResponse) => {
      const notificationData  = {
        title: 'New Booking offer!',
        content: 'You have received an offer from ' + userResponse.name.firstname + ' ' + userResponse.name.lastname,
        status: 'unread',
        timestamp: firebase.firestore.Timestamp.fromDate(new Date()),
        type: 'booking'
      };

      this.subs.sink = from(this.notificationsService.insert(notificationData)).subscribe((notification) => {
        // set sub collection notification
        this.setNotiticationCollection(proId, 'notifications', notification.id, {});
      }, (error: any) => {
        this.loadingController.dismiss();
        this.presentAlert(error.code, error.message);
      });
    });
  }
  /**
   *
   * @Todo
   * Create bookings collections
   * Set to my booking collections
   */
  onSubmit(event: string, form: FormGroupDirective) {
    this.subs.sink = from(this.authService.getCurrentUser())
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
    ).subscribe((existItem) => {
      existItem.quantity += 1;
      this.getTotal();
    });
  }

  decreaseQuantity(selectedOffer: Offers) {
    from(this.offerItems$).pipe(
      map(offers => offers.find(offer => offer.id === selectedOffer.id))
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
