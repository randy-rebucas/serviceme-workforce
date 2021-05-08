import { Component, OnDestroy, OnInit } from '@angular/core';
import { AlertController, LoadingController } from '@ionic/angular';

import { BehaviorSubject, combineLatest, from, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { ClassificationsService } from 'src/app/shared/services/classifications.service';
import { environment } from 'src/environments/environment';
import { SubSink } from 'subsink';
import { Settings } from './settings';
import { SettingsService } from './settings.service';



@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit, OnDestroy {
  public settings$: Observable<Settings>;
  public defaultCurrency$: Observable<string|null>;
  public defaultCurrency: string;
  private subs = new SubSink();

  constructor(
    private alertController: AlertController,
    private loadingController: LoadingController,
    private authService: AuthService,
    private settingsService: SettingsService,
    private classificationsService: ClassificationsService
  ) {
    this.settings$ = this.getSettings();
  }

  getSettings() {
    return from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        return this.settingsService.getOne(user.uid);
      })
    );
  }

  ngOnInit() {
    this.defaultCurrency$ = from(this.settings$).pipe(
      map(setting => setting.currency)
    );

    // tslint:disable-next-line: deprecation
    from(this.defaultCurrency$).subscribe((currency) => {
      this.defaultCurrency = (currency) ? currency : environment.defaultCurrency;
    });
  }

  onChangeCurrency() {
    from(this.alertController.create({
      cssClass: 'my-custom-class',
      header: 'Select currency!',
      inputs: [
        {
          name: 'currency',
          type: 'radio',
          label: 'PHP',
          value: 'PHP',
          checked: this.defaultCurrency === 'PHP' ? true : false
        },
        {
          name: 'currency',
          type: 'radio',
          label: 'USD',
          value: 'USD',
          checked: this.defaultCurrency === 'USD' ? true : false
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => { }
        }, {
          text: 'Ok',
          handler: (data) => {
            this.defaultCurrency$ = of(data);
            const currencyData = {
              currency: data
            };
            this.doUpdate(currencyData);
          }
        }
      ]
    // tslint:disable-next-line: deprecation
    })).subscribe((alertEl) => {
      alertEl.present();
    });
  }

  doUpdate(payload: any) {
    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      switchMap((currentUser) => {
        return this.settingsService.insert(currentUser.uid, payload);
      })
    // tslint:disable-next-line: deprecation
    ).subscribe(() => {
      this.presentAlert('Settings', 'Settings updated successfully!');
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
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
