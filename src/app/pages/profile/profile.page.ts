import { Component, OnDestroy, OnInit } from '@angular/core';
import { AngularFireStorageReference, AngularFireUploadTask } from '@angular/fire/storage';
import { ActionSheetController, AlertController, IonRouterOutlet, LoadingController, ModalController } from '@ionic/angular';

import { BehaviorSubject, from, Observable, Subject } from 'rxjs';
import { finalize, map, switchMap } from 'rxjs/operators';

import { AuthService } from 'src/app/auth/auth.service';
import { Camera, CameraOptions, PictureSourceType } from '@ionic-native/camera/ngx';
import { Crop } from '@ionic-native/crop/ngx';

import { SubSink } from 'subsink';
import firebase from 'firebase/app';
import { CustomBase64 } from 'src/app/helper/base64';
import { FirestoreService } from 'src/app/shared/services/firestore.service';
import { FormComponent } from './form/form.component';
import { ChangePasswordComponent } from './change-password/change-password.component';
import { UsersService } from '../users/users.service';
import { Router } from '@angular/router';
import { ChangePhoneNumberComponent } from './change-phone-number/change-phone-number.component';
import { ChangeEmailComponent } from './change-email/change-email.component';
import { Base64 } from '@ionic-native/base64/ngx';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage implements OnInit, OnDestroy {
  public user$: Observable<any>;
  public uploadPercent: Observable<number>;
  public showProgress: boolean;
  private userUpdateListener = new Subject<any>();
  private angularFireUploadTask: AngularFireUploadTask;
  private angularFireStorageReference: AngularFireStorageReference;
  private subs = new SubSink();

  constructor(
    private alertController: AlertController,
    private authService: AuthService,
    private userService: UsersService,
    private actionSheetController: ActionSheetController,
    private loadingController: LoadingController,
    private modalController: ModalController,
    private routerOutlet: IonRouterOutlet,
    private firestoreService: FirestoreService,
    private camera: Camera,
    private crop: Crop,
    private base64: Base64
  ) {
    this.showProgress = false;
  }

  private getUserUpdateListener() {
    return this.userUpdateListener.asObservable();
  }

  ngOnInit() {
    from(this.authService.getCurrentUser()).pipe(
      switchMap((auhtUser) => {
        return this.userService.getOne(auhtUser.uid).pipe(
          map((user) => {
            return Object.keys(user).filter(key =>
              key !== 'roles').reduce((obj, key) =>
              {
                  obj[key] = user[key];
                  return obj;
              }, {}
            );
          })
        );
      })
    // tslint:disable-next-line: deprecation
    ).subscribe((user) => {
      this.preFormed(user);
    });

    this.user$ = this.getUserUpdateListener();
  }

  preFormed(userData: any) {
    const customData = {
      name: userData.name,
      gender: userData.gender,
      birthdate: userData.birthdate,
      displayName: userData.displayName,
      photoURL: userData.photoURL,
      address: userData.address
    };
    this.userUpdateListener.next(customData);
  }

  onEdit() {
    this.subs.sink = from(this.modalController.create({
      component: FormComponent,
      componentProps: {
        user: this.user$
      },
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl
    // tslint:disable-next-line: deprecation
    })).subscribe((modalEl) => {
      modalEl.present();

      modalEl.onDidDismiss().then((dataReturned) => {
        if (dataReturned.data.dismissed) {
          // this.userUpdateListener.next(dataReturned.data.user);
          this.preFormed(dataReturned.data.user);
        }
      });
    });
  }

  onChangePass() {
    this.subs.sink = from(this.modalController.create({
      component: ChangePasswordComponent,
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl
    // tslint:disable-next-line: deprecation
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
    // tslint:disable-next-line: deprecation
    })).subscribe((modalEl) => {
      modalEl.present();

      modalEl.onDidDismiss().then((dataReturned) => {
        if (dataReturned.data.dismissed) {
          from(this.authService.getCurrentUser()).pipe(
            switchMap((currenctUser) => {
              return this.userService.update(currenctUser.uid, {email: dataReturned.data.email});
            })
          // tslint:disable-next-line: deprecation
          ).subscribe(() => {
            this.presentAlert('Profile updated', 'Email successfully updated!');
          });
        }
      });
    });
  }

  onChangePhone() {
    this.subs.sink = from(this.modalController.create({
      component: ChangePhoneNumberComponent,
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl
    // tslint:disable-next-line: deprecation
    })).subscribe((modalEl) => {
      modalEl.present();

      modalEl.onDidDismiss().then((dataReturned) => {
        if (dataReturned.data.dismissed) {
          from(this.authService.getCurrentUser()).pipe(
            switchMap((currenctUser) => {
              return this.userService.update(currenctUser.uid, {phoneNumber: dataReturned.data.phone});
            })
          // tslint:disable-next-line: deprecation
          ).subscribe(() => {
            // tslint:disable-next-line: deprecation
            this.getUserUpdateListener().subscribe((user) => {
              const appendedNumber = {...user, ...{phoneNumber: dataReturned.data.phone}};
              this.userUpdateListener.next(appendedNumber);
              this.presentAlert('Profile updated', 'Phone successfully updated!');
            });
          });
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
          this.capture(this.camera.PictureSourceType.PHOTOLIBRARY);
        }
      }, {
        text: 'Camera',
        icon: 'camera-outline',
        handler: () => {
          this.capture(this.camera.PictureSourceType.CAMERA);
        }
      }, {
        text: 'Cancel',
        icon: 'close',
        role: 'cancel',
        handler: () => {}
      }]
    // tslint:disable-next-line: deprecation
    })).subscribe((actionSheetEl) => {
      actionSheetEl.present();
    });
  }

  capture(selectedSourceType: PictureSourceType) {
    const options: CameraOptions = {
      quality: 100,
      sourceType: selectedSourceType,
      destinationType: this.camera.DestinationType.FILE_URI, // DATA_URL
      encodingType: this.camera.EncodingType.JPEG,
      mediaType: this.camera.MediaType.PICTURE,
      cameraDirection: this.camera.Direction.BACK,
      targetHeight: 800,
      targetWidth: 800,
      correctOrientation: true
    };

    // tslint:disable-next-line: deprecation
    this.subs.sink = from(this.camera.getPicture(options)).subscribe((imageData) => {
      this.doCrop(imageData);
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
  }

  doCrop(imageData: any) {
    // tslint:disable-next-line: deprecation
    from(this.crop.crop(imageData, {quality: 75})).pipe(
      switchMap((cropedImage) => this.base64.encodeFile(cropedImage))
    // tslint:disable-next-line: deprecation
    ).subscribe((base64File) => {
      this.doUpload(base64File);
    }, (error: any) => {
      this.presentAlert(error.code, error.message);
    });
  }
  doUpload(imageUrl: any) {
    this.subs.sink = from(this.loadingController.create({
      cssClass: 'my-custom-class',
      message: 'Please wait...',
    // tslint:disable-next-line: deprecation
    })).subscribe((loadingEl) => {
      loadingEl.present();
      // tslint:disable-next-line: deprecation
      this.subs.sink = from(this.authService.getCurrentUser()).subscribe((user) => {
        // data:image/*;charset=utf-8;base64,
        // const file = new FileToBase64().dataURItoBlob('data:image/jpeg;base64,' + imageUrl);
        const file = new CustomBase64().dataURItoBlob(imageUrl);
        const filePath = `avatar/${user.uid}.jpg`;

        this.angularFireStorageReference = this.firestoreService.ref(filePath);
        this.angularFireUploadTask = this.firestoreService.put(filePath, file);
        // observe percentage changes
        this.uploadPercent = this.angularFireUploadTask.percentageChanges();

        this.subs.sink = this.angularFireUploadTask.snapshotChanges().pipe(
          finalize(() => {
            // tslint:disable-next-line: deprecation
            this.subs.sink = this.angularFireStorageReference.getDownloadURL().pipe(
              switchMap((downloadableUrl) => {
                return from(user.updateProfile({ photoURL: downloadableUrl })).pipe(
                  switchMap(() => {
                    return from(this.userService.update(user.uid, {photoURL: downloadableUrl})).pipe(
                      switchMap(() => {
                        return this.userService.getOne(user.uid).pipe(
                          map((customData) => {
                            return this.userUpdateListener.next(customData);
                          })
                        );
                      })
                    );
                  })
                );
              })
            // tslint:disable-next-line: deprecation
            ).subscribe(() => {
              this.loadingController.dismiss();
            });
          })
        // tslint:disable-next-line: deprecation
        ).subscribe();
      });
    });
  }

  onUpdateUsername() {
    // prompt for username
    this.subs.sink = from(this.alertController.create({
      cssClass: 'my-custom-class',
      header: 'Set Username',
      inputs: [
        {
          name: 'userName',
          type: 'text',
          value: '',
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
            this.subs.sink = from(this.authService.getCurrentUser()).pipe(
              map((user) => {
                return from(user.updateProfile({ displayName: data.userName })).pipe(
                  switchMap(() => {
                    return from(this.userService.update(user.uid, {displayName: data.userName})).pipe(
                      map((customData) => {
                        return this.userUpdateListener.next(customData);
                      })
                    );
                  })
                )
              })
            // tslint:disable-next-line: deprecation
            ).subscribe(() => {}, (error: any) => {
              this.presentAlert(error.code, error.message);
            });
          }
        }
      ]
    // tslint:disable-next-line: deprecation
    })).subscribe((promptEl) => {
      promptEl.present();
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

  // Unsubscribe when the component dies
  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
