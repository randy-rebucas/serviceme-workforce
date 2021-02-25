import { NgModule } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ProfilePageRoutingModule } from './profile-routing.module';
import { File } from '@ionic-native/file/ngx';
import { Camera } from '@ionic-native/camera/ngx';
import { ProfilePage } from './profile.page';
import { SharedModule } from 'src/app/shared/shared.module';
import { FormComponent } from './form/form.component';
import { ChangePasswordComponent } from './change-password/change-password.component';
import { ChangePhoneNumberComponent } from './change-phone-number/change-phone-number.component';
import { ChangeEmailComponent } from './change-email/change-email.component';

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
    File
  ]
})
export class ProfilePageModule {}
