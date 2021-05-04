import { Pipe, PipeTransform } from '@angular/core';
import { from, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AuthService } from 'src/app/auth/auth.service';
import { ChatsService } from 'src/app/pages/chats/chats.service';

@Pipe({
  name: 'chatCounter'
})
export class ChatCounterPipe implements PipeTransform {

  constructor(
    protected authService: AuthService,
    protected chatsService: ChatsService
  ) {}

  transform(value: any, ...args: any[]): any {
    return new Observable(observer => {
      from(this.authService.getCurrentUser()).pipe(
        switchMap((currentUser) => {
          return this.chatsService.getSubCollection(value).pipe(
            map(messages => messages.filter(messagesFilter => messagesFilter.from !== currentUser.uid)),
            map(messages => messages.filter(messagesFilter => messagesFilter.unread))
          );
        })
      )
      // tslint:disable-next-line: deprecation
      .subscribe((bookings) => {
        observer.next(bookings.length);
      });
    });
  }

}
