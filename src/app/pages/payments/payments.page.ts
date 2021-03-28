import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AlertController, IonInput, LoadingController, ToastController } from '@ionic/angular';
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
import { Router } from '@angular/router';

@Component({
  selector: 'app-payments',
  templateUrl: './payments.page.html',
  styleUrls: ['./payments.page.scss'],
})
export class PaymentsPage implements OnInit, AfterViewInit, OnDestroy {
  public form: FormGroup;
  public formRequest: FormGroup;
  public currentDate: Date;
  public method: string;
  private defaultCurrency: string;
  private initialDeposit: number;
  private shortDescription: string;
  private subs = new SubSink();
  @ViewChild('box', {static: false}) inputEl: IonInput;
  constructor(
    private authService: AuthService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController,
    private settingsService: SettingsService,
    private transactionsService: TransactionsService,
    private userService: UsersService,
    private paymentsService: PaymentsService,
    private router: Router,
    private payPal: PayPal,
  ) {
    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        return this.settingsService.getOne(user.uid);
      })
    ).subscribe((settings) => {
      this.defaultCurrency = (settings) ? settings.currency : environment.defaultCurrency;
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });

    this.shortDescription = 'Deposit';
    this.currentDate = new Date();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.inputEl.setFocus();
    }, 200);
  }

  ngOnInit() {
    this.paymentsService.getCurrentMethod().subscribe((methodResponse) => {
      // check if method exist.
      if (!methodResponse) {
        this.router.navigate(['/pages']);
      }
      // set method
      this.method = methodResponse.method;
      // set deposit amount
      this.initialDeposit = (methodResponse.amount < environment.initialDeposit ) ? environment.initialDeposit : methodResponse.amount;
    });

    this.form = new FormGroup({
      amount: new FormControl(this.initialDeposit, {
        updateOn: 'blur',
        validators: [Validators.required, Validators.maxLength(8)]
      })
    });

    this.formRequest = new FormGroup({
      amount: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required, Validators.maxLength(8)]
      }),
      reference: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required, Validators.maxLength(15)]
      }),
      paidDate: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required]
      })
    });
  }

  onFocus(value: any) {
    this.formCtrls.amount.setValue(Number(value).toLocaleString('en-US'));
  }

  onInput(value: any) {
    let input = value.replace(/[\D\s\._\-]+/g, '');
    input = input ? parseInt( input, 10 ) : 0;
    this.formCtrls.amount.setValue(( input === 0 ) ? '' : input.toLocaleString( 'en-US' ));
  }

  onCustomInput(value: any) {
    let input = value.replace(/[\D\s\._\-]+/g, '');
    input = input ? parseInt( input, 10 ) : 0;
    this.formRequestCtrls.amount.setValue(( input === 0 ) ? '' : input.toLocaleString( 'en-US' ));
  }

  get formCtrls() { return this.form.controls; }

  get formRequestCtrls() { return this.formRequest.controls; }

  setSubCollection(user: firebase.User, transaction: any, amount: number) {
    this.subs.sink = from(this.userService.setSubCollection(user.uid, 'transactions', transaction.id, { balance: Number(amount) }))
    .subscribe(() => {
      if (this.method === 'remittance') {
        this.toastController.create({
          message: 'Please wait, while we confirm your payment.',
          duration: 5000
        }).then((toastEl) => {
          toastEl.present();
        });
      }
      this.formRequest.reset();
      this.loadingController.dismiss();
    });
  }

  setTransactionData(amount: number, refId: string, transactionDate: Date, transactionStatus: string) {
    this.subs.sink = from(this.authService.getCurrentUser()).subscribe((user) => {
      const transactionData  = {
        amount: Number(amount),
        currency: this.defaultCurrency,
        description: this.shortDescription,
        timestamp: firebase.firestore.Timestamp.fromDate(transactionDate),
        ref: refId,
        status: transactionStatus,
        type: 'payment'
      };

      this.subs.sink = this.subs.sink = from(this.transactionsService.insert(transactionData)).subscribe((transaction) => {
        this.setSubCollection(user, transaction, amount);
      }, (error: any) => {
        this.loadingController.dismiss();
        this.presentAlert(error.code, error.message);
      });
    });
  }

  paypalPayment() {
    const amountValue = this.form.value.amount;
    const amount = amountValue.replace(/[^0-9.-]+/g, '');
    const payment = new PayPalPayment('5', this.defaultCurrency, this.shortDescription, 'sale');
    this.subs.sink = from(this.payPal.renderSinglePaymentUI(payment)).subscribe((paypalResponse) => {
      // Example sandbox response
      //
      // {
      //   "client": {
      //     "environment": "sandbox",
      //     "product_name": "PayPal iOS SDK",
      //     "paypal_sdk_version": "2.16.0",
      //     "platform": "iOS"
      //   },
      //   "response_type": "payment",
      //   "response": {
      //     "id": "PAY-1AB23456CD789012EF34GHIJ",
      //     "state": "approved",
      //     "create_time": "2016-10-03T13:33:33Z",
      //     "intent": "sale"
      //   }
      // }
      this.setTransactionData(amount, paypalResponse.response.id, new Date(), 'completed');
    }, (error: any) => {
      this.loadingController.dismiss();
      this.presentAlert(error.code, error.message);
    });
  }

  paypalRender() {
    this.subs.sink = from(this.payPal.prepareToRender(environment.payPalEnv, new PayPalConfiguration({
      // Only needed if you get an "Internal Service Error" after PayPal login!
      // payPalShippingAddressOption: 2 // PayPalShippingAddressOptionPayPal
    }))).subscribe(() => {
      this.paypalPayment();
    }, (error: any) => {
      this.loadingController.dismiss();
      this.presentAlert(error.code, error.message);
    });
  }

  doCashIn() {
    this.subs.sink = from(this.payPal.init({
      PayPalEnvironmentProduction: environment.payPalProdClientId,
      PayPalEnvironmentSandbox: environment.payPalSandBoxClientId
    })).subscribe(() => {
      this.paypalRender();
    }, (error: any) => {
      this.loadingController.dismiss();
      this.presentAlert(error.code, error.message);
    });
  }

  onCashIn() {
    this.subs.sink = from(this.loadingController.create({
      message: 'Please wait...'
    })).subscribe(loadingEl => {
      loadingEl.present();
      this.doCashIn();
    });
  }

  doRequestCashIn() {
    const amountValue = this.formRequest.value.amount;
    const dateValue = new Date(this.formRequest.value.paidDate);
    const amount = amountValue.replace(/[^0-9.-]+/g, '');
    this.setTransactionData(amount, this.formRequest.value.reference, dateValue, 'pending');
  }

  onRequestCashIn() {
    this.subs.sink = from(this.loadingController.create({
      message: 'Please wait...'
    })).subscribe(loadingEl => {
      loadingEl.present();
      this.doRequestCashIn();
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

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
