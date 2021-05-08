import { Component, OnInit } from '@angular/core';
import { AlertController } from '@ionic/angular';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Partners } from './partners';
import { PartnersService } from './partners.service';

@Component({
  selector: 'app-partners',
  templateUrl: './partners.page.html',
  styleUrls: ['./partners.page.scss'],
})
export class PartnersPage implements OnInit {
  public merchants$: Observable<Partners[]>;

  constructor(
    private alertController: AlertController,
    private partnersService: PartnersService
  ) { }

  ngOnInit() {
    this.merchants$ = this.partnersService.getAll().pipe(
      map((merchants) => {
        const merchantData = [];
        merchants.forEach(merchant => {
          merchantData.push({
            fullname: `${merchant.name.firstname} ${merchant.name.middlename}, ${merchant.name.lastname}`,
            address: `${merchant.address.line1} ${merchant.address.line2} ${merchant.address.city}, ${merchant.address.state}, ${merchant.address.country} ${merchant.address.postalCode}`,
            location: `${merchant.address.state}`
          });
        });
        return merchantData;
      })
    );
  }

  myHeaderFn(record, recordIndex, records) {
    if (recordIndex === 0) {
      return record.location.toUpperCase();
    }

    const firstPrev = records[recordIndex - 1].location;
    const firstCurrent = record.location;

    if (firstPrev !== firstCurrent) {
      return firstCurrent.toUpperCase();
    }

    return null;
  }

  onHelp() {
    this.alertController.create({
      cssClass: 'my-custom-class',
      header: 'Here\'s why?',
      subHeader: 'Details to earn more.',
      message: 'Earn 5% income share in every cashin transactions and 5% in every scans of bookings',
      buttons: ['OK']
    // tslint:disable-next-line: deprecation
    }).then((alertEl) => {
      alertEl.present();
    });
  }
}
