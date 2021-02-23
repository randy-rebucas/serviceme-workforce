import { Component, OnDestroy, OnInit } from '@angular/core';
import { AlertController, LoadingController } from '@ionic/angular';

import { BehaviorSubject, combineLatest, from, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { ClassificationsService } from 'src/app/shared/services/classifications.service';
import { SubSink } from 'subsink';
import { SettingsService } from './settings.service';

export class Availability {
  constructor(
      public id: number,
      public title: string
  ) {}
}

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit, OnDestroy {
  public availablityList: Availability[] = [
    {id: 1, title: 'Monday'},
    {id: 2, title: 'Tuesday'},
    {id: 3, title: 'Wednesday'},
    {id: 4, title: 'Thursday'},
    {id: 5, title: 'Friday'},
    {id: 6, title: 'Saturday'},
    {id: 7, title: 'Sunday'}
  ];

  private availablities$: BehaviorSubject<any[]|[]>;
  public availablities: any[];
  private defaultCurrency$: BehaviorSubject<string|null>;
  public defaultCurrency: string;
  private classifications$: BehaviorSubject<string|null>;
  public classifications: string;
  private subs = new SubSink();

  constructor(
    private alertController: AlertController,
    private loadingController: LoadingController,
    private authService: AuthService,
    private settingsService: SettingsService,
    private classificationsService: ClassificationsService
  ) {
    this.availablities$ = new BehaviorSubject([]);
    this.defaultCurrency$ = new BehaviorSubject('PHP');

    this.subs.sink = combineLatest([
      this.availablities$,
      this.defaultCurrency$
    ]).subscribe(([availablities, defaultCurrency]) => {
      this.availablities = availablities;
      this.defaultCurrency = defaultCurrency;
    });
  }

  ngOnInit() {
    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        return this.settingsService.getOne(user.uid);
      })
    ).subscribe((settings) => {
      this.defaultCurrency$.next(settings.currency);
      this.availablities$.next(settings.availability);
    });
  }

  compareAvailablity(o1: Availability, o2: Availability | Availability[]) {
    if (!o1 || !o2) {
      return o1 === o2;
    }

    if (Array.isArray(o2)) {
      return o2.some((u: Availability) => u.id === o1.id);
    }

    return o1.id === o2.id;
  }

  onSelectAvailability(event: CustomEvent) {
    this.availablities$.next(event.detail.value);
  }

  onSelectCurrency(event: CustomEvent) {
    this.defaultCurrency$.next(event.detail.value);
  }

  onPickAvailability(event: CustomEvent, availability: any) {
    if (event.detail.checked) {
      this.availablities.push(availability);
      this.availablities$.next(this.availablities);
    } else {
      const updatedAvailablities = this.availablities.filter(item => item.val !== availability.val);
      this.availablities$.next(updatedAvailablities);
    }
  }

  doUpdate(userId: string) {
    const createdSettings = {
      availability: this.availablities,
      currency: this.defaultCurrency
    };
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
    })).subscribe(loadingEl => {
      loadingEl.present();
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
    })).subscribe(alertEl => {
        alertEl.present();
    });
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
