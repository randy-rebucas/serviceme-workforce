import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PagesPageRoutingModule } from './pages-routing.module';

import { PagesPage } from './pages.page';
import { LocalNotifications } from '@ionic-native/local-notifications/ngx';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PagesPageRoutingModule
  ],
  declarations: [PagesPage],
  providers: [
    LocalNotifications,
  ]
})
export class PagesPageModule {}
