// Servizio che coordina le richieste globali di stop video, fade audio e chiusura completa del player scheda.

import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class StopVideoGlobaleService {
  private richiesteStop$ = new Subject<{ durataMs: number; done: () => void }>(); // tengo le richieste di stop dolce complete
  private richiesteFadeAudio$ = new Subject<{ durataMs: number; done: () => void }>(); // tengo le richieste di solo fade audio
  private richiesteChiusuraPlayerScheda$ =
    new Subject<{ durataMs: number; done: () => void }>(); // tengo le richieste di chiusura completa del player scheda

  /**
   * Restituisce lo stream delle richieste di stop dolce completo.
   *
   * @returns Observable<{ durataMs: number; done: () => void }> Stream delle richieste di stop.
   */
  osservaRichiesteStop$() {
    return this.richiesteStop$.asObservable(); // espongo lo stream delle richieste di stop completo
  }

  /**
   * Restituisce lo stream delle richieste di solo fade audio.
   *
   * @returns Observable<{ durataMs: number; done: () => void }> Stream delle richieste di fade audio.
   */
  osservaRichiesteFadeAudio$() {
    return this.richiesteFadeAudio$.asObservable(); // espongo lo stream delle richieste di solo fade audio
  }

  /**
   * Restituisce lo stream delle richieste di chiusura completa del player scheda.
   *
   * @returns Observable<{ durataMs: number; done: () => void }> Stream delle richieste di chiusura player.
   */
  osservaRichiesteChiusuraPlayerScheda$() {
    return this.richiesteChiusuraPlayerScheda$.asObservable(); // espongo lo stream delle richieste di chiusura completa del player scheda
  }

  /**
   * Invia una richiesta globale di stop dolce completo e attende la conferma di completamento.
   *
   * @param durataMs Durata del fade e dello stop richiesta.
   * @returns Promise<void> Promise risolta quando il chiamante riceve la conferma di completamento.
   */
  richiediStopDolce(durataMs: number): Promise<void> {
    return new Promise<void>((resolve) => {
      this.richiesteStop$.next({ durataMs: Math.max(0, durataMs || 0), done: resolve }); // pubblico la richiesta di stop completo con durata normalizzata
    });
  }

  /**
   * Invia una richiesta globale di solo fade audio e attende la conferma di completamento.
   * - Usa anche un fallback temporale
   * - Se nessuno ascolta la richiesta la promise viene comunque risolta
   *
   * @param durataMs Durata del fade audio richiesta.
   * @returns Promise<void> Promise risolta al completamento reale oppure al fallback.
   */
  richiediSoloFadeAudio(durataMs: number): Promise<void> {
    return new Promise<void>((resolve) => {
      let risolto = false; // tengo traccia se ho gia' risolto la promise
      const safeResolve = () => {
        if (!risolto) {
          risolto = true;
          resolve();
        }
      }; // risolvo una sola volta in modo sicuro

      this.richiesteFadeAudio$.next({
        durataMs: Math.max(0, durataMs || 0),
        done: safeResolve,
      }); // pubblico la richiesta di solo fade audio con durata normalizzata

      setTimeout(safeResolve, Math.max(durataMs + 50, 100)); // se nessuno ascolta risolvo comunque dopo il fallback
    });
  }

  /**
   * Invia una richiesta globale di chiusura completa del player scheda e attende la conferma.
   * - Usa anche un fallback temporale
   * - Se nessuno ascolta la richiesta non blocca la navigazione
   *
   * @param durataMs Durata della chiusura richiesta.
   * @returns Promise<void> Promise risolta al completamento reale oppure al fallback.
   */
  richiediChiusuraCompletaPlayerScheda(durataMs: number): Promise<void> {
    return new Promise<void>((resolve) => {
      let risolto = false; // tengo traccia se ho gia' risolto la promise
      const safeResolve = () => {
        if (!risolto) {
          risolto = true;
          resolve();
        }
      }; // risolvo una sola volta in modo sicuro

      this.richiesteChiusuraPlayerScheda$.next({
        durataMs: Math.max(0, durataMs || 0),
        done: safeResolve,
      }); // pubblico la richiesta di chiusura completa con durata normalizzata

      setTimeout(safeResolve, Math.max(durataMs + 80, 120)); // se nessuno ascolta risolvo comunque per non bloccare la navigazione
    });
  }
}
