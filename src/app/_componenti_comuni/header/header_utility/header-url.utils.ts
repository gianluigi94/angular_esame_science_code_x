// Funzioni pure per calcolo URL dell'header (zero dipendenze Angular).
import { TipoContenuto } from 'src/app/_catalogo/riga-categoria/categoria_services/tipo-contenuto.service';

/**
 * Ricava il prefisso lingua corretto partendo dall'URL corrente o dalla lingua attiva.
 * @param path URL o path corrente da analizzare.
 * @param linguaCorrente Lingua attualmente selezionata.
 * @returns Prefisso lingua nel formato '/it' oppure '/en'.
 */
export function prefissoLinguaDaUrl(path: string, linguaCorrente: string): string {
  const soloPath = path.split('?')[0].split('#')[0]; // pulisco query string e hash per lavorare solo sul path
  const m = soloPath.match(/^\/(it|en)(?=\/|$)/); // provo a leggere subito il prefisso lingua iniziale
  if (m?.[1] === 'it') return '/it'; // se trovo it lo restituisco direttamente
  if (m?.[1] === 'en') return '/en'; // se trovo en lo restituisco direttamente
  return linguaCorrente === 'it' ? '/it' : '/en'; // se non c'e' nel path ripiego sulla lingua corrente
}

/**
 * Costruisce la base catalogo coerente con lingua e struttura URL corrente.
 * @param path URL o path corrente da analizzare.
 * @param linguaCorrente Lingua attualmente selezionata.
 * @returns Base catalogo nel formato '/it/catalogo', '/en/catalog' o equivalente.
 */
export function baseCatalogoDaUrl(path: string, linguaCorrente: string): string {
  const soloPath = path.split('?')[0].split('#')[0]; // pulisco query string e hash per analizzare solo il path
  const pref = prefissoLinguaDaUrl(path, linguaCorrente); // recupero prima il prefisso lingua corretto
  const senzaPref = soloPath.replace(/^\/(it|en)(?=\/|$)/, ''); // rimuovo il prefisso lingua per leggere la base restante
  const matchBase = senzaPref.match(/^\/(catalogo|catalog)(\/|$)/); // controllo se nel path esiste gia' catalogo o catalog

  if (matchBase?.[1] === 'catalog') return pref + '/catalog'; // mantengo la variante inglese se la trovo gia'
  if (matchBase?.[1] === 'catalogo') return pref + '/catalogo'; // mantengo la variante italiana se la trovo gia'
  return pref + (linguaCorrente === 'it' ? '/catalogo' : '/catalog'); // altrimenti scelgo la base in base alla lingua attiva
}

/**
 * Genera il path catalogo finale partendo dalla base e dal tipo contenuto richiesto.
 * @param base Base catalogo gia' calcolata.
 * @param val Tipo contenuto richiesto.
 * @returns Path completo verso film, serie o vista combinata.
 */
export function pathCatalogoDaTipo(base: string, val: TipoContenuto): string {
  const en = base.endsWith('/catalog'); // capisco se sto lavorando sulla variante inglese
  if (val === 'film') return base + (en ? '/movies' : '/film'); // costruisco il path film coerente con la lingua
  if (val === 'serie') return base + (en ? '/series' : '/serie'); // costruisco il path serie coerente con la lingua
  return base + (en ? '/movies-series' : '/film-serie'); // per il tipo misto restituisco il path combinato
}

/**
 * Costruisce il path della pagina login coerente con la lingua attiva.
 * @param path URL o path corrente da analizzare.
 * @param linguaCorrente Lingua attualmente selezionata.
 * @returns Path completo verso la pagina di login.
 */
export function pathLoginDaLingua(path: string, linguaCorrente: string): string {
  const pref = prefissoLinguaDaUrl(path, linguaCorrente); // ricavo prima il prefisso lingua corretto
  return linguaCorrente === 'it' ? pref + '/benvenuto/accedi' : pref + '/welcome/login'; // compongo il path login corretto per lingua
}

/**
 * Verifica se l'URL corrente corrisponde a una pagina scheda contenuto.
 * @param url URL completo o path da controllare.
 * @returns True se l'URL e' una scheda film o serie, altrimenti false.
 */
export function isPaginaScheda(url: string): boolean {
  return /^\/(it|en)\/(catalogo|catalog)\/(film|movies|serie|series)\/\d+(\/|$)/.test(url.split('?')[0]); // controllo il path senza query per vedere se rispetta il formato scheda
}
