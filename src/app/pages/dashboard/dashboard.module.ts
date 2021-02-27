import { NgModule } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DashboardPageRoutingModule } from './dashboard-routing.module';

import { DashboardPage } from './dashboard.page';
import { SharedModule } from 'src/app/shared/shared.module';
import { ClientComponent } from './client/client.component';
import { ProComponent } from './pro/pro.component';
import { Camera } from '@ionic-native/camera/ngx';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DashboardPageRoutingModule,
    SharedModule
  ],
  declarations: [
    DashboardPage,
    ClientComponent,
    ProComponent
  ],
  providers: [
    Camera,
    TitleCasePipe
  ]
})
export class DashboardPageModule {}
