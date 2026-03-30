// Funzioni pure per costruire URL e pulire testi del catalogo.

export function urlTrailerHover(lang: string, slug: string): string {
  const l = String(lang || '').toLowerCase() === 'en' ? 'en' : 'it'; // normalizzo la lingua in it o en
  const folder = l === 'it' ? 'mp4-trailer-it' : 'mp4-trailer-en'; // scelgo la cartella corretta in base alla lingua
  const prefix = l === 'it' ? 'trailer_ita_' : 'trailer_en_'; // scelgo il prefisso corretto del file trailer
  return `https://d2kd3i5q9rl184.cloudfront.net/${folder}/${prefix}${slug}.mp4`; // costruisco l'URL completo del trailer hover
}

/**
 * Pulisce il titolo tradotto rimuovendo placeholder e doppi apici.
 *
 * @param testoTradotto Testo tradotto da normalizzare.
 * @returns string Titolo pulito da usare nel tooltip.
 */
export function titoloPulitoPerTooltip(testoTradotto: string): string {
  return String(testoTradotto || '')
    .replace('{{titolo}}', '')
    .replace(/"/g, '')
    .trim(); // rimuovo placeholder, virgolette e spazi superflui
}

/**
 * Costruisce l'URL del catalogo in base a lingua, tipo e id contenuto.
 *
 * @param codice Codice lingua corrente.
 * @param tipo Tipo contenuto richiesto.
 * @param id Id del contenuto.
 * @returns string URL finale del catalogo.
 */
export function buildCatalogUrl(codice: string, tipo: string, id: string): string {
  const en = codice === 'en'; // verifico se la lingua corrente e' inglese
  const pref = en ? '/en' : '/it'; // scelgo il prefisso lingua dell'URL
  const base = en ? '/catalog' : '/catalogo'; // scelgo la base URL localizzata
  const t = String(tipo || '').toLowerCase() === 'serie' ? 'serie' : 'film'; // normalizzo il tipo a serie oppure film
  const leaf = en
    ? t === 'film'
      ? '/movies'
      : '/series'
    : t === 'film'
      ? '/film'
      : '/serie'; // scelgo il segmento finale in base a lingua e tipo
  return pref + base + leaf + '/' + id; // compongo l'URL finale del catalogo
}
