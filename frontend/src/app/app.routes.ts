import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  // Default redirect
  { path: '', redirectTo: '/login', pathMatch: 'full' },

  // Customer routes
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'loans',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/loan/loan.component').then(m => m.LoanComponent)
  },
  {
    path: 'repayment',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/repayment/repayment.component').then(m => m.RepaymentComponent)
  },

  // Admin routes — protected by adminGuard
  {
    path: 'admin-login',
    loadComponent: () => import('./pages/admin/admin-login.component').then(m => m.AdminLoginComponent)
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent)
  },

  // Wildcard
  { path: '**', redirectTo: '/login' }
];
