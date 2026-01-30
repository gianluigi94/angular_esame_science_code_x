import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AudioGlobaleService {
  chiaveStorage = 'audio_consentito';
  valorePredefinito = true;
  statoCorrente = this.valorePredefinito;
  sorgenteStato = new BehaviorSubject<boolean>(false);
  statoAudio$ = this.sorgenteStato.asObservable();
 solo_brawser_blocca = false;

  constructor() {
    const iniziale = this.leggiDaStorage();
    this.statoCorrente = iniziale;
    this.sorgenteStato.next(iniziale);

    window.addEventListener('storage', (evento) => {
      if (evento.key === this.chiaveStorage) {
        const nuovo = evento.newValue === 'true';
        this.statoCorrente = nuovo;
        this.sorgenteStato.next(nuovo);
      }
    });

  }
  private sorgenteSoloBlocca = new BehaviorSubject<boolean>(false);
  soloBlocca$ = this.sorgenteSoloBlocca.asObservable();
    handlerNascondiSoloBlocca: any = null;
  soloBloccaListenerAttivo = false;
   leggiDaStorage(): boolean {
     try {
      const v = localStorage.getItem(this.chiaveStorage);
      if (v === 'true' || v === 'false') return v === 'true';
      localStorage.setItem(this.chiaveStorage, String(this.valorePredefinito));
      return this.valorePredefinito;
     } catch {
      return this.valorePredefinito;
     }
   }

  salvaSuStorage(valore: boolean): void {
    try { localStorage.setItem(this.chiaveStorage, String(valore)); } catch {}
  }

  imposta(consentito: boolean): void {
    this.statoCorrente = consentito;
    this.salvaSuStorage(consentito);
    this.sorgenteStato.next(consentito);
    if (consentito) this.setSoloBrowserBlocca(false);
  }

  toggle(): void {
    this.imposta(!this.statoCorrente);
  }

    agganciaNascondiSoloBloccaAlPrimoClick(): void {
    if (this.soloBloccaListenerAttivo) return;
    this.soloBloccaListenerAttivo = true;

    this.handlerNascondiSoloBlocca = () => {
      this.setSoloBrowserBlocca(false);
    };

    // micro-delay per evitare che il click che ha "causato" la comparsa lo spenga subito
    setTimeout(() => {
      if (!this.solo_brawser_blocca) {
        this.staccaNascondiSoloBlocca();
        return;
      }
      document.addEventListener('click', this.handlerNascondiSoloBlocca, true);
      document.addEventListener('touchstart', this.handlerNascondiSoloBlocca, true);
    }, 0);
  }

  staccaNascondiSoloBlocca(): void {
    if (!this.soloBloccaListenerAttivo) return;
    this.soloBloccaListenerAttivo = false;
    try { document.removeEventListener('click', this.handlerNascondiSoloBlocca, true); } catch {}
    try { document.removeEventListener('touchstart', this.handlerNascondiSoloBlocca, true); } catch {}
    this.handlerNascondiSoloBlocca = null;
  }


    setSoloBrowserBlocca(v: boolean): void {
    this.solo_brawser_blocca = v;
    this.sorgenteSoloBlocca.next(v);

        if (v) this.agganciaNascondiSoloBloccaAlPrimoClick();
    else this.staccaNascondiSoloBlocca()
  }
}
