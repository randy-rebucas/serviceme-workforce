import { Component, OnDestroy, OnInit } from '@angular/core';
import { AngularFireStorageReference, AngularFireUploadTask } from '@angular/fire/storage';
import { Camera, CameraOptions, PictureSourceType } from '@ionic-native/camera/ngx';
import { ActionSheetController, AlertController, LoadingController, ModalController, NavParams } from '@ionic/angular';
import { from, Observable, of } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { Base64 } from 'src/app/helper/base64';
import { FirestoreService } from 'src/app/shared/services/firestore.service';
import { SubSink } from 'subsink';
import { SettingsService } from '../../settings/settings.service';
import { FormComponent } from '../form/form.component';
import { Offers } from '../offers';
import { OffersService } from '../offers.service';

@Component({
  selector: 'app-detail',
  templateUrl: './detail.component.html',
  styleUrls: ['./detail.component.scss'],
})
export class DetailComponent implements OnInit, OnDestroy {
  public offer$: Observable<any>;
  public uploadPercent: Observable<number>;
  public offer: Offers;
  public title: string;
  public showProgress: boolean;
  public defaultCurrency: string;
  private angularFireUploadTask: AngularFireUploadTask;
  private angularFireStorageReference: AngularFireStorageReference;
  private subs = new SubSink();

  constructor(
    private navParams: NavParams,
    private modalController: ModalController,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private actionSheetController: ActionSheetController,
    private authService: AuthService,
    private settingsService: SettingsService,
    private offersService: OffersService,
    private firestoreService: FirestoreService,
    private camera: Camera,
  ) { }

  ngOnInit() {
    this.title = this.navParams.data.title;

    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        return this.settingsService.getOne(user.uid);
      })
    ).subscribe((settings) => {
      this.defaultCurrency = (settings) ? settings.currency : 'USD';
    });

    this.offer$ = from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        return this.offersService.getOne(user.uid, this.navParams.data.offerData.id);
      })
    );

    this.subs.sink =  this.offer$.subscribe((offer) => {
      this.offer = offer;
    });
  }

  onEdit(offer: Offers) {
    this.onDismiss(true);
    this.subs.sink = from(this.modalController.create({
      component: FormComponent,
      componentProps: {
        title: 'Update Offer',
        offerData: offer,
        state: false
      }
    })).subscribe((modalEl) => {
      modalEl.present();
    });
  }

  onDismiss(state: boolean) {
    this.modalController.dismiss({
      dismissed: state
    });
  }

  onPickSource() {
    this.subs.sink = from(this.actionSheetController.create({
      header: 'Pick a Source',
      cssClass: 'my-custom-class',
      buttons: [{
        text: 'Library',
        icon: 'library-outline',
        handler: () => {
          this.takePhoto(this.camera.PictureSourceType.PHOTOLIBRARY);
        }
      }, {
        text: 'Camera',
        icon: 'camera-outline',
        handler: () => {
          this.takePhoto(this.camera.PictureSourceType.CAMERA);
        }
      }, {
        text: 'Cancel',
        icon: 'close',
        role: 'cancel',
        handler: () => {}
      }]
    })).subscribe((actionSheetEl) => {
      actionSheetEl.present();
    });
  }

  takePhoto(selectedSourceType: PictureSourceType) {
    this.capture(selectedSourceType);
  }

  capture(selectedSourceType: PictureSourceType) {
    const options: CameraOptions = {
      quality: 100,
      sourceType: selectedSourceType,
      destinationType: this.camera.DestinationType.DATA_URL,
      encodingType: this.camera.EncodingType.JPEG,
      mediaType: this.camera.MediaType.PICTURE,
      cameraDirection: this.camera.Direction.FRONT
    };

    this.subs.sink = from(this.camera.getPicture(options)).subscribe((imageData) => {
      this.onUpload(imageData);
    });
  }

  onUpload(imageData: any) {
    this.subs.sink = from(this.loadingController.create({
      message: 'Please wait...'
    })).subscribe(loadingEl => {
      loadingEl.present();
      this.doUpload(imageData);
    });
  }

  doUpload(imageUrl: any) {
    this.showProgress = true;
    const file = new Base64().dataURItoBlob('data:image/jpeg;base64,' + imageUrl);
    const filePath = `offer/${this.offer.id}.jpg`;

    this.angularFireStorageReference = this.firestoreService.ref(filePath);
    this.angularFireUploadTask = this.firestoreService.put(filePath, file);
    // observe percentage changes
    this.uploadPercent = this.angularFireUploadTask.percentageChanges();

    this.subs.sink = this.angularFireUploadTask.snapshotChanges().pipe(
      finalize(() => {
        this.subs.sink = this.angularFireStorageReference.getDownloadURL().subscribe((imageLink) => {
          this.getCurrentUser(imageLink);
        });
      })
    ).subscribe();
  }

  getCurrentUser(imageLink: any) {
    this.subs.sink = from(this.authService.getCurrentUser()).subscribe((currentUser) => {
      this.setUpdateData(imageLink, currentUser.uid);
    }, (error: any) => {
      this.loadingController.dismiss();
      this.presentAlert(error.code, error.message);
    });
  }

  setUpdateData(imageLink: any, userId: string) {
    this.subs.sink = from(this.offersService.update(userId, this.offer.id, {imageUrl: imageLink})).subscribe(() => {
      this.loadingController.dismiss();
      this.onDismiss(true);
    }, (error: any) => {
      this.loadingController.dismiss();
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
