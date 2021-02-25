import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import firebase from 'firebase/app';

const BACKEND_URL = environment.firebase.functions;
@Injectable({
  providedIn: 'root'
})
export class AdminFunctionService {

  constructor(
    private http: HttpClient
  ) { }

  getByEmail(email: string) {
    const queryParams = `?email=${email}`;
    return this.http.get<{ user: firebase.User }>(
      BACKEND_URL + '/getUserByEmail' + queryParams
    );
  }

  getById(id: string) {
    const queryParams = `?uid=${id}`;
    return this.http.get<{ user: firebase.User }>(
      BACKEND_URL + '/getUserById' + queryParams
    );
  }

  getAllUsers(page: string = null) {
    const queryParams = `?nextPageToken=${page}`;
    return this.http.get<{ user: firebase.User }>(BACKEND_URL + '/getAllUsers' + queryParams);
  }

  createUser(userData: any) {
    return this.http.post<{ userId: string }>(BACKEND_URL + '/createUser', userData);
  }
}
