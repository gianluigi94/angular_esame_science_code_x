// ─── categoria-url.utils.ts ──────────────────────────────────────────────────
// Funzioni pure (zero dipendenze Angular / servizi).

export function urlTrailerHover(lang: string, slug: string): string {
  const l      = String(lang || '').toLowerCase() === 'en' ? 'en' : 'it';
  const folder = l === 'it' ? 'mp4-trailer-it' : 'mp4-trailer-en';
  const prefix = l === 'it' ? 'trailer_ita_'   : 'trailer_en_';
  return `https://d2kd3i5q9rl184.cloudfront.net/${folder}/${prefix}${slug}.mp4`;
}

export function titoloPulitoPerTooltip(testoTradotto: string): string {
  return String(testoTradotto || '')
    .replace('{{titolo}}', '')
    .replace(/"/g, '')
    .trim();
}

export function buildCatalogUrl(codice: string, tipo: string, id: string): string {
  const en   = codice === 'en';
  const pref = en ? '/en' : '/it';
  const base = en ? '/catalog' : '/catalogo';
  const t    = String(tipo || '').toLowerCase() === 'serie' ? 'serie' : 'film';
  const leaf = en
    ? (t === 'film' ? '/movies' : '/series')
    : (t === 'film' ? '/film'   : '/serie');
  return pref + base + leaf + '/' + id;
}
