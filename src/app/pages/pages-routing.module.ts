import { NgModule } from '@angular/core';
import { AngularFireAuthGuard, hasCustomClaim } from '@angular/fire/auth-guard';
import { Routes, RouterModule } from '@angular/router';

import { PagesPage } from './pages.page';

const adminOnly = () => hasCustomClaim('admin');
const clientOnly = () => hasCustomClaim('client');
const proOnly = () => hasCustomClaim('pro');

const routes: Routes = [
  {
    path: '',
    component: PagesPage,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'page-not-found',
        loadChildren: () => import('./page-not-found/page-not-found.module').then( m => m.PageNotFoundPageModule)
      },
      {
        path: 'profile',
        loadChildren: () => import('./profile/profile.module').then( m => m.ProfilePageModule)
      },
      {
        path: 'transactions',
        loadChildren: () => import('./transactions/transactions.module').then( m => m.TransactionsPageModule)
      },
      {
        path: 'payments',
        loadChildren: () => import('./payments/payments.module').then( m => m.PaymentsPageModule)
      },
      {
        path: 'dashboard',
        loadChildren: () => import('./dashboard/dashboard.module').then( m => m.DashboardPageModule)
      },
      {
        path: 'settings',
        loadChildren: () => import('./settings/settings.module').then( m => m.SettingsPageModule)
      },
      {
        path: 'terms-of-use',
        loadChildren: () => import('./terms-of-use/terms-of-use.module').then( m => m.TermsOfUsePageModule)
      },
      {
        path: 'privacy-policy',
        loadChildren: () => import('./privacy-policy/privacy-policy.module').then( m => m.PrivacyPolicyPageModule)
      },
      {
        path: 'users',
        canActivate: [AngularFireAuthGuard],
        data: { authGuardPipe: adminOnly },
        loadChildren: () => import('./users/users.module').then( m => m.UsersPageModule)
      },
      {
        path: 'offers',
        canActivate: [AngularFireAuthGuard],
        data: { authGuardPipe: proOnly },
        loadChildren: () => import('./offers/offers.module').then( m => m.OffersPageModule)
      },
      {
        path: 'bookings',
        canActivate: [AngularFireAuthGuard],
        data: { authGuardPipe: clientOnly },
        loadChildren: () => import('./bookings/bookings.module').then( m => m.BookingsPageModule)
      },
      {
        path: 'locator',
        canActivate: [AngularFireAuthGuard],
        data: { authGuardPipe: proOnly },
        loadChildren: () => import('./locator/locator.module').then( m => m.LocatorPageModule)
      },
      {
        path: 'notifications',
        loadChildren: () => import('./notifications/notifications.module').then( m => m.NotificationsPageModule)
      },
      {
        path: 'receipts',
        loadChildren: () => import('./receipts/receipts.module').then( m => m.ReceiptsPageModule)
      },
      {
        path: 'chats',
        loadChildren: () => import('./chats/chats.module').then( m => m.ChatsPageModule)
      }
    ]
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PagesPageRoutingModule {}
