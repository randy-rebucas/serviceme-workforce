import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CountriesService {
  url: string;

  constructor(private http: HttpClient) {
    this.url = '/assets/json/countries.json';
  }

  allCountries(): Observable<any> {
    return this.http.get(this.url);
  }
}
