import { Injectable } from '@angular/core';
import { Subject, firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class StopVideoGlobaleService {
  private richiesteStop$ = new Subject<{ durataMs: number; done: () => void }>();
  private richiesteFadeAudio$ = new Subject<{ durataMs: number; done: () => void }>();

  osservaRichiesteStop$() {
    return this.richiesteStop$.asObservable();
  }

  osservaRichiesteFadeAudio$() {
    return this.richiesteFadeAudio$.asObservable();
  }

  richiediStopDolce(durataMs: number): Promise<void> {
    return new Promise<void>((resolve) => {
      this.richiesteStop$.next({ durataMs: Math.max(0, durataMs || 0), done: resolve });
    });
  }

  richiediSoloFadeAudio(durataMs: number): Promise<void> {
    return new Promise<void>((resolve) => {
      this.richiesteFadeAudio$.next({ durataMs: Math.max(0, durataMs || 0), done: resolve });
    });
  }
}
