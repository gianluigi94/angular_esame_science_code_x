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


export function isAreaCatalogo(url: string): boolean { // funzione che mi dice se l'url sta dentro l'area catalogo (qualsiasi sotto-rotta)
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
      /^\/(it|en)\/non-trovato(\/|$)/.test(pathPulito)
    ) {
      return;
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
    if (!/^\/(it|en)\/non-trovato(\/|$)/.test(pathPulito)) {
      return;
    }

    sessionStorage.setItem(CHIAVE_SESSIONE_PATH, pathPulito);
  } catch {}
}
const CHIAVE_WELCOME_TITOLO_STATO = 'welcome_titolo_stato';
export type WelcomeTitoloStato = 'ALTO' | 'CENTRO' | '';

export function leggiWelcomeTitoloStatoDaSessione(): WelcomeTitoloStato {
  try {
    const v = (sessionStorage.getItem(CHIAVE_WELCOME_TITOLO_STATO) || '') as any;
    return v === 'ALTO' || v === 'CENTRO' ? v : '';
  } catch {
    return '';
  }
}
