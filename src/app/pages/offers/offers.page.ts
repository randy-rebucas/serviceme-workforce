import { Component, OnDestroy, OnInit } from '@angular/core';
import { BehaviorSubject, from, Observable, Subject } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

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
  private offersUpdated = new Subject<Offers[]>();

  public defaultCurrency: string;
  private offerOption$: BehaviorSubject<string|null>;
  public offerOption: string;
  private subs = new SubSink();
  constructor(
    private modalController: ModalController,
    private loadingController: LoadingController,
    private authService: AuthService,
    private offersService: OffersService,
    private settingsService: SettingsService,
    private routerOutlet: IonRouterOutlet,
  ) {
    this.offerOption$ = new BehaviorSubject('single');
  }

  getOfferListener() {
    return this.offersUpdated.asObservable();
  }

  initialized() {
    this.subs.sink = this.authService.getUserState().pipe(
      switchMap((user) =>
        this.offerOption$.pipe(
          switchMap((option) => this.offersService.getAll(user.uid, option))
        )
      )
    ).subscribe((offers) => {
      this.offersUpdated.next(offers);
    });
  }

  ngOnInit() {
    this.subs.sink = this.offerOption$.subscribe((offerOption) => {
      this.offerOption = offerOption;
    });

    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        return this.settingsService.getOne(user.uid);
      })
    ).subscribe((settings) => {
      this.defaultCurrency = (settings) ? settings.currency : 'USD';
    });

    this.initialized();
    this.offers$ = this.getOfferListener();
  }

  onClear() {
    this.initialized();
  }

  onChange(event: CustomEvent) {
    const searchKey = event.detail.value;

    this.authService.getUserState().pipe(
      switchMap((user) =>
        this.offerOption$.pipe(
          switchMap((option) =>
            this.offersService.getAll(user.uid, option).pipe(
              map((offers) => {
                if (!searchKey) {
                  return offers;
                }
                return offers.filter((offer) => {
                  return offer.title.toLowerCase().includes(searchKey);
                });
              })
            )
          )
        )
      )
    ).subscribe((offers) => {
      this.offersUpdated.next(offers);
    });
  }

  offerChanged(event: CustomEvent) {
    this.offerOption$.next(event.detail.value);
  }

  onCreate(offerOption: string) {
    this.subs.sink = from(this.modalController.create({
      component: FormComponent,
      componentProps: {
        title: 'Create Offer',
        offerData: Offers,
        state: true,
        option: offerOption
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
    this.subs.sink = from(this.offersService.delete(docRef, offerId, this.offerOption)).subscribe(() => {
      this.loadingController.dismiss();
      ionItemSliding.closeOpened();
    });
  }

  onDeail(offer: Offers, ionItemSliding: IonItemSliding) {
    this.subs.sink = from(this.modalController.create({
      component: DetailComponent,
      componentProps: {
        title: offer.type + ' offer details',
        offerId: offer.id,
        offerOption: this.offerOption
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
