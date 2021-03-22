import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { AngularFireStorageReference, AngularFireUploadTask } from '@angular/fire/storage';
import { ActionSheetController, AlertController, IonRouterOutlet, LoadingController, ModalController } from '@ionic/angular';

import { BehaviorSubject, from, Observable, of } from 'rxjs';
import { finalize, map, mergeMap } from 'rxjs/operators';

import { AuthService } from 'src/app/auth/auth.service';
import { Camera, CameraOptions, PictureSourceType } from '@ionic-native/camera/ngx';

import { SubSink } from 'subsink';
import firebase from 'firebase/app';
import { Base64 } from 'src/app/helper/base64';
import { FirestoreService } from 'src/app/shared/services/firestore.service';
import { FormComponent } from './form/form.component';
import { ChangePasswordComponent } from './change-password/change-password.component';
import { UsersService } from '../users/users.service';
import { Router } from '@angular/router';
import { ChangePhoneNumberComponent } from './change-phone-number/change-phone-number.component';
import { ChangeEmailComponent } from './change-email/change-email.component';
import { TitleCasePipe } from '@angular/common';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage implements OnInit, AfterViewInit, OnDestroy {
  public user$: Observable<any>;
  public uploadPercent: Observable<number>;
  public showProgress: boolean;
  private username$: BehaviorSubject<string|null>;
  private user: firebase.User;
  private username: string;
  public isClient: boolean;
  public isPro: boolean;
  public isAdmin: boolean;
  private angularFireUploadTask: AngularFireUploadTask;
  private angularFireStorageReference: AngularFireStorageReference;
  private subs = new SubSink();

  constructor(
    private router: Router,
    private alertController: AlertController,
    private authService: AuthService,
    private userService: UsersService,
    private actionSheetController: ActionSheetController,
    private loadingController: LoadingController,
    private modalController: ModalController,
    private routerOutlet: IonRouterOutlet,
    private firestoreService: FirestoreService,
    private titlecasePipe: TitleCasePipe,
    private camera: Camera,
  ) {
    this.showProgress = false;
    this.username$ = new BehaviorSubject(null);
  }

  ngOnInit() {
    this.subs.sink = from(this.authService.getCurrentUser()).subscribe((user) => {
      user.getIdTokenResult().then((idTokenResult) => {
        this.isClient = idTokenResult.claims.client;
        this.isPro = idTokenResult.claims.pro;
        this.isAdmin = idTokenResult.claims.admin;
      });
    });

    this.user$ = from(this.authService.getCurrentUser()).pipe(
        mergeMap((auhtUser) => {
          this.user = auhtUser;
          return this.userService.getOne(auhtUser.uid);
        }),
        map(userData => {
          let completeName = '';
          let addressLine1 = '';
          let addressLine2 = '';
          let addressLine3 = '';
          const firstname = this.titlecasePipe.transform(userData.name.firstname);
          const lastname = this.titlecasePipe.transform(userData.name.lastname);
          const midlename = (userData.name.midlename) ? this.titlecasePipe.transform(userData.name.midlename) : null;
          if (midlename) {
            completeName = firstname.concat(' ', midlename);
          }
          completeName = completeName.concat(', ', lastname);

          const address1 = (userData.address) ? this.titlecasePipe.transform(userData.address.address1) : null;
          const address2 = (userData.address) ? this.titlecasePipe.transform(userData.address.address2) : null;
          const city = (userData.address) ? this.titlecasePipe.transform(userData.address.city) : null;
          const country = (userData.address) ? this.titlecasePipe.transform(userData.address.country) : null;
          const postalCode = (userData.address) ? this.titlecasePipe.transform(userData.address.postalCode) : null;
          const state = (userData.address) ? this.titlecasePipe.transform(userData.address.state) : null;
          // check address 1 Unit/Floor + House/Building Name
          if (address1) {
            addressLine1 = address1;
          }
          // check address 2 Street Number/Name
          if (address2) {
            addressLine1 = addressLine1.concat(', ', address2);
          }
          // check State/Brangay/District
          if (state) {
            addressLine2 = state;
          }
          // check City
          if (city) {
            addressLine2 = addressLine2.concat(', ', city);
          }
          // check PostalCode
          if (postalCode) {
            addressLine3 = postalCode;
          }
          // check Country
          if (country) {
            addressLine3 = addressLine3.concat(', ', country);
          }

          const customData = {
            fullname: completeName,
            line1: addressLine1,
            line2: addressLine2,
            line3: addressLine3
          };

          return {...this.user, ...userData, ...customData};
        })
      );
  }

  ngAfterViewInit() {
    this.subs.sink = this.username$.subscribe((username) => {
      this.username = username;
    });
  }

  onEdit() {
    this.subs.sink = from(this.modalController.create({
      component: FormComponent,
      componentProps: {
        user: this.user$
      },
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl
    })).subscribe((modalEl) => {
      modalEl.present();

      modalEl.onDidDismiss().then((dataReturned) => {
        if (dataReturned.data.dismissed) {
          this.presentAlert('Profile updated', 'Profile successfully updated!');
        }
      });
    });
  }

  onChangePass() {
    this.subs.sink = from(this.modalController.create({
      component: ChangePasswordComponent,
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl
    })).subscribe((modalEl) => {
      modalEl.present();

      modalEl.onDidDismiss().then((dataReturned) => {
        if (dataReturned.data.dismissed) {
          this.presentAlert('Profile updated', 'Password successfully updated!');
        }
      });
    });
  }

  onChangeEmail() {
    this.subs.sink = from(this.modalController.create({
      component: ChangeEmailComponent,
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl
    })).subscribe((modalEl) => {
      modalEl.present();

      modalEl.onDidDismiss().then((dataReturned) => {
        if (dataReturned.data.dismissed) {
          this.presentAlert('Profile updated', 'Email successfully updated!');
        }
      });
    });
  }

  onChangePhone() {
    this.subs.sink = from(this.modalController.create({
      component: ChangePhoneNumberComponent,
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl
    })).subscribe((modalEl) => {
      modalEl.present();

      modalEl.onDidDismiss().then((dataReturned) => {
        if (dataReturned.data.dismissed) {
          this.presentAlert('Profile updated', 'Phone successfully updated!');
        }
      });
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

  setUpdateData(imageUrl: any) {
    this.subs.sink = from(this.authService.getCurrentUser()).subscribe((currentUser) => {
      const updateProfile = {
        displayName: this.username,
        photoURL: imageUrl
      };
      currentUser.updateProfile(updateProfile);
      this.loadingController.dismiss();
    }, (error: any) => {
      this.loadingController.dismiss();
      this.presentAlert(error.code, error.message);
    });
  }

  doUpload(imageUrl: any, userId: string) {
    this.showProgress = true;
    const file = new Base64().dataURItoBlob('data:image/jpeg;base64,' + imageUrl);
    const filePath = `avatar/${userId}.jpg`;

    this.angularFireStorageReference = this.firestoreService.ref(filePath);
    this.angularFireUploadTask = this.firestoreService.put(filePath, file);
    // observe percentage changes
    this.uploadPercent = this.angularFireUploadTask.percentageChanges();

    this.subs.sink = this.angularFireUploadTask.snapshotChanges().pipe(
      finalize(() => {
        this.subs.sink = this.angularFireStorageReference.getDownloadURL().subscribe((imageLink) => {
          this.setUpdateData(imageLink);
        });
      })
    ).subscribe();
  }

  getCurrentUser(imageData: any) {
    this.subs.sink = from(this.authService.getCurrentUser()).subscribe((user) => {
      this.doUpload(imageData, user.uid);
    });
  }

  onUpload(imageData: any) {
    this.subs.sink = from(this.loadingController.create({
      message: 'Please wait...'
    })).subscribe(loadingEl => {
      loadingEl.present();
      this.getCurrentUser(imageData);
    });
  }

  capture(selectedSourceType: PictureSourceType) {
    const options: CameraOptions = {
      quality: 100,
      targetHeight: 200,
      targetWidth: 200,
      sourceType: selectedSourceType,
      destinationType: this.camera.DestinationType.DATA_URL,
      encodingType: this.camera.EncodingType.JPEG,
      mediaType: this.camera.MediaType.PICTURE,
      correctOrientation: true,
      cameraDirection: this.camera.Direction.FRONT
    };

    this.subs.sink = from(this.camera.getPicture(options)).subscribe((imageData) => {
      this.onUpload(imageData);
    });
  }

  takePhoto(selectedSourceType: PictureSourceType) {
    this.subs.sink = from(this.authService.getCurrentUser()).subscribe((user) => {
      if (user.displayName === null || user.displayName === '') {
        this.prompUsername(selectedSourceType);
      } else {
        this.capture(selectedSourceType);
      }
    });
  }

  prompUsername(selectedSourceType: PictureSourceType) {
    // prompt for username
    this.subs.sink = from(this.alertController.create({
      cssClass: 'my-custom-class',
      header: 'Set Username',
      inputs: [
        {
          name: 'userName',
          type: 'text',
          placeholder: 'username'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {}
        }, {
          text: 'Save',
          handler: (data) => {
            this.username$.next(data.userName);
            this.capture(selectedSourceType);
          }
        }
      ]
    })).subscribe((promptEl) => {
      promptEl.present();
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

  // Unsubscribe when the component dies
  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
