import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import {
  AngularFirestore,
  AngularFirestoreCollection,
  DocumentReference,
  QuerySnapshot
} from '@angular/fire/firestore';

import { Settings as useClass } from './settings';

const collection = 'settings';

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  constructor(
    private angularFirestore: AngularFirestore
  ) { }

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

  insert(userId: string, data: any) {
    return this.defaultCollection().doc(userId).set({
      currency: data.currency
    });
  }

  update(colRef: string, id: string, data: any): Promise<void> {
    return this.defaultCollection().doc(id).update(data);
  }

  delete(colRef: string, id: string): Promise<void> {
    return this.defaultCollection().doc(id).delete();
  }
}
