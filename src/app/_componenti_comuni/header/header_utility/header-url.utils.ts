// ─── header-url.utils.ts ─────────────────────────────────────────────────────
// Funzioni pure per calcolo URL dell'header (zero dipendenze Angular).
// Estratte da header.component.ts.

import { TipoContenuto } from 'src/app/_catalogo/riga-categoria/categoria_services/tipo-contenuto.service';

export function prefissoLinguaDaUrl(path: string, linguaCorrente: string): string {
  const soloPath = path.split('?')[0].split('#')[0];
  const m = soloPath.match(/^\/(it|en)(?=\/|$)/);
  if (m?.[1] === 'it') return '/it';
  if (m?.[1] === 'en') return '/en';
  return linguaCorrente === 'it' ? '/it' : '/en';
}

export function baseCatalogoDaUrl(path: string, linguaCorrente: string): string {
  const soloPath = path.split('?')[0].split('#')[0];
  const pref     = prefissoLinguaDaUrl(path, linguaCorrente);
  const senzaPref = soloPath.replace(/^\/(it|en)(?=\/|$)/, '');
  const matchBase = senzaPref.match(/^\/(catalogo|catalog)(\/|$)/);
  if (matchBase?.[1] === 'catalog')  return pref + '/catalog';
  if (matchBase?.[1] === 'catalogo') return pref + '/catalogo';
  return pref + (linguaCorrente === 'it' ? '/catalogo' : '/catalog');
}

export function pathCatalogoDaTipo(base: string, val: TipoContenuto): string {
  const en = base.endsWith('/catalog');
  if (val === 'film')  return base + (en ? '/movies'        : '/film');
  if (val === 'serie') return base + (en ? '/series'        : '/serie');
  return base + (en ? '/movies-series' : '/film-serie');
}

export function pathLoginDaLingua(path: string, linguaCorrente: string): string {
  const pref = prefissoLinguaDaUrl(path, linguaCorrente);
  return linguaCorrente === 'it' ? pref + '/benvenuto/accedi' : pref + '/welcome/login';
}

export function isPaginaScheda(url: string): boolean {
  return /^\/(it|en)\/(catalogo|catalog)\/(film|movies|serie|series)\/\d+(\/|$)/.test(url.split('?')[0]);
}
