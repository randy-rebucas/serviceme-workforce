import { Component, Inject, LOCALE_ID, OnDestroy, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { AlertController, ModalController, NavParams } from '@ionic/angular';
import { from, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { SubSink } from 'subsink';
import firebase from 'firebase/app';
import { TransactionsService } from '../../transactions/transactions.service';
import { UsersService } from '../../users/users.service';
import { SettingsService } from '../../settings/settings.service';
import { environment } from 'src/environments/environment';
import { formatCurrency, getCurrencySymbol } from '@angular/common';

export interface QRCodeData {
  uid: string;
  referenceNumber: string;
  amount: number;
  message: string;
}
@Component({
  selector: 'app-preview',
  templateUrl: './preview.component.html',
  styleUrls: ['./preview.component.scss'],
})
export class PreviewComponent implements OnInit, OnDestroy {
  public form: FormGroup;
  public title: string;
  public type: string;
  public enoughBalance: boolean;
  public defaultCurrency: string;
  public currentBalance: number;
  public qrCode$: Observable<QRCodeData>;
  public scannedData: QRCodeData;

  private subs = new SubSink();
  constructor(
    private navParams: NavParams,
    private modalController: ModalController,
    private alertController: AlertController,
    private transactionsService: TransactionsService,
    private authService: AuthService,
    private userService: UsersService,
    private settingsService: SettingsService,
    @Inject(LOCALE_ID) private locale: string
  ) {
    this.enoughBalance = true;
    this.title = this.navParams.data.title;
    this.type = this.navParams.data.type;
    this.qrCode$ = of(this.navParams.data.scannedData).pipe(
      map((scanedData) => {
        const infoData = scanedData.split('?')[1];
        return {
          uid: scanedData.split('?')[0].split(':')[1],
          referenceNumber: infoData.split('&')[0].split('=')[1],
          amount: Number(infoData.split('&')[1].split('=')[1]),
          message: infoData.split('&')[2].split('=')[1]
        };
      })
    );

    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        return this.settingsService.getOne(user.uid);
      })
    // tslint:disable-next-line: deprecation
    ).subscribe((settings) => {
      this.defaultCurrency = (settings) ? settings.currency : environment.defaultCurrency;
    });
  }

  private getBalance() {
    return from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        return this.userService.getSubCollection(user.uid, 'receipts').pipe(
          map((receipts) => {
            let balance = 0;
            receipts.forEach(receipt => {
              balance += receipt.amount;
            });
            return balance;
          })
        );
      })
    );
  }

  private onCheckBalance(serviceCharge: number) {
    // tslint:disable-next-line: deprecation
    this.getBalance().subscribe((currentBalance) => {
      this.currentBalance = currentBalance;
      if (currentBalance < Number(this.scannedData.amount)) {
        this.subs.sink = from(this.alertController.create(
          {
            header: 'Insufficient balance!',
            message: `Your current balance is ${formatCurrency(currentBalance, this.locale, getCurrencySymbol(this.defaultCurrency, 'narrow'))}`,
            buttons: [
              {
                text: 'Cancel',
                role: 'cancel',
                cssClass: 'secondary',
                handler: () => {}
              }, {
                text: 'Ok',
                handler: () => {
                  this.enoughBalance = false;
                }
              }
            ],
            backdropDismiss: false,
            keyboardClose: false
          }
        // tslint:disable-next-line: deprecation
        )).subscribe((alertEl) => {
          alertEl.present();
        });
      }
    });
  }

  ngOnInit() {
    // tslint:disable-next-line: deprecation
    this.qrCode$.subscribe((response) => {
      this.scannedData = response;
    });

    this.onCheckBalance(Number(this.scannedData.amount));
  }

  onCheckReference(data: QRCodeData) {
    this.transactionsService.getOne(data.referenceNumber);
  }

  onDismiss(state: boolean) {
    this.modalController.dismiss({
      dismissed: state
    });
  }

  onPay() {
    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      switchMap((currentUser) => {
        const transactionData = {
          userId: currentUser.uid,
          refference: this.scannedData.referenceNumber,
          transactionDate: firebase.firestore.Timestamp.fromDate(new Date()),
          description: this.scannedData.message,
          entries: [
            {
              account: 'Cash',
              debit: Number(this.scannedData.amount),
              credit: 0
            },
            {
              account: 'Expense',
              debit: 0,
              credit: Number(this.scannedData.amount)
            }
          ],
        };

        return from(this.transactionsService.insert(transactionData)).pipe(
          switchMap((transaction) => {
            return this.userService.setSubCollection(
              currentUser.uid,
              'receipts',
              transaction.id,
              {amount: -Number(this.scannedData.amount)}
            );
          })
        );
      })
    // tslint:disable-next-line: deprecation
    ).subscribe(() => {
      this.onReceive();
    });
  }

  onReceive() {
    const transactionData = {
      userId: this.scannedData.uid,
      refference: this.scannedData.referenceNumber,
      transactionDate: firebase.firestore.Timestamp.fromDate(new Date()),
      description: this.scannedData.message,
      entries: [
        {
          account: 'Expense',
          debit: Number(this.scannedData.amount),
          credit: 0
        },
        {
          account: 'Cash',
          debit: 0,
          credit: Number(this.scannedData.amount)
        }
      ],
    };

    this.subs.sink = from(this.transactionsService.insert(transactionData)).pipe(
      switchMap((transaction) => {
        return this.userService.setSubCollection(
          this.scannedData.uid,
          'receipts',
          transaction.id,
          {amount: Number(this.scannedData.amount)}
        );
      })
    // tslint:disable-next-line: deprecation
    ).subscribe(() => {
      this.onDismiss(true);
    });
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
