// Servizio che conserva in memoria lo stato cache del catalogo tra un caricamento e l'altro.

import { Injectable } from '@angular/core';
import { TipoContenuto } from './tipo-contenuto.service';

@Injectable({ providedIn: 'root' })
export class CatalogoCacheService {
  righeDemo: any[] = []; // tengo le righe gia' caricate del catalogo
  offsetRighe = 0; // tengo l'offset corrente delle righe
  haAltreRighe = true; // segno se ci sono ancora righe da caricare
  hoFinitoTutto = false; // segno se il caricamento e' terminato del tutto
  tipo: TipoContenuto = 'film_serie'; // tengo il tipo contenuto associato alla cache
  lingua = 'it'; // tengo la lingua associata alla cache
  scrollY = 0; // salvo la posizione verticale di scroll

  /**
   * Verifica se la cache corrente e' ancora valida per lingua e tipo richiesti.
   *
   * @param lingua Lingua da confrontare con quella salvata.
   * @param tipo Tipo contenuto da confrontare con quello salvato.
   * @returns boolean True se la cache contiene righe ed e' coerente con lingua e tipo richiesti.
   */
  valida(lingua: string, tipo: TipoContenuto): boolean {
    return this.righeDemo.length > 0 && this.lingua === lingua && this.tipo === tipo; // controllo che la cache abbia dati e corrisponda a lingua e tipo richiesti
  }

  /**
   * Svuota completamente la cache e reimposta lo stato iniziale.
   *
   * @returns void
   */
  svuota(): void {
    this.righeDemo = []; // svuoto le righe memorizzate
    this.offsetRighe = 0; // riporto l'offset iniziale a zero
    this.haAltreRighe = true; // riapro la possibilita' di caricare altre righe
    this.hoFinitoTutto = false; // tolgo il flag di caricamento completo
    this.scrollY = 0; // azzero la posizione di scroll salvata
  }
}
