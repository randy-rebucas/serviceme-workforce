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

  private defaultCollection(): AngularFirestoreCollection<useClass> {
    return this.angularFirestore.collection<useClass>(collection);
  }

  private byStatusCollection(): AngularFirestoreCollection<useClass> {
    return this.angularFirestore.collection<useClass>(collection);
  }

  private byProfessionalCollection(userId: string): AngularFirestoreCollection<useClass> {
    return this.angularFirestore.collection<useClass>(
      collection,
      ref => ref.where('prof', '==', userId)
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

  getAll(): Observable<useClass[]> {
    return this.fetchData(this.defaultCollection());
  }

  getByProfessional(userId: string): Observable<useClass[]> {
    return this.fetchData(this.byProfessionalCollection(userId));
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
