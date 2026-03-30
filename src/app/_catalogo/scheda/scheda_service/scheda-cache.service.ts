// Servizio che salva e recupera snapshot cache della scheda per tipo, id e lingua.

import { Injectable } from '@angular/core';

export interface SchedaSnapshot {
  descrizione: string;
  descrizioneTestuale: string;
  urlSfondoScheda: string;
  imgTitoloScheda: string;
  anno: number | null;
  titoloScheda: string;
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
  private cache: Record<string, SchedaSnapshot> = {}; // tengo la cache degli snapshot scheda indicizzati per chiave composta

  /**
   * Salva uno snapshot nella cache della scheda.
   *
   * @param tipo Tipo del contenuto.
   * @param id Id del contenuto.
   * @param lingua Lingua associata allo snapshot.
   * @param snap Snapshot completo della scheda da salvare.
   * @returns void
   */
  set(tipo: string, id: number, lingua: string, snap: SchedaSnapshot): void {
    this.cache[`${tipo}_${id}_${lingua}`] = snap; // salvo lo snapshot usando una chiave composta da tipo, id e lingua
  }

  /**
   * Recupera uno snapshot dalla cache della scheda.
   *
   * @param tipo Tipo del contenuto.
   * @param id Id del contenuto.
   * @param lingua Lingua associata allo snapshot.
   * @returns SchedaSnapshot | null Snapshot trovato oppure null.
   */
  get(tipo: string, id: number, lingua: string): SchedaSnapshot | null {
    return this.cache[`${tipo}_${id}_${lingua}`] ?? null; // restituisco lo snapshot salvato oppure null se non esiste
  }

  /**
   * Svuota completamente la cache della scheda.
   *
   * @returns void
   */
  svuota(): void {
    this.cache = {}; // resetto tutta la cache degli snapshot
  }
}
