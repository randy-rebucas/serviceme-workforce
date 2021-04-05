import { Component, OnDestroy, OnInit } from '@angular/core';
import { AlertController, IonItemSliding, IonRouterOutlet, ModalController } from '@ionic/angular';

import { BehaviorSubject, from, Observable, of, Subject} from 'rxjs';
import { map, mergeMap, reduce, switchMap } from 'rxjs/operators';

import { AdminFunctionService } from 'src/app/shared/services/admin-function.service';
import { UsersService } from '../../users/users.service';
import { DetailComponent } from '../../bookings/detail/detail.component';

import { SubSink } from 'subsink';
@Component({
  selector: 'app-client',
  templateUrl: './client.component.html',
  styleUrls: ['./client.component.scss'],
})
export class ClientComponent implements OnInit, OnDestroy {
  public users$: Observable<any>;
  private userUpdated = new Subject<any[]>();
  private searchKey$: BehaviorSubject<string|null>;
  private subs = new SubSink();

  constructor(
    private modalController: ModalController,
    private alertController: AlertController,
    private routerOutlet: IonRouterOutlet,
    private usersService: UsersService,
    private adminFunctionService: AdminFunctionService,
  ) {
    this.searchKey$ = new BehaviorSubject(null);
  }

  getUserListener() {
    return this.userUpdated.asObservable();
  }

  initialized() {
    this.subs.sink = this.searchKey$.pipe(
      switchMap(searchKey => this.usersService.getAll().pipe(
        map((users) => {
          if (!searchKey) {
            return users;
          }
          return users.filter((filterUser) => {
            return filterUser.name.firstname.toLowerCase().includes(searchKey);
          });
        }),
        mergeMap((usersMerge) => {
          return from(usersMerge).pipe(
            mergeMap((user) => {
              return this.adminFunctionService.getById(user.id).pipe(
                map(admin => ({ user, admin })),
              );
            }),
            reduce((a, i) => [...a, i], [])
          );
        })
      ))
    // tslint:disable-next-line: deprecation
    ).subscribe((users) => {
      const formatedUser = [];
      users.forEach(user => {
        formatedUser.push({...user.user, ...user.admin.user});
      });
      this.preFormedUser(formatedUser);
    });
  }

  preFormedUser(formatedUser: any[]) {
    this.subs.sink = of(formatedUser).pipe(
      map(users => users.filter(userClaims => userClaims.customClaims.pro === true)),
    // tslint:disable-next-line: deprecation
    ).subscribe((users) => {
      this.userUpdated.next(users);
    });
  }

  ngOnInit() {
    this.initialized();
    this.users$ = this.getUserListener();
  }

  onClear() {
    this.initialized();
  }

  onChange(event: any) {
    this.searchKey$.next(event.detail.value);
  }

  onDeail(userDetail: any, ionItemSliding: IonItemSliding) {
    this.subs.sink = from(this.modalController.create({
      component: DetailComponent,
      componentProps: {
        title: 'Detail',
        userData: userDetail,
        state: false
      },
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl
    // tslint:disable-next-line: deprecation
    })).subscribe((modalEl) => {
      modalEl.present();
      ionItemSliding.closeOpened();
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
