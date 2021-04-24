import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { AlertController, LoadingController, ModalController, NavParams } from '@ionic/angular';
import { BehaviorSubject, from, Observable, of } from 'rxjs';
import { AuthService } from 'src/app/auth/auth.service';
import { Classification } from 'src/app/shared/classes/classification';
import { ClassificationsService } from 'src/app/shared/services/classifications.service';
import { CountriesService } from 'src/app/shared/services/countries.service';
import { SubSink } from 'subsink';
import { UsersService } from '../../users/users.service';
import firebase from 'firebase/app';
import { map, switchMap } from 'rxjs/operators';

export class Availability {
  constructor(
      public id: number,
      public title: string
  ) {}
}
@Component({
  selector: 'app-form',
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.scss'],
})
export class FormComponent implements OnInit, OnDestroy {
  public form: FormGroup;
  public user$: Observable<any>;
  public subs = new SubSink();
  public countries: any[] = [];
  public maxDate: Date;
  constructor(
    private formBuilder: FormBuilder,
    private navParams: NavParams,
    private alertController: AlertController,
    private modalController: ModalController,
    private loadingController: LoadingController,
    private country: CountriesService,
    private userService: UsersService,
    private authService: AuthService
  ) {
    this.user$ = from(this.navParams.data.user);

    const now = new Date();
    now.setFullYear(now.getFullYear() - 16);
    this.maxDate = new Date(now.toISOString().slice(0, 10));
  }

  ngOnInit() {
    this.subs.sink = this.country.allCountries().pipe(
      map((countryList) => {
        return Object.keys(countryList).map(k => countryList[k]);
      }),
    // tslint:disable-next-line: deprecation
    ).subscribe((countryResponse) => {
      this.countries = countryResponse.filter(countries => countries.name === 'Philippines');
    });

    this.form = this.formBuilder.group({
        name: this.formBuilder.group({
          firstname: new FormControl(null, {
            updateOn: 'blur',
            validators: [Validators.required, Validators.maxLength(50)]
          }),
          midlename: new FormControl(null, {
            updateOn: 'blur',
            validators: [Validators.required, Validators.maxLength(50)]
          }),
          lastname: new FormControl(null, {
            updateOn: 'blur',
            validators: [Validators.required, Validators.maxLength(50)]
          })
        }),
        gender: new FormControl(null, {
          updateOn: 'blur',
          validators: [Validators.required]
        }),
        birthdate: new FormControl(null, {
          updateOn: 'blur',
          validators: [Validators.required]
        }),
        address: this.formBuilder.group({
          address1: new FormControl(null, {
            updateOn: 'blur',
            validators: [Validators.required, Validators.maxLength(250)]
          }),
          address2: new FormControl(null, {
            updateOn: 'blur',
            validators: [Validators.maxLength(250)]
          }),
          city: new FormControl(null, {
            updateOn: 'blur',
            validators: [Validators.required, Validators.maxLength(150)]
          }),
          state: new FormControl(null, {
            updateOn: 'blur',
            validators: [Validators.required, Validators.maxLength(150)]
          }),
          postalCode: new FormControl(null, {
            updateOn: 'blur',
            validators: [Validators.required, Validators.maxLength(6)]
          }),
          country: new FormControl(null, {
            updateOn: 'blur',
            validators: [Validators.required]
          })
        })
    });

    // tslint:disable-next-line: deprecation
    from(this.authService.getCurrentUser()).pipe(
      switchMap((auhtUser) => {
        return this.userService.getOne(auhtUser.uid);
      })
    // tslint:disable-next-line: deprecation
    ).subscribe((user) => {
      console.log(user);
      this.form.patchValue({
        name: user.name,
        gender: user.gender,
        birthdate: user.birthdate,
        address: user.address
      });
    });
  }

  onDismiss(state: boolean, userData?: any) {
    this.modalController.dismiss({
      dismissed: state,
      user: userData
    });
  }

  get formCtrls() {
    return this.form.controls;
  }

  get formNameCtrls() { return this.form.get('name') as FormGroup; }

  get formAddressCtrls() { return this.form.get('address') as FormGroup; }

  onUpdate() {
    this.subs.sink = from(this.loadingController.create({
      message: 'Updating Profile...'
    // tslint:disable-next-line: deprecation
    })).subscribe(loadingEl => {
      loadingEl.present();
      // this.getUser();
      from(this.authService.getCurrentUser()).pipe(
        switchMap((user) => {
          return from(this.userService.update(user.uid, this.form.value));
        })
      // tslint:disable-next-line: deprecation
      ).subscribe(() => {
        loadingEl.dismiss();
        this.onDismiss(true, this.form.value);
      }, (error: any) => {
        this.loadingController.dismiss();
        this.presentAlert(error.code, error.message);
      });
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
