import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { QrcodesPageRoutingModule } from './qrcodes-routing.module';

import { QrcodesPage } from './qrcodes.page';
import { NgxQRCodeModule } from '@techiediaries/ngx-qrcode';
import { Base64ToGallery } from '@ionic-native/base64-to-gallery/ngx';
import { SocialSharing } from '@ionic-native/social-sharing/ngx';
import { Screenshot } from '@ionic-native/screenshot/ngx';
import { BarcodeScanner } from '@ionic-native/barcode-scanner/ngx';
import { PreviewComponent } from './preview/preview.component';
@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    QrcodesPageRoutingModule,
    NgxQRCodeModule
  ],
  declarations: [QrcodesPage, PreviewComponent],
  providers: [
    Base64ToGallery,
    SocialSharing,
    Screenshot,
    BarcodeScanner
  ]
})
export class QrcodesPageModule {}
