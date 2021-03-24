import { Component, OnDestroy, OnInit } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { from, Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { environment } from 'src/environments/environment';
import { SubSink } from 'subsink';
import { SettingsService } from '../../settings/settings.service';

@Component({
  selector: 'app-detail',
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.scss'],
})
export class DetailComponent implements OnInit, OnDestroy {
  public title: string;
  public transaction$: Observable<any>;
  public defaultCurrency: string;
  private subs = new SubSink();

  constructor(
    private navParams: NavParams,
    private modalController: ModalController,
    private authService: AuthService,
    private settingsService: SettingsService
  ) {
    this.title = this.navParams.data.title;
    this.transaction$ = of(this.navParams.data.transactionData);

    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        return this.settingsService.getOne(user.uid);
      })
    ).subscribe((settings) => {
      this.defaultCurrency = (settings) ? settings.currency : environment.defaultCurrency;
    });
  }

  ngOnInit() {
    this.transaction$.subscribe((r) => {
      console.log(r);
    });
  }

  onDismiss(state: boolean) {
    this.modalController.dismiss({
      dismissed: state
    });
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
