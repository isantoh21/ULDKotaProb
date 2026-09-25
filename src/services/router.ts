import { useState, useEffect } from 'react';

export type AppRoute = 
  | '/'
  | '/asesmen-guest'
  | '/tiket-asesmen'
  | '/login-peserta'
  | '/portal-peserta'
  | '/daftar-jadwal'
  | '/login-terapis'
  | '/portal-terapis'
  | '/admin'
  | '/log-aktivitas'
  | '/panduan-layanan';

export interface RouteState {
  path: AppRoute;
  params: Record<string, string>;
}

export function parseHash(hash: string): RouteState {
  const cleanHash = hash.replace(/^#\/?/, '/');
  const [pathname, queryString] = cleanHash.split('?');
  
  const validPathnames: AppRoute[] = [
    '/',
    '/asesmen-guest',
    '/tiket-asesmen',
    '/login-peserta',
    '/portal-peserta',
    '/daftar-jadwal',
    '/login-terapis',
    '/portal-terapis',
    '/admin',
    '/log-aktivitas',
    '/panduan-layanan'
  ];

  const matchedPath: AppRoute = validPathnames.includes(pathname as AppRoute) 
    ? (pathname as AppRoute) 
    : '/';

  const params: Record<string, string> = {};
  if (queryString) {
    const searchParams = new URLSearchParams(queryString);
    searchParams.forEach((val, key) => {
      params[key] = val;
    });
  }

  return {
    path: matchedPath,
    params
  };
}

export function navigateTo(path: AppRoute, params?: Record<string, string>) {
  let target = `#${path}`;
  if (params && Object.keys(params).length > 0) {
    const qs = new URLSearchParams(params).toString();
    target += `?${qs}`;
  }
  window.location.hash = target;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function useAppRouter() {
  const [route, setRoute] = useState<RouteState>(() => {
    if (typeof window !== 'undefined') {
      return parseHash(window.location.hash || '#/');
    }
    return { path: '/', params: {} };
  });

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(parseHash(window.location.hash));
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return {
    route,
    navigate: navigateTo
  };
}
