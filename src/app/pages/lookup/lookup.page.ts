import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { IonSearchbar, ModalController, NavParams } from '@ionic/angular';
import { BehaviorSubject, from, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { SubSink } from 'subsink';
import { DetailComponent } from '../bookings/detail/detail.component';
import { Users } from '../users/users';
import { UsersService } from '../users/users.service';


@Component({
  selector: 'app-lookup',
  templateUrl: './lookup.page.html',
  styleUrls: ['./lookup.page.scss'],
})
export class LookupPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('searchbar', {static: false}) searchEl: IonSearchbar;

  public professionals$: Observable<Users[]>;
  public searchKey$: BehaviorSubject<string|null>;
  private subs = new SubSink();
  constructor(
    private modalController: ModalController,
    private usersService: UsersService
  ) {
    this.searchKey$ = new BehaviorSubject(null);
  }

  ngOnInit() {
    this.professionals$ = this.searchKey$.pipe(
      switchMap((searchKey) => {
        if (searchKey) {
          return this.usersService.getAll(searchKey.toUpperCase())
          .pipe(
            map(users => {
              return users.filter(userClaims => userClaims.roles?.pro === true);
            })
          );
        } else {
          return of([]);
        }
      })
    );
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.searchEl.setFocus();
    }, 200);
  }

  onDismiss(state: boolean) {
    this.modalController.dismiss({
      dismissed: state
    });
  }

  onClear() {
    this.searchKey$.next('');
  }

  onChange(event: any) {
    this.searchKey$.next(event.detail.value);
  }

  onDeail(userDetail: any) {
    this.subs.sink = from(this.modalController.create({
      component: DetailComponent,
      componentProps: {
        title: 'Detail',
        userData: userDetail,
        state: false
      }
    // tslint:disable-next-line: deprecation
    })).subscribe((modalEl) => {
      modalEl.present();
    });
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

}
