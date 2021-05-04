import { NgModule } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ChatsPageRoutingModule } from './chats-routing.module';
import { ChatsPage } from './chats.page';
import { LookupComponent } from './lookup/lookup.component';
import { FormComponent } from './form/form.component';
import { Camera } from '@ionic-native/camera/ngx';
import { Crop } from '@ionic-native/crop/ngx';
import { Base64 } from '@ionic-native/base64/ngx';
import { PhotoViewer } from '@ionic-native/photo-viewer/ngx';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    ChatsPageRoutingModule,
    SharedModule
  ],
  declarations: [ChatsPage, FormComponent, LookupComponent],
  providers: [
    Camera,
    Crop,
    Base64,
    PhotoViewer,
    TitleCasePipe
  ]
})
export class ChatsPageModule {}
