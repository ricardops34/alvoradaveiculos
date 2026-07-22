import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, catchError, of } from 'rxjs';

// Decide se a raiz do sistema ('/') abre a loja pública (vitrine de veículos) ou vai direto pro
// login — controlado pelo interruptor "Loja Pública Ativa" em Configurações. Desligado por
// padrão, então instalações existentes continuam caindo direto no login como sempre foi.
export const lojaGuard: CanActivateFn = () => {
  const http = inject(HttpClient);
  const router = inject(Router);

  return http.get<any>('/api/config/parametros').pipe(
    map(p => {
      if (p?.loja_ativa) return true;
      router.navigate(['/auth/login']);
      return false;
    }),
    catchError(() => {
      router.navigate(['/auth/login']);
      return of(false);
    })
  );
};
