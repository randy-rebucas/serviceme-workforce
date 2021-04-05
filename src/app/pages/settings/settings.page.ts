import { Component, OnDestroy, OnInit } from '@angular/core';
import { AlertController, LoadingController } from '@ionic/angular';

import { BehaviorSubject, combineLatest, from, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { ClassificationsService } from 'src/app/shared/services/classifications.service';
import { environment } from 'src/environments/environment';
import { SubSink } from 'subsink';
import { SettingsService } from './settings.service';



@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit, OnDestroy {
  private defaultCurrency$: BehaviorSubject<string|null>;
  public defaultCurrency: string;
  private subs = new SubSink();

  constructor(
    private alertController: AlertController,
    private loadingController: LoadingController,
    private authService: AuthService,
    private settingsService: SettingsService,
    private classificationsService: ClassificationsService
  ) {
    this.defaultCurrency$ = new BehaviorSubject('PHP');
    // tslint:disable-next-line: deprecation
    this.defaultCurrency$.subscribe((defaultCurrency) => {
      this.defaultCurrency = defaultCurrency;
    });
  }

  ngOnInit() {
    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        return this.settingsService.getOne(user.uid);
      })
    // tslint:disable-next-line: deprecation
    ).subscribe((settings) => {
      this.defaultCurrency = (settings) ? settings.currency : environment.defaultCurrency;
    });
  }

  onSelectCurrency(event: any) {
    this.defaultCurrency$.next(event.detail.value);
  }

  doUpdate(userId: string) {
    const createdSettings = {
      currency: this.defaultCurrency
    };
    // tslint:disable-next-line: deprecation
    this.subs.sink = from(this.settingsService.insert(userId, createdSettings)).subscribe(() => {
      this.loadingController.dismiss();
      this.presentAlert('Settings', 'Settings updated successfully!');
    }, (error: any) => {
      this.loadingController.dismiss();
      this.presentAlert(error.code, error.message);
    });
  }

  onUpdate() {
    this.subs.sink = from(this.loadingController.create({
      message: 'Please wait...'
    // tslint:disable-next-line: deprecation
    })).subscribe(loadingEl => {
      loadingEl.present();
      // tslint:disable-next-line: deprecation
      from(this.authService.getCurrentUser()).subscribe((user) => {
        this.doUpdate(user.uid);
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
