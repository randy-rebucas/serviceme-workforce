import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AlertController, IonRouterOutlet, LoadingController, Platform } from '@ionic/angular';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Plugins } from '@capacitor/core';
import { from, Observable, Subject } from 'rxjs';
import { SubSink } from 'subsink';
import { AuthService } from '../auth/auth.service';
import { map, switchMap } from 'rxjs/operators';
import { UsersService } from './users/users.service';
import { LocalNotifications } from '@ionic-native/local-notifications/ngx';
import { Notifications } from './notifications/notifications';
import firebase from 'firebase/app';
const { App } = Plugins;

@Component({
  selector: 'app-pages',
  templateUrl: './pages.page.html',
  styleUrls: ['./pages.page.scss'],
})
export class PagesPage implements OnInit, OnDestroy {
  @ViewChild(IonRouterOutlet, { static : true }) routerOutlet: IonRouterOutlet;

  public user$: Observable<firebase.User>;
  public notifications$: Observable<Notifications[]>;
  private notificationListener = new Subject<Notifications[]>();
  public subs = new SubSink();

  constructor(
    private router: Router,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private authService: AuthService,
    private usersService: UsersService,
    private platform: Platform,
    private location: Location,
    private localNotifications: LocalNotifications,
  ) {
    this.platform.ready().then(() => {
      // tslint:disable-next-line: deprecation
      this.localNotifications.on('click').subscribe((res) => {
        this.localNotifications.clear(res.id).then(() => {
          this.router.navigate(['/pages/notifications']);
        });
      });
    });
  }

  ngOnInit() {
    // get all new notifications
    this.getNotifications();

    // back event listener
    this.platform.backButton.subscribeWithPriority(10, (processNextHandler) => {
      if (this.location.isCurrentPathEqualTo('/pages')) {
        // Show Exit Alert!
        this.showExitConfirm();
        processNextHandler();
      } else {
        this.loadingController.getTop().then(v => v ? this.loadingController.dismiss() : null);
        // Navigate to back page
        this.location.back();
      }
    });

    // force exit on back
    this.platform.backButton.subscribeWithPriority(-1, () => {
      if (!this.routerOutlet.canGoBack()) {
        App.exitApp();
      }
    });

    this.user$ = from(this.authService.getCurrentUser());

    // tslint:disable-next-line: deprecation
    this.getNotificationListener().subscribe((notifications) => {
      for (const notification of notifications) {
        this.scheduleNotification(notification.title, notification.content, notification);
      }
    });
  }

  private getNotificationListener() {
    return this.notificationListener.asObservable();
  }

  private getNotifications() {
    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      // get all notifications
      switchMap((user) => this.usersService.getSubCollection(user.uid, 'notifications').pipe(
        map((notifications) => {
          return notifications.filter(notificationStatus => notificationStatus.status === 'unread');
        })
      ))
    // tslint:disable-next-line: deprecation
    ).subscribe((notifications) => {
      this.notificationListener.next(notifications);
    });
  }

  private scheduleNotification(notificationTitle: string, notificationText: string, data: any) {
    this.localNotifications.schedule({
      id: Math.floor(Math.random() * 5),
      title: notificationTitle,
      text: notificationText,
      data: {
        page: '/pages/notifications',
        refferenceId: data.id
      },
      foreground: true,
      vibrate: true
    });
  }

  private showExitConfirm() {
    this.subs.sink = from(this.alertController.create({
      cssClass: 'my-custom-class',
      header: 'cutsonwheel close',
      message: 'Do you want to close the app?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {}
        }, {
          text: 'Exit',
          handler: () => {
            this.authService.signOut().then(() => {
              App.exitApp();
            });
          }
        }
      ]
    // tslint:disable-next-line: deprecation
    })).subscribe((alert) => {
      alert.present();
    });
  }

  onLogout() {
    this.subs.sink = from(this.alertController.create({
      header: 'Confirmation Logout',
      message: 'Are you sure to logout?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {}
        }, {
          text: 'Yes',
          handler: () => {
            this.authService.signOut().then(() => {
              this.router.navigate(['/auth']);
            });
          }
        }
      ]
    // tslint:disable-next-line: deprecation
    })).subscribe((alertEl) => {
      alertEl.present();
    });
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

}
