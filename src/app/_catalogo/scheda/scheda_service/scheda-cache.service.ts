import { Injectable } from '@angular/core';

export interface SchedaSnapshot {
  descrizione: string;
  descrizioneTestuale: string;
  urlSfondoScheda: string;
  imgTitoloScheda: string;
  anno: number | null;
  durata: number | null;
  episodiTotali: number | null;
  regista: string;
  slugCorrente: string;
  stagioni: Array<{ id_stagione: number; numero_stagione: number; numero_episodi: number }>;
  stagioneSelezionata: string | null;
  serieData: Record<string, Record<string, { titolo: string; descrizione: string; anteprima: string; durata: string }>>;
  righeCorrelate: { idCategoria: string; category: string; locandine: { src: string; titolo: string; sottotitolo: string; tipo: string; id_media: string }[] }[];
}

@Injectable({ providedIn: 'root' })
export class SchedaCacheService {
  private cache: Record<string, SchedaSnapshot> = {};

  set(tipo: string, id: number, lingua: string, snap: SchedaSnapshot): void {
    this.cache[`${tipo}_${id}_${lingua}`] = snap;
  }

  get(tipo: string, id: number, lingua: string): SchedaSnapshot | null {
    return this.cache[`${tipo}_${id}_${lingua}`] ?? null;
  }

  svuota(): void {
    this.cache = {};
  }
}
