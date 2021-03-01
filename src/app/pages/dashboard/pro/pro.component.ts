import { Component, OnInit } from '@angular/core';
import { IonItemSliding } from '@ionic/angular';
import { BehaviorSubject, from, Observable, of, Subject } from 'rxjs';
import { filter, map, mergeMap, reduce, switchMap } from 'rxjs/operators';
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
  private bookingListener = new Subject<any>();

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

    this.subs.sink = this.bookingStatus$.subscribe((bookingStatus) => {
      this.bookingStatus = bookingStatus;
    });
  }

  getBookingListener() {
    return this.bookingListener.asObservable();
  }
  // get user data to retrive names
  getUser(bookingDetail: any, subCollectionForiegnKeyId: string) {
    return this.usersService.getOne(subCollectionForiegnKeyId).pipe(
      map(usersCollection => ({ usersCollection, bookingDetail })),
    );
  }
  // get auth user data to retrive photoUrl
  getAuthUser(booking) {
    return this.adminFunctionService.getById(booking.bookingSubCollection.userId).pipe(
      map(admin => ({ booking, admin })),
      // merge user collection to get common user intity object
      mergeMap((bookingDetail) => {
        return this.getUser(bookingDetail, booking.bookingSubCollection.userId);
      })
    );
  }
  // get sub collections
  getSubCollectionDocument(bookingSubCollection: any, status: string) {
    return this.bookingsService.getOne(bookingSubCollection.id).pipe(
      // map to combine user booking sub-collection to collection
      map(bookingCollection => ({ bookingSubCollection, bookingCollection })),
      // filter by status
      filter(bookingStatus => bookingStatus.bookingCollection.status === status),
      // merge the user auth data to get firebase.User object
      mergeMap((booking) => {
        return this.getAuthUser(booking);
      })
    );
  }
  // get Main Collection {bookings}
  getCollection(booking: any[], status: string) {
    return from(booking).pipe(
      mergeMap((bookingSubCollection) => {
        return this.getSubCollectionDocument(bookingSubCollection, status);
      }),
      reduce((a, i) => [...a, i], [])
    );
  }

  // get all sub collection bookings from user perspective
  getSubCollection(documentRef: string, collectionRef: string, status: string) {
    return this.usersService.getSubCollection(documentRef, collectionRef).pipe(
      // bookings response
      mergeMap((bookingMap: any[]) => {
        return this.getCollection(bookingMap, status);
      })
    );
  }

  // initialize
  initialized() {
    this.bookingStatus$.pipe(
      switchMap((status) => {
        return from(this.authService.getCurrentUser()).pipe(
          // get all bookings
          switchMap((user) => this.getSubCollection(user.uid, 'bookings', status))
        );
      })
    ).subscribe((bookings) => {
      this.bookingListener.next(bookings);
    });

    // from(this.authService.getCurrentUser()).pipe(
    //   // get all bookings
    //   switchMap((user) => this.usersService.getSubCollection(user.uid, 'bookings').pipe(
    //     // bookings response
    //     mergeMap((bookingMap: any[]) => {
    //       // merge collection
    //       return from(bookingMap).pipe(
    //         mergeMap((bookingSubCollection) => {
    //           return this.bookingsService.getOne(bookingSubCollection.id).pipe(
    //             // map to combine user booking sub-collection to collection
    //             map(bookingCollection => ({ bookingSubCollection, bookingCollection })),
    //             // filter by status
    //             filter(bookingStatus => bookingStatus.bookingCollection.status === status),
    //             // merge the user auth data to get firebase.User object
    //             mergeMap((booking) => {
    //               return this.adminFunctionService.getById(booking.bookingSubCollection.userId).pipe(
    //                 map(admin => ({ booking, admin })),
    //                 // merge user collection to get common user intity object
    //                 mergeMap((bookingDetail) => {
    //                   return this.usersService.getOne(booking.bookingSubCollection.userId).pipe(
    //                     map(usersCollection => ({ usersCollection, bookingDetail })),
    //                   );
    //                 })
    //               );
    //             })
    //           );
    //         }),
    //         reduce((a, i) => [...a, i], [])
    //       );
    //     })
    //   ))
    // ).subscribe((bookings) => {
    //   console.log(bookings);
    //   this.bookingListener.next(bookings);
    // });
  }

  ngOnInit() {
    // initialize bookings
    this.initialized();

    // get booking listener from booking observables
    this.bookings$ = this.getBookingListener();
  }

  statusChanged(event: CustomEvent) {
    // update status
    this.bookingStatus$.next(event.detail.value);
  }

  onAccept(booking: any, ionItemSliding: IonItemSliding) {
    console.log(booking);
  }
}
