import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.fetchUserInfo().pipe(
    map(userInfo => {
      if (userInfo) {
        return true;
      } else {
        return router.createUrlTree(['/home']);
      }
    }),
    catchError(() => {
      return of(router.createUrlTree(['/home']));
    })
  );
};