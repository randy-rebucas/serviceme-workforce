import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
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
export class FormComponent implements OnInit, AfterViewInit, OnDestroy {
  public availablityList: Availability[] = [
    {id: 1, title: 'Monday'},
    {id: 2, title: 'Tuesday'},
    {id: 3, title: 'Wednesday'},
    {id: 4, title: 'Thursday'},
    {id: 5, title: 'Friday'},
    {id: 6, title: 'Saturday'},
    {id: 7, title: 'Sunday'}
  ];

  public availablities: any[];
  public form: FormGroup;
  public user$: Observable<any>;
  public subs = new SubSink();
  public countries: any[] = [];
  public classifications: Classification[];
  public isClient: boolean;
  public isPro: boolean;
  public isAdmin: boolean;
  public currentClassification: string;
  public currentCountry: string;
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
    this.subs.sink = from(this.authService.getCurrentUser()).subscribe((user) => {
      user.getIdTokenResult().then((idTokenResult) => {
        this.isClient = idTokenResult.claims.client;
        this.isPro = idTokenResult.claims.pro;
        this.isAdmin = idTokenResult.claims.admin;
      });
    });

    this.subs.sink = this.classificationsService.getAll().subscribe((classifications) => {
      this.classifications = classifications;
    });

    this.subs.sink = this.country.allCountries().pipe(
      map((countryList) => {
        return Object.keys(countryList).map(k => countryList[k]);
      }),
    ).subscribe((countryResponse) => {
      this.countries = countryResponse.filter(countries => countries.name === 'Philippines');
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
  }

  ngAfterViewInit() {
    this.subs.sink = this.user$.subscribe((user) => {
      this.currentClassification = user.classification;
      this.availablities = user.availability;
      this.currentCountry = user.address?.country;

      this.form.patchValue({
        firstname: user.name.firstname,
        midlename: user.name.midlename,
        lastname: user.name.lastname,
        gender: user.gender,
        address1: user.address?.address1,
        address2: user.address?.address2,
        city: user.address?.city,
        state: user.address?.state,
        postalCode: user.address?.postalCode,
        country:  user.address?.country
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
    const patchdUser = {
      name: {
        firstname: this.form.value.firstname,
        midlename: this.form.value.midlename,
        lastname: this.form.value.lastname
      },
      gender: this.form.value.gender,
      address: {
        address1: this.form.value.address1,
        address2: this.form.value.address2,
        state: this.form.value.state,
        city: this.form.value.city,
        country: this.form.value.country,
        postalCode: this.form.value.postalCode
      }
    };

    this.subs.sink = from(this.userService.update(userId, patchdUser)).subscribe(() => {
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

  onSelectClassification(event: CustomEvent) {
    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        return this.userService.update(user.uid, { classification: event.detail.value });
      })
    ).subscribe(() => {}, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
  }

  compareAvailablity(o1: Availability, o2: Availability | Availability[]) {
    if (!o1 || !o2) {
      return o1 === o2;
    }

    if (Array.isArray(o2)) {
      return o2.some((u: Availability) => u.id === o1.id);
    }

    return o1.id === o2.id;
  }

  onSelectAvailability(event: CustomEvent) {
    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        return this.userService.update(user.uid, { availability: event.detail.value });
      })
    ).subscribe(() => {}, (error: any) => {
      this.presentAlert(error.code, error.message);
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
