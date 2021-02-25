import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { combineLatest, Observable } from 'rxjs';
import { delay } from 'rxjs/operators';
import { UsersService } from 'src/app/pages/users/users.service';
import { AdminFunctionService } from '../../services/admin-function.service';

@Component({
  selector: 'app-list-item',
  templateUrl: './list-item.component.html',
  styleUrls: ['./list-item.component.scss'],
})
export class ListItemComponent implements OnInit {
  @Input() userId: string;
  @Input() itemId: string;
  @Input() data: any;

  @Output() item = new EventEmitter<any>();
  user$: Observable<{}>;
  constructor(
    private adminFunctionService: AdminFunctionService,
    private userService: UsersService
  ) { }

  ngOnInit() {
    this.user$ = combineLatest([this.adminFunctionService.getById(this.userId), this.userService.getOne(this.userId)]).pipe(
      delay(500)
    );

    this.user$.subscribe((r) => {
      console.log(r);
    });
  }

  emitData() {
    this.item.emit(this.data);
  }

}
