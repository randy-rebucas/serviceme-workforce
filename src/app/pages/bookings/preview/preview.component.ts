import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AlertController, ModalController, NavParams } from '@ionic/angular';
import { from, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { SubSink } from 'subsink';
import { SettingsService } from '../../settings/settings.service';

import firebase from 'firebase/app';
import { FeedbacksService } from '../feedbacks.service';
import { Feedbacks } from '../feedbacks';
@Component({
  selector: 'app-preview',
  templateUrl: './preview.component.html',
  styleUrls: ['./preview.component.scss'],
})
export class PreviewComponent implements OnInit, OnDestroy {
  public form: FormGroup;
  public title: string;
  public booking$: Observable<any>;
  public feedbacks$: Observable<Feedbacks[]>;
  public defaultCurrency: string;
  private subs = new SubSink();

  /**
   *
   * @todo
   * implement feedbacks once status changes from pending
   * view all feedbacks
   */
  constructor(
    private navParams: NavParams,
    private alertController: AlertController,
    private modalController: ModalController,
    private authService: AuthService,
    private settingsService: SettingsService,
    private feedbacksService: FeedbacksService
  ) {
    this.title = this.navParams.data.title;
    this.booking$ = of(this.navParams.data.bookingData);

    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        return this.settingsService.getOne(user.uid);
      })
    ).subscribe((settings) => {
      this.defaultCurrency = (settings) ? settings.currency : 'USD';
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
  }

  ngOnInit() {
    this.form = new FormGroup({
      feedback: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required]
      })
    });

    this.feedbacks$ = this.booking$.pipe(
      switchMap((booking) => {
        return this.feedbacksService.getAll(booking.bookingInfo.id).pipe();
      })
    );
  }

  onDismiss(state: boolean) {
    this.modalController.dismiss({
      dismissed: state
    });
  }

  get formCtrls() { return this.form.controls; }

  onCreate(bookingId: string) {
    this.subs.sink = from(this.authService.getCurrentUser()).subscribe((user) => {
      const feedbackData  = {
        userId: user.uid,
        feedback: this.form.value.feedback,
        timestamp: firebase.firestore.Timestamp.fromDate(new Date())
      };

      this.subs.sink = from(this.feedbacksService.insert(bookingId, feedbackData)).subscribe(() => {
        this.form.reset();
      }, (error: any) => {
        this.presentAlert(error.code, error.message);
      });
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
