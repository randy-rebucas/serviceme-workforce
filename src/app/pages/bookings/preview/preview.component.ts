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
import { ChatsService } from '../../chats/chats.service';
import { Notifications } from '../../notifications/notifications';
import { FormComponent } from '../../chats/form/form.component';
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
    private usersService: UsersService,
    private chatsService: ChatsService,
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

  onChat(chatRoomId: string) {
    // tslint:disable-next-line: deprecation
    this.subs.sink = this.chatsService.checkExist(chatRoomId).subscribe((room) => {
      if (!room) {
        this.subs.sink = from(this.alertController.create({
          cssClass: 'my-custom-class',
          header: 'Chatroom checking...',
          message: 'Create a room for this user?',
          buttons: [
            {
              text: 'Cancel',
              role: 'cancel',
              cssClass: 'secondary',
              handler: (blah) => {}
            }, {
              text: 'Okay',
              handler: () => {
                const chatMembers = [];
                this.subs.sink = from(this.booking$).pipe(
                  switchMap((bookings) => {
                    chatMembers.push(bookings.bookingData.bookingSubCollection.userId);
                    // return from(this.sms.send(bookings.userDetail.phoneNumber, data.sms))
                    return from(this.authService.getCurrentUser()).pipe(
                      switchMap((currentUser) => {
                        chatMembers.push(currentUser.uid);
                        const newGroup = {
                          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                          createdBy: currentUser.uid,
                          members: chatMembers
                        };
                        return from(this.chatsService.insert(chatRoomId, newGroup));
                      })
                    );
                  })
                // tslint:disable-next-line: deprecation
                ).subscribe(() => {
                  this.openChat(chatRoomId);
                  this.sendNotification(chatRoomId, chatMembers);
                });
              }
            }
          ]
        // tslint:disable-next-line: deprecation
        })).subscribe((alertEl) => {
          alertEl.present();
        });
      } else {
        this.openChat(chatRoomId);
      }
    });
  }

  private sendNotification(chatRoomId: string, users: any[]) {
    from(this.authService.getCurrentUser()).pipe(
      map(user => user.uid),
      switchMap((userId) => {
        return of(users).pipe(
          map(filterUser => filterUser.filter(user => user.id !== userId))
        );
      })
    // tslint:disable-next-line: deprecation
    ).subscribe((userIds) => {
      userIds.forEach(user => {
        const notificationData  = {
          title: 'Chat Room created!',
          content: 'New chat room created with id: ' + chatRoomId,
          status: 'unread',
          timestamp: firebase.firestore.Timestamp.fromDate(new Date()),
          type: 'chat'
        };
        return this.setNotificationData(user, notificationData);
      });
    });
  }

  private setNotificationData(clientId: string, notificationData: Notifications) {
    const randId = (Date.now().toString(36) + Math.random().toString(36).substr(2, 5)).toUpperCase();
    return this.usersService.setSubCollection(clientId, 'notifications', randId, notificationData );
  }

  openChat(chatRoomId: string) {
    this.subs.sink = this.chatsService.getOne(chatRoomId).pipe(
      map(chatRoom => chatRoom.name)
    // tslint:disable-next-line: deprecation
    ).subscribe((chatRoomName) => {
      this.subs.sink = from(this.modalController.create({
        component: FormComponent,
        cssClass: 'my-custom-class',
        componentProps: {
          title: chatRoomName ? chatRoomName : chatRoomId,
          roomId: chatRoomId
        }
      // tslint:disable-next-line: deprecation
      })).subscribe(modalEl => modalEl.present());
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
