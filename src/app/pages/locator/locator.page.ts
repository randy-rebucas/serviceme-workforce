import { Component, ElementRef, OnDestroy, OnInit, Renderer2, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, Platform } from '@ionic/angular';
import { Plugins, Capacitor } from '@capacitor/core';

import { BehaviorSubject, from } from 'rxjs';
import { SubSink } from 'subsink';
import { environment } from 'src/environments/environment';
import { Clipboard } from '@ionic-native/clipboard/ngx';
import { BookingsService } from '../bookings/bookings.service';
import { Coordinates } from '../bookings/bookings';
declare var google;

  // 2 / minute
  // 14 / succesding km
  // 40 flagdown rate
export interface Distance {
  text: string;
  value: number;
}

export interface Duration {
  text: string;
  value: number;
}

@Component({
  selector: 'app-locator',
  templateUrl: './locator.page.html',
  styleUrls: ['./locator.page.scss'],
})
export class LocatorPage implements OnInit, OnDestroy {
  @ViewChild('map', { static: false }) mapElementRef: ElementRef;
  public location: any;
  public isStart: boolean;
  private direction: Coordinates;
  private googleMaps: any;
  private directionsService: any;
  private directionsDisplay: any;
  private coords$: BehaviorSubject<any|null>;
  private watchId: any;
  private subs = new SubSink();
  constructor(
    private alertController: AlertController,
    private bookingService: BookingsService,
    private renderer: Renderer2,
    private platform: Platform,
    private clipboard: Clipboard,
    private router: Router
  ) {
    this.isStart = false;
    this.coords$ = new BehaviorSubject({});
  }

  ngOnInit() {
    // tslint:disable-next-line: deprecation
    this.subs.sink = this.bookingService.getBooking().subscribe((direction) => {
      if (Object.keys(direction).length === 0) {
        this.router.navigate(['/pages']);
      }
      this.location = direction.bookingDetails.location;
      this.direction = direction.bookingDetails.coordinates;
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });

    this.platform.ready().then(() => {
      // tslint:disable-next-line: deprecation
      this.subs.sink = from(Plugins.Geolocation.getCurrentPosition()).subscribe((geoPosition) => {
        const coordinates = {
          lat: +geoPosition.coords.latitude,
          lng: +geoPosition.coords.longitude
        };
        this.coords$.next(coordinates);

        this.onLocate();
      }, (error: any) => {
        this.presentAlert(error.code, error.message);
      });
    });
  }

  onStartLocate() {
    this.isStart = true;
    this.watchId = Plugins.Geolocation.watchPosition({timeout: 30000, enableHighAccuracy: true}, (position) => {
      if (position) {
        const coordinates = {
          lat: +position.coords.latitude,
          lng: +position.coords.longitude
        };
        this.coords$.next(coordinates);
      }
    });
  }

  onStopLocate() {
    this.subs.sink = from(Plugins.Geolocation.clearWatch(this.watchId)).subscribe(() => {
      this.isStart = false;
      this.router.navigate(['pages']);
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
  }

  startLocating(currentCoordinate: Coordinates) {
    // tslint:disable-next-line: deprecation
    this.subs.sink = from(this.getGoogleMaps()).subscribe(googleMaps => {
      this.googleMaps = googleMaps;
      this.directionsService = new googleMaps.DirectionsService();
      this.directionsDisplay = new googleMaps.DirectionsRenderer();

      const mapOptions = {
        center: currentCoordinate,
        zoom: 7
      };

      const mapEl = this.mapElementRef.nativeElement;
      const mapView = new googleMaps.Map(mapEl, mapOptions);

      this.googleMaps.event.addListenerOnce(mapView, 'idle', () => {
        this.renderer.addClass(mapEl, 'visible');
      });

      this.directionsDisplay.setMap(mapView);

      this.directionsService.route({
        origin: currentCoordinate,
        destination: this.direction,
        travelMode: 'DRIVING'
      }, (response: any, status: any) => {
        console.log(response);
        if (status === 'OK') {
          this.directionsDisplay.setDirections(response);
          // this.findRouteDistance(response.routes[0]);
        } else {
          window.alert('Directions request failed due to ' + status);
        }
      });
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
  }

  findRouteDistance(route: any) {
    let totalDistance = 0;
    for (const routeLeg of route.legs) {
      totalDistance += routeLeg.distance.value;
    }
    return totalDistance;
  }

  onLocate() {
    // tslint:disable-next-line: deprecation
    this.subs.sink = this.coords$.subscribe((coordinates) => {
      this.startLocating(coordinates);
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
  }

  private getGoogleMaps(): Promise<any> {
    const win = window as any;
    const googleModule = win.google;
    if (googleModule && googleModule.maps) {
      return Promise.resolve(googleModule.maps);
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src =
        'https://maps.googleapis.com/maps/api/js?key=' +
        environment.googleMapsApiKey;
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
      script.onload = () => {
        const loadedGoogleModule = win.google;
        if (loadedGoogleModule && loadedGoogleModule.maps) {
          resolve(loadedGoogleModule.maps);
        } else {
          reject('Google maps SDK not available.');
        }
      };
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

  onCopy() {
    this.clipboard.copy(this.location);
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
