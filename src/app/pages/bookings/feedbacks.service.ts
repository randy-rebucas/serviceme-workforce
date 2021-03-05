import { Injectable } from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreCollection,
  DocumentReference,
  QuerySnapshot
} from '@angular/fire/firestore';

import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

import { Feedbacks as useClass } from './feedbacks';

const collection = 'feedbacks';

@Injectable({
  providedIn: 'root'
})
export class FeedbacksService {

  constructor(
    private angularFirestore: AngularFirestore
  ) { }

  private defaultCollection(colRef: string): AngularFirestoreCollection<useClass> {
    return this.angularFirestore.collection<useClass>('bookings/' + colRef + '/' + collection);
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
        // data.id = id;
        return data;
      })
    );
  }

  insert(colRef: string, subColRef: string, data: any) {
    return this.defaultCollection(colRef).doc(subColRef).set({
      feedback: data.feedback,
      timestamp: data.timestamp
    });
  }

  update(colRef: string, id: string, data: any): Promise<void> {
    return this.defaultCollection(colRef).doc(id).update(data);
  }

  delete(colRef: string, id: string): Promise<void> {
    return this.defaultCollection(colRef).doc(id).delete();
  }
}
