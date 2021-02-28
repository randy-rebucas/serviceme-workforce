import { Component, OnInit } from '@angular/core';
import { from, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { Bookings } from '../../bookings/bookings';
import { BookingsService } from '../../bookings/bookings.service';

@Component({
  selector: 'app-pro',
  templateUrl: './pro.component.html',
  styleUrls: ['./pro.component.scss'],
})
export class ProComponent implements OnInit {
  public bookings$: Observable<Bookings[]>;

  constructor(
    private authService: AuthService,
    private bookingsService: BookingsService
  ) { }

  ngOnInit() {
    // from(this.authService.getCurrentUser()).pipe(
    //   switchMap((user) => {
    //     console.log(user);
    //     return this.bookingsService.getByProfessional(user.uid);
    //   })
    // ).subscribe((r) => {
    //   console.log(r);
    // });
  }

}
