import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, from, Observable, Subject } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';

import { Users } from '../users/users';
import { Base64ToGallery } from '@ionic-native/base64-to-gallery/ngx';
import { SocialSharing } from '@ionic-native/social-sharing/ngx';
import { BarcodeScanner } from '@ionic-native/barcode-scanner/ngx';
import { UsersService } from '../users/users.service';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { UUID } from 'angular2-uuid';
import firebase from 'firebase/app';
import { PreviewComponent } from './preview/preview.component';
import { SubSink } from 'subsink';
import { SettingsService } from '../settings/settings.service';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';
import { NgxQrcodeElementTypes, NgxQrcodeErrorCorrectionLevels } from '@techiediaries/ngx-qrcode';
export interface QrCode {
  elementType: string;
  value: string;
}
export interface QrCodeDetail {
  amount: number;
  message: string;
}
@Component({
  selector: 'app-qrcodes',
  templateUrl: './qrcodes.page.html',
  styleUrls: ['./qrcodes.page.scss'],
})
export class QrcodesPage implements OnInit {
  public segmentListener$: Subject<string>;
  public detailListener$: BehaviorSubject<QrCodeDetail>;

  public segment$: Observable<string>;
  public currentUser$: Observable<Users>;
  public receiveScan$: Observable<QrCode>;
  public receiveScan: QrCode;
  public randomCode$: Observable<QrCode>;
  public randomCode: QrCode;
  public defaultCurrency: string;
  // public random
  private activeUser$: Observable<firebase.User>;
  public random: string = (Date.now().toString(36) + Math.random().toString(36).substr(2, 5)).toUpperCase();
  public amount: number;
  public message: string;
  public elementType = NgxQrcodeElementTypes.CANVAS;
  public correctionLevel = NgxQrcodeErrorCorrectionLevels.QUARTILE;
  private subs = new SubSink();
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private settingsService: SettingsService,
    private base64ToGallery: Base64ToGallery,
    private socialSharing: SocialSharing,
    private barcodeScanner: BarcodeScanner,
    private toastController: ToastController,
    private alertController: AlertController,
    private router: Router,
    private modalController: ModalController
  ) {
    this.segmentListener$ = new Subject<string>();
    this.detailListener$ = new BehaviorSubject<QrCodeDetail>({amount: 0, message: ''});
    this.activeUser$ = from(this.authService.getCurrentUser());

    this.subs.sink = from(this.activeUser$).pipe(
      switchMap((user) => {
        return this.settingsService.getOne(user.uid);
      })
    // tslint:disable-next-line: deprecation
    ).subscribe((settings) => {
      this.defaultCurrency = (settings) ? settings.currency : environment.defaultCurrency;
    });
  }

  ngOnInit() {
    this.currentUser$ = from(this.activeUser$).pipe(
      switchMap((user) => {
        return this.usersService.getOne(user.uid);
      })
    );

    this.onGenerate();

    this.receiveScan$ = this.detailListener$.pipe(
      switchMap((detail) => {
        this.amount = detail.amount;
        this.message = detail.message;
        return from(this.authService.getCurrentUser()).pipe(
          map((user) => {
            const random = (Date.now().toString(36) + Math.random().toString(36).substr(2, 5)).toUpperCase();
            return {
              elementType: 'canvas',
              value: `uid:${user.uid}?refereceNumber=${random}&amount=${detail.amount}&message=${detail.message}`
            };
          })
        );
      })
    );

    this.segment$ = this.segmentListener$.asObservable();
  }

  onUpdate() {
    from(this.alertController.create({
      cssClass: 'my-custom-class',
      header: 'Update',
      // subHeader: '',
      message: 'Add amount and message to this QR Code',
      inputs: [
        // multiline input.
        {
          name: 'amount',
          placeholder: '0.00',
          type: 'number',
          value: this.amount,
          max: 6
        },
        {
          name: 'message',
          id: 'message',
          type: 'textarea',
          value: this.message,
          placeholder: 'Message'
        },
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary'
        }, {
          text: 'Ok',
          handler: (data) => {
            this.detailListener$.next({amount: data.amount, message: data.message});
          }
        }
      ]
    // tslint:disable-next-line: deprecation
    })).subscribe((alertEl) => {
      alertEl.present();
    });
  }

  segmentChanged(event) {
    this.segmentListener$.next(event.detail.value);
  }

  onGenerate() {
    const random = (Date.now().toString(36) + Math.random().toString(36).substr(2, 5)).toUpperCase();
    this.randomCode$ = from(this.activeUser$).pipe(
      map((user) => {
        return {
          elementType: 'canvas',
          value: `uid:${user.uid}?refereceNumber=${random}`
        };
      })
    );
  }

  onScan() {
    this.barcodeScanner.scan().then(barcodeData => {
      // uid:gkdgxFsjFvXDi1sx5sff6IHkhU12?refereceNumber=KOC4SX0165V0V&amount=0&message=
      this.onPay(barcodeData.text);
     }).catch(err => {
         console.log('Error', err);
     });
  }

  onPay(data: string) {
    this.subs.sink = from(this.modalController.create({
      component: PreviewComponent,
      componentProps: {
        title: 'Pay now',
        scannedData: data
      }
    // tslint:disable-next-line: deprecation
    })).subscribe((modalEl) => {
      modalEl.present();
      modalEl.onDidDismiss().then((res) => {
        if (res.data.dismissed) {
          this.router.navigate(['pages/receipts']);
        }
      });
    });
  }

  onDownload() {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    const imageData = canvas.toDataURL('image/jpeg').toString();
    const base64Data = imageData.split(',')[1];

    // tslint:disable-next-line: deprecation
    from(this.base64ToGallery.base64ToGallery(base64Data, { prefix: '_img', mediaScanner: true })).subscribe(() => {
      this.toastController.create({
        message: 'QR Code saved in your gallery.',
        duration: 2000
      }).then((toastEl) => {
        toastEl.present();
      });
    });
  }

  onShare() {
    // tslint:disable-next-line: deprecation
    from(this.currentUser$).subscribe((user) => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      const imageData = canvas.toDataURL('image/jpeg').toString();
      this.socialSharing.share(user.displayName + ' QRCode', 'QRCode Share', imageData).then(() => {
        this.toastController.create({
          message: 'QR Code shared.',
          duration: 2000
        }).then((toastEl) => {
          toastEl.present();
        });
      });
    });
  }
}
