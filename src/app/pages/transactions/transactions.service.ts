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

import { Transactions as useClass } from './transactions';

const collection = 'transactions';
const orderField = 'timestamp';
const orderBy = 'desc';
@Injectable({
  providedIn: 'root'
})
export class TransactionsService {

  private totalBalance$ = new BehaviorSubject<number>(0);

  constructor(
    private angularFirestore: AngularFirestore
  ) {}

  setBalance(amount: number) {
    this.totalBalance$.next(amount);
  }

  getBalance() {
    return this.totalBalance$.asObservable();
  }

  private defaultCollection(status?: string): AngularFirestoreCollection<useClass> {
    return this.angularFirestore.collection<useClass>(collection, ref => {
      let query: firebase.firestore.CollectionReference | firebase.firestore.Query = ref;
      if (status) {
        query = query.where('status', '==', status);
      }
      return query.orderBy(orderField, orderBy);
      }
    );
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

  getAll(status?: string): Observable<useClass[]> {
    return this.fetchData(this.defaultCollection(status));
  }

  getSize(): Observable<QuerySnapshot<useClass>> {
    return this.defaultCollection().get();
  }

  getOne(id: string): Observable<useClass> {
    return this.defaultCollection().doc<useClass>(id).valueChanges().pipe(
      take(1),
      map(data => {
        // data.id = id;
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
