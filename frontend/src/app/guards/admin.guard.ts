import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const isAdmin = localStorage.getItem('isAdmin') === 'true';
  const token   = localStorage.getItem('adminToken');

  if (isAdmin && token) return true;

  router.navigate(['/admin-login']);
  return false;
};
