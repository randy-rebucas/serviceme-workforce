import { Component, OnInit } from '@angular/core';
import { from, Observable, Subject } from 'rxjs';
import { map, mergeMap, reduce, switchMap } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { environment } from 'src/environments/environment';
import { SubSink } from 'subsink';
import { SettingsService } from '../settings/settings.service';
import { UsersService } from '../users/users.service';
import { Transactions } from './transactions';
import { TransactionsService } from './transactions.service';

@Component({
  selector: 'app-transactions',
  templateUrl: './transactions.page.html',
  styleUrls: ['./transactions.page.scss'],
})
export class TransactionsPage implements OnInit {
  public transactions$: Observable<any[]>;
  public defaultCurrency: string;
  private transactionListener = new Subject<any>();
  private subs = new SubSink();
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private transactionsService: TransactionsService,
    private settingsService: SettingsService
  ) {
    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        return this.settingsService.getOne(user.uid);
      })
    ).subscribe((settings) => {
      this.defaultCurrency = (settings) ? settings.currency : environment.defaultCurrency;
    });
  }

  getTransactionListener() {
    return this.transactionListener.asObservable();
  }

  ngOnInit() {
    from(this.authService.getCurrentUser()).pipe(
      // get all transactions
      switchMap((user) => this.usersService.getSubCollection(user.uid, 'transactions').pipe(
        // transactions response
        mergeMap((transactionMap: any[]) => {
          // merge collection
          return from(transactionMap).pipe(
            mergeMap((transactionSubCollection) => {
              return this.transactionsService.getOne(transactionSubCollection.id.trim()).pipe(
                // map to combine user transactions sub-collection to collection
                map(transactionCollection => ({transactionSubCollection, transactionCollection}))
              );
            }),
            reduce((a, i) => [...a, i], [])
          );
        })
      ))
    ).subscribe((transactions) => {
      this.transactionListener.next(transactions);
    });

    this.transactions$ = this.getTransactionListener();
  }

}
