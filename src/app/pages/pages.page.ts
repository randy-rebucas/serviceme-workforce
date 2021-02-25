import { Component, OnDestroy, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Plugins, Capacitor } from '@capacitor/core';
import { from, Observable } from 'rxjs';
import { SubSink } from 'subsink';
import { AuthService } from '../auth/auth.service';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { map, switchMap } from 'rxjs/operators';
import { Address } from './users/users';
import { UsersService } from './users/users.service';
import firebase from 'firebase/app';

@Component({
  selector: 'app-pages',
  templateUrl: './pages.page.html',
  styleUrls: ['./pages.page.scss'],
})
export class PagesPage implements OnInit, OnDestroy {
  public user$: Observable<firebase.User>;
  public subs = new SubSink();
  public isClient: boolean;
  public isPro: boolean;
  public isAdmin: boolean;

  constructor(
    private router: Router,
    private http: HttpClient,
    private alertController: AlertController,
    private authService: AuthService,
    private usersService: UsersService
  ) { }

  ngOnInit() {
    this.user$ = from(this.authService.getCurrentUser());

    this.subs.sink = this.user$.subscribe((user) => {
      user.getIdTokenResult().then((idTokenResult) => {
        this.isClient = idTokenResult.claims.client;
        this.isPro = idTokenResult.claims.pro;
        this.isAdmin = idTokenResult.claims.admin;
      });
      this.getUserInfo(user.uid);
    });
  }

  private getUserInfo(userId: string) {
    this.subs.sink = this.usersService.getOne(userId).subscribe((user) => {
      if (!user.address) {
        console.log('address created.');
        this.locateUser();
      }
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
  }

  private locateUser() {
    if (!Capacitor.isPluginAvailable('Geolocation')) {
      return;
    }
    this.subs.sink = from(Plugins.Geolocation.getCurrentPosition()).subscribe((geoPosition) => {
      this.pointLocation(geoPosition.coords);
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
  }

  private pointLocation(coordinates: any) {
    this.subs.sink = this.getAddress(coordinates.latitude, coordinates.longitude).subscribe(address => {
      this.updateLocation(address);
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
  }

  private updateLocation(address: Address) {
    const currentAddress = {
        city: address.city, // 'Noveleta',
        country: address.country, // 'Philippines',
        state: address.state, // 'Cavite'
    };
    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        return this.usersService.update(user.uid, { address: currentAddress });
      })
    ).subscribe(() => {}, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
  }

  private getAddress(lat: number, lng: number) {
    return this.http.get<any>(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${
          environment.googleMapsApiKey
        }`
      ).pipe(
        map(geoData => {
          if (!geoData || !geoData.results || geoData.results.length === 0) {
            return null;
          }
          const addressComponent = geoData.results[0].address_components;
          const address = {
            city: addressComponent[1].long_name,
            state: addressComponent[2].long_name,
            country: addressComponent[4].long_name
          };
          return address;
        })
      );
  }

  onLogout() {
    this.subs.sink = from(this.alertController.create({
      header: 'Confirmation Logout',
      message: 'Are you sure to logout?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {}
        }, {
          text: 'Yes',
          handler: () => {
            this.authService.signOut().then(() => {
              this.router.navigate(['/auth']);
            });
          }
        }
      ]
    })).subscribe((alertEl) => {
      alertEl.present();
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
