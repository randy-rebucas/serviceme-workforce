import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ReferPageRoutingModule } from './refer-routing.module';

import { ReferPage } from './refer.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReferPageRoutingModule
  ],
  declarations: [ReferPage]
})
export class ReferPageModule {}
