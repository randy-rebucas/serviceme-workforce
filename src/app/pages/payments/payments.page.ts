import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AlertController, LoadingController } from '@ionic/angular';
import { from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { SubSink } from 'subsink';
import { SettingsService } from '../settings/settings.service';
import firebase from 'firebase/app';
import { TransactionsService } from '../transactions/transactions.service';
import { UsersService } from '../users/users.service';
import { PaymentsService } from './payments.service';
import { PayPal, PayPalConfiguration, PayPalPayment } from '@ionic-native/paypal/ngx';
import { environment } from 'src/environments/environment';
import { Transactions } from '../transactions/transactions';

// const payPalClientId = environment.payPalClientId;
// const payPalEnv = environment.payPalEnv;

@Component({
  selector: 'app-payments',
  templateUrl: './payments.page.html',
  styleUrls: ['./payments.page.scss'],
})
export class PaymentsPage implements OnInit, OnDestroy {
  public form: FormGroup;
  private defaultCurrency: string;
  private initialDeposit: number;
  private shortDescription: string;
  private method: string;
  private subs = new SubSink();

  constructor(
    private authService: AuthService,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private settingsService: SettingsService,
    private transactionsService: TransactionsService,
    private userService: UsersService,
    private paymentsService: PaymentsService,
    private payPal: PayPal,
  ) {
    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        return this.settingsService.getOne(user.uid);
      })
    ).subscribe((settings) => {
      this.defaultCurrency = (settings) ? settings.currency : 'USD';
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });

    this.initialDeposit = 100;
    this.shortDescription = 'Cash In';
  }

  ngOnInit() {
    this.paymentsService.getCurrentMethod().subscribe((methodResponse) => {
      this.method = methodResponse;
    });

    this.form = new FormGroup({
      amount: new FormControl(this.initialDeposit, {
        updateOn: 'blur',
        validators: [Validators.required, Validators.maxLength(8)]
      })
    });
  }

  onInput(value: any) {
    let input = value.replace(/[\D\s\._\-]+/g, '');
    input = input ? parseInt( input, 10 ) : 0;
    this.formCtrls.amount.setValue(( input === 0 ) ? '' : input.toLocaleString( 'en-US' ));
  }

  get formCtrls() { return this.form.controls; }

  // setSubCollection(user: firebase.User, transaction: any) {
  //   this.subs.sink = from(this.userService.setSubCollection(user.uid, 'transactions', transaction.id, { userId: user.uid }))
  //   .subscribe(() => {
  //     this.form.reset();
  //     this.loadingController.dismiss();
  //   });
  // }

  // setTransactionData( payPalId: string) {
  //   this.subs.sink = from(this.authService.getCurrentUser()).subscribe((user) => {
  //     const amount = this.form.value.amount;
  //     const transactionData  = {
  //       amount: Number(amount.replace(/[^0-9.-]+/g, '')),
  //       currency: this.defaultCurrency,
  //       description: this.shortDescription,
  //       timestamp: firebase.firestore.Timestamp.fromDate(new Date()),
  //       ref: payPalId,
  //       status: 'completed',
  //       type: 'payment'
  //     };

  //     this.subs.sink = this.subs.sink = from(this.transactionsService.insert(transactionData)).subscribe((transaction) => {
  //       this.setSubCollection(user, transaction);
  //     }, (error: any) => {
  //       this.loadingController.dismiss();
  //       this.presentAlert(error.code, error.message);
  //     });
  //   });
  // }

  // paypalPayment() {
  //   const payment = new PayPalPayment(this.form.value.amount, this.defaultCurrency, this.shortDescription, 'sale');
  //   this.subs.sink = from(this.payPal.renderSinglePaymentUI(payment)).subscribe((paypalResponse) => {
  //     this.setTransactionData(paypalResponse);
  //   }, (error: any) => {
  //     this.loadingController.dismiss();
  //     this.presentAlert(error.code, error.message);
  //   });
  // }

  // paypalRender() {
  //   this.subs.sink = from(this.payPal.prepareToRender(payPalEnv, new PayPalConfiguration({
  //     // Only needed if you get an "Internal Service Error" after PayPal login!
  //     // payPalShippingAddressOption: 2 // PayPalShippingAddressOptionPayPal
  //   }))).subscribe(() => {
  //     this.paypalPayment();
  //   }, (error: any) => {
  //     this.loadingController.dismiss();
  //     this.presentAlert(error.code, error.message);
  //   });
  // }

  // doCashIn() {
  //   this.subs.sink = from(this.payPal.init({
  //     PayPalEnvironmentProduction: payPalClientId,
  //     PayPalEnvironmentSandbox: payPalClientId
  //   })).subscribe(() => {
  //     this.paypalRender();
  //   }, (error: any) => {
  //     this.loadingController.dismiss();
  //     this.presentAlert(error.code, error.message);
  //   });
  // }

  // onCashIn() {
  //   this.subs.sink = from(this.loadingController.create({
  //     message: 'Please wait...'
  //   })).subscribe(loadingEl => {
  //     loadingEl.present();
  //     this.doCashIn();
  //   });
  // }

  presentAlert(alertHeader: string, alertMessage: string) {
    this.subs.sink = from(this.alertController.create({
      header: alertHeader, // alert.code,
      message: alertMessage, // alert.message,
      buttons: ['OK']
    })).subscribe(alertEl => {
        alertEl.present();
    });
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
