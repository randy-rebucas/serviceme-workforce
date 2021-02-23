import { Injectable } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/storage';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {

  constructor(
    private angularFireStorage: AngularFireStorage
  ) { }

  put(path: string, file: any) {
    return this.ref(path).put(file);
  }

  ref(path: string) {
    return this.angularFireStorage.ref(path);
  }
}
