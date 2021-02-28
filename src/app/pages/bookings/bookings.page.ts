import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { forkJoin, from, Observable, Subject } from 'rxjs';
import { map, mergeMap, reduce, switchMap, toArray } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { SubSink } from 'subsink';
import { SettingsService } from '../settings/settings.service';
import { UsersService } from '../users/users.service';
import { Bookings } from './bookings';
import { BookingsService } from './bookings.service';

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
    private authService: AuthService,
    private bookingsService: BookingsService,
    private usersService: UsersService,
    private settingsService: SettingsService
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

  onCancel() {}

  onPreview() {}

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
