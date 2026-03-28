import { Injectable } from '@angular/core';
import { Subject, firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class StopVideoGlobaleService {
  private richiesteStop$ = new Subject<{ durataMs: number; done: () => void }>();
  private richiesteFadeAudio$ = new Subject<{ durataMs: number; done: () => void }>();

   private richiesteChiusuraPlayerScheda$ =
     new Subject<{ durataMs: number; done: () => void }>();

  osservaRichiesteStop$() {
    return this.richiesteStop$.asObservable();
  }

  osservaRichiesteFadeAudio$() {
    return this.richiesteFadeAudio$.asObservable();
  }

   osservaRichiesteChiusuraPlayerScheda$() {
     return this.richiesteChiusuraPlayerScheda$.asObservable();
   }

  richiediStopDolce(durataMs: number): Promise<void> {
    return new Promise<void>((resolve) => {
      this.richiesteStop$.next({ durataMs: Math.max(0, durataMs || 0), done: resolve });
    });
  }

   richiediSoloFadeAudio(durataMs: number): Promise<void> {
    return new Promise<void>((resolve) => {
      let risolto = false;
      const safeResolve = () => { if (!risolto) { risolto = true; resolve(); } };
      this.richiesteFadeAudio$.next({ durataMs: Math.max(0, durataMs || 0), done: safeResolve });
      // fallback: se nessuno è in ascolto (es. nella scheda senza player video), risolve comunque
      setTimeout(safeResolve, Math.max(durataMs + 50, 100));
    });
  }

   richiediChiusuraCompletaPlayerScheda(durataMs: number): Promise<void> {
     return new Promise<void>((resolve) => {
       let risolto = false;
       const safeResolve = () => { if (!risolto) { risolto = true; resolve(); } };

       this.richiesteChiusuraPlayerScheda$.next({
         durataMs: Math.max(0, durataMs || 0),
         done: safeResolve
       });

       // fallback: se nessuno ascolta, non blocca la navigazione
       setTimeout(safeResolve, Math.max(durataMs + 80, 120));
     });
   }
}
