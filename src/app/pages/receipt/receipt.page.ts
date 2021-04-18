import { Component, OnInit } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map, mergeMap, reduce, switchMap } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { environment } from 'src/environments/environment';
import { SubSink } from 'subsink';
import { SettingsService } from '../settings/settings.service';
import { TransactionsService } from '../transactions/transactions.service';
import { UsersService } from '../users/users.service';

@Component({
  selector: 'app-receipt',
  templateUrl: './receipt.page.html',
  styleUrls: ['./receipt.page.scss'],
})
export class ReceiptPage implements OnInit {
  public defaultCurrency: string;
  public receipts$: Observable<any[]>;

  private subs = new SubSink();
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private settingsService: SettingsService,
    private transactionsService: TransactionsService
  ) {
    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        return this.settingsService.getOne(user.uid);
      })
    // tslint:disable-next-line: deprecation
    ).subscribe((settings) => {
      this.defaultCurrency = (settings) ? settings.currency : environment.defaultCurrency;
    });
  }

  ngOnInit() {
    this.receipts$ = from(this.authService.getCurrentUser()).pipe(
      // get all transactions
      switchMap((user) => this.usersService.getSubCollection(user.uid, 'receipt').pipe(
        // transactions response
        mergeMap((receiptMap: any[]) => {
          // merge collection
          return from(receiptMap).pipe(
            mergeMap((receiptSubCollection) => {
              return this.transactionsService.getOne(receiptSubCollection.id.trim()).pipe(
                // map to combine user transactions sub-collection to collection
                map(transactionCollection => ({receiptSubCollection, transactionCollection}))
              );
            }),
            reduce((a, i) => [...a, i], [])
          );
        }),
      ))
    );

    from(this.receipts$).subscribe((r) => {
      console.log(r)
    })
  }

}
