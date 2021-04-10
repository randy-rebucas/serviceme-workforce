import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { IonSlides, ModalController, Platform } from '@ionic/angular';

// ionic native
import { AppVersion } from '@ionic-native/app-version/ngx';
// cap plugins
import { Plugins } from '@capacitor/core';
import { SubSink } from 'subsink';
import { from } from 'rxjs';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
const { App } = Plugins;

@Component({
  selector: 'app-auth',
  templateUrl: './auth.page.html',
  styleUrls: ['./auth.page.scss'],
})
export class AuthPage implements OnInit, OnDestroy {
  public appVer: string;
  public isEnd: boolean;
  public slideOpts = {
    initialSlide: 0,
    slidesPerView: 1,
    speed: 400
  };

  private subs = new SubSink();

  constructor(
    private appVersion: AppVersion,
    private platform: Platform,
    private router: Router,
    private modalController: ModalController
  ) { }

  ngOnInit() {

    this.platform.backButton.subscribeWithPriority(5, () => {
      App.exitApp();
    });

    this.subs.sink = from(this.appVersion.getVersionNumber()).subscribe((app) => {
      this.appVer = app;
    });
  }

  onSlideDidChange(slideView: IonSlides) {
    from(slideView.isEnd()).subscribe((istrue) => {
      this.isEnd = istrue;
    });
  }

  onSkip(slideView: IonSlides) {
    slideView.slideTo(4);
  }

  onSlidePrev(slideView: IonSlides) {
    slideView.slidePrev();
  }

  onSlideNext(slideView: IonSlides) {
    slideView.slideNext();
  }

  onLoginOpen() {
    this.subs.sink = from(this.modalController.create({
      component: LoginComponent
    })).subscribe((modalEl) => {
      modalEl.onDidDismiss().then(modalData => {
        if (!modalData.data) {
          return;
        }
        if (modalData.data.dismissed) {
          this.router.navigateByUrl('/pages');
        }
      });
      modalEl.present();
    });
  }

  onRegisterOpen() {
    this.subs.sink = from(this.modalController.create({
      component: RegisterComponent
    })).subscribe((modalEl) => {
      modalEl.onDidDismiss().then(modalData => {
        if (!modalData.data) {
          return;
        }
        if (modalData.data.dismissed) {
          this.router.navigateByUrl('/auth');
        }
      });
      modalEl.present();
    });
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
