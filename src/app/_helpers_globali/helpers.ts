/**
 * Determina se l'utente sta utilizzando un dispositivo mobile o tablet.
 *
 * Il controllo viene effettuato analizzando lo user agent e cercando
 * parole chiave tipiche dei browser mobile/tablet.
 *
 * @param userAgent User agent da analizzare. Di default viene usato quello del browser corrente.
 * @returns true se il dispositivo è mobile o tablet, false altrimenti.
 */
export function isMobileOrTablet(userAgent: string = navigator.userAgent): boolean { // funzione che mi dice se sono su mobile/tablet usando lo user agent (di default quello del browser)
  const ua = userAgent.toLowerCase(); // porto lo user agent in minuscolo per fare controlli case-insensitive
  return /android|iphone|ipad|ipod|blackberry|opera mini|iemobile|wpdesktop/.test(ua); // verifico con una regex se contiene parole chiave tipiche dei dispositivi mobili/tablet
}

/**
 * Verifica se il browser in uso è Firefox.
 *
 * Il controllo esclude esplicitamente SeaMonkey, che può contenere
 * la stringa 'firefox' nello user agent.
 *
 * @param userAgent User agent da analizzare. Di default viene usato quello del browser corrente.
 * @returns true se il browser è Firefox, false altrimenti.
 */
export function isFirefox(userAgent: string = navigator.userAgent): boolean { // funzione che mi dice se il browser è Firefox (di default leggendo lo user agent)
  try { // uso un try per evitare che un input strano mi faccia lanciare eccezioni
    const ua = (userAgent || '').toLowerCase(); // mi proteggo da null/undefined e porto la stringa in minuscolo
    return ua.includes('firefox') && !ua.includes('seamonkey'); // ritorno true se vedo 'firefox' ma escludo 'seamonkey' che potrebbe contenerlo
  } catch { // se succede qualunque errore
    return false; // in caso di problemi considero che non sia Firefox
  }
}

/**
 * Pulisce un URL rimuovendo query string e hash.
 *
 * Restituisce solo il path principale prima di '?' e '#'.
 *
 * @param url URL da pulire.
 * @returns URL senza query string e hash.
 */
export function pulisciUrl(url: string): string { // funzione che mi pulisce un url togliendo querystring e hash
  return (url || '').split('?')[0].split('#')[0]; // prendo solo la parte prima di '?' e prima di '#', gestendo anche url vuoti
}

/**
 * Verifica se l'URL corrisponde esattamente alla home del catalogo.
 *
 * La verifica viene fatta sull'URL pulito (senza query e hash).
 *
 * @param url URL da verificare.
 * @returns true se l'URL è '/catalogo', false altrimenti.
 */
 export function isCatalogoHome(url: string): boolean {
   const path = pulisciUrl(url || '');
   const p = path.replace(/^\/(it|en)(?=\/|$)/, '');
    return (
      p === '/catalogo' ||
    p === '/catalogo/' ||
    p === '/catalogo/film' ||
    p === '/catalogo/serie' ||
    p === '/catalogo/film-serie' ||
    p === '/catalog' ||
    p === '/catalog/' ||
    p === '/catalog/movies' ||
    p === '/catalog/series' ||
    p === '/catalog/movies-series'
  );
 }


// helpers.ts

 export function isAreaCatalogo(url: string): boolean {
   const path = pulisciUrl(url || '');
   const p = path.replace(/^\/(it|en)(?=\/|$)/, '');
   return p.startsWith('/catalogo') || p.startsWith('/catalog');
 }

export function impostaLangHtml(documento: Document, codice: string): void { // funzione che mi imposta l'attributo lang del tag <html>
  const lang = codice === 'it' ? 'it' : 'en'; // traduco il codice in una lingua supportata: se non è 'it' forzo 'en'
  documento.documentElement.setAttribute('lang', lang); // imposto l'attributo lang sull'elemento radice del documento
}


const CHIAVE_SESSIONE_PATH = 'ultimo_path';

/**
 * Salva in sessionStorage il path corrente (senza query/hash).
 */
export function salvaPathInSessionStorage(url: string): void {
  try {
    const pathPulito = pulisciUrl(url || '');
    if (
      !pathPulito ||
      pathPulito === '/' ||
      /^\/(it|en)$/.test(pathPulito) ||
      /^\/(it|en)\/(non-trovato|not-found)(\/|$)/.test(pathPulito)
    ) {
      return;
    }

    const last = sessionStorage.getItem(CHIAVE_SESSIONE_PATH) || '';
    const eraContatti = /^\/(it\/contatti|en\/contact)(\/|$)/.test(last);
    const oraContatti = /^\/(it\/contatti|en\/contact)(\/|$)/.test(pathPulito);

    if (eraContatti && !oraContatti) {
      setTimeout(() => {
        sessionStorage.removeItem('vengo_da_contatti');
      }, 500);
    }

    // se il path cambia e non siamo più sul login, rimuovo il flag vengo_da_login
    const eraLogin = /^\/(it\/benvenuto\/accedi|en\/welcome\/sign-in)(\/|$)/.test(last);
    const oraLogin = /^\/(it\/benvenuto\/accedi|en\/welcome\/sign-in)(\/|$)/.test(pathPulito);
    if (eraLogin && !oraLogin) {
      setTimeout(() => {
        sessionStorage.removeItem('vengo_da_login');
      }, 500);
    }

    const eraRegistrazione = /^\/(it\/benvenuto\/registrazione|en\/welcome\/registration)(\/|$)/.test(last);
    const oraRegistrazione = /^\/(it\/benvenuto\/registrazione|en\/welcome\/registration)(\/|$)/.test(pathPulito);
    if (eraRegistrazione && !oraRegistrazione) {
      setTimeout(() => {
        sessionStorage.removeItem('pagina_registrazione');
      }, 500);
    }

    const eraContatti2 = /^\/(it\/contatti|en\/contact)(\/|$)/.test(last);
    const oraContatti2 = /^\/(it\/contatti|en\/contact)(\/|$)/.test(pathPulito);
    if (eraContatti2 && !oraContatti2) {
      setTimeout(() => {
        sessionStorage.removeItem('vengo_da_registrazione');
      }, 500);
    }

    sessionStorage.setItem(CHIAVE_SESSIONE_PATH, pathPulito);
  } catch {}
}


/**
 * Ritorna il path salvato in sessionStorage.
 */
export function leggiPathDaSessionStorage(): string {
  try {
    return sessionStorage.getItem(CHIAVE_SESSIONE_PATH) || '';
  } catch {
    return '';
  }
}

/**
 * Ritorna true se l'ultimo path salvato in sessionStorage indica che si arriva da benvenuto/welcome.
 * Usa leggiPathDaSessionStorage() che già pulisce e salva i path "utili".
 */
export function vengoDaBenvenutoDaSessione(): boolean {
  try {
    const last = pulisciUrl(leggiPathDaSessionStorage() || '');

    return (
      last === '/it/benvenuto' ||
      last === '/it/welcome' ||
      last === '/en/benvenuto' ||
      last === '/en/welcome'
    );
  } catch {
    return false;
  }
}

/**
 * Forza il salvataggio del path corrente anche se è /non-trovato.
 * Da chiamare SOLO quando la pagina 404 è già caricata/stabile.
 */
export function salvaPathNonTrovatoDopoCaricamento(url: string): void {
  try {
    const pathPulito = pulisciUrl(url || '');
    if (!pathPulito) return;

    // accetta SOLO la rotta non-trovato (it/en)
    if (!/^\/(it|en)\/(non-trovato|not-found)(\/|$)/.test(pathPulito)) {
      return;
    }

    sessionStorage.setItem(CHIAVE_SESSIONE_PATH, pathPulito);
  } catch {}
}

export function calcolaHash32(testo: string): number {
  let h = 2166136261;
  for (let i = 0; i < testo.length; i++) {
    h ^= testo.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function slugDaLocandina(url: string): string {
  const u = String(url || '');
  const file = (u.split('/').pop() || '').trim();
  const m = file.match(/^locandina_(it|en)_(.+)\.webp$/i);
  if (m && m[2]) return m[2];
  return file.replace(/\.webp$/i, '');
}

export function mescolaDeterministicaLocandine<T extends { src: string }>(
  lista: T[],
  seed: string,
): T[] {
  const s = String(seed || '');
  return (lista || []).slice().sort((a, b) => {
    const ka = calcolaHash32(s + '|' + slugDaLocandina(String(a?.src || '')));
    const kb = calcolaHash32(s + '|' + slugDaLocandina(String(b?.src || '')));
    return ka - kb;
  });
}

export function traduciSegmentiUrl(url: string, langSalvata: 'it' | 'en'): string {
  let u = url;

  if (langSalvata === 'it') {
    u = u.replace(/\/(welcome)(\/|$)/,      '/benvenuto$2');
    u = u.replace(/\/(login)(\/|$)/,        '/accedi$2');
    u = u.replace(/\/(catalog)(\/|$)/,      '/catalogo$2');
    u = u.replace(/\/(movies-series)(\/|$)/,'/film-serie$2');
    u = u.replace(/\/(movies)(\/|$)/,       '/film$2');
    u = u.replace(/\/(series)(\/|$)/,       '/serie$2');
    u = u.replace(/\/(season)(\/|$)/,       '/stagione$2');
    u = u.replace(/([?&])play=/,            '$1riproduzione=');
  } else {
    u = u.replace(/\/(benvenuto)(\/|$)/,    '/welcome$2');
    u = u.replace(/\/(accedi)(\/|$)/,       '/login$2');
    u = u.replace(/\/(catalogo)(\/|$)/,     '/catalog$2');
    u = u.replace(/\/(film-serie)(\/|$)/,   '/movies-series$2');
    u = u.replace(/\/(film)(\/|$)/,         '/movies$2');
    u = u.replace(/\/(serie)(\/|$)/,        '/series$2');
    u = u.replace(/\/(stagione)(\/|$)/,     '/season$2');
    u = u.replace(/([?&])riproduzione=/,    '$1play=');
  }

  return u;
}
