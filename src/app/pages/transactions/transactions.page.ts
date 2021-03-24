import { AfterViewInit, Component, OnInit } from '@angular/core';
import { IonItemSliding, IonRouterOutlet, ModalController } from '@ionic/angular';
import { BehaviorSubject, from, Observable, Subject } from 'rxjs';
import { filter, map, mergeMap, reduce, switchMap } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { environment } from 'src/environments/environment';
import { SubSink } from 'subsink';
import { SettingsService } from '../settings/settings.service';
import { UsersService } from '../users/users.service';
import { DetailComponent } from './detail/detail.component';
import { Transactions } from './transactions';
import { TransactionsService } from './transactions.service';

@Component({
  selector: 'app-transactions',
  templateUrl: './transactions.page.html',
  styleUrls: ['./transactions.page.scss'],
})
export class TransactionsPage implements OnInit, AfterViewInit {
  public transactions$: Observable<any[]>;
  public defaultCurrency: string;
  public currenctBalance: number;
  private transactionListener = new Subject<any>();
  private status$: BehaviorSubject<string|null>;
  private status: string;
  private subs = new SubSink();
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private modalController: ModalController,
    private routerOutlet: IonRouterOutlet,
    private transactionsService: TransactionsService,
    private settingsService: SettingsService
  ) {
    this.currenctBalance = 0;

    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        return this.settingsService.getOne(user.uid);
      })
    ).subscribe((settings) => {
      this.defaultCurrency = (settings) ? settings.currency : environment.defaultCurrency;
    });

    this.status$ = new BehaviorSubject('completed');
  }

  getTransactionListener() {
    return this.transactionListener.asObservable();
  }

  ngOnInit() {
    this.status$.pipe(
      switchMap(status =>
        from(this.authService.getCurrentUser()).pipe(
          // get all transactions
          switchMap((user) => this.usersService.getSubCollection(user.uid, 'transactions').pipe(
            // transactions response
            mergeMap((transactionMap: any[]) => {
              this.status = status;
              // merge collection
              return from(transactionMap).pipe(
                mergeMap((transactionSubCollection) => {
                  return this.transactionsService.getOne(transactionSubCollection.id.trim()).pipe(
                    // map to combine user transactions sub-collection to collection
                    map(transactionCollection => ({transactionSubCollection, transactionCollection})),
                    // filter by status
                    filter(bookingStatus => bookingStatus.transactionCollection.status === status),
                  );
                }),
                reduce((a, i) => [...a, i], [])
              );
            })
          ))
        )
      )
    ).subscribe((transactions) => {
      this.transactionListener.next(transactions);
    });

    this.transactions$ = this.getTransactionListener();

    this.subs.sink = from(this.transactions$).subscribe((transactions) => {
      let balance = 0;
      console.log(transactions);
      transactions.forEach(transaction => {
        balance += transaction.transactionSubCollection.balance;
      });
      // set current balance observable value
      this.transactionsService.setBalance(balance);
    });
  }

  filterTransactions(event: any) {
    const searchTerm = event.srcElement.value;
    this.transactions$.pipe(map((r) => {
      console.log(r);
    }));
  }

  filterStatus(event: any) {
    this.status$.next(event.detail.value);
  }

  onDeail(transactionDetail: any, ionItemSliding: IonItemSliding) {
    this.subs.sink = from(this.modalController.create({
      component: DetailComponent,
      componentProps: {
        title: 'Detail',
        transactionData: transactionDetail
      },
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl
    })).subscribe((modalEl) => {
      modalEl.present();
      ionItemSliding.closeOpened();
    });
  }

  ngAfterViewInit() {
    this.subs.sink = this.transactionsService.getBalance().subscribe((balance) => {
      this.currenctBalance = balance;
    });
  }
}
