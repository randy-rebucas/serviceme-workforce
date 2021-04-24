import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';

@Component({
  selector: 'app-page-not-found',
  templateUrl: './page-not-found.page.html',
  styleUrls: ['./page-not-found.page.scss'],
})
export class PageNotFoundPage implements OnInit {

  constructor(private location: Location) { }

  ngOnInit() {
  }

  onBack() {
    this.location.back();
  }
}
