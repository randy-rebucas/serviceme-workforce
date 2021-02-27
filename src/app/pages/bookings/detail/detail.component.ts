import { Component, OnDestroy, OnInit } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { BehaviorSubject, from, Observable, of, Subject } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { SubSink } from 'subsink';
import { Offers } from '../../offers/offers';
import { OffersService } from '../../offers/offers.service';
import { SettingsService } from '../../settings/settings.service';
import { BookingsService } from '../bookings.service';
import { FormComponent } from '../form/form.component';

@Component({
  selector: 'app-detail',
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.scss'],
})
export class DetailComponent implements OnInit, OnDestroy {
  public title: string;
  public user$: Observable<any>;
  public state: boolean;
  public defaultCurrency: string;
  public offerItems: any[];
  public offers$: Observable<Offers[]>;
  public offerOption: string;
  private offerOption$: BehaviorSubject<string|null>;
  private offersUpdated = new Subject<Offers[]>();
  private subs = new SubSink();
  constructor(
    private navParams: NavParams,
    private modalController: ModalController,
    private authService: AuthService,
    private settingsService: SettingsService,
    private offersService: OffersService,
    private bookingsService: BookingsService
  ) {
    this.title = this.navParams.data.title;
    this.user$ = of(this.navParams.data.userData);
    this.state = this.navParams.data.state;

    this.offerOption$ = new BehaviorSubject('single');

    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        return this.settingsService.getOne(user.uid);
      })
    ).subscribe((settings) => {
      this.defaultCurrency = (settings) ? settings.currency : 'USD';
    });
  }

  getOfferListener() {
    return this.offersUpdated.asObservable();
  }

  ngOnInit() {
    this.user$.pipe(
      switchMap((r) =>
        this.offerOption$.pipe(
          switchMap((option) => this.offersService.getAll(r.user.id, option))
        )
      )
    ).subscribe((offers) => {
      this.offersUpdated.next(offers);
    });

    this.subs.sink = this.offerOption$.subscribe((offerOption) => {
      this.offerOption = offerOption;
    });

    this.offers$ = this.getOfferListener();

    this.bookingsService.getOffers().subscribe((offers) => {
      this.offerItems = offers;
    });
  }

  offerChanged(event: CustomEvent) {
    this.offerOption$.next(event.detail.value);
  }

  onUpdateOffer(offers: Offers[]) {
    let totalCharges = 0;
    offers.forEach(offerItem => {
      totalCharges += Number(offerItem.charges);
    });
  }

  onPickService(event: CustomEvent, selectedOffer: Offers) {
    if (event.detail.checked) {
      this.offerItems.push(selectedOffer);
      this.bookingsService.setOffers(this.offerItems);
    } else {
      const updatedOffers = this.offerItems.filter(offer => offer.id !== selectedOffer.id);
      this.bookingsService.setOffers(updatedOffers);
    }
  }

  checkOffer(selectedOffer: Offers, currentChilds: Offers | Offers[]) {
    if (!selectedOffer || !currentChilds) {
      return selectedOffer === currentChilds;
    }

    if (Array.isArray(currentChilds)) {
      return currentChilds.some((u: Offers) => u.id === selectedOffer.id);
    }

    return selectedOffer.id === currentChilds.id;
  }

  onBook() {
    this.subs.sink = from(this.modalController.create({
      component: FormComponent,
      componentProps: {
        title: 'Create booking'
      }
    })).subscribe((modalEl) => {
      modalEl.present();
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
