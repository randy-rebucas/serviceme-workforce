import { CurrencyPipe } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';
import { from, Observable } from 'rxjs';
import { filter, map, mergeMap, reduce, switchMap } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { BookingsService } from 'src/app/pages/bookings/bookings.service';
import { SettingsService } from 'src/app/pages/settings/settings.service';
import { UsersService } from 'src/app/pages/users/users.service';

@Pipe({
  name: 'bookingCounter'
})
export class BookingCounterPipe implements PipeTransform {
  private defaultCurrency: string;

  constructor(
    protected bookingsService: BookingsService,
    protected usersService: UsersService,
    protected authService: AuthService,
    protected settingsService: SettingsService,
    protected currencyPipe: CurrencyPipe
  ) {
    from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        return this.settingsService.getOne(user.uid);
      })
    ).subscribe((settings) => {
      this.defaultCurrency = (settings) ? settings.currency : 'USD';
    });
  }

  // get sub collections
  getSubCollectionDocument(bookingSubCollection: any, status: string) {
    return this.bookingsService.getOne(bookingSubCollection.id).pipe(
      // map to combine user booking sub-collection to collection
      map(bookingCollection => ({ bookingSubCollection, bookingCollection })),
      // filter by status
      filter(bookingStatus => bookingStatus.bookingCollection.status === status),
    )
  }

  // get Main Collection {bookings}
  getCollection(users: any[], status: string) {
    return from(users).pipe(
      mergeMap((userSubCollection) => {
        return this.getSubCollectionDocument(userSubCollection, status);
      }),
      reduce((a, i) => [...a, i], [])
    );
  }

   // get all sub collection bookings from user perspective
   getSubCollection(documentRef: string, collectionRef: string, status: string) {
    return this.usersService.getSubCollection(documentRef, collectionRef)
    .pipe(
      // bookings response
      mergeMap((bookingMap: any[]) => {
        return this.getCollection(bookingMap, status);
      })
    );
  }

  transform(value: any, ...args: any[]): any {
    return new Observable(observer => {
      this.getSubCollection(value, 'bookings', args[0])
      .subscribe((bookings) => {
        let totalCharges = 0;
        bookings.forEach(booking => {
          totalCharges += Number(booking.bookingCollection.charges);
        });

        let observerVal = '';
        if (args[1] === 'job') {
          observerVal = args[0] + ' job' + (bookings.length > 1 ? '(s)' : '') + ': ' + bookings.length;
        } else {
          observerVal = (totalCharges > 0) ?  this.currencyPipe.transform(totalCharges, this.defaultCurrency, 'symbol-narrow') + ' earned' : '';
        }

        observer.next(observerVal);
      });
    });
  }

}
