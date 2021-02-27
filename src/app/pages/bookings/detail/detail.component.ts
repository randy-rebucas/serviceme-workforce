import { Component, OnInit } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { BehaviorSubject, from, Observable, of, Subject } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { SubSink } from 'subsink';
import { Offers } from '../../offers/offers';
import { OffersService } from '../../offers/offers.service';
import { SettingsService } from '../../settings/settings.service';
import { BookingsService } from '../bookings.service';

@Component({
  selector: 'app-detail',
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.scss'],
})
export class DetailComponent implements OnInit {
  public title: string;
  public user$: Observable<any>;
  public state: boolean;
  public defaultCurrency: string;
  public offerItems: any[];
  public offers$: Observable<Offers[]>;
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

    this.offers$ = this.getOfferListener();

    this.bookingsService.getOffers().subscribe((offers) => {
      this.offerItems = offers;
    });
  }

  offerChanged(event: CustomEvent) {
    this.offerOption$.next(event.detail.value);
  }

  onPickService(offer: Offers) {
    this.offerItems.push(offer);
    this.bookingsService.setOffers(this.offerItems);
  }

  onBook() {
    console.log(this.offerItems);
    this.onDismiss(true);
  }

  onDismiss(state: boolean) {
    this.modalController.dismiss({
      dismissed: state
    });
  }
}
