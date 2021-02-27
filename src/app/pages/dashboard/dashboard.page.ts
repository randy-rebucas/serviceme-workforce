import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { from, Observable, of } from 'rxjs';
import { AuthService } from 'src/app/auth/auth.service';
import { AlertController } from '@ionic/angular';
import { UsersService } from '../users/users.service';
import { Users } from '../users/users';
import { AdminFunctionService } from 'src/app/shared/services/admin-function.service';
import { map, mergeMap, reduce, toArray } from 'rxjs/operators';
import { SubSink } from 'subsink';
import firebase from 'firebase/app';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit, AfterViewInit, OnDestroy {
  public isClient: boolean;
  public isPro: boolean;
  public isAdmin: boolean;
  public currentUser$: Observable<firebase.User>;
  public lists$: Observable<any>;
  public user: Users[];
  private subs = new SubSink();

  constructor(
    private alertController: AlertController,
    private authService: AuthService,
    private adminFunctionService: AdminFunctionService,
    private usersService: UsersService
  ) {}

  ngOnInit() {
    this.currentUser$ = from(this.authService.getCurrentUser());

    this.subs.sink = this.currentUser$.subscribe((user) => {
      user.getIdTokenResult().then((idTokenResult) => {
        this.isClient = idTokenResult.claims.client;
        this.isPro = idTokenResult.claims.pro;
        this.isAdmin = idTokenResult.claims.admin;
      });
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });

    this.lists$ = this.usersService.getAll().pipe(
      map((users) => {
        return users.filter((usersList) => {
          return usersList.roles.pro === true;
        });
      }),
      mergeMap((usersMerge) => {
        return from(usersMerge).pipe(
          mergeMap((user) => {
            return this.adminFunctionService.getById(user.id).pipe(
              map(admin => ({ user, admin })),
            );
          }),
          reduce((a, i) => [...a, i], []),
        );
      })
    );
  }

  ngAfterViewInit() {
    this.subs.sink = this.currentUser$.subscribe((user) => {
      if (!user.emailVerified) {
        console.log('please verify');
        from(this.alertController.create(
          {
            header: 'Verification!',
            message: 'Your account is not yet verified! Please check your email.',
            buttons: [
              {
                text: 'Cancel',
                role: 'cancel',
                cssClass: 'secondary',
                handler: () => {}
              }, {
                text: 'Ok',
                handler: () => {
                  this.authService.signOut();
                }
              }
            ]
          }
        )).subscribe((alertEl) => {
          alertEl.present();
        });
      }
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
