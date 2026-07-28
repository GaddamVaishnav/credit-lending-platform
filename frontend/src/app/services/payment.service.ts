import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { API } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  private get cid() { return this.auth.getCustomerId(); }

  createOrder(loanId: number, amount: number) {
    return this.http.post<any>(`${API.REPAYMENT}/payments/create-order`, {
      loanId, amount, customerId: this.cid
    });
  }

  verifyPayment(data: any) {
    return this.http.post<any>(`${API.REPAYMENT}/payments/verify`, {
      ...data, customerId: this.cid
    });
  }

  makePayment(loanId: number, amount: number, mode: string) {
    return this.http.post<any>(`${API.REPAYMENT}/repayments/pay?customerId=${this.cid}`, {
      loanId, amount, paymentMode: mode
    });
  }

  getPaymentHistory(loanId: number) {
    return this.http.get<any[]>(`${API.REPAYMENT}/payments/history/${loanId}?customerId=${this.cid}`);
  }

  getEmiSchedule(loanId: number) {
    return this.http.get<any[]>(`${API.REPAYMENT}/emi/${loanId}/schedule?customerId=${this.cid}`);
  }

  getForeclosureQuote(loanId: number) {
    return this.http.get<any>(`${API.REPAYMENT}/repayments/${loanId}/foreclosure`);
  }
}
