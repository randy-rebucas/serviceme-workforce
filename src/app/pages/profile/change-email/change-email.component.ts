import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AlertController, LoadingController, ModalController } from '@ionic/angular';
import { from } from 'rxjs';
import { AuthService } from 'src/app/auth/auth.service';
import { SubSink } from 'subsink';

@Component({
  selector: 'app-change-email',
  templateUrl: './change-email.component.html',
  styleUrls: ['./change-email.component.scss'],
})
export class ChangeEmailComponent implements OnInit, OnDestroy {
  public form: FormGroup;
  private subs = new SubSink();

  constructor(
    private modalController: ModalController,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.form = new FormGroup({
      oldPass: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required, Validators.maxLength(8)]
      }),
      email: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required, Validators.email, Validators.maxLength(50)]
      })
    });
  }

  onDismiss(status: boolean, newEmail?: string) {
    this.modalController.dismiss({
      dismissed: status, // true
      email: newEmail
    });
  }

  get formCtrls() {
    return this.form.controls;
  }

  checkEmailExist() {
    from(this.authService.checkEmailExist(this.form.value.email)).subscribe((response) => {
      console.log(response);
      if (response.length === 0) {
        this.doUpdateEmail();
      } else {
        this.loadingController.dismiss();
        this.presentAlert('Email cheking...', 'Email is already in used!');
      }
    });
  }

  doUpdateEmail() {
    this.subs.sink = from(this.authService.updateEmail(this.form.value.email)).subscribe(() => {
      this.loadingController.dismiss();
      this.onDismiss(true, this.form.value.email);
    }, (error: any) => {
      this.loadingController.dismiss();
      this.presentAlert(error.code, error.message);
    });
  }

  checkCurrentEmail() {
    this.subs.sink = from(this.authService.getCurrentUser()).subscribe((user) => {
      if (user.email !== this.form.value.email) {
        this.checkEmailExist();
      } else {
        this.loadingController.dismiss();
        this.presentAlert('Email cheking...', 'You entered email you currently used!');
      }
    }, (error: any) => {
      this.loadingController.dismiss();
      this.presentAlert(error.code, error.message);
    });
  }

  reAuthenticate() {
    this.subs.sink = from(this.authService.reauthenticate(this.form.value.oldPass)).subscribe(() => {
      this.checkCurrentEmail();
    }, (error: any) => {
      this.loadingController.dismiss();
      this.presentAlert(error.code, error.message);
    });
  }

  onUpdate() {
    this.subs.sink = from(this.loadingController.create({
      message: 'Please wait...'
    })).subscribe(loadingEl => {
      loadingEl.present();
      console.log(this.form.value);
      this.reAuthenticate();
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
