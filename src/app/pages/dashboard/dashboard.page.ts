import { AfterViewInit, Component, OnInit } from '@angular/core';
import { from, Observable } from 'rxjs';
import { AuthService } from 'src/app/auth/auth.service';
import { AlertController } from '@ionic/angular';
import firebase from 'firebase/app';
import { UsersService } from '../users/users.service';
import { Users } from '../users/users';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit, AfterViewInit {

  public currentUser$: Observable<firebase.User>;
  public users$: Observable<Users[]>;

  constructor(
    private alertController: AlertController,
    private authService: AuthService,
    private usersService: UsersService
  ) {}

  ngOnInit() {
    this.currentUser$ = from(this.authService.getCurrentUser());

    this.users$ = this.usersService.getAllPro();
    this.users$.subscribe((r) => {
      console.log(r);
    });
  }

  ngAfterViewInit() {
    this.currentUser$.subscribe((user) => {
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
                handler: () => {}
              }
            ]
          }
        )).subscribe((alertEl) => {
          alertEl.present();
        });
      }
    });
  }
}
