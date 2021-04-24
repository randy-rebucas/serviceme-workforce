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
import { PayPal, PayPalConfiguration, PayPalPayment } from '@ionic-native/paypal/ngx';
import { environment } from 'src/environments/environment';


@Component({
  selector: 'app-payments',
  templateUrl: './payments.page.html',
  styleUrls: ['./payments.page.scss'],
})
export class PaymentsPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('box', {static: false}) inputEl: IonInput;
  public form: FormGroup;
  public currentDate: Date;
  public method: string;
  private defaultCurrency: string;
  private initialDeposit: number;
  private shortDescription: string;
  private subs = new SubSink();
  constructor(
    private authService: AuthService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private alertController: AlertController,
    private settingsService: SettingsService,
    private transactionsService: TransactionsService,
    private userService: UsersService,
    private payPal: PayPal,
  ) {
    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        return this.settingsService.getOne(user.uid);
      })
    // tslint:disable-next-line: deprecation
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
    // set deposit amount
    this.initialDeposit = environment.initialDeposit;

    this.form = new FormGroup({
      amount: new FormControl(this.initialDeposit, {
        updateOn: 'blur',
        validators: [Validators.required, Validators.maxLength(8)]
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

  get formCtrls() { return this.form.controls; }

  setSubCollection(transaction: any) {
    from(this.authService.getCurrentUser()).pipe(
      switchMap((currentUser) => {
        return from(this.userService.setSubCollection(currentUser.uid, 'receipts', transaction.id, {}));
      })
    // tslint:disable-next-line: deprecation
    ).subscribe(() => {
      this.toastController.create({
        message: 'Please wait, while we confirm your payment.',
        duration: 5000
      }).then((toastEl) => {
        toastEl.present();
      });
      this.form.reset();
      this.loadingController.dismiss();
    });
  }

  paypalPayment() {
    const amountValue = this.form.value.amount;
    const amount = amountValue.replace(/[^0-9.-]+/g, '');
    const payment = new PayPalPayment(amountValue, this.defaultCurrency, this.shortDescription, 'sale');
    // tslint:disable-next-line: deprecation
    this.subs.sink = from(this.payPal.renderSinglePaymentUI(payment))
    .pipe(
      switchMap((paypalResponse) => {
        if (paypalResponse.response.state === 'approved') {
          return from(this.authService.getCurrentUser()).pipe(
            switchMap((currentUser) => {
              const transactionData = {
                userId: currentUser.uid,
                refference: paypalResponse.response.id,
                transactionDate: firebase.database.ServerValue.TIMESTAMP,
                description: this.shortDescription,
                entries: [
                  {
                    account: 'Cash',
                    debit: Number(amount),
                    credit: 0
                  },
                  {
                    account: 'Accounts receivable',
                    debit: 0,
                    credit: Number(amount)
                  }
                ],
              };

              return from(this.transactionsService.insert(transactionData)).pipe(
                switchMap((transaction) => {
                  return this.userService.setSubCollection(currentUser.uid, 'receipts', transaction.id, {amount: Number(amount)});
                })
              );
            })
          );
        } else {
          this.presentAlert('Paypal response', 'Your paypal payment was ' + paypalResponse.response.state);
        }
      })
    // tslint:disable-next-line: deprecation
    ).subscribe(() => {}, (error: any) => {
      this.loadingController.dismiss();
      this.presentAlert(error.code, error.message);
    });
  }

  paypalRender() {
    this.subs.sink = from(this.payPal.prepareToRender(environment.payPalEnv, new PayPalConfiguration({
      // Only needed if you get an "Internal Service Error" after PayPal login!
      // payPalShippingAddressOption: 2 // PayPalShippingAddressOptionPayPal
    // tslint:disable-next-line: deprecation
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
    // tslint:disable-next-line: deprecation
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
    // tslint:disable-next-line: deprecation
    })).subscribe(loadingEl => {
      loadingEl.present();
      this.doCashIn();
    });
  }

  presentAlert(alertHeader: string, alertMessage: string) {
    this.subs.sink = from(this.alertController.create({
      header: alertHeader, // alert.code,
      message: alertMessage, // alert.message,
      buttons: ['OK']
    // tslint:disable-next-line: deprecation
    })).subscribe(alertEl => {
        alertEl.present();
    });
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
