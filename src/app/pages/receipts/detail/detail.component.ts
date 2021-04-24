import { Component, OnDestroy, OnInit } from '@angular/core';
import { AlertController, ModalController, NavParams, ToastController } from '@ionic/angular';
import { from, Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { environment } from 'src/environments/environment';
import { SubSink } from 'subsink';
import { SettingsService } from '../../settings/settings.service';
import { Screenshot } from '@ionic-native/screenshot/ngx';

@Component({
  selector: 'app-detail',
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.scss'],
})
export class DetailComponent implements OnInit, OnDestroy {
  public title: string;
  public isVisiable: boolean;
  public transaction$: Observable<any>;
  public defaultCurrency: string;
  private subs = new SubSink();

  constructor(
    private navParams: NavParams,
    private modalController: ModalController,
    private alertController: AlertController,
    public toastController: ToastController,
    private authService: AuthService,
    private settingsService: SettingsService,
    private screenshot: Screenshot
  ) {
    this.title = this.navParams.data.title;
    this.transaction$ = of(this.navParams.data.transactionData);

    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        return this.settingsService.getOne(user.uid);
      })
    // tslint:disable-next-line: deprecation
    ).subscribe((settings) => {
      this.defaultCurrency = (settings) ? settings.currency : environment.defaultCurrency;
    });

    this.isVisiable = true;
  }

  ngOnInit() {
    // tslint:disable-next-line: deprecation
    from(this.transaction$).subscribe((r) => {
      console.log(r);
    });
  }

  onDismiss(state: boolean) {
    this.modalController.dismiss({
      dismissed: state
    });
  }

  onCapture() {
    this.isVisiable = false;
    // Take a screenshot and save to file
    // tslint:disable-next-line: deprecation
    from(this.screenshot.save('jpg', 80, 'myscreenshot.jpg')).subscribe(() => {
      this.toastController.create({
        message: 'Receipt save! Please check your gallery.',
        duration: 2000
      }).then((toastEl) => {
        toastEl.present();
      });
      setTimeout(() => {
        this.isVisiable = true;
      }, 3000);
    }, (error: any) => {
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
