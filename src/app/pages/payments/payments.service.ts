import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PaymentsService {
  private method$ = new BehaviorSubject<string|null>(null);

  constructor() { }

  setMethod(method: string) {
    this.method$.next(method);
  }

  getCurrentMethod() {
    return this.method$.asObservable();
  }
}
