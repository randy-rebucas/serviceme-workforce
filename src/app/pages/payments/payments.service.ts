import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

interface Method {
  method: string;
  amount: number;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentsService {
  private method$ = new BehaviorSubject<Method|null>(null);

  constructor() { }

  setMethod(methodOption: string, amountToDeposit: number) {
    this.method$.next({method: methodOption, amount: amountToDeposit});
  }

  getCurrentMethod() {
    return this.method$.asObservable();
  }
}
