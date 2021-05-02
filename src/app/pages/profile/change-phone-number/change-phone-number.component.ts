import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AlertController, LoadingController, ModalController } from '@ionic/angular';
import { from } from 'rxjs';
import { AuthService } from 'src/app/auth/auth.service';
import { SubSink } from 'subsink';
import firebase from 'firebase/app';
import { PhoneNumberValidator } from 'src/app/shared/directives/intl-phone-validation.directive';

@Component({
  selector: 'app-change-phone-number',
  templateUrl: './change-phone-number.component.html',
  styleUrls: ['./change-phone-number.component.scss'],
})
export class ChangePhoneNumberComponent implements OnInit, OnDestroy {
  public form: FormGroup;
  public windowRef: any;
  public formSubmited: boolean;
  private subs = new SubSink();
  constructor(
    private modalController: ModalController,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private authService: AuthService
  ) {
    this.formSubmited = false;
  }

  ngOnInit() {
    this.form = new FormGroup({
      phoneNumber: new FormControl(null, {
        updateOn: 'blur',
        validators: [
          Validators.required,
          Validators.maxLength(13),
          // PhoneNumberValidator('PH')
        ]
      })
    });
  }

  get formCtrls() { return this.form.controls; }

  onDismiss(status: boolean, phoneNumber?: string) {
    this.modalController.dismiss({
      dismissed: status, // true,
      phone: phoneNumber
    });
  }

  doUpdate() {
    const appVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {size: 'invisible'});
    const provider = new firebase.auth.PhoneAuthProvider();
    // tslint:disable-next-line: deprecation
    this.subs.sink = from(provider.verifyPhoneNumber(this.form.value.phoneNumber, appVerifier)).subscribe((verificationId) => {
        this.loadingController.dismiss();
        this.onUpdatePhone(verificationId);
    }, (error: any) => {
      this.loadingController.dismiss();
      this.presentAlert(error.code, error.message);
    });
  }

  onUpdatePhone(verificationId: any) {
    // prompt for username
    this.subs.sink = from(this.alertController.create({
      cssClass: 'my-custom-class',
      header: 'Verifications',
      message: 'Please enter the verification ' +
      'code that was sent to your mobile device.',
      inputs: [
        {
          name: 'verificationCode',
          type: 'text',
          value: '',
          placeholder: 'Enter Code'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
            this.loadingController.dismiss();
            this.onDismiss(false);
          }
        }, {
          text: 'Submit',
          handler: (data) => {
            const verificationCode = data.verificationCode;
            const phoneCredential = firebase.auth.PhoneAuthProvider.credential(verificationId, verificationCode);
            // tslint:disable-next-line: deprecation
            from(firebase.auth().currentUser.updatePhoneNumber(phoneCredential)).subscribe(() => {
              this.loadingController.dismiss();
              this.onDismiss(true, this.form.value.phoneNumber);
            }, (error: any) => {
              this.loadingController.dismiss();
              this.presentAlert(error.code, error.message);
            });
          }
        }
      ],
      backdropDismiss: false
    // tslint:disable-next-line: deprecation
    })).subscribe((promptEl) => {
      promptEl.present();
    });
  }

  onUpdate() {
    this.subs.sink = from(this.loadingController.create({
      message: 'Please wait...'
    })).subscribe(loadingEl => {
      loadingEl.present();
      this.doUpdate();
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
