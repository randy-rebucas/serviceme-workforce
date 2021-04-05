import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AlertController, ModalController, NavParams } from '@ionic/angular';
import { from, Observable, of } from 'rxjs';
import { filter, map, mergeMap, reduce, switchMap } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { SubSink } from 'subsink';
import { SettingsService } from '../../settings/settings.service';

import firebase from 'firebase/app';
import { FeedbacksService } from '../feedbacks.service';
import { Feedbacks } from '../feedbacks';
import { UsersService } from '../../users/users.service';
import { environment } from 'src/environments/environment';
@Component({
  selector: 'app-preview',
  templateUrl: './preview.component.html',
  styleUrls: ['./preview.component.scss'],
})
export class PreviewComponent implements OnInit, OnDestroy {
  public form: FormGroup;
  public title: string;
  public booking$: Observable<any>;
  public feedbacks$: Observable<any[]>;
  public defaultCurrency: string;

  private userId: string;
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
    private feedbacksService: FeedbacksService,
    private usersService: UsersService
  ) {
    this.title = this.navParams.data.title;

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

  ngOnInit() {

    this.booking$ = of(this.navParams.data.bookingData).pipe(
      mergeMap((bookingData) => {
        return this.usersService.getOne(bookingData.userId).pipe(
          map(userDetail => ({ bookingData, userDetail })),
        );
      })
    );

    this.form = new FormGroup({
      feedback: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required]
      })
    });

    this.feedbacks$ = of(this.navParams.data.bookingData).pipe(
      switchMap((booking) => {
        return this.feedbacksService.getAll(booking.bookingData.id).pipe(
          map((filterBooking) => {
            return filterBooking.filter((bookings) => {
              return bookings.id === booking.bookingData.userId;
            });
          }),
          mergeMap((feedbackMap: any[]) => {
            return from(feedbackMap).pipe(
              // merge join collections bookings
              mergeMap((feedback) => {
                return this.usersService.getOne(feedback.id).pipe(
                  map(profissional => ({ feedback, profissional })),
                );
              }),
              reduce((a, i) => [...a, i], [])
            );
          })
        );
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
    // tslint:disable-next-line: deprecation
    this.subs.sink = from(this.authService.getCurrentUser()).subscribe((user) => {
      const feedbackData  = {
        feedback: this.form.value.feedback,
        timestamp: firebase.firestore.Timestamp.fromDate(new Date())
      };

      // tslint:disable-next-line: deprecation
      this.subs.sink = from(this.feedbacksService.insert(bookingId, user.uid, feedbackData)).subscribe(() => {
        this.form.reset();
        this.feedbacks$ = this.feedbacksService.getAll(bookingId);
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
    // tslint:disable-next-line: deprecation
    })).subscribe(alertEl => {
        alertEl.present();
    });
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
