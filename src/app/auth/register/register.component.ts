import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AlertController, LoadingController, ModalController } from '@ionic/angular';
import { BehaviorSubject, from } from 'rxjs';
import { SubSink } from 'subsink';
import { AuthService } from '../auth.service';
import firebase from 'firebase/app';
import { AdminFunctionService } from 'src/app/shared/services/admin-function.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent implements OnInit, OnDestroy {
  public form: FormGroup;
  public isChecked: boolean;
  private subs = new SubSink();
  private selectedType$: BehaviorSubject<string|null>;
  public selectedType: string;
  constructor(
    private modalController: ModalController,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private authService: AuthService,
    private adminFunctionService: AdminFunctionService
  ) {
    this.isChecked = false;
    this.selectedType$ = new BehaviorSubject(null);
  }

  ngOnInit() {
    this.selectedType$.subscribe((selectedType) => {
      this.selectedType = selectedType;
    });

    this.form = new FormGroup({
      firstname: new FormControl(null, {
        updateOn: 'blur',
        validators: [
          Validators.required,
          Validators.maxLength(30)
        ]
      }),
      lastname: new FormControl(null, {
        updateOn: 'blur',
        validators: [
          Validators.required,
          Validators.maxLength(30)
        ]
      }),
      email: new FormControl(null, {
        updateOn: 'blur',
        validators: [
          Validators.required,
          Validators.email,
          Validators.maxLength(50)
        ]
      }),
      password: new FormControl(null, {
        updateOn: 'blur',
        validators: [
          Validators.required,
          Validators.maxLength(12)
        ]
      }),
      confirmPassword: new FormControl(null, {
        updateOn: 'blur',
        validators: [
          Validators.required,
          Validators.maxLength(12)
        ]
      })
    }, {
      validators: this.passwordConfirm.bind(this)
    });
  }

  passwordConfirm(formGroup: FormGroup) {
    const password = formGroup.get('password').value;
    const confirmPassword = formGroup.get('confirmPassword').value;
    // compare is the password math
    if (password === confirmPassword) {
      return { passwordNotMatch: false };
    }
    return formGroup.get('confirmPassword').setErrors({passwordNotMatch: true});
  }

  get formCtrls() {
    return this.form.controls;
  }

  onPick(event: CustomEvent) {
    this.selectedType$.next(event.detail.value);
  }

  onReSelect() {
    this.selectedType$.next(null);
  }

  sendEmailVerification(userCredential: firebase.auth.UserCredential) {
    this.subs.sink = from(userCredential.user.sendEmailVerification()).subscribe(() => {
      this.loadingController.dismiss();
      // tslint:disable-next-line: max-line-length
      this.presentAlert('Verify your email', 'One last step to continue your registration. Check ou email and click on the link to verify.');
      this.form.reset();
      this.onDismiss(true);
    }, (error: any) => {
      this.loadingController.dismiss();
      this.presentAlert(error.code, error.message);
    });
  }

  setCustomClaims(userCredential: firebase.auth.UserCredential) {
    this.authService.setCustomClaims(userCredential.user.email, this.selectedType).subscribe(() => {
      this.sendEmailVerification(userCredential);
    }, (error: any) => {
      this.loadingController.dismiss();
      this.presentAlert(error.code, error.message);
    });
  }

  setUserData(userCredential: firebase.auth.UserCredential) {
    const userData = {
      name: {
        firstName: this.form.value.firstname,
        lastName: this.form.value.lastname,
        middleName: null
      },
      roles: {
        pro: (this.selectedType === 'pro') ? true : false,
        client: (this.selectedType === 'client') ? true : false
      }
    };

    this.subs.sink = from(this.authService.setUserData(userCredential.user.uid, userData)).subscribe(() => {
      this.setCustomClaims(userCredential);
    }, (error: any) => {
      this.loadingController.dismiss();
      this.presentAlert(error.code, error.message);
    });
  }

  doSignup(email: string, password: string) {
    this.subs.sink = from(this.authService.signUpWithEmail( email, password )).subscribe((signupResponse) => {
      this.setUserData(signupResponse);
    }, (error: any) => {
      this.loadingController.dismiss();
      this.presentAlert(error.code, error.message);
    });
  }

  onSignUp() {
    this.subs.sink = from(this.loadingController
    .create({
      message: 'Please wait...'
    })).subscribe(loadingEl => {
      loadingEl.present();
      this.doSignup(this.form.value.email, this.form.value.password);
    });
  }

  onCheck(event: CustomEvent) {
    this.isChecked = true;
  }

  onDismiss(state: boolean) {
    this.modalController.dismiss({
      dismissed: state
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
