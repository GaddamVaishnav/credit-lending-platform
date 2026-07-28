import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { API } from '../config/api.config';

@Injectable({ providedIn: 'root' })
export class EmailService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  sendOtpEmail(email: string, otp: string) {
    return this.http.post(`${API.NOTIFICATION}/notifications/otp`, { email, otp });
  }
  sendLoanApprovedEmail(customerId: number, loanId: number) {
    return this.http.post(`${API.NOTIFICATION}/notifications/loan-approved`, { customerId, loanId });
  }
  sendEmiReminder(customerId: number, loanId: number, dueDate: string, amount: number) {
    return this.http.post(`${API.NOTIFICATION}/notifications/emi-reminder`, { customerId, loanId, dueDate, amount });
  }
  sendPaymentConfirmation(customerId: number, amount: number, txnId: string) {
    return this.http.post(`${API.NOTIFICATION}/notifications/payment-confirmed`, { customerId, amount, txnId });
  }
  getNotifications(customerId: number) {
    return this.http.get<any[]>(`${API.NOTIFICATION}/notifications/history/${customerId}`);
  }
}
