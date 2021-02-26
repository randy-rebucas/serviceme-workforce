import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule } from '@angular/forms';
import { ListItemComponent } from './components/list-item/list-item.component';
import { NumberToTimePipe } from './pipes/number-to-time.pipe';

@NgModule({
  declarations: [
    ListItemComponent,
    NumberToTimePipe
  ],
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule
  ],
  exports: [
    ListItemComponent,
    NumberToTimePipe
  ],
  providers: [
    AndroidPermissions
  ]
})
export class SharedModule { }
