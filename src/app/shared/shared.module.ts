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

@NgModule({
  declarations: [
    ListItemComponent,
    NumberToTimePipe,
    CounterPipe,
    BookingCounterPipe,
    WeekDayPipe
  ],
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule
  ],
  exports: [
    ListItemComponent,
    NumberToTimePipe,
    CounterPipe,
    BookingCounterPipe,
    WeekDayPipe
  ],
  providers: [
    AndroidPermissions,
    CurrencyPipe
  ]
})
export class SharedModule { }
