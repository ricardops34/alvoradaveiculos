import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  // Só anexa o token em chamadas para a nossa própria API — URLs absolutas (ex: ViaCEP,
  // MinhaReceita) são para serviços externos e não devem receber o Authorization, que
  // além de desnecessário derruba o preflight de CORS deles.
  const isExternal = /^https?:\/\//i.test(req.url);
  const authReq = token && !isExternal
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError(err => {
      if (err.status === 401 && authService.isAuthenticated()) {
        authService.logout();
        router.navigate(['/auth/login']);
      }
      return throwError(() => err);
    })
  );
};
