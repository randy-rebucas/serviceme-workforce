import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule } from '@angular/forms';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    IonicModule,
    ReactiveFormsModule
  ],
  providers: [
    AndroidPermissions
  ]
})
export class SharedModule { }
