import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { API } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  private get cid() { return this.auth.getCustomerId(); }

  submitKyc(data: any)            { return this.http.post(`${API.ONBOARDING}/kyc/submit`, data); }
  getKycStatus(customerId: number){ return this.http.get(`${API.ONBOARDING}/kyc/status/${customerId}`); }
  fetchCreditScore() {
    const cid = this.auth.getCustomerId();
    return this.http.post(`${API.ONBOARDING}/credit-score/fetch?customerId=${cid}`, {});
  }
  getProfile(customerId: number)  { return this.http.get<any>(`${API.ONBOARDING}/customers/${customerId}/profile`); }
  getMyProfile()                  { return this.http.get<any>(`${API.ONBOARDING}/customers/${this.cid}/profile`); }
  updateProfile(data: any)        { return this.http.put(`${API.ONBOARDING}/customers/${this.cid}`, data); }
}

