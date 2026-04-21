// Utility pure per il riconoscimento delle rotte usate in app.component.ts.

 /**
  * Verifica se l'URL corrente corrisponde a una rotta login o registrazione.
  *
  * @param url URL da controllare.
  * @returns boolean True se l'URL e' una rotta login o registrazione, false altrimenti.
  */
export function isRottaLogin(url: string): boolean {
  return (
    /^\/(it|en)\/benvenuto\/(login|accedi|registrazione)(\/|$)/.test(url) || // verifico se l'URL appartiene all'area benvenuto login o registrazione
    /^\/(it|en)\/welcome\/(login|accedi|registration)(\/|$)/.test(url) // verifico se l'URL appartiene all'area welcome login o registration
  );
}

/**
 * Verifica se l'URL corrente corrisponde alla pagina 404.
 *
 * @param url URL da controllare.
 * @returns boolean True se l'URL e' la pagina 404, false altrimenti.
 */
export function isRotta404(url: string): boolean {
  return /^\/(it|en)\/(non-trovato|not-found)(\/|$)/.test(url); // verifico se l'URL punta alla pagina 404
}

/**
 * Verifica se l'URL corrente corrisponde alla pagina contatti.
 *
 * Rimuove eventuali query string e fragment prima del controllo.
 *
 * @param url URL da controllare.
 * @returns boolean True se l'URL e' la pagina contatti, false altrimenti.
 */
export function isRottaContatti(url: string): boolean {
  const path = String(url || '').split('?')[0].split('#')[0]; // pulisco l'URL da query string e fragment
  return /^\/(it|en)\/(contatti|contact)(\/|$)/.test(path); // verifico se l'URL punta alla pagina contatti
}

/**
 * Verifica se l'URL corrente corrisponde all'area catalogo.
 *
 * @param url URL da controllare.
 * @returns boolean True se l'URL appartiene al catalogo, false altrimenti.
 */
export function isRottaCatalogo(url: string): boolean {
  return /^\/(it|en)\/(catalogo|catalog)(\/|$)/.test(url); // verifico se l'URL appartiene all'area catalogo
}

export function isRottaPiano(url: string): boolean {
  return /^\/(it|en)\/(piano|plan)(\/|$)/.test(url);
}

export function isRottaRicevute(url: string): boolean {
  return /^\/(it|en)\/(ricevute|receipts)(\/|$)/.test(url);
}

export function isRottaProfilo(url: string): boolean {
  return /^\/(it|en)\/(profilo|profile)(\/|$)/.test(url);
}
