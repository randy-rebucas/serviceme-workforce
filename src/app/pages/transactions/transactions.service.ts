import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import {
  AngularFirestore,
  AngularFirestoreCollection,
  DocumentReference,
  QuerySnapshot
} from '@angular/fire/firestore';
import firebase from 'firebase/app';

import { Transactions, Transactions as useClass } from './transactions';

const collection = 'transactions';
const orderField = 'timestamp';
const orderBy = 'desc';
@Injectable({
  providedIn: 'root'
})
export class TransactionsService {

  private totalBalance$ = new BehaviorSubject<number>(0);
  private myTransactions$ = new BehaviorSubject<Transactions[]>([]);

  constructor(
    private angularFirestore: AngularFirestore
  ) {}

  setBalance(amount: number) {
    this.totalBalance$.next(amount);
  }

  myTransactions(transaction: Transactions[]) {
    this.myTransactions$.next(transaction);
  }

  getBalance() {
    return this.totalBalance$.asObservable();
  }

  getMyTransactions() {
    return this.myTransactions$.asObservable();
  }

  private defaultCollection(): AngularFirestoreCollection<useClass> {
    return this.angularFirestore.collection<useClass>(collection, ref => ref.orderBy(orderField, orderBy));
  }

  public filterBySender(limit: number | null) {
    return this.angularFirestore.collection(collection, ref => {
      let query: firebase.firestore.CollectionReference | firebase.firestore.Query = ref;
      if (limit) {
        query = query.limit(limit);
      }
      return query.where('status', '==', 'completed').orderBy(orderField, orderBy);
    });
  }

  private fetchData(col: AngularFirestoreCollection): Observable<any> {
    return col.snapshotChanges().pipe(
        map(actions => {
          return actions.map(a => {
            const data = a.payload.doc.data();
            const id = a.payload.doc.id;
            return { id, ...data };
          });
        })
      );
  }

  getAll(): Observable<useClass[]> {
    return this.fetchData(this.defaultCollection());
  }

  getBySender(limit: number| null): Observable<useClass[]> {
    return this.fetchData(this.filterBySender(limit));
  }

  getSize(): Observable<QuerySnapshot<useClass>> {
    return this.defaultCollection().get();
  }

  getOne(id: string): Observable<useClass> {
    return this.defaultCollection().doc<useClass>(id).valueChanges().pipe(
      take(1),
      map(data => {
        data.id = id;
        return data;
      })
    );
  }

  insert(data: any): Promise<DocumentReference> {
    return this.defaultCollection().add(data);
  }

  update(id: string, data: any): Promise<void> {
    return this.defaultCollection().doc(id).update(data);
  }

  delete(id: string): Promise<void> {
    return this.defaultCollection().doc(id).delete();
  }
}
