import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActionSheetController, AlertController, IonContent, LoadingController, ModalController, NavParams, ToastController } from '@ionic/angular';
import { from, Observable, Subject } from 'rxjs';
import { AuthService } from 'src/app/auth/auth.service';
import { SubSink } from 'subsink';

import { ChatsService } from '../chats.service';
import { finalize, map, mergeMap, reduce, switchMap } from 'rxjs/operators';
import { Chats, Message } from '../chats';
import { UsersService } from '../../users/users.service';

import firebase from 'firebase/app';
import { CustomBase64 } from 'src/app/helper/base64';
import { Camera, CameraOptions, PictureSourceType } from '@ionic-native/camera/ngx';
import { PhotoViewer } from '@ionic-native/photo-viewer/ngx';
import { Crop } from '@ionic-native/crop/ngx';
import { Base64 } from '@ionic-native/base64/ngx';
import { AngularFireStorageReference, AngularFireUploadTask } from '@angular/fire/storage';
import { FirestoreService } from 'src/app/shared/services/firestore.service';

@Component({
  selector: 'app-form',
  templateUrl: './form.component.html',
  styleUrls: ['./form.component.scss'],
})
export class FormComponent implements OnInit, OnDestroy {
  @ViewChild(IonContent) content: IonContent;

  public title: string;
  public roomId: string;
  public form: FormGroup;
  public room$: Observable<any>;
  public chatMessages$: Observable<any[]>;
  public user: firebase.User;
  public uploadPercent: Observable<number>;
  private chatListener = new Subject<any[]>();
  private angularFireUploadTask: AngularFireUploadTask;
  private angularFireStorageReference: AngularFireStorageReference;
  private subs = new SubSink();
  constructor(
    private navParams: NavParams,
    private modalController: ModalController,
    private actionSheetController: ActionSheetController,
    private loadingController: LoadingController,
    private alertController: AlertController,
    private authService: AuthService,
    private usersService: UsersService,
    private chatsService: ChatsService,
    private firestoreService: FirestoreService,
    private camera: Camera,
    private crop: Crop,
    private base64: Base64,
    private photoViewer: PhotoViewer
  ) {
    this.title = this.navParams.data.title;
    this.roomId = this.navParams.data.roomId;
    // this.roomId = this.navParams.data.booking;
    // tslint:disable-next-line: deprecation
    this.room$ = this.chatsService.getOne(this.navParams.data.roomId).pipe(
      switchMap((chatCollection) => {
        return this.usersService.getOne(chatCollection.createdBy).pipe(
          map((room) => {
            return {...chatCollection, ...room };
          }
        ));
      })
    );
  }

  getChatListener() {
    return this.chatListener.asObservable();
  }

  ngOnInit() {
    // tslint:disable-next-line: deprecation
    this.subs.sink = from(this.authService.getCurrentUser()).subscribe((user) => {
      this.user = user;
    });

    this.subs.sink = this.chatsService.getSubCollection(this.roomId).pipe(
      // notifications response
      mergeMap((notificationMap: any[]) => {
        // merge collection
        return from(notificationMap).pipe(
          mergeMap((chatSubCollection) => {
            return this.usersService.getOne(chatSubCollection.from).pipe(
              // map to combine user notifications sub-collection to collection
              map(userCollection => ({chatSubCollection, userCollection}))
            );
          }),
          reduce((a, i) => [...a, i], [])
        );
      }),
    // tslint:disable-next-line: deprecation
    ).subscribe((messages) => {
      const formatedMessage = [];
      messages.forEach(message => {
        formatedMessage.push({...message.chatSubCollection, ...message.userCollection});
      });
      this.chatListener.next(formatedMessage);
    });

    this.chatMessages$ = this.getChatListener().pipe(
      map((actions) => {
        return actions.sort((a, b) => {
          // first sort by timestamp
          if (a.createdAt > b.createdAt) {
              return 1;
          }
          if (b.createdAt > a.createdAt) {
              return -1;
          }
        });
      })
    );

    // update all unread message from sender
    from(this.authService.getCurrentUser()).pipe(
      switchMap((currentUser) => {
        return this.chatMessages$.pipe(
          map(messages => messages.filter(messagesFilter => messagesFilter.from !== currentUser.uid)),
          map(unreadMessage => unreadMessage.filter(filterUnread => filterUnread.unread))
        );
      })
    // tslint:disable-next-line: deprecation
    ).subscribe((unreadMessages) => {
      unreadMessages.forEach(unreadMessage => {
        return this.chatsService.updateSubCollection(this.roomId, unreadMessage.id, {unread: false});
      });
    });

    this.form = new FormGroup({
      message: new FormControl(null, {
        updateOn: 'blur',
        validators: [Validators.required]
      })
    });
  }

  onDismiss(state: boolean) {
    this.modalController.dismiss({
      dismissed: state
    });
  }

  get formCtrls() { return this.form.controls; }

  onPreview(imageUrl: string) {
    const origUrl = imageUrl.split('?')[0].split('/').pop();
    this.photoViewer.show(imageUrl, origUrl, {share: true});
  }

  onDelete(messageId: string) {
    // tslint:disable-next-line: deprecation
    from(this.chatsService.deleteSubCollection(this.roomId, messageId)).subscribe(() => {});
  }

  notificationData(userIds: any) {
    userIds.forEach(userId => {
      this.usersService.getOne(userId).pipe(
        map(user => (user.displayName) ? user.displayName : user.name.firstname + ' ' + user.name.lastname),
        switchMap((member) => {
          const notificationData  = {
            title: 'New Chat!',
            content: 'New chat from ' + member,
            status: 'unread',
            timestamp: firebase.firestore.Timestamp.fromDate(new Date()),
            type: 'chat'
          };
          const randId = (Date.now().toString(36) + Math.random().toString(36).substr(2, 5)).toUpperCase();
          return this.usersService.setSubCollection(userId, 'notifications', randId, notificationData );
        })
      // tslint:disable-next-line: deprecation
      ).subscribe();
    });
  }

  // send notifications to all members
  sendNotifications() {
    from(this.authService.getCurrentUser()).pipe(
      switchMap((currentUser) => {
        return this.chatsService.getOne(this.roomId).pipe(
          map(chatRooms => chatRooms.members.filter(filterChat => filterChat !== currentUser.uid))
        );
      })
    // tslint:disable-next-line: deprecation
    ).subscribe((members) => {
      this.notificationData(members);
    });
  }

  onSent() {
    if (!this.form.valid) {
      return;
    }
    this.subs.sink = from(this.authService.getCurrentUser()).pipe(
      switchMap((user) => {
        const messageData = {
          createdAt: firebase.firestore.Timestamp.fromDate(new Date()),
          from: user.uid,
          message: this.form.value.message,
          type: 'text',
          unread: true
        };
        return from(this.chatsService.insertSubCollection(this.roomId, messageData)).pipe(
          switchMap(() => {
            return this.chatsService.update(this.roomId, {recentMessage: this.form.value.message});
          })
        );
      })
    // tslint:disable-next-line: deprecation
    ).subscribe(() => {
      this.sendNotifications();
      this.form.reset();
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
      // data:image/*;charset=utf-8;base64,
      // const file = new FileToBase64().dataURItoBlob('data:image/jpeg;base64,' + imageUrl);
      const randId = (Date.now().toString(36) + Math.random().toString(36).substr(2, 5)).toUpperCase();
      const file = new CustomBase64().dataURItoBlob(imageUrl);
      const filePath = `chat/${randId}.jpg`;

      this.angularFireStorageReference = this.firestoreService.ref(filePath);
      this.angularFireUploadTask = this.firestoreService.put(filePath, file);
      // observe percentage changes
      this.uploadPercent = this.angularFireUploadTask.percentageChanges();

      this.subs.sink = this.angularFireUploadTask.snapshotChanges().pipe(
        finalize(() => {
          // tslint:disable-next-line: deprecation
          this.subs.sink = this.angularFireStorageReference.getDownloadURL().pipe(
            switchMap((downloadableUrl) => {
              // return downloadableUrl;
              return from(this.authService.getCurrentUser()).pipe(
                switchMap((user) => {
                  const messageData = {
                    createdAt: firebase.firestore.Timestamp.fromDate(new Date()),
                    from: user.uid,
                    message: downloadableUrl,
                    type: 'image',
                    unread: true
                  };
                  return this.chatsService.insertSubCollection(this.roomId, messageData);
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
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
