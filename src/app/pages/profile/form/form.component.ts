import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AlertController, LoadingController, ModalController, NavParams } from '@ionic/angular';
import { from, Observable } from 'rxjs';
import { AuthService } from 'src/app/auth/auth.service';
import { Classification } from 'src/app/shared/classes/classification';
import { ClassificationsService } from 'src/app/shared/services/classifications.service';
import { CountriesService } from 'src/app/shared/services/countries.service';
import { SubSink } from 'subsink';
import { UsersService } from '../../users/users.service';

@Component({
  selector: 'app-form',
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.scss'],
})
export class FormComponent implements OnInit, AfterViewInit, OnDestroy {
  public form: FormGroup;
  public user$: Observable<any>;
  public subs = new SubSink();
  public countries: any[] = [];
  public classifications: Classification[];

  constructor(
    private navParams: NavParams,
    private alertController: AlertController,
    private modalController: ModalController,
    private loadingController: LoadingController,
    private country: CountriesService,
    private userService: UsersService,
    private authService: AuthService,
    private classificationsService: ClassificationsService
  ) {
    this.user$ = from(this.navParams.data.user);
  }

  ngOnInit() {
    this.classificationsService.getAll().subscribe((classifications) => {
      this.classifications = classifications;
    });

    this.form = new FormGroup({
      firstname: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required, Validators.maxLength(50)]
      }),
      midlename: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required, Validators.maxLength(2)]
      }),
      lastname: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required, Validators.maxLength(50)]
      }),
      gender: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required]
      }),
      classification: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required]
      }),
      phoneNumber: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.maxLength(12)]
      }),
      address1: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required, Validators.maxLength(150)]
      }),
      address2: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.maxLength(150)]
      }),
      city: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required, Validators.maxLength(50)]
      }),
      state: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required, Validators.maxLength(50)]
      }),
      postalCode: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required, Validators.maxLength(6)]
      }),
      country: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required]
      })
    });

    const newCountries = [];
    this.subs.sink = this.country.allCountries().subscribe((countries) => {
      for (const key in countries) {
        if (Object.prototype.hasOwnProperty.call(countries, key)) {
          const element = countries[key];
          newCountries.push({value: element.name, viewValue: element.name});
        }
      }
      this.countries = newCountries;
    });
  }

  ngAfterViewInit() {
    this.user$.subscribe((user) => {
      this.form.patchValue({
        firstname: user.name.firstname,
        midlename: user.name.midlename,
        lastname: user.name.lastname,
        gender: user.gender,
        classification: user.classification,
        address1: user.address.address1,
        address2: user.address.address2,
        city: user.address.city,
        state: user.address.state,
        postalCode: user.address.postalCode,
        country:  user.address.country
      });
    });
  }

  onDismiss(state: boolean) {
    this.modalController.dismiss({
      dismissed: state
    });
  }

  get formCtrls() {
    return this.form.controls;
  }

  doUpdate(userId: string) {
    const updatedUser = {
      name: {
        firstname: this.form.value.firstname,
        midlename: this.form.value.midlename,
        lastname: this.form.value.lastname
      },
      gender: this.form.value.gender,
      classification: this.form.value.classification,
      address: {
        address1: this.form.value.address1,
        address2: this.form.value.address2,
        state: this.form.value.state,
        city: this.form.value.city,
        country: this.form.value.country,
        postalCode: this.form.value.postalCode
      }
    };
    this.subs.sink = from(this.userService.update(userId, updatedUser)).subscribe(() => {
      this.loadingController.dismiss();
      this.onDismiss(true);
    }, (error: any) => {
      this.loadingController.dismiss();
      this.presentAlert(error.code, error.message);
    });
  }

  getUser() {
    this.subs.sink = from(this.authService.getCurrentUser()).subscribe((user) => {
      this.doUpdate(user.uid);
    });
  }

  onUpdate() {
    this.subs.sink = from(this.loadingController.create({
      message: 'Updating Profile...'
    })).subscribe(loadingEl => {
      loadingEl.present();
      this.getUser();
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
