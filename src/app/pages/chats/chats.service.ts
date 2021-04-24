import { Injectable } from '@angular/core';
import {
  AngularFirestore,
  AngularFirestoreCollection,
  DocumentReference,
  QuerySnapshot
} from '@angular/fire/firestore';

import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

import { Chats as useClass } from './chats';

const collection = 'chats';
import firebase from 'firebase/app';
@Injectable({
  providedIn: 'root'
})
export class ChatsService {

  constructor(
    private angularFirestore: AngularFirestore
  ) { }

  private defaultCollection(userId?: string): AngularFirestoreCollection<useClass> {
    return this.angularFirestore.collection<useClass>(collection, ref => {
      let query: firebase.firestore.CollectionReference | firebase.firestore.Query = ref;
      if (userId) {
        query = query.where('members', 'array-contains', userId);
      }
      return query;
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

  getAll(userId?: string): Observable<useClass[]> {
    return this.fetchData(this.defaultCollection(userId));
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

  checkExist(id: string) {
    return this.defaultCollection().doc<useClass>(id).get().pipe(
      map((mapres) => {
        return (mapres.exists) ? true : false;
      })
    );
  }

  insert(roomId: string, data: any): Promise<void> {
    return this.defaultCollection().doc(roomId).set(data);
  }

  update(id: string, data: any): Promise<void> {
    return this.defaultCollection().doc(id).update(data);
  }

  delete(id: string): Promise<void> {
    return this.defaultCollection().doc(id).delete();
  }

  setSubCollection(documentId: string, childId: string, data: any) {
    return this.angularFirestore.collection<useClass>('chats/' + documentId + '/messages').doc(childId).set({
      name: data.name
    }, { merge: true });
  }

  insertSubCollection(documentId: string, data: any) {
    return this.angularFirestore.collection<useClass>('chats/' + documentId + '/messages').add(data);
  }

  getSubCollection(documentId: string) {
    return this.fetchData(this.angularFirestore.collection<useClass>('chats/' + documentId + '/messages', ref => ref.orderBy('createdAt', 'asc')));
  }

  deleteSubCollection(parentDocId: string, childId: string): Promise<void> {
    return this.angularFirestore.collection<useClass>('chats/' + parentDocId + '/messages').doc(childId).delete();
  }

  getOneCollection(parentDocId: string, childId: string): Observable<useClass> {
    return this.angularFirestore.collection<useClass>('chats/' + parentDocId + '/messages').doc<useClass>(childId).valueChanges().pipe(
      take(1),
      map(data => {
        // data.id = id;
        return data;
      })
    );
  }
}
