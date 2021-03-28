import { Component, OnDestroy, OnInit } from '@angular/core';
import { AlertController, IonItemSliding, LoadingController } from '@ionic/angular';
import { from, Observable, Subject } from 'rxjs';
import { map, mergeMap, reduce, switchMap } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { SubSink } from 'subsink';
import { UsersService } from '../users/users.service';
import { Notifications } from './notifications';
import { NotificationsService } from './notifications.service';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
})
export class NotificationsPage implements OnInit, OnDestroy {
  public notifications$: Observable<any[]>;
  private notificationListener = new Subject<any>();
  private subs = new SubSink();

  constructor(
    private loadingController: LoadingController,
    private alertController: AlertController,
    private authService: AuthService,
    private usersService: UsersService,
    private notificationsService: NotificationsService
  ) {
    this.getNotifications();
  }

  ngOnInit() {
    this.notifications$ = this.getNotificationListener();

    // update all unread notification status
    from(this.notificationListener).subscribe((notifications) => {
      for (const notification of notifications) {
        if (notification.notificationCollection.status === 'unread') {
          this.notificationsService.update(notification.notificationSubCollection.id, { status: 'read'});
        }
      }
    });

  }

  getNotifications() {
    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      // get all notifications
      switchMap((user) => this.usersService.getSubCollection(user.uid, 'notifications').pipe(
        // notifications response
        mergeMap((notificationMap: any[]) => {
          // merge collection
          return from(notificationMap).pipe(
            mergeMap((notificationSubCollection) => {
              return this.notificationsService.getOne(notificationSubCollection.id).pipe(
                // map to combine user notifications sub-collection to collection
                map(notificationCollection => ({notificationSubCollection, notificationCollection})),
              );
            }),
            reduce((a, i) => [...a, i], [])
          );
        }),
      ))
    ).subscribe((notifications) => {
      this.notificationListener.next(notifications);
    });
  }

  getNotificationListener() {
    return this.notificationListener.asObservable();
  }

  onDelete(notification: any, ionItemSliding: IonItemSliding) {
    this.subs.sink = from(this.loadingController.create({
      message: 'Deleting...'
    })).subscribe(loadingEl => {
      loadingEl.present();
      this.doDeleteSubCollection(notification.notificationSubCollection.id, ionItemSliding);
    });
  }

  doDeleteSubCollection(notificationId: string, ionItemSliding: IonItemSliding) {
    this.subs.sink = this.authService.getUserState().pipe(
      switchMap((user) => {
        return from(this.usersService.deleteSubCollection(user.uid, 'notifications', notificationId));
      })
    ).subscribe(() => {
      this.doDeleteCollection(notificationId, ionItemSliding);
    }, (error: any) => {
      this.loadingController.dismiss();
      this.presentAlert(error.code, error.message);
    });
  }

  doDeleteCollection(notificationId: string, ionItemSliding: IonItemSliding) {
    this.subs.sink = from(this.notificationsService.delete(notificationId)).subscribe(() => {
      this.loadingController.dismiss();
      ionItemSliding.closeOpened();
    }, (error: any) => {
      this.loadingController.dismiss();
      this.presentAlert(error.code, error.message);
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
