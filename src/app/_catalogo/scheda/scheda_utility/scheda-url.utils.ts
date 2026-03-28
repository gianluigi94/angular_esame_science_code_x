// ─── scheda-url.utils.ts ─────────────────────────────────────────────────────
// Funzioni pure (zero dipendenze Angular / servizi).

export function costruisciUrlTrailer(slug: string, lang: string): string {
  if (!slug) return '';
  const folder = lang === 'it' ? 'mp4-trailer-it' : 'mp4-trailer-en';
  const prefix = lang === 'it' ? 'trailer_ita_' : 'trailer_en_';
  return `https://d2kd3i5q9rl184.cloudfront.net/${folder}/${prefix}${slug}.mp4`;
}

export function imgTitoloDaSlug(slug: string, lingua: string): string {
  if (!slug) return '';
  return `assets/titoli_${lingua}/titolo_${lingua}_${slug}.webp`;
}

export function sfondoDaDescrizione(descrizione: string): string {
  const slug = slugDaDescrizione(descrizione);
  if (!slug) return '';
  return `assets/carosello_locandine/carosello_${slug}.webp`;
}

export function slugDaDescrizione(descrizione: string): string {
  return String(descrizione || '').replace(/^(film|serie)\./, '').trim();
}

export function secondiInLeggibile(secondi: number | null | undefined): string {
  if (!secondi || secondi <= 0) return '';
  const ore = Math.floor(secondi / 3600);
  const min = Math.floor((secondi % 3600) / 60);
  const sec = secondi % 60;
  if (ore > 0) return sec > 0 ? `${ore}h ${min}m ${sec}s` : `${ore}h ${min}m`;
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
}

export function attendi(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function precaricaImmagini(urls: string[]): Promise<void> {
  if (!urls || urls.length === 0) return Promise.resolve();
  const jobs = urls.map(u => new Promise<void>(resolve => {
    const img = new Image();
    img.onload = img.onerror = () => resolve();
    img.src = u;
  }));
  return Promise.all(jobs).then(() => undefined);
}
