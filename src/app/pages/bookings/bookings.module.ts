import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { BookingsPageRoutingModule } from './bookings-routing.module';

import { BookingsPage } from './bookings.page';
import { DetailComponent } from './detail/detail.component';
import { FormComponent } from './form/form.component';
import { PreviewComponent } from './preview/preview.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    BookingsPageRoutingModule
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
  ]
})
export class BookingsPageModule {}
