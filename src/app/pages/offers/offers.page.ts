import { Component, OnDestroy, OnInit } from '@angular/core';
import { from, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { AuthService } from 'src/app/auth/auth.service';
import { OffersService } from './offers.service';
import { Offers } from './offers';
import { IonItemSliding, IonRouterOutlet, LoadingController, ModalController } from '@ionic/angular';
import { FormComponent } from './form/form.component';
import { SubSink } from 'subsink';
import { DetailComponent } from './detail/detail.component';
import { SettingsService } from '../settings/settings.service';

@Component({
  selector: 'app-offers',
  templateUrl: './offers.page.html',
  styleUrls: ['./offers.page.scss'],
})
export class OffersPage implements OnInit, OnDestroy {
  // observables
  public offers$: Observable<Offers[]>;

  public defaultCurrency: string;

  private subs = new SubSink();
  constructor(
    private modalController: ModalController,
    private loadingController: LoadingController,
    private authService: AuthService,
    private offersService: OffersService,
    private settingsService: SettingsService,
    private routerOutlet: IonRouterOutlet,
  ) { }

  ngOnInit() {
    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        return this.settingsService.getOne(user.uid);
      })
    ).subscribe((settings) => {
      this.defaultCurrency = settings.currency;
    });

    this.offers$ = this.authService.getUserState().pipe(
      switchMap((user) =>
        this.offersService.getAll(user.uid)
      )
    );
  }

  onCreate() {
    this.subs.sink = from(this.modalController.create({
      component: FormComponent,
      componentProps: {
        title: 'Create Offer',
        offerData: Offers,
        state: true
      },
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl
    })).subscribe((modalEl) => {
      modalEl.present();
    });
  }

  onDelete(offer: Offers, ionItemSliding: IonItemSliding) {
    this.subs.sink = from(this.loadingController.create({
      message: 'Deleting...'
    })).subscribe(loadingEl => {
      loadingEl.present();
      this.getCurrentUser(offer.id, ionItemSliding);
    });
  }

  getCurrentUser(offerId: string, ionItemSliding: IonItemSliding) {
    this.subs.sink = this.authService.getUserState().subscribe((user) => {
      this.doDelete(user.uid, offerId, ionItemSliding);
    });
  }

  doDelete(docRef: string, offerId: string, ionItemSliding: IonItemSliding) {
    this.subs.sink = from(this.offersService.delete(docRef, offerId)).subscribe(() => {
      this.loadingController.dismiss();
      ionItemSliding.closeOpened();
    });
  }

  onDeail(offer: Offers, ionItemSliding: IonItemSliding) {
    this.subs.sink = from(this.modalController.create({
      component: DetailComponent,
      componentProps: {
        title: 'Offer details',
        offerData: offer,
      },
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl
    })).subscribe((modalEl) => {
      modalEl.present();
      ionItemSliding.closeOpened();
    });
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
