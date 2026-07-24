import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../shared/toast.service';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast  = inject(ToastService);
  const auth   = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {

      // Don't show toast for background refresh calls
      const silent = req.url.includes('/actuator') || req.url.includes('/profile');

      let message = '';

      switch (error.status) {
        case 0:
          message = `Cannot connect to server. Is the backend running?`;
          break;
        case 400:
          message = error.error?.error
                 || error.error?.message
                 || error.error?.fieldErrors
                    ? formatFieldErrors(error.error.fieldErrors)
                    : 'Bad request. Please check your input.';
          break;
        case 401:
          message = 'Session expired. Please login again.';
          auth.logout();
          router.navigate(['/login']);
          break;
        case 403:
          message = 'Access denied. You do not have permission.';
          break;
        case 404:
          message = `Resource not found: ${req.url.split('/api')[1]}`;
          break;
        case 409:
          message = error.error?.error || 'Conflict — resource already exists.';
          break;
        case 422:
          message = error.error?.error || 'Validation failed. Check your input.';
          break;
        case 500:
          message = error.error?.error || 'Server error. Please try again later.';
          break;
        case 503:
          message = 'Service unavailable. Please try again later.';
          break;
        default:
          message = error.error?.error || `Unexpected error (${error.status})`;
      }

      if (message && !silent) {
        toast.error(message);
      }

      return throwError(() => error);
    })
  );
};

function formatFieldErrors(fieldErrors: any): string {
  if (!fieldErrors) return 'Validation failed';
  return Object.entries(fieldErrors)
    .map(([field, msg]) => `${field}: ${msg}`)
    .join(', ');
}
