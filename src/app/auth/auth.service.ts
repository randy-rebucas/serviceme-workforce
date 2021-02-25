import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireFunctions } from '@angular/fire/functions';
import { Observable, of } from 'rxjs';

import firebase from 'firebase/app';
import { Users } from '../pages/users/users';
import { switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  user$: Observable<Users>;

  constructor(
    private angularFireAuth: AngularFireAuth,
    private angularFirestore: AngularFirestore,
    private angularFireFunctions: AngularFireFunctions
  ) {
    // this.user$ = this.getUserState().pipe(
    //   switchMap(
    //     user => {
    //       if (user) {
    //         return this.angularFirestore.doc<Users>(`users/${user.uid}`).valueChanges();
    //       } else {
    //         return of(null) as Observable;
    //       }
    //     }
    //   )
    // );
  }

  getUserState(): Observable<firebase.User> {
    return this.angularFireAuth.authState;
  }

  getCurrentUser() {
    return this.angularFireAuth.currentUser;
  }

  getIdToken() {
    return this.angularFireAuth.idToken;
  }

  signOut() {
    return this.angularFireAuth.signOut();
  }

  reauthenticate(currentPassword: string) {
    const user = firebase.auth().currentUser;
    const cred = firebase.auth.EmailAuthProvider.credential(
        user.email, currentPassword);
    return user.reauthenticateWithCredential(cred);
  }

  updatePassword(newPassword: string) {
    const user = firebase.auth().currentUser;
    return user.updatePassword(newPassword);
  }

  updateEmail(newEmail: string) {
    const user = firebase.auth().currentUser;
    return user.updateEmail(newEmail);
  }

  changeEmai(newEmail: string) {
    const user = firebase.auth().currentUser;
    return user.updateEmail(newEmail);
  }

  changePhone(phoneCredential: firebase.auth.AuthCredential) {
    const user = firebase.auth().currentUser;
    return user.updatePhoneNumber(phoneCredential);
  }

  signInWithEmail(email: string, password: string) {
    return this.angularFireAuth.signInWithEmailAndPassword(email, password);
  }

  signUpWithEmail(email: string, password: string) {
    return this.angularFireAuth.createUserWithEmailAndPassword(email, password);
  }

  setUserData(userId: string, userData: any) {
    return this.angularFirestore.collection('users').doc(userId).set({
      name: {
        firstname: userData.firstName,
        middlename: userData.middleName,
        lastname: userData.lastName
      }
    });
  }

  setCustomClaims(userEmail: string, claimRole: string) {
    const selectedRole = (claimRole === 'client') ? 'addClientRole' : 'addProRole';
    const setCustomClaim = this.angularFireFunctions.httpsCallable(selectedRole);
    return setCustomClaim({ email: userEmail});
  }

  checkEmailExist(email: string) {
    return firebase.auth().fetchSignInMethodsForEmail(email);
  }
}
