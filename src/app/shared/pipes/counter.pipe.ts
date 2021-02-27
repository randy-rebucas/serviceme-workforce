import { Pipe, PipeTransform } from '@angular/core';
import { from, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { OffersService } from 'src/app/pages/offers/offers.service';

@Pipe({
  name: 'counter'
})
export class CounterPipe implements PipeTransform {

  constructor(
    protected authService: AuthService,
    protected offersService: OffersService
  ) {}

  transform(value: any, ...args: any[]): any {
    return new Observable(observer => {
      this.offersService.getSize(value, args[0]).subscribe((offer) => {
        const size = offer.size ? offer.size : 0;
        observer.next(size + ' ' + args[1] + (size > 1 ? '(s)' : ''));
      });
    });
  }

}
