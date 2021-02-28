import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, from, Observable, of, Subject } from 'rxjs';
import { map, mergeMap, reduce, switchMap } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { AdminFunctionService } from 'src/app/shared/services/admin-function.service';
import { SubSink } from 'subsink';
import { Bookings } from '../../bookings/bookings';
import { BookingsService } from '../../bookings/bookings.service';
import { UsersService } from '../../users/users.service';

@Component({
  selector: 'app-pro',
  templateUrl: './pro.component.html',
  styleUrls: ['./pro.component.scss'],
})
export class ProComponent implements OnInit {
  public bookings$: Observable<Bookings[]>;
  private bookingListener = new Subject<Bookings[]>();

  private bookingStatus$: BehaviorSubject<string|null>;
  public bookingStatus: string;

  private subs = new SubSink();
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private adminFunctionService: AdminFunctionService,
    private bookingsService: BookingsService
  ) {
    this.bookingStatus$ = new BehaviorSubject('pending');
  }

  getBookingListener() {
    return this.bookingListener.asObservable();
  }

  initialized() {
    from(this.authService.getCurrentUser()).pipe(
      // get all bookings
      switchMap((user) => this.usersService.getSubCollection(user.uid, 'bookings').pipe(
        // bookings response
        mergeMap((bookingMap: any[]) => {
          return from(bookingMap).pipe(
            // merge join collections bookings
            mergeMap((bookingInfo) => {
              return this.bookingsService.getOne(bookingInfo.id, status).pipe(
                // merge profissional user collections
                mergeMap((booking) => {
                  return this.adminFunctionService.getById(bookingInfo.userId).pipe(
                    // userAuth data
                    mergeMap((clientAuth) => {
                      return this.usersService.getOne(bookingInfo.userId).pipe(
                        map(client => ({ booking, client, clientAuth })),
                      );
                    })
                  );
                }),
                reduce((a, i) => [...a, i], [])
              );
            })
          );
        })
      ))
    ).subscribe((bookings) => {
      this.bookingListener.next(bookings);
    });
  }

  ngOnInit() {
    this.initialized();

    this.subs.sink = this.bookingStatus$.subscribe((bookingStatus) => {
      this.bookingStatus = bookingStatus;
    });

    this.bookings$ = this.getBookingListener();
  }

  statusChanged(event: CustomEvent) {
    this.bookingStatus$.next(event.detail.value);
    this.getBookingListener().pipe(
      map((bookings) => {
        console.log(bookings);
        return bookings.filter((bookingList) => {
          return bookingList.status === this.bookingStatus;
        });
      }),
    ).subscribe((bookings) => {
      this.bookingListener.next(bookings);
    });
  }

}
