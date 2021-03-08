import { Component, OnInit } from '@angular/core';
import { from, Observable } from 'rxjs';
import { AuthService } from 'src/app/auth/auth.service';
import { SubSink } from 'subsink';
import { Transactions } from './transactions';

@Component({
  selector: 'app-transactions',
  templateUrl: './transactions.page.html',
  styleUrls: ['./transactions.page.scss'],
})
export class TransactionsPage implements OnInit {
  public transactions$: Observable<Transactions[]>;
  private subs = new SubSink();
  constructor(
    private authService: AuthService
  ) { }

  ngOnInit() {
    // get transactions subcollections
    // this.subs.sink = from(this.authService.getCurrentUser()).pipe(
    //   map((user) => {
    //     this.user = user;
    //   }),
    //   switchMap(() =>
    //     this.transactionsService.getBySender(null)
    //   )
    // ).subscribe((transactions) => {
    //   const transactionItems = transactions.filter((transaction) => {
    //     return transaction.to === this.user.uid || transaction.from === this.user.uid
    //   });
    //   this.transactionsService.myTransactions(transactionItems);
    // });
    // // get my transactions subcollections
    // this.transactions$ = this.transactionsService.getMyTransactions();
  }

}
