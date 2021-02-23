import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import {
  AngularFirestore,
  AngularFirestoreCollection,
  DocumentReference,
  QuerySnapshot
} from '@angular/fire/firestore';

import { Offers as useClass } from './offers';

const collection = 'offers';

@Injectable({
  providedIn: 'root'
})
export class OffersService {

  constructor(
    private angularFirestore: AngularFirestore
  ) { }

  private defaultCollection(colRef: string): AngularFirestoreCollection<useClass> {
    return this.angularFirestore.collection<useClass>('users/' + colRef + '/' + collection);
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
