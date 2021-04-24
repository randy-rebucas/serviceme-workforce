import { Component, OnDestroy, OnInit } from '@angular/core';
import { from, Observable, Subject } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { Chats } from './chats';
import { ChatsService } from './chats.service';
import firebase from 'firebase/app';
import { AlertController, IonItemSliding, LoadingController, ModalController } from '@ionic/angular';
import { FormComponent } from './form/form.component';
import { SubSink } from 'subsink';
import { LookupComponent } from './lookup/lookup.component';
@Component({
  selector: 'app-chats',
  templateUrl: './chats.page.html',
  styleUrls: ['./chats.page.scss'],
})
export class ChatsPage implements OnInit, OnDestroy {
  public chatRooms$: Observable<Chats[]>;
  public user: firebase.User;
  private chatListener = new Subject<any[]>();
  private subs = new SubSink();
  constructor(
    private alertController: AlertController,
    private loadingController: LoadingController,
    private modalController: ModalController,
    private authService: AuthService,
    private chatsService: ChatsService
  ) { }

  getchatListener() {
    return this.chatListener.asObservable();
  }

  ngOnInit() {
    this.chatRooms$ = from(this.authService.getCurrentUser()).pipe(
      map((currentUser) => {
        this.user = currentUser;
        return currentUser;
      }),
      switchMap((currentUser) => {
        return this.chatsService.getAll(currentUser.uid);
      })
    );
  }

  onRename(roomId: string, ionItemSliding: IonItemSliding) {
    // tslint:disable-next-line: deprecation
    this.subs.sink = this.chatsService.getOne(roomId).pipe(
      map(room => room.name)
    // tslint:disable-next-line: deprecation
    ).subscribe((roomName) => {
      ionItemSliding.closeOpened();
      this.subs.sink = from(this.alertController.create({
        cssClass: 'my-custom-class',
        header: 'Rename room!',
        inputs: [
          {
            name: 'name',
            type: 'text',
            value: roomName ? roomName : roomId,
            placeholder: 'My room'
          }
        ],
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
            cssClass: 'secondary'
          }, {
            text: 'Update',
            handler: (data) => {
              this.chatsService.update(roomId, {name: data.name});
            }
          }
        ]
      // tslint:disable-next-line: deprecation
      })).subscribe(alertEl => alertEl.present());
    });
  }

  openChat(chatRoomId: string) {
    this.subs.sink = this.chatsService.getOne(chatRoomId).pipe(
      map(chatRoom => chatRoom.name)
    // tslint:disable-next-line: deprecation
    ).subscribe((chatRoomName) => {
      from(this.modalController.create({
        component: FormComponent,
        cssClass: 'my-custom-class',
        componentProps: {
          title: chatRoomName ? chatRoomName : chatRoomId,
          roomId: chatRoomId
        }
      // tslint:disable-next-line: deprecation
      })).subscribe(modalEl => modalEl.present());
    });
  }

  onDelete(chatRoomId: string, ionItemSliding: IonItemSliding) {
    this.subs.sink = from(this.loadingController.create({
      message: 'Deleting...'
    // tslint:disable-next-line: deprecation
    })).subscribe(loadingEl => {
      loadingEl.present();
      // tslint:disable-next-line: deprecation
      this.subs.sink = from(this.chatsService.delete(chatRoomId)).subscribe(() => {
        this.loadingController.dismiss();
        ionItemSliding.closeOpened();
      }, (error: any) => {
        this.loadingController.dismiss();
        this.presentAlert(error.code, error.message);
      });
    });
  }

  onCreate() {
    from(this.modalController.create({
      component: LookupComponent,
      cssClass: 'my-custom-class',
      componentProps: {
        title: 'Find users'
      }
    // tslint:disable-next-line: deprecation
    })).subscribe((modalEl) => {
        modalEl.present();

        modalEl.onDidDismiss().then((response) => {
          if (response.data.dismissed) {
            const chatMembers = [];
            const selectedUsers = response.data.selected;
            selectedUsers.forEach(selectedUser => {
              chatMembers.push(selectedUser.id);
            });

            from(this.authService.getCurrentUser()).pipe(
              switchMap((currentUser) => {
                chatMembers.push(currentUser.uid);
                const randId = (Date.now().toString(36) + Math.random().toString(36).substr(2, 5)).toUpperCase();
                return from(this.chatsService.insert(randId,
                  {
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    createdBy: currentUser.uid,
                    members: chatMembers
                  }));
              })
            // tslint:disable-next-line: deprecation
            ).subscribe();

          }
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
