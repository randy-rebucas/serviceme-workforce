import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { AlertController, IonItemSliding, IonRouterOutlet, LoadingController, ModalController } from '@ionic/angular';
import { forkJoin, from, Observable, Subject } from 'rxjs';
import { map, mergeMap, reduce, switchMap, toArray } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { SubSink } from 'subsink';
import { SettingsService } from '../settings/settings.service';
import { UsersService } from '../users/users.service';
import { Bookings } from './bookings';
import { BookingsService } from './bookings.service';
import { PreviewComponent } from './preview/preview.component';

@Component({
  selector: 'app-bookings',
  templateUrl: './bookings.page.html',
  styleUrls: ['./bookings.page.scss'],
})
export class BookingsPage implements OnInit, AfterViewInit, OnDestroy {
  public defaultCurrency: string;
  public bookings$: Observable<Bookings[]>;
  private bookingListener = new Subject<Bookings[]>();
  private subs = new SubSink();
  constructor(
    private alertController: AlertController,
    private modalController: ModalController,
    private loadingController: LoadingController,
    private authService: AuthService,
    private bookingsService: BookingsService,
    private usersService: UsersService,
    private settingsService: SettingsService,
    private routerOutlet: IonRouterOutlet,
  ) {
    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        return this.settingsService.getOne(user.uid);
      })
    ).subscribe((settings) => {
      this.defaultCurrency = (settings) ? settings.currency : 'USD';
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
  }

  getBookingListener() {
    return this.bookingListener.asObservable();
  }

  initialized() {
    from(this.authService.getCurrentUser()).pipe(
      // get all bookings
      switchMap((user) => this.bookingsService.getAll(user.uid).pipe(
        // bookings response
        mergeMap((bookingMap: Bookings[]) => {
          return from(bookingMap).pipe(
            mergeMap((bookingInfo) => {
              return this.usersService.getOne(bookingInfo.prof).pipe(
                map(proInfo => ({ bookingInfo, proInfo })),
              );
            }),
            reduce((a, i) => [...a, i], [])
          );
        })
      ))
    ).subscribe((bookings) => {
      this.bookingListener.next(bookings);
    });
  }

  ngOnInit() {
    this.initialized();
  }

  ngAfterViewInit() {
    this.bookings$ = this.getBookingListener();
  }

  onDelete(booking: Bookings, ionItemSliding: IonItemSliding) {
    this.subs.sink = from(this.loadingController.create({
      message: 'Deleting...'
    })).subscribe(loadingEl => {
      loadingEl.present();
      this.doDelete(booking.id, ionItemSliding);
    });
  }

  doDelete(bookingId: string, ionItemSliding: IonItemSliding) {
    this.authService.getUserState().pipe(
      switchMap((user) => {
        return from(this.bookingsService.delete(user.uid, bookingId));
      })
    ).subscribe(() => {
      this.loadingController.dismiss();
      ionItemSliding.closeOpened();
    }, (error: any) => {
      this.loadingController.dismiss();
      this.presentAlert(error.code, error.message);
    });
  }

  onCancel(booking: Bookings, ionItemSliding: IonItemSliding) {
    this.subs.sink = from(this.loadingController.create({
      message: 'Canceling...'
    })).subscribe(loadingEl => {
      loadingEl.present();
      this.doCancel(booking.id, ionItemSliding);
    });
  }

  doCancel(bookingId: string, ionItemSliding: IonItemSliding) {
    this.authService.getUserState().pipe(
      switchMap((user) => {
        return from(this.bookingsService.update(user.uid, bookingId, { status: 'canceled' }));
      })
    ).subscribe(() => {
      this.loadingController.dismiss();
      ionItemSliding.closeOpened();
    }, (error: any) => {
      this.loadingController.dismiss();
      this.presentAlert(error.code, error.message);
    });
  }

  onPreview(booking: any, ionItemSliding: IonItemSliding) {
    this.subs.sink = from(this.modalController.create({
      component: PreviewComponent,
      componentProps: {
        title: 'Preview',
        bookingData: booking
      },
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl
    })).subscribe((modalEl) => {
      modalEl.present();
      ionItemSliding.closeOpened();
    });
  }

  onChange(event: CustomEvent) {
    const searchKey = event.detail.value;

    this.authService.getUserState().pipe(
      switchMap((user) =>
        this.bookingsService.getAll(user.uid).pipe(
          map((bookings) => {
            if (!searchKey) {
              return bookings;
            }
            return bookings.filter((booking) => {
              return booking.id.toLowerCase().includes(searchKey);
            });
          }),
          // bookings response
          mergeMap((bookingMap: Bookings[]) => {
            return from(bookingMap).pipe(
              mergeMap((bookingInfo) => {
                return this.usersService.getOne(bookingInfo.prof).pipe(
                  map(proInfo => ({ bookingInfo, proInfo })),
                );
              }),
              reduce((a, i) => [...a, i], [])
            );
          })
        )
      )
    ).subscribe((bookings) => {
      console.log(bookings);
      this.bookingListener.next(bookings);
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
  }

  onClear() {
    this.initialized();
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
