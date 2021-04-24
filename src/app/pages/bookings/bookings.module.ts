import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { BookingsPageRoutingModule } from './bookings-routing.module';

import { BookingsPage } from './bookings.page';
import { DetailComponent } from './detail/detail.component';
import { FormComponent } from './form/form.component';
import { PreviewComponent } from './preview/preview.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { PhotoViewer } from '@ionic-native/photo-viewer/ngx';
import { Camera } from '@ionic-native/camera/ngx';
import { Crop } from '@ionic-native/crop/ngx';
import { Base64 } from '@ionic-native/base64/ngx';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    BookingsPageRoutingModule,
    SharedModule
  ],
  declarations: [
    BookingsPage,
    DetailComponent,
    FormComponent,
    PreviewComponent
  ],
  entryComponents: [
    DetailComponent,
    FormComponent,
    PreviewComponent
  ],
  providers: [
    PhotoViewer,
    Camera,
    Crop,
    Base64
  ]
})
export class BookingsPageModule {}
