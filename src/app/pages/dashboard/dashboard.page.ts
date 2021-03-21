import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { from, Observable, of, Subject } from 'rxjs';
import { AuthService } from 'src/app/auth/auth.service';
import { ActionSheetController, AlertController, ToastController } from '@ionic/angular';
import { UsersService } from '../users/users.service';
import { Users } from '../users/users';
import { AdminFunctionService } from 'src/app/shared/services/admin-function.service';
import { filter, map, mergeMap, reduce, switchMap, toArray } from 'rxjs/operators';
import { SubSink } from 'subsink';
import { Router } from '@angular/router';
import { PaymentsService } from '../payments/payments.service';
import { MyTransactions, Transactions } from '../transactions/transactions';
import { TransactionsService } from '../transactions/transactions.service';
import { SettingsService } from '../settings/settings.service';
import firebase from 'firebase/app';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit, AfterViewInit, OnDestroy {
  public isClient: boolean;
  public isPro: boolean;
  public isAdmin: boolean;
  public currenctBalance: number;
  public currentUser$: Observable<firebase.User>;
  public transactions$: Observable<any[]>;
  public lists$: Observable<any>;
  public user: Users[];
  private transactionListener = new Subject<any>();
  private defaultCurrency: string;
  private subs = new SubSink();

  constructor(
    private alertController: AlertController,
    private actionSheetController: ActionSheetController,
    private toastController: ToastController,
    private router: Router,
    private authService: AuthService,
    private adminFunctionService: AdminFunctionService,
    private usersService: UsersService,
    private paymentsService: PaymentsService,
    private transactionService: TransactionsService,
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
  }

  getTransactionListener() {
    return this.transactionListener.asObservable();
  }

  ngOnInit() {
    this.currentUser$ = from(this.authService.getCurrentUser());

    this.subs.sink = this.currentUser$.subscribe((user) => {
      user.getIdTokenResult().then((idTokenResult) => {
        this.isClient = idTokenResult.claims.client;
        this.isPro = idTokenResult.claims.pro;
        this.isAdmin = idTokenResult.claims.admin;
      });
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });

    this.lists$ = this.usersService.getAll().pipe(
      map((users) => {
        return users.filter((usersList) => {
          return usersList.roles.pro === true;
        });
      }),
      mergeMap((usersMerge) => {
        return from(usersMerge).pipe(
          mergeMap((user) => {
            return this.adminFunctionService.getById(user.id).pipe(
              map(admin => ({ user, admin })),
            );
          }),
          reduce((a, i) => [...a, i], []),
        );
      })
    );

    from(this.authService.getCurrentUser()).pipe(
      // get all transactions
      switchMap((user) => this.usersService.getSubCollection(user.uid, 'transactions').pipe(
        // transactions response
        mergeMap((transactionMap: any[]) => {
          // merge collection
          return from(transactionMap).pipe(
            mergeMap((transactionSubCollection) => {
              return this.transactionService.getOne(transactionSubCollection.id.trim()).pipe(
                // map to combine user transactions sub-collection to collection
                map(transactionCollection => ({transactionSubCollection, transactionCollection})),
                // filter by status
                filter(transactionStatus => transactionStatus.transactionCollection.status === 'completed')
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

    this.subs.sink = from(this.transactions$).subscribe((transactions) => {
      let balance = 0;
      transactions.forEach(transaction => {
        balance += transaction.transactionSubCollection.balance;
      });
      // set current balance observable value
      this.transactionService.setBalance(balance);
    });
  }

  ngAfterViewInit() {
    this.subs.sink = this.transactionService.getBalance().subscribe((balance) => {
      this.currenctBalance = balance;
    });

    this.subs.sink = this.currentUser$.subscribe((user) => {
      if (!user.emailVerified) {
        from(this.alertController.create(
          {
            header: 'Verification!',
            message: 'Your account is not yet verified! Please check your email.',
            buttons: [
              {
                text: 'Cancel',
                role: 'cancel',
                cssClass: 'secondary',
                handler: () => {}
              }, {
                text: 'Ok',
                handler: () => {
                  this.authService.signOut();
                }
              }
            ]
          }
        )).subscribe((alertEl) => {
          alertEl.present();
        });
      }
    });
  }

  presentAlert(alertHeader: string, alertMessage: string) {
    this.subs.sink = from(this.alertController.create({
      header: alertHeader, // alert.code,
      message: alertMessage, // alert.message,
      buttons: ['OK']
    })).subscribe(alertEl => {
        alertEl.present();
    });
  }

  onPickMethods() {
    this.subs.sink = from(this.actionSheetController.create(
      {
        header: 'Select Methods',
        cssClass: 'custom-action-sheets',
        buttons: [{
          text: 'Paypal',
          icon: 'logo-paypal',
          handler: () => {
            this.paymentsService.setMethod('paypal');
            this.router.navigate(['/pages/payments']);
          }
        }, {
          text: 'Alipay',
          icon: 'logo-alipay',
          handler: () => {
            this.toastController.create({
              message: 'Sorry for inconvenience. Alipay is under maintenance!',
              duration: 5000
            }).then((toastEl) => {
              toastEl.present();
            });
          }
        }, {
          text: 'Cancel',
          icon: 'close',
          role: 'cancel',
          handler: () => {}
        }]
      }
    )).subscribe(actionEl => {
      actionEl.present();
    });
  }

  navigateTo() {
    this.router.navigate(['/pages/payments']);
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
