import { Component, OnInit } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map, mergeMap, reduce } from 'rxjs/operators';
import { AdminFunctionService } from 'src/app/shared/services/admin-function.service';
import { UsersService } from '../../users/users.service';

@Component({
  selector: 'app-client',
  templateUrl: './client.component.html',
  styleUrls: ['./client.component.scss'],
})
export class ClientComponent implements OnInit {
  public lists$: Observable<any>;

  constructor(
    private usersService: UsersService,
    private adminFunctionService: AdminFunctionService
  ) { }

  ngOnInit() {
    this.lists$ = this.usersService.getAll().pipe(
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
          reduce((a, i) => [...a, i], []),
        );
      })
    );
  }

}
