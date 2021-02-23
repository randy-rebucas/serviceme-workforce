import { AfterViewInit, Component, OnInit } from '@angular/core';
import { from, Observable } from 'rxjs';
import { AuthService } from 'src/app/auth/auth.service';
import { AlertController } from '@ionic/angular';
import firebase from 'firebase/app';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit, AfterViewInit {

  public user$: Observable<firebase.User>;

  constructor(
    private alertController: AlertController,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.user$ = from(this.authService.getCurrentUser());
  }

  ngAfterViewInit() {
    this.user$.subscribe((user) => {
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
