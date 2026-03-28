// Funzioni pure per il riconoscimento delle rotte — estratte da saturno.service.ts

export function eRottaCatalogo(url: string): boolean {
  const u = String(url || '');
  return /^\/(it|en)\/(catalogo|catalog)(\/|$)/.test(u);
}

export function eRottaWelcome(url: string): boolean {
  const u = String(url || '').split('?')[0].split('#')[0];
  if (eRottaLogin(u) || eRottaRegistrazione(u)) return false;
  return (
    u === '/it/benvenuto' ||
    u.startsWith('/it/benvenuto/') ||
    u === '/en/benvenuto' ||
    u.startsWith('/en/benvenuto/') ||
    u === '/it/welcome' ||
    u.startsWith('/it/welcome/') ||
    u === '/en/welcome' ||
    u.startsWith('/en/welcome/')
  );
}

export function eRottaLogin(url: string): boolean {
  const path = String(url || '').split('?')[0].split('#')[0];
  return (
    /^\/(it|en)\/benvenuto\/(login|accedi)(\/|$)/.test(path) ||
    /^\/(it|en)\/welcome\/(login|accedi)(\/|$)/.test(path)
  );
}

export function eRottaRegistrazione(url: string): boolean {
  const path = String(url || '').split('?')[0].split('#')[0];
  return (
    /^\/(it|en)\/benvenuto\/registrazione(\/|$)/.test(path) ||
    /^\/(it|en)\/welcome\/registration(\/|$)/.test(path)
  );
}

export function eRottaNotFound(url: string): boolean {
  const path = String(url || '').split('?')[0].split('#')[0];
  return /^\/(it|en)\/(non-trovato|not-found)(\/|$)/.test(path);
}

export function eRottaContatti(url: string): boolean {
  const path = String(url || '').split('?')[0].split('#')[0];
  return /^\/(it|en)\/(contatti|contact)(\/|$)/.test(path);
}

export function eSchedaCatalogo(url: string): boolean {
  const path = String(url || '').split('?')[0].split('#')[0];
  return /^\/(it|en)\/(catalogo|catalog)\/(film|movies|serie|series)\/\d+(\/|$)/.test(path);
}

export function leggiUrlAttuale(): string {
  return String(window.location.pathname || '') +
         String(window.location.search  || '') +
         String(window.location.hash    || '');
}
