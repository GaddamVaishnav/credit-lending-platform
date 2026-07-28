import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { API } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser = signal<any>(null);

  constructor(private http: HttpClient, private router: Router) {
    const stored = localStorage.getItem('user');
    if (stored) this.currentUser.set(JSON.parse(stored));
  }

  register(data: any) {
    return this.http.post(`${API.ONBOARDING}/auth/register`, data);
  }

  verifyOtp(mobile: string, otp: string) {
    return this.http.post<any>(`${API.ONBOARDING}/auth/verify-otp`, { mobile, otp }).pipe(
      tap(res => this.storeSession(res))
    );
  }

  login(email: string, password: string) {
    return this.http.post<any>(`${API.ONBOARDING}/auth/login`, { email, password }).pipe(
      tap(res => this.storeSession(res))
    );
  }

  refreshProfile(customerId: number): Observable<any> {
    return this.http.get<any>(`${API.ONBOARDING}/customers/${customerId}/profile`).pipe(
      tap(profile => {
        const merged = { ...this.currentUser(), ...profile };
        localStorage.setItem('user', JSON.stringify(merged));
        this.currentUser.set(merged);
      })
    );
  }

  private storeSession(res: any): void {
    localStorage.setItem('token', res.accessToken);
    const profile = res.profile || {};
    localStorage.setItem('user', JSON.stringify(profile));
    this.currentUser.set(profile);
  }

  logout() {
    localStorage.clear();
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null { return localStorage.getItem('token'); }
  isLoggedIn(): boolean     { return !!this.getToken(); }
  getCustomerId(): number   {
    const user = this.currentUser();
    return user?.id || user?.customerId || 1;
  }
}
