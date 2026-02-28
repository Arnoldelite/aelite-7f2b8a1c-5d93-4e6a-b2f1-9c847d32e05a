import { HttpInterceptorFn } from '@angular/common/http';

const API_BASE = 'http://localhost:3000';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');

  // Prepend API base URL for relative paths
  let url = req.url;
  if (!req.url.startsWith('http')) {
    url = API_BASE + req.url;
  }

  let cloned = req.clone({ url });

  if (token) {
    cloned = cloned.clone({
      headers: cloned.headers.set('Authorization', `Bearer ${token}`),
    });
  }

  return next(cloned);
};
