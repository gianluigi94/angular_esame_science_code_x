// Funzioni pure per costruire URL e formattare dati della scheda.

export function costruisciUrlTrailer(slug: string, lang: string): string {
  if (!slug) return ''; // esco se non ho uno slug valido
  const folder = lang === 'it' ? 'mp4-trailer-it' : 'mp4-trailer-en'; // scelgo la cartella trailer in base alla lingua
  const prefix = lang === 'it' ? 'trailer_ita_' : 'trailer_en_'; // scelgo il prefisso file trailer in base alla lingua
  return `https://d2kd3i5q9rl184.cloudfront.net/${folder}/${prefix}${slug}.mp4`; // costruisco l'URL completo del trailer
}

/**
 * Costruisce l'URL dell'immagine titolo partendo dallo slug e dalla lingua.
 *
 * @param slug Slug del contenuto.
 * @param lingua Lingua corrente.
 * @returns string URL dell'immagine titolo oppure stringa vuota.
 */
export function imgTitoloDaSlug(slug: string, lingua: string): string {
  if (!slug) return ''; // esco se non ho uno slug valido
  return `assets/titoli_${lingua}/titolo_${lingua}_${slug}.webp`; // costruisco l'URL dell'immagine titolo
}

/**
 * Costruisce l'URL dello sfondo partendo dalla descrizione semantica.
 *
 * @param descrizione Descrizione semantica del contenuto.
 * @returns string URL dello sfondo oppure stringa vuota.
 */
export function sfondoDaDescrizione(descrizione: string): string {
  const slug = slugDaDescrizione(descrizione); // ricavo lo slug dalla descrizione
  if (!slug) return ''; // esco se non ho ottenuto uno slug valido
  return `assets/carosello_locandine/carosello_${slug}.webp`; // costruisco l'URL dello sfondo
}

/**
 * Estrae lo slug dalla descrizione semantica del contenuto.
 *
 * @param descrizione Descrizione semantica da normalizzare.
 * @returns string Slug pulito del contenuto.
 */
export function slugDaDescrizione(descrizione: string): string {
  return String(descrizione || '').replace(/^(film|serie)\./, '').trim(); // rimuovo il prefisso semantico e pulisco gli spazi
}

/**
 * Converte una durata in secondi in una stringa leggibile.
 *
 * @param secondi Durata in secondi.
 * @returns string Durata formattata in ore, minuti e secondi.
 */
export function secondiInLeggibile(secondi: number | null | undefined): string {
  if (!secondi || secondi <= 0) return ''; // esco se la durata non e' valida
  const ore = Math.floor(secondi / 3600); // ricavo le ore intere
  const min = Math.floor((secondi % 3600) / 60); // ricavo i minuti residui
  const sec = secondi % 60; // ricavo i secondi residui
  if (ore > 0) return sec > 0 ? `${ore}h ${min}m ${sec}s` : `${ore}h ${min}m`; // formatto il caso con ore
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`; // formatto il caso senza ore
}

/**
 * Attende per il numero di millisecondi richiesto.
 *
 * @param ms Millisecondi di attesa.
 * @returns Promise<void> Promise risolta allo scadere del tempo.
 */
export function attendi(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms)); // aspetto il tempo richiesto prima di risolvere
}

/**
 * Precarica una lista di immagini e risolve quando tutte hanno completato il tentativo di caricamento.
 *
 * @param urls Lista degli URL immagine da precaricare.
 * @returns Promise<void> Promise risolta quando tutti i preload sono terminati.
 */
export function precaricaImmagini(urls: string[]): Promise<void> {
  if (!urls || urls.length === 0) return Promise.resolve(); // esco subito se non ho immagini da precaricare
  const jobs = urls.map(
    (u) =>
      new Promise<void>((resolve) => {
        const img = new Image(); // creo un'immagine temporanea per il preload
        img.onload = img.onerror = () => resolve(); // considero concluso il preload sia in successo sia in errore
        img.src = u; // faccio partire il caricamento dell'immagine
      }),
  );
  return Promise.all(jobs).then(() => undefined); // risolvo quando tutti i preload sono terminati
}
