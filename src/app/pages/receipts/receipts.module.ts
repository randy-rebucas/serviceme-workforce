import { NgModule } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ReceiptsPageRoutingModule } from './receipts-routing.module';

import { ReceiptsPage } from './receipts.page';
import { DetailComponent } from './detail/detail.component';
import { Screenshot } from '@ionic-native/screenshot/ngx';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ReceiptsPageRoutingModule
  ],
  declarations: [ReceiptsPage, DetailComponent],
  providers: [
    TitleCasePipe,
    Screenshot
  ]
})
export class ReceiptsPageModule {}
