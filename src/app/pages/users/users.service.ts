import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { map, scan, take, tap } from 'rxjs/operators';

import {
  AngularFirestore,
  AngularFirestoreCollection,
  DocumentReference,
  QuerySnapshot
} from '@angular/fire/firestore';

import { Users as useClass } from './users';
import { Offers } from '../offers/offers';
import { Feedbacks } from '../bookings/feedbacks';
import firebase from 'firebase/app';
// import { QueryConfig } from '../dashboard/client/client.component';
const collection = 'users';
const bookingsSubCollection = 'bookings';
const orderField = 'id';
const orderBy = 'asc';
@Injectable({
  providedIn: 'root'
})
export class UsersService {

  // private infinatePos$: BehaviorSubject<any>;
  // private infinatePos: any;

  private done$ = new BehaviorSubject(false);
  private loading$ = new BehaviorSubject(false);
  private data$ = new BehaviorSubject([]);
  // private query: QueryConfig;

   // Observable data
  data: Observable<any>;
  done: Observable<boolean> = this.done$.asObservable();
  loading: Observable<boolean> = this.loading$.asObservable();

  constructor(
    private angularFirestore: AngularFirestore,
  ) {}
  // init(path: string, field: string, opts?: any) {
  //   this.query = {
  //     path,
  //     field,
  //     limit: 8,
  //     reverse: false,
  //     prepend: false,
  //     ...opts
  //   };

  //   const first = this.angularFirestore.collection(this.query.path, ref => {
  //     return ref
  //             .orderBy(this.query.field, this.query.reverse ? 'desc' : 'asc')
  //             .limit(this.query.limit);
  //   });


  //   this.mapAndUpdate(first);

  //   return this.data$.asObservable().pipe(
  //     scan( (acc, val) => {
  //       return this.query.prepend ? val.concat(acc) : acc.concat(val);
  //     })
  //   // tslint:disable-next-line: deprecation
  //   );

  // }
  // // Retrieves additional data from firestore
  // more() {
  //   const cursor = this.getCursor();

  //   const more = this.angularFirestore.collection(this.query.path, ref => {
  //     return ref
  //             .orderBy(this.query.field, this.query.reverse ? 'desc' : 'asc')
  //             .limit(this.query.limit)
  //             .startAfter(cursor);
  //   });
  //   this.mapAndUpdate(more);
  // }
  // // Determines the doc snapshot to paginate query
  // private getCursor() {
  //   const current = this.data$.value;
  //   if (current.length) {
  //     return current[current.length - 1].doc;
  //   }
  //   return null;
  // }
  //   // Maps the snapshot to usable format the updates source
  // private mapAndUpdate(col: AngularFirestoreCollection<any>) {

  //   if (this.done$.value || this.loading$.value) { return; }

  //   // loading
  //   this.loading$.next(true);

  //   // Map snapshot with doc ref (needed for cursor)
  //   return col.snapshotChanges()
  //   .pipe(
  //     tap(actions => {
  //         let values = actions.map(snap => {
  //           const data = snap.payload.doc.data();
  //           const doc = snap.payload.doc;
  //           return { ...data, doc };
  //         });
  //         // If prepending, reverse the batch order
  //         values = this.query.prepend ? values.reverse() : values;

  //         // update source with new values, done loading
  //         this.data$.next(values);
  //         this.loading$.next(false);

  //         // no more values, mark done
  //         if (!values.length) {
  //           this.done$.next(true);
  //         }
  //     }),
  //     take(1)
  //   );
  // }

  // =====================
  // tslint:disable-next-line: max-line-length
  private defaultCollection(keystring: string = '' , classification?: string, point?: string, location?: any): AngularFirestoreCollection<useClass> {
    console.log(point)
    console.log(location)
    return this.angularFirestore.collection<useClass>(collection, ref => {
      let query: firebase.firestore.CollectionReference | firebase.firestore.Query = ref;
      query.where('roles.pro', '==', false);
      if (classification) {
        query = query.where('classification', '==', classification);
      }
      if (keystring !== '') {
        query = query.orderBy('name.firstname').startAt(keystring).endAt(keystring + '\uf8ff');
      }
      if (location != null) {
        if (point === 'nearby') {
          query = query.where('address.city', '==', location?.city);
        } else {
          query = query.where('address.state', '==', location?.state);
        }
      }
      return query; });
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

  getAll(keystring: string = '' , classification?: string, point?: string, location?: any): Observable<useClass[]> {
    return this.fetchData(this.defaultCollection(keystring, classification, point, location));
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

  deleteSubCollection(document: string, targetCollection: string, documentId: string): Promise<void> {
    return this.childCollections(document, targetCollection).doc(documentId).delete();
  }
}
