import { TitleCasePipe } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormGroupDirective, Validators } from '@angular/forms';
import { AlertController, LoadingController, ModalController, NavParams } from '@ionic/angular';
import { HttpClient } from '@angular/common/http';
import { Plugins, Capacitor } from '@capacitor/core';

import { BehaviorSubject, from, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { AuthService } from 'src/app/auth/auth.service';
import { SettingsService } from '../../settings/settings.service';
import { BookingsService } from '../bookings.service';
import { UsersService } from '../../users/users.service';

import { environment } from 'src/environments/environment';
import { Offers } from '../../offers/offers';
import { SubSink } from 'subsink';

import firebase from 'firebase/app';
import { DocumentReference } from '@angular/fire/firestore';
@Component({
  selector: 'app-form',
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.scss'],
})
export class FormComponent implements OnInit, OnDestroy {
  public form: FormGroup;
  public title: string;
  public state: boolean;
  private proId: string;
  private currentLocation: any;
  private coord: object;
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
    private settingsService: SettingsService,
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

  ngOnInit() {

    this.offerItems$ = this.bookingsService.getOffers();
    this.subs.sink = this.offerItems$.subscribe((offerItems) => {
      if (offerItems.length === 0) {
        this.onDismiss(true);
      }
      let sum = 0;
      offerItems.forEach(offerItem => {
        sum += Number(offerItem.charges);
      });
      this.totalCharges = sum;
      this.offerItems = offerItems;
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });

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
  }

  get formCtrls() { return this.form.controls; }

  onPickAddress(event: CustomEvent) {
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

  private setBookingCollection(userDocId: string, bookingDocId: string) {
    const bookingData = {
      userId: userDocId
    };
    return from(this.userService.setSubCollection(userDocId, 'bookings', bookingDocId, bookingData));
  }

  private setClientBookingCollection(userId: string, booking: DocumentReference<firebase.firestore.DocumentData>) {
    return this.setBookingCollection(userId, booking.id);
  }

  private setProfessionalBookingCollection(userId: string, booking: DocumentReference<firebase.firestore.DocumentData>) {
    return this.setBookingCollection(userId, booking.id);
  }
  /**
   *
   * @Todo
   * Create bookings collections
   * Set to my booking collections
   */
  onSubmit(event: string, form: FormGroupDirective) {
    this.subs.sink = from(this.authService.getCurrentUser()).subscribe((user) => {
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
        // set a copy of booking to client sub collections
        this.subs.sink = from(this.userService.setSubCollection(user.uid, 'bookings', booking.id, { userId: this.proId }))
        .subscribe(() => {
          // set a copy of booking for pro sub collection
          this.subs.sink = from(this.userService.setSubCollection(this.proId, 'bookings', booking.id, { userId: user.uid }))
          .subscribe(() => {
            this.form.reset();
            this.onDismiss(true);
            this.bookingsService.setOffers([]);
          });
        });
      }, (error: any) => {
        this.loadingController.dismiss();
        this.presentAlert(error.code, error.message);
      });
    });
  }

  onRemove(selectedItem: Offers) {
    const updatedItems = this.offerItems.filter(item => item.id !== selectedItem.id);
    this.bookingsService.setOffers(updatedItems);
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

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
