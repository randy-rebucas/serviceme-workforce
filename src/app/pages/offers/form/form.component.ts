import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AlertController, LoadingController, ModalController, NavParams } from '@ionic/angular';

import { AuthService } from 'src/app/auth/auth.service';
import { OffersService } from '../offers.service';

import { BehaviorSubject, from, Observable, of } from 'rxjs';
import { SubSink } from 'subsink';
import firebase from 'firebase/app';
import { CategoriesService } from 'src/app/shared/services/categories.service';
import { Category } from 'src/app/shared/classes/category';
import { Offers } from '../offers';
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
    private alertController: AlertController
  ) {
    this.durations$ = new BehaviorSubject(25);
    this.title = this.navParams.data.title;
    this.state = this.navParams.data.state;
    this.offer = this.navParams.data.offerData;
  }

  ngOnInit() {
    this.durations$.subscribe((durations) => {
      this.durations = durations;
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
        validators: [Validators.required, Validators.min(2), Validators.maxLength(6)]
      })
    });

    this.categories$ = this.categoriesService.getAll();

    if (!this.state) {
      this.form.patchValue({
        title: this.offer.title,
        description: this.offer.description,
        category: this.offer.category,
        charges: this.offer.charges
      });

      this.durations$.next(this.offer.durations);
    }
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

  doCreate(userId: string) {
    const offerData  = {
      title: this.form.value.title,
      description: this.form.value.description,
      category: this.form.value.category,
      durations: this.durations,
      charges: Number(this.form.value.charges),
      timestamp: firebase.firestore.Timestamp.fromDate(new Date())
    };
    if (this.state) {
      this.subs.sink = from(this.offersService.insert(userId, offerData)).subscribe(() => {
        this.form.reset();
        this.loadingController.dismiss();
        this.onDismiss(true);
      }, (error: any) => {
        this.loadingController.dismiss();
        this.presentAlert(error.code, error.message);
      });
    } else {
      this.subs.sink = from(this.offersService.update(userId, this.offer.id, offerData)).subscribe(() => {
        this.form.reset();
        this.loadingController.dismiss();
        this.onDismiss(true);
      }, (error: any) => {
        this.loadingController.dismiss();
        this.presentAlert(error.code, error.message);
      });
    }
  }

  getCurrentUser() {
    this.subs.sink = from(this.authService.getCurrentUser()).subscribe((user) => {
      this.doCreate(user.uid);
    });
  }

  onCreate() {
    this.subs.sink = from(this.loadingController.create({
      message: 'Please wait...'
    })).subscribe(loadingEl => {
      loadingEl.present();
      this.getCurrentUser();
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
