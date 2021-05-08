import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { QrcodesPage } from './qrcodes.page';

const routes: Routes = [
  {
    path: '',
    component: QrcodesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class QrcodesPageRoutingModule {}
