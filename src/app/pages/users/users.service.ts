import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import {
  AngularFirestore,
  AngularFirestoreCollection,
  DocumentReference
} from '@angular/fire/firestore';

import { Users as useClass } from './users';

const collection = 'users';
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
    return this.angularFirestore.collection<useClass>(collection, ref => ref.orderBy(orderField, orderBy));
  }

  public byRoleCollection() {
    return this.angularFirestore.collection(collection, ref => ref.where('role', '==', 'pro').orderBy(orderField, orderBy));
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

  getSize() {
    return this.angularFirestore.collection<useClass>(collection).get();
  }

  getAll(searchKey: string): Observable<useClass[]> {
    const datas = this.fetchData(this.defaultCollection());
    return datas.pipe(
      map(dataList =>
        dataList.filter((data: useClass) => {
          return data.name.firstname.toLowerCase().includes(searchKey.toLowerCase());
        })
      )
    );
  }

  getUser(userId: string): Observable<useClass> {
    return this.defaultCollection().doc<useClass>(userId).valueChanges().pipe(
      take(1),
      map(data => {
        // data.id = userId;
        return data;
      })
    );
  }

  getAllPro(): Observable<useClass[]> {
    return this.fetchData(this.byRoleCollection());
  }

  insert(userId: string, data: any): Promise<DocumentReference> {
    return;
    // return this.defaultCollection().doc(userId).set({
    //   name: {
    //     firstname: data.firstname,
    //     lastname: data.lastname,
    //     midlename: data.midlename
    //   },
    //   address: {
    //     address1: data.address1,
    //     address2: data.address2,
    //     city: data.city,
    //     country: data.country,
    //     postalCode: data.postalCode,
    //     state: data.state
    //   },
    //   gender: data.gender
    // });
  }

  update(id: string, data: any): Promise<void> {
    return this.defaultCollection().doc(id).update(data);
  }

  delete(id: string): Promise<void> {
    return this.defaultCollection().doc(id).delete();
  }
}
