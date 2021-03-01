import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import {
  AngularFirestore,
  AngularFirestoreCollection,
  DocumentReference,
  QuerySnapshot
} from '@angular/fire/firestore';

import { Users as useClass } from './users';
import { Offers } from '../offers/offers';
import { Feedbacks } from '../bookings/feedbacks';

const collection = 'users';
const bookingsSubCollection = 'bookings';
const orderField = 'id';
const orderBy = 'asc';
@Injectable({
  providedIn: 'root'
})
export class UsersService {

  constructor(
    private angularFirestore: AngularFirestore,
  ) {}

  private defaultCollection(): AngularFirestoreCollection<useClass> {
    return this.angularFirestore.collection<useClass>(collection);
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

  /**
   * set child collections
   * users/{userId}/{subCollection}
   */

  private childCollections(document: string, subCollection: string): AngularFirestoreCollection<useClass> {
    return this.angularFirestore.collection<useClass>(
        collection +
        '/' +
        document +
        '/' +
        subCollection
      );
  }

  setSubCollection(document: string, targetCollection: string, documentId: string, data: any) {
    return this.childCollections(document, targetCollection).doc(documentId).set(data);
  }

  getSubCollection(document: string, targetCollection: string) {
    return this.fetchData(this.childCollections(document, targetCollection));
  }

}
