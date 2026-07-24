import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';

const API = 'http://localhost:8081/api/v1';

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser = signal<any>(null);

  constructor(private http: HttpClient, private router: Router) {
    const stored = localStorage.getItem('user');
    if (stored) this.currentUser.set(JSON.parse(stored));
  }

  register(data: any) {
    return this.http.post(`${API}/auth/register`, data);
  }

  verifyOtp(mobile: string, otp: string) {
    return this.http.post<any>(`${API}/auth/verify-otp`, { mobile, otp }).pipe(
      tap(res => this.storeSession(res))
    );
  }

  login(email: string, password: string) {
    return this.http.post<any>(`${API}/auth/login`, { email, password }).pipe(
      tap(res => this.storeSession(res))
    );
  }

  // Fetch fresh profile from API — always up to date
  refreshProfile(customerId: number): Observable<any> {
    return this.http.get<any>(`${API}/customers/${customerId}/profile`).pipe(
      tap(profile => {
        localStorage.setItem('user', JSON.stringify(profile));
        this.currentUser.set(profile);
      })
    );
  }

  private storeSession(res: any) {
    localStorage.setItem('token', res.accessToken);
    localStorage.setItem('refreshToken', res.refreshToken);

    if (res.profile) {
      localStorage.setItem('user', JSON.stringify(res.profile));
      this.currentUser.set(res.profile);
    }
  }

  logout() {
    localStorage.clear();
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null { return localStorage.getItem('token'); }
  isLoggedIn(): boolean { return !!this.getToken(); }
  getCustomerId(): number { return this.currentUser()?.id || 1; }
}


