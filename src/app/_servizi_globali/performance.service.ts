//questo servizio serve per capire la potenza della gpu dell'utente, ma purtroppo ottengo un risultato diverso da browser a browser

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' }) // Dico ad Angular che questa classe è un servizio iniettabile
export class PerformanceService {
  private performanceLevel = new BehaviorSubject<string>('Calcolando...'); //mantiene l'ultimo valore emesso, all'inizio è calcolando, ma cambierà quando sarà pronto, uso ascoltatori perche avere eventuali messaggi dinamici in più eventuali parti nel progetto
  performanceLevel$ = this.performanceLevel.asObservable(); //ottengo il valore in una proprietà

  private isLowEndPC = new BehaviorSubject<boolean>(false); //inizia con false ma può cambiare se è un pc scarso
  isLowEndPC$ = this.isLowEndPC.asObservable(); // Espongo lo stato 'pc poco potente' come observable in sola lettura


  constructor() {
    this.detectGPU();
  }

 /**
 * Rileva il livello di performance della GPU dell'utente tramite la libreria 'detect-gpu'.
 *
 * Carica dinamicamente 'detect-gpu', calcola il tier stimato (fps) usando i benchmark locali e:
 * - aggiorna lo stream 'performanceLevel$' con una descrizione testuale (es. 'Alta', 'Bassa', ecc.)
 * - aggiorna lo stream 'isLowEndPC$' a true se il dispositivo è un PC e la stima fps è sotto soglia
 *
 * Nota: il risultato può variare tra browser per differenze di fingerprinting, driver e API disponibili.
 *
 * @link https://github.com/pmndrs/detect-gpu
 * @returns Promise che si risolve quando il rilevamento è completato e gli stream sono stati aggiornati.
 */
private async detectGPU(): Promise<void> {
  const { getGPUTier } = await import('detect-gpu'); // Importo in modo dinamico la funzione getGPUTier
  const gpuTier = await getGPUTier({ // Chiamo getGPUTier per ottenere stima e info della GPU
    benchmarksURL: '/assets/detect-gpu/benchmarks' // Indico dove trovare i file benchmark nel progetto
  });


    const fps = gpuTier.fps ?? 0; //ottengo fps stimati

    //lista di possibili livelli
    let level = 'GPU non trovata'; // uno dei pochi attendibili da tutti i brawser
    if (!gpuTier.gpu) {
      level = 'GPU non trovata';
    } else if (fps >= 144) {
      level = 'Estremamente alta';
    } else if (fps >= 90) {
      level = 'Molto alta';
    } else if (fps >= 60) {
      level = 'Alta';
    } else if (fps >= 45) {
      level = 'Medio alta';
    } else if (fps >= 30) {
      level = 'Medio';
    } else if (fps >= 20) {
      level = 'Medio bassa';
    } else if (fps >= 15) {
      level = 'Bassa';
    } else if (fps >= 10) {
      level = 'Molto bassa';
    } else {
      level = 'Estremamente bassa'; // uno dei pochi attendibili da tutti i brawser
    }

    this.performanceLevel.next(level); //agiorna osservable
    this.isLowEndPC.next(fps < 15 && this.isPC()); //imposta true se il dispositivo è un pc e gli fps sono bassi
  }

  /**
 * Determina se il dispositivo corrente è un PC basandosi sullo user agent.
 *
 * Controlla la presenza di stringhe tipiche dei sistemi desktop ('Win', 'Mac', 'Linux').
 *
 * @returns True se sembra un sistema desktop, altrimenti false.
 */
private isPC(): boolean {
    const userAgent = window.navigator.userAgent; // controlla se è un pc e ritorna il sistema operativo
    return userAgent.includes('Win') || userAgent.includes('Mac') || userAgent.includes('Linux');
  }
}
