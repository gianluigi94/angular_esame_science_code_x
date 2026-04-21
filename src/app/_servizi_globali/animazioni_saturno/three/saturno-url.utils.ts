// Funzioni pure che riconoscono le principali rotte applicative e leggono l'URL corrente.

/**
 * Verifica se l'URL appartiene alla rotta catalogo.
 *
 * @param url URL da controllare.
 * @returns boolean
 */
export function eRottaCatalogo(url: string): boolean {
  const u = String(url || ''); // normalizzo l'URL ricevuto in stringa sicura
  return /^\/(it|en)\/(catalogo|catalog)(\/|$)/.test(u); // verifico se il path appartiene alla rotta catalogo
}

/**
 * Verifica se l'URL appartiene alla rotta welcome escludendo login e registrazione.
 *
 * @param url URL da controllare.
 * @returns boolean
 */
export function eRottaWelcome(url: string): boolean {
  const u = String(url || '')
    .split('?')[0]
    .split('#')[0]; // ripulisco l'URL da query string e hash
  if (eRottaLogin(u) || eRottaRegistrazione(u)) return false; // escludo esplicitamente login e registrazione dalla welcome
  return (
    u === '/it/benvenuto' || // controllo il path italiano benvenuto esatto
    u.startsWith('/it/benvenuto/') || // controllo i sotto-percorsi italiani di benvenuto
    u === '/en/benvenuto' || // controllo il path inglese benvenuto esatto
    u.startsWith('/en/benvenuto/') || // controllo i sotto-percorsi inglesi di benvenuto
    u === '/it/welcome' || // controllo il path italiano welcome esatto
    u.startsWith('/it/welcome/') || // controllo i sotto-percorsi italiani di welcome
    u === '/en/welcome' || // controllo il path inglese welcome esatto
    u.startsWith('/en/welcome/') // controllo i sotto-percorsi inglesi di welcome
  );
}

/**
 * Verifica se l'URL appartiene alla rotta login.
 *
 * @param url URL da controllare.
 * @returns boolean
 */
export function eRottaLogin(url: string): boolean {
  const path = String(url || '')
    .split('?')[0]
    .split('#')[0]; // ripulisco l'URL da query string e hash
  return (
    /^\/(it|en)\/benvenuto\/(login|accedi)(\/|$)/.test(path) || // verifico se il path appartiene al login sotto benvenuto
    /^\/(it|en)\/welcome\/(login|accedi)(\/|$)/.test(path) // verifico se il path appartiene al login sotto welcome
  );
}

/**
 * Verifica se l'URL appartiene alla rotta registrazione.
 *
 * @param url URL da controllare.
 * @returns boolean
 */
export function eRottaRegistrazione(url: string): boolean {
  const path = String(url || '')
    .split('?')[0]
    .split('#')[0]; // ripulisco l'URL da query string e hash
  return (
    /^\/(it|en)\/benvenuto\/registrazione(\/|$)/.test(path) || // verifico se il path appartiene alla registrazione sotto benvenuto
    /^\/(it|en)\/welcome\/registration(\/|$)/.test(path) // verifico se il path appartiene alla registrazione sotto welcome
  );
}

/**
 * Verifica se l'URL appartiene alla rotta not found.
 *
 * @param url URL da controllare.
 * @returns boolean
 */
export function eRottaNotFound(url: string): boolean {
  const path = String(url || '')
    .split('?')[0]
    .split('#')[0]; // ripulisco l'URL da query string e hash
  return /^\/(it|en)\/(non-trovato|not-found)(\/|$)/.test(path); // verifico se il path appartiene alla rotta not found
}

/**
 * Verifica se l'URL appartiene alla rotta contatti.
 *
 * @param url URL da controllare.
 * @returns boolean
 */
export function eRottaContatti(url: string): boolean {
  const path = String(url || '')
    .split('?')[0]
    .split('#')[0]; // ripulisco l'URL da query string e hash
  return /^\/(it|en)\/(contatti|contact)(\/|$)/.test(path); // verifico se il path appartiene alla rotta contatti
}
export function eRottaPiano(url: string): boolean {
  const path = String(url || '')
    .split('?')[0]
    .split('#')[0];
  return /^\/(it|en)\/(piano|plan)(\/|$)/.test(path);
}

export function eRottaProfilo(url: string): boolean {
  return /^\/(it|en)\/(profilo|profile)(\/|$)/.test(url || '');
}

export function eRottaRicevute(url: string): boolean {
  const path = String(url || '')
    .split('?')[0]
    .split('#')[0];
  return /^\/(it|en)\/(ricevute|receipts)(\/|$)/.test(path);
}
/**
 * Verifica se l'URL appartiene a una scheda catalogo film o serie con id numerico.
 *
 * @param url URL da controllare.
 * @returns boolean
 */
export function eSchedaCatalogo(url: string): boolean {
  const path = String(url || '')
    .split('?')[0]
    .split('#')[0]; // ripulisco l'URL da query string e hash
  return /^\/(it|en)\/(catalogo|catalog)\/(film|movies|serie|series)\/\d+(\/|$)/.test(
    path,
  ); // verifico se il path appartiene a una scheda catalogo con id
}

/**
 * Legge l'URL attuale completo di pathname, query string e hash.
 *
 * @returns string
 */
export function leggiUrlAttuale(): string {
  return (
    String(window.location.pathname || '') + // leggo il pathname corrente oppure una stringa vuota
    String(window.location.search || '') + // aggiungo la query string corrente oppure una stringa vuota
    String(window.location.hash || '')
  ); // aggiungo l'hash corrente oppure una stringa vuota
}
