import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import {
  AngularFirestore,
  AngularFirestoreCollection,
  DocumentReference,
  QuerySnapshot
} from '@angular/fire/firestore';

import { Notifications as useClass } from './notifications';
import firebase from 'firebase/app';

const collection = 'notifications';
const orderField = 'timestamp';
const orderBy = 'desc';

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {

  constructor(
    private angularFirestore: AngularFirestore
  ) {}

  private defaultCollection(status: 'string' = null): AngularFirestoreCollection<useClass> {
    // return this.angularFirestore.collection<useClass>(collection); // , ref => ref.orderBy(orderField, orderBy)
    return this.angularFirestore.collection<useClass>(collection, ref => {
      let query: firebase.firestore.CollectionReference | firebase.firestore.Query = ref;
      if (status) {
        query = query.where('status', '==', status);
      }
      return query.orderBy(orderField, orderBy);
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

  getAll(status: 'string' = null): Observable<useClass[]> {
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
