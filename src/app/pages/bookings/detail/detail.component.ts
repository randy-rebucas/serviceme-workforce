import { Component, OnDestroy, OnInit } from '@angular/core';
import { AlertController, ModalController, NavParams } from '@ionic/angular';
import { BehaviorSubject, from, Observable, of, Subject } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { environment } from 'src/environments/environment';
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
  public userId: string;
  private offerOption$: BehaviorSubject<string|null>;
  private offersUpdated = new Subject<Offers[]>();
  private subs = new SubSink();
  constructor(
    private navParams: NavParams,
    private modalController: ModalController,
    private alertController: AlertController,
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
    // tslint:disable-next-line: deprecation
    ).subscribe((settings) => {
      this.defaultCurrency = (settings) ? settings.currency : environment.defaultCurrency;
    });
  }

  getOfferListener() {
    return this.offersUpdated.asObservable();
  }

  ngOnInit() {
    this.subs.sink = this.user$.pipe(
      map((res) => {
        this.userId = res.id;
        return res;
      }),
      switchMap((r) =>
        this.offerOption$.pipe(
          switchMap((option) => this.offersService.getAll(r.id, option))
        )
      )
    // tslint:disable-next-line: deprecation
    ).subscribe((offers) => {
      this.offersUpdated.next(offers);
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });

    // tslint:disable-next-line: deprecation
    this.subs.sink = this.offerOption$.subscribe((offerOption) => {
      this.offerOption = offerOption;
    });

    this.offers$ = this.getOfferListener();

    // tslint:disable-next-line: deprecation
    this.subs.sink = this.bookingsService.getOffers().subscribe((offers) => {
      this.offerItems = offers;
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
  }

  offerChanged(event: any) {
    this.offerOption$.next(event.detail.value);
  }

  onUpdateOffer(offers: Offers[]) {
    let totalCharges = 0;
    offers.forEach(offerItem => {
      totalCharges += Number(offerItem.charges);
    });
  }

  onPickService(event: any, selectedOffer: Offers) {
    if (event.detail.checked) {
      this.offerItems.push({...selectedOffer, quantity: 1});
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

  onBook(userId: string) {
    this.subs.sink = from(this.modalController.create({
      component: FormComponent,
      componentProps: {
        title: 'Create booking',
        prof: userId
      }
    // tslint:disable-next-line: deprecation
    })).subscribe((modalEl) => {
      modalEl.onDidDismiss().then((modalDismissRes) => {
        if (modalDismissRes.data.dismissed) {
          this.onDismiss(true);
        }
      });
      modalEl.present();
    });
  }

  onDismiss(state: boolean) {
    this.modalController.dismiss({
      dismissed: state
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
