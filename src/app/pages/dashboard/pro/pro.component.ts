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
    // charges: 840
    // id: "s5CnMSrvx3PDKWW2eUTy"
    // location: "Unnamed Road, Tanauan, Batangas, Philippines"
    // notes: "trtry"
    // offers: (2) [{…}, {…}]
    // prof: "ALF85zQI7PPvazgMdzkY4E5AqrH2"
    // scheduleDate: t {seconds: 1614504239, nanoseconds: 0}
    // scheduleTime: t {seconds: 1614504239, nanoseconds: 1000000}
    // status: "pending"

    this.bookings$ = from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        return this.bookingsService.getByProfessional(user.uid);
      })
    );
  }

}
