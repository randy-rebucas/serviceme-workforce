import { Injectable } from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreCollection,
  DocumentReference,
  QuerySnapshot
} from '@angular/fire/firestore';

import { BehaviorSubject, Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

import { Bookings as useClass } from './bookings';
import { Offers } from '../offers/offers';

const collection = 'bookings';

@Injectable({
  providedIn: 'root'
})
export class BookingsService {
  private offerItems$ = new BehaviorSubject<Offers[]>([]);

  constructor(
    private angularFirestore: AngularFirestore
  ) { }

  setOffers(offers: Offers[]) {
    this.offerItems$.next(offers);
  }

  getOffers() {
    return this.offerItems$.asObservable();
  }

  private defaultCollection(colRef: string): AngularFirestoreCollection<useClass> {
    return this.angularFirestore.collection<useClass>('users/' + colRef + '/' + collection);
  }

  private childCollection(colRef: string, offer: Offers): AngularFirestoreCollection<useClass> {
    return this.angularFirestore.collection<useClass>(
      'users/' + colRef + '/' + collection,
      ref => ref.where('childs', 'array-contains', offer)
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

  getAll(colRef: string): Observable<useClass[]> {
    return this.fetchData(this.defaultCollection(colRef));
  }

  getChildField(colRef: string, offer: Offers) {
    return this.fetchData(this.childCollection(colRef, offer));
  }

  getSize(colRef: string): Observable<QuerySnapshot<useClass>> {
    return this.defaultCollection(colRef).get();
  }

  getOne(colRef: string, id: string): Observable<useClass> {
    return this.defaultCollection(colRef).doc<useClass>(id).valueChanges().pipe(
      take(1),
      map(data => {
        data.id = id;
        return data;
      })
    );
  }

  insert(colRef: string, data: any): Promise<DocumentReference> {
    return this.defaultCollection(colRef).add(data);
  }

  update(colRef: string, id: string, data: any): Promise<void> {
    return this.defaultCollection(colRef).doc(id).update(data);
  }

  delete(colRef: string, id: string): Promise<void> {
    return this.defaultCollection(colRef).doc(id).delete();
  }
}
