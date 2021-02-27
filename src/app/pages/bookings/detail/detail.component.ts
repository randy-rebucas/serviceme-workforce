import { Component, OnInit } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { from, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { SubSink } from 'subsink';
import { SettingsService } from '../../settings/settings.service';

@Component({
  selector: 'app-detail',
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.scss'],
})
export class DetailComponent implements OnInit {
  public title: string;
  public userData: Observable<{}>;
  public state: boolean;
  public defaultCurrency: string;

  private subs = new SubSink();
  constructor(
    private navParams: NavParams,
    private modalController: ModalController,
    private authService: AuthService,
    private settingsService: SettingsService
  ) {
    this.title = this.navParams.data.title;
    this.userData = this.navParams.data.userData;
    this.state = this.navParams.data.state;

    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        return this.settingsService.getOne(user.uid);
      })
    ).subscribe((settings) => {
      this.defaultCurrency = (settings) ? settings.currency : 'USD';
    });
  }

  ngOnInit() {}

  onDismiss(state: boolean) {
    this.modalController.dismiss({
      dismissed: state
    });
  }
}
