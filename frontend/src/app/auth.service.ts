import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = 'http://localhost:8080';
  constructor(private http: HttpClient) { }

  getAuthUrl(provider: string): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${this.apiUrl}/auth/${provider}`);
  }

  exchangeCodeForToken(provider: string, code: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/${provider}`, { code });
  }

  setUserInfo(userInfo: any) {
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
  }

  getUserInfo() {
    const userInfo = localStorage.getItem('userInfo');
    return userInfo ? JSON.parse(userInfo) : null;
  }

  logout() {
    localStorage.removeItem('userInfo');
  }

}
