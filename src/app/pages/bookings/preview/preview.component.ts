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

      // initialized() {
    // from(this.authService.getCurrentUser()).pipe(
    //   // get all bookings
    //   switchMap((user) => this.usersService.getSubCollection(user.uid, 'bookings').pipe(
    //     // bookings response
    //     mergeMap((bookingMap: any[]) => {
    //       return from(bookingMap).pipe(
    //         // merge join collections bookings
    //         mergeMap((bookingInfo) => {
    //           console.log(bookingInfo);

    //           return this.bookingsService.getOne(bookingInfo.id).pipe(
    //             // merge profissional user collections
    //             mergeMap((booking) => {
    //               return this.usersService.getOne(bookingInfo.userId).pipe(
    //                 map(profissional => ({ booking, profissional })),
    //               );
    //             }),
    //             reduce((a, i) => [...a, i], [])
    //           );
    //         }),
    //       );
    //     })
    //   ))
    // ).subscribe((bookings) => {
    //   console.log(bookings);
    //   this.bookingListener.next(bookings);
    // });
  // }

    this.feedbacks$ = this.booking$.pipe(
      switchMap((booking) => {
        return this.feedbacksService.getAll(booking.bookingDetail.booking.bookingSubCollection.id).pipe(
          map((filterBooking) => {
            return filterBooking.filter((bookings) => {
              return bookings.id === booking.bookingDetail.booking.bookingSubCollection.userId;
            });
          }),
          mergeMap((feedbackMap: any[]) => {
            return from(feedbackMap).pipe(
              // merge join collections bookings
              mergeMap((feedback) => {
                console.log(feedback);
                return this.usersService.getOne(feedback.id).pipe(
                  map(profissional => ({ feedback, profissional })),
                );
              }),
              reduce((a, i) => [...a, i], [])
            );
            // return this.usersService.getOne(feedback).pipe(
            //   map(usersCollection => ({ usersCollection, bookingDetail })),
            // );
          })
        );
      })
    );

    this.feedbacks$.subscribe((r) => {
      console.log(r);
    });
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
        feedback: this.form.value.feedback,
        timestamp: firebase.firestore.Timestamp.fromDate(new Date())
      };

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
    })).subscribe(alertEl => {
        alertEl.present();
    });
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
