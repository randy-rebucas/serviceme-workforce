import { DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormGroupDirective, Validators } from '@angular/forms';
import { AlertController, LoadingController, ModalController, NavParams } from '@ionic/angular';
import { from, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { SubSink } from 'subsink';
import { Offers } from '../../offers/offers';
import { SettingsService } from '../../settings/settings.service';
import { BookingsService } from '../bookings.service';
import firebase from 'firebase/app';
@Component({
  selector: 'app-form',
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.scss'],
})
export class FormComponent implements OnInit {
  public form: FormGroup;
  public title: string;
  public state: boolean;
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
    private settingsService: SettingsService,
    private datePipe: DatePipe
  ) {
    this.title = this.navParams.data.title;
    this.state = this.navParams.data.state;
    this.currentDate = new Date();
    this.maxDate = new Date(new Date().setDate(new Date().getDate() + 7));

    this.totalCharges = 0;

    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        return this.settingsService.getOne(user.uid);
      })
    ).subscribe((settings) => {
      this.defaultCurrency = (settings) ? settings.currency : 'USD';
    });
  }

  ngOnInit() {
    this.offerItems$ = this.bookingsService.getOffers();
    this.offerItems$.subscribe((offerItems) => {
      if (offerItems.length === 0) {
        this.onDismiss(true);
      }
      let sum = 0;
      offerItems.forEach(offerItem => {
        sum += Number(offerItem.charges);
      });
      this.totalCharges = sum;
      this.offerItems = offerItems;
    });

    this.form = new FormGroup({
      scheduleDate: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required]
      }),
      scheduleTime: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required]
      })
    });
  }

  get formCtrls() { return this.form.controls; }

  onSubmit(event: string, form: FormGroupDirective) {
    from(this.authService.getCurrentUser()).subscribe((user) => {
      const bookingData  = {
        charges: Number(this.totalCharges),
        scheduleDate: firebase.firestore.Timestamp.fromDate(new Date(this.form.value.scheduleDate)),
        scheduleTime: firebase.firestore.Timestamp.fromDate(new Date(this.form.value.scheduleTime)),
        status: 'pending',
        offers: this.offerItems
      };

      this.subs.sink = from(this.bookingsService.insert(user.uid, bookingData)).subscribe(() => {
        this.form.reset();
        this.loadingController.dismiss();
        this.onDismiss(true);
      }, (error: any) => {
        this.loadingController.dismiss();
        this.presentAlert(error.code, error.message);
      });
    });

    // console.log(this.datePipe.transform(this.form.value.scheduleDate, 'shortDate'));
    // console.log(this.datePipe.transform(this.form.value.scheduleTime, 'shortTime'));
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
}
