import { NgModule } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';

import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule } from '@angular/forms';
import { ListItemComponent } from './components/list-item/list-item.component';
import { NumberToTimePipe } from './pipes/number-to-time.pipe';
import { CounterPipe } from './pipes/counter.pipe';
import { BookingCounterPipe } from './pipes/booking-counter.pipe';
import { WeekDayPipe } from './pipes/week-day.pipe';
import { MaskPipe } from './pipes/mask.pipe';
import { AvatarComponent } from './components/avatar/avatar.component';
import { IntlPhoneValidationDirective } from './directives/intl-phone-validation.directive';
import { ChatCounterPipe } from './pipes/chat-counter.pipe';

@NgModule({
  declarations: [
    ListItemComponent,
    AvatarComponent,
    NumberToTimePipe,
    CounterPipe,
    BookingCounterPipe,
    WeekDayPipe,
    MaskPipe,
    ChatCounterPipe,
    IntlPhoneValidationDirective
  ],
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule
  ],
  exports: [
    ListItemComponent,
    AvatarComponent,
    NumberToTimePipe,
    CounterPipe,
    BookingCounterPipe,
    WeekDayPipe,
    MaskPipe,
    ChatCounterPipe,
    IntlPhoneValidationDirective
  ],
  providers: [
    AndroidPermissions,
    CurrencyPipe
  ]
})
export class SharedModule { }
