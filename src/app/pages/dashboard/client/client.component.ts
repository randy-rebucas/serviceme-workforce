import { Component, OnDestroy, OnInit } from '@angular/core';
import { IonItemSliding, IonRouterOutlet, LoadingController, ModalController } from '@ionic/angular';
import { from, Observable, Subject} from 'rxjs';
import { map, mergeMap, reduce } from 'rxjs/operators';
import { AdminFunctionService } from 'src/app/shared/services/admin-function.service';
import { SubSink } from 'subsink';
import { DetailComponent } from '../../bookings/detail/detail.component';
import { UsersService } from '../../users/users.service';

@Component({
  selector: 'app-client',
  templateUrl: './client.component.html',
  styleUrls: ['./client.component.scss'],
})
export class ClientComponent implements OnInit, OnDestroy {
  public users$: Observable<any>;
  private userUpdated = new Subject<any[]>();
  private subs = new SubSink();
  constructor(
    private modalController: ModalController,
    private loadingController: LoadingController,
    private routerOutlet: IonRouterOutlet,
    private usersService: UsersService,
    private adminFunctionService: AdminFunctionService,
  ) { }

  getUserListener() {
    return this.userUpdated.asObservable();
  }

  initialized() {
    this.subs.sink = this.usersService.getAll().pipe(
      map((users) => {
        return users.filter((usersList) => {
          return usersList.roles.pro === true;
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

  onChange(event: CustomEvent) {
    const searchKey = event.detail.value;
    this.subs.sink = this.usersService.getAll().pipe(
      map((users) => {
        return users.filter((usersList) => {
          return usersList.roles.pro === true;
        });
      }),
      map((users) => {
        if (!searchKey) {
          return users;
        }
        return users.filter((filterUser) => {
          return filterUser.name.lastname.toLowerCase().includes(searchKey);
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
    ).subscribe((users) => {
      this.userUpdated.next(users);
    });
  }

  onDeail(user: any, ionItemSliding: IonItemSliding) {
    this.subs.sink = from(this.modalController.create({
      component: DetailComponent,
      componentProps: {
        title: 'Detail',
        userData: user,
        state: false
      },
      swipeToClose: true,
      presentingElement: this.routerOutlet.nativeEl
    })).subscribe((modalEl) => {
      modalEl.present();
      ionItemSliding.closeOpened();
    });
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
