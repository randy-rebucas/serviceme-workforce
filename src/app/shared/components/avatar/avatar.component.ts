import { Component, OnInit } from '@angular/core';
import { AlertController, ModalController, NavParams } from '@ionic/angular';
import { from } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { SubSink } from 'subsink';

@Component({
  selector: 'app-avatar',
  templateUrl: './avatar.component.html',
  styleUrls: ['./avatar.component.scss'],
})
export class AvatarComponent implements OnInit {
  public previewUrl: string;
  private subs = new SubSink();
  constructor(
    private navParams: NavParams,
    private alertController: AlertController,
    private authService: AuthService,
    private modalController: ModalController
  ) {
    this.previewUrl = this.navParams.data.imageUrl;
  }

  ngOnInit() {}

  onChange() {
    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      map(user => user.updateProfile({ photoURL: this.previewUrl }))
    // tslint:disable-next-line: deprecation
    ).subscribe(() => {
        this.onDismiss(true);
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
  }

  onDismiss(state: boolean) {
    this.modalController.dismiss({
      dismissed: state,
      imageUrl: this.previewUrl
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
}
