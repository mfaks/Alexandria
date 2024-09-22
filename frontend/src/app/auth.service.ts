import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080';

  constructor(private http: HttpClient) { }

  initiateAuth(provider: string): void {
    window.location.href = `${this.apiUrl}/auth/${provider}`;
  }

  fetchUserInfo(): Observable<any> {
    return this.http.get(`${this.apiUrl}/user/info`, { withCredentials: true })
      .pipe(
        tap(userInfo => {
          this.setUserInfo(userInfo);
        }),
        catchError(error => {
          console.error('Error fetching user info:', error);
          return of(null);
        })
      );
  }

  setUserInfo(userInfo: any): void {
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
  }

  getUserInfo(): any {
    const userInfo = localStorage.getItem('userInfo');
    return userInfo ? JSON.parse(userInfo) : null;
  }

  logout(): Observable<any> {
    return this.http.get(`${this.apiUrl}/logout`, { withCredentials: true })
      .pipe(
        tap(response => {
          localStorage.removeItem('userInfo');
        }),
        catchError(error => {
          console.error('Error logging out:', error);
          localStorage.removeItem('userInfo');
          return of(null);
        })
      );
  }
}