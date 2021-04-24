import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { IonItemSliding, IonRouterOutlet, ModalController } from '@ionic/angular';
import { BehaviorSubject, from, Observable, Subject } from 'rxjs';
import { filter, map, mergeMap, reduce, switchMap } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { environment } from 'src/environments/environment';
import { SubSink } from 'subsink';
import { SettingsService } from '../settings/settings.service';
import { TransactionsService } from '../transactions/transactions.service';
import { UsersService } from '../users/users.service';
import { DetailComponent } from './detail/detail.component';

@Component({
  selector: 'app-receipts',
  templateUrl: './receipts.page.html',
  styleUrls: ['./receipts.page.scss'],
})
export class ReceiptsPage implements OnInit, OnDestroy {
  public transactions$: Observable<any[]>;
  public defaultCurrency: string;
  public currentBalance$: Observable<number>;
  public status: string;

  private transactionListener = new Subject<any>();
  private status$: BehaviorSubject<string|null>;
  private subs = new SubSink();

  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private modalController: ModalController,
    private routerOutlet: IonRouterOutlet,
    private transactionsService: TransactionsService,
    private settingsService: SettingsService
  ) {
    // set initial status value
    this.status$ = new BehaviorSubject('completed');
    // get user settings
    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        return this.settingsService.getOne(user.uid);
      })
    // tslint:disable-next-line: deprecation
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
      switchMap((user) => this.usersService.getSubCollection(user.uid, 'receipts').pipe(
        // transactions response
        mergeMap((transactionMap: any[]) => {
          this.status = status;
          // merge collection
          return from(transactionMap).pipe(
            mergeMap((transactionSubCollection) => {
              return this.transactionsService.getOne(transactionSubCollection.id).pipe(
                // map to combine user transactions sub-collection to collection
                map(transactionCollection => ({transactionSubCollection, transactionCollection}))
              );
            }),
            reduce((a, i) => [...a, i], [])
          );
        }),
      ))
    // tslint:disable-next-line: deprecation
    ).subscribe((transactions) => {
      const transactionArray = [];
      transactions.forEach(element => {
        transactionArray.push({...element.transactionCollection, ...element.transactionSubCollection});
      });
      this.transactionListener.next(transactionArray);
    });

    // get onservable transactions
    this.transactions$ = this.getTransactionListener();
  }


  filterStatus(event: any) {
    this.status$.next(event.detail.value);
  }

  onDetail(transactionDetail: any, ionItemSliding: IonItemSliding) {
    this.subs.sink = from(this.modalController.create({
      component: DetailComponent,
      componentProps: {
        title: 'Detail',
        transactionData: transactionDetail
      },
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl
    // tslint:disable-next-line: deprecation
    })).subscribe((modalEl) => {
      modalEl.present();
      ionItemSliding.closeOpened();
    });
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
