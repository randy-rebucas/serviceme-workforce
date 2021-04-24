import { Component, OnDestroy, OnInit } from '@angular/core';
import { ModalController, NavParams } from '@ionic/angular';
import { BehaviorSubject, from, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { SubSink } from 'subsink';
import { Users } from '../../users/users';
import { UsersService } from '../../users/users.service';

@Component({
  selector: 'app-lookup',
  templateUrl: './lookup.component.html',
  styleUrls: ['./lookup.component.scss']
})
export class LookupComponent implements OnInit, OnDestroy {
  public title: string;
  public users$: Observable<any>;
  public userItems: any[];
  public userItems$ = new BehaviorSubject<Users[]>([]);
  private searchKey$: BehaviorSubject<string|null>;
  private subs = new SubSink();
  constructor(
    private navParams: NavParams,
    private modalController: ModalController,
    public usersService: UsersService
  ) {
    this.title = this.navParams.data.title;
    this.searchKey$ = new BehaviorSubject(null);
  }

  getSelectedUser() {
    return this.userItems$.asObservable();
  }

  ngOnInit() {
    this.users$ = this.searchKey$;

    // tslint:disable-next-line: deprecation
    this.getSelectedUser().subscribe((selectedUsers) => {
      this.userItems = selectedUsers;
    });
  }

  onClear() {
    this.searchKey$.next(null);
  }

  onChange(event: any) {
    if (event.detail.value) {
      // tslint:disable-next-line: deprecation
      this.usersService.getResults(event.detail.value).subscribe((response) => {
        this.searchKey$.next(response);
      });
    }
  }

  checkOffer(selectedOffer: Users, currentChilds: Users | Users[]) {
    if (!selectedOffer || !currentChilds) {
      return selectedOffer === currentChilds;
    }

    if (Array.isArray(currentChilds)) {
      return currentChilds.some((u: Users) => u.id === selectedOffer.id);
    }

    return selectedOffer.id === currentChilds.id;
  }

  onSelect(event: any, selectedUser: Users) {
    if (event.detail.checked) {
      this.userItems.push(selectedUser);
      this.userItems$.next(this.userItems);
    } else {
      const updatedOffers = this.userItems.filter(user => user.id !== selectedUser.id);
      this.userItems$.next(updatedOffers);
    }
  }

  onDismiss(state: boolean) {
    this.modalController.dismiss({
      dismissed: state,
      selected: this.userItems
    });
  }

  onRemove(selectedUser: Users) {
    const updatedOffers = this.userItems.filter(user => user.id !== selectedUser.id);
    this.userItems$.next(updatedOffers);
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
