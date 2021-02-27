import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AlertController, LoadingController, ModalController, NavParams } from '@ionic/angular';

import { AuthService } from 'src/app/auth/auth.service';
import { OffersService } from '../offers.service';

import { BehaviorSubject, from, Observable, of } from 'rxjs';
import { SubSink } from 'subsink';
import { CategoriesService } from 'src/app/shared/services/categories.service';
import { Category } from 'src/app/shared/classes/category';
import { Offers } from '../offers';
import { CurrencyPipe } from '@angular/common';
import { switchMap } from 'rxjs/operators';
import firebase from 'firebase/app';

@Component({
  selector: 'app-form',
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.scss'],
})
export class FormComponent implements OnInit, OnDestroy {
  public form: FormGroup;
  public durations: number;
  public title: string;
  public state: boolean;
  public offerOption: string;
  public categories$: Observable<any[]>;
  public offer: Offers;
  private durations$: BehaviorSubject<number|null>;
  private subs = new SubSink();

  constructor(
    private navParams: NavParams,
    private authService: AuthService,
    private offersService: OffersService,
    private categoriesService: CategoriesService,
    private loadingController: LoadingController,
    private modalController: ModalController,
    private alertController: AlertController,
    private currencyPipe: CurrencyPipe
  ) {
    this.durations$ = new BehaviorSubject(25);
    this.title = this.navParams.data.title;
    this.state = this.navParams.data.state;
    this.offer = this.navParams.data.offerData;
    this.offerOption = this.navParams.data.option;
  }

  ngOnInit() {
    this.subs.sink = this.durations$.subscribe((durations) => {
      this.durations = durations;
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });

    this.form = new FormGroup({
      title: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required, Validators.maxLength(250)]
      }),
      description: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required, Validators.maxLength(1000)]
      }),
      category: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required]
      }),
      charges: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required, Validators.maxLength(8)]
      })
    });

    this.categories$ = this.categoriesService.getAll();

    if (!this.state) {

      const charge = this.offer.charges;
      this.form.patchValue({
        title: this.offer.title,
        description: this.offer.description,
        category: this.offer.category,
        charges: ( charge === 0 ) ? '' : charge.toLocaleString( 'en-US' )
      });
      this.durations$.next(this.offer.durations);
    }
  }

  onInput(value: any) {
    let input = value.replace(/[\D\s\._\-]+/g, '');
    input = input ? parseInt( input, 10 ) : 0;
    this.formCtrls.charges.setValue(( input === 0 ) ? '' : input.toLocaleString( 'en-US' ));
  }

  onDurationSelected(event: CustomEvent) {
    this.durations$.next(event.detail.value);
  }

  get formCtrls() { return this.form.controls; }

  onDismiss(state: boolean) {
    this.modalController.dismiss({
      dismissed: state
    });
  }

  doCreate() {
    this.subs.sink = from(this.authService.getCurrentUser()).subscribe((user) => {
      const charges = this.form.value.charges;
      const offerData  = {
        title: this.form.value.title,
        description: this.form.value.description,
        category: this.form.value.category,
        durations: this.durations,
        charges: Number(charges.replace(/[^0-9.-]+/g, '')),
        timestamp: firebase.firestore.Timestamp.fromDate(new Date()),
        type: this.offerOption
      };

      if (this.state) {
        this.subs.sink = from(this.offersService.insert(user.uid, offerData, this.offerOption)).subscribe(() => {
          this.form.reset();
          this.loadingController.dismiss();
          this.onDismiss(true);
        }, (error: any) => {
          this.loadingController.dismiss();
          this.presentAlert(error.code, error.message);
        });
      } else {
        this.subs.sink = from(this.offersService.update(user.uid, this.offer.id, offerData, this.offerOption)).subscribe(() => {
          this.form.reset();
          this.loadingController.dismiss();
          this.onDismiss(true);
        }, (error: any) => {
          this.loadingController.dismiss();
          this.presentAlert(error.code, error.message);
        });
      }
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
  }

  onCreate() {
    this.subs.sink = from(this.loadingController.create({
      message: 'Please wait...'
    })).subscribe(loadingEl => {
      loadingEl.present();
      this.doCreate();
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
