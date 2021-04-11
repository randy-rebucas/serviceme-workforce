import { Component, OnDestroy, OnInit } from '@angular/core';
import { AlertController, IonItemSliding, IonRouterOutlet, ModalController } from '@ionic/angular';

import { BehaviorSubject, combineLatest, from, Observable, of, Subject} from 'rxjs';
import { map, mergeMap, reduce, scan, switchMap, tap } from 'rxjs/operators';

import { AdminFunctionService } from 'src/app/shared/services/admin-function.service';
import { UsersService } from '../../users/users.service';
import { DetailComponent } from '../../bookings/detail/detail.component';

import { SubSink } from 'subsink';
import { Users } from '../../users/users';
import { ClassificationsService } from 'src/app/shared/services/classifications.service';
import { Classification } from 'src/app/shared/classes/classification';

export interface QueryConfig {
  path: string; //  path to collection
  field: string; // field to orderBy
  limit: number; // limit per query
  reverse: boolean; // reverse order?
  prepend: boolean; // prepend to source?
}

@Component({
  selector: 'app-client',
  templateUrl: './client.component.html',
  styleUrls: ['./client.component.scss'],
})
export class ClientComponent implements OnInit, OnDestroy {
  // list professional data
  public users$: Observable<any>;
  public classifications: Classification[];
  private userUpdated = new Subject<any[]>();
  private classification$: BehaviorSubject<string|null>;
  private searchKey$: BehaviorSubject<string|null>;
  private subs = new SubSink();

  constructor(
    private modalController: ModalController,
    private alertController: AlertController,
    private routerOutlet: IonRouterOutlet,
    private usersService: UsersService,
    private adminFunctionService: AdminFunctionService,
    private classificationsService: ClassificationsService
  ) {
    this.searchKey$ = new BehaviorSubject(null);
    this.classification$ = new BehaviorSubject(null);
  }

  getUserListener() {
    return this.userUpdated.asObservable();
  }

  preFormedUser(usersArray: any[]) {
    const formatedUser = [];
    usersArray.forEach(user => {
      formatedUser.push({...user.user, ...user.admin.user});
    });
    this.subs.sink = of(formatedUser).pipe(
      map(users => users.filter(userClaims => userClaims.customClaims.pro === true)),
    // tslint:disable-next-line: deprecation
    ).subscribe((users) => {
      this.userUpdated.next(users);
    });
  }

  private mergeUserAuth(usersMerge: any[])  {
    return from(usersMerge)
      .pipe(
        mergeMap((user): any => {
          return this.adminFunctionService.getById(user.id).pipe(
            map(admin => ({ user, admin })),
          );
        }),
        reduce((a, i) => [...a, i], [])
      );
  }

  infinateData() {
    this.usersService.init('users', 'name.firstname', { reverse: true, prepend: false }).pipe(
      // mergeMap((usersMerge) => {
      //   return this.mergeUserAuth(usersMerge);
      // })
    // tslint:disable-next-line: deprecation
    ).subscribe((r) => {
      console.log(r);
      this.userUpdated.next(r);
    });
  }

  doInfinite(event: any) {
    this.usersService.more();
  }

  ngOnInit() {
    this.subs.sink = combineLatest([
      this.searchKey$,
      this.classification$
    ]).pipe(
      switchMap(([searchKey, classification]) => this.usersService.getAll(searchKey, classification).pipe(
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
      this.preFormedUser(users);
    });

    this.users$ = this.getUserListener();

    // tslint:disable-next-line: deprecation
    this.subs.sink = this.classificationsService.getAll().subscribe((classifications) => {
      this.classifications = classifications;
    });
  }

  filterClassification(searchKey: string) {
    this.classification$.next(searchKey);
  }

  onClear() {
    this.searchKey$.next('');
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
