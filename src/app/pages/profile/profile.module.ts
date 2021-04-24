import { NgModule } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ProfilePageRoutingModule } from './profile-routing.module';
import { File } from '@ionic-native/file/ngx';
import { Camera } from '@ionic-native/camera/ngx';
import { Crop } from '@ionic-native/crop/ngx';

import { ProfilePage } from './profile.page';
import { SharedModule } from 'src/app/shared/shared.module';
import { FormComponent } from './form/form.component';
import { ChangePasswordComponent } from './change-password/change-password.component';
import { ChangePhoneNumberComponent } from './change-phone-number/change-phone-number.component';
import { ChangeEmailComponent } from './change-email/change-email.component';
import { Base64 } from '@ionic-native/base64/ngx';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    ProfilePageRoutingModule,
    SharedModule
  ],
  declarations: [
    ProfilePage,
    FormComponent,
    ChangePasswordComponent,
    ChangePhoneNumberComponent,
    ChangeEmailComponent
  ],
  entryComponents: [
    FormComponent,
    ChangePasswordComponent,
    ChangePhoneNumberComponent,
    ChangeEmailComponent
  ],
  providers: [
    TitleCasePipe,
    Camera,
    Crop,
    Base64,
    File
  ]
})
export class ProfilePageModule {}
