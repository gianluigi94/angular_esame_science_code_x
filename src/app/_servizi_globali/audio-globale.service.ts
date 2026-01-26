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
   const sbloccaDopoPrimoGesto = () => this.setSoloBrowserBlocca(false);
   window.addEventListener('pointerdown', sbloccaDopoPrimoGesto, { once: true });
   window.addEventListener('keydown',      sbloccaDopoPrimoGesto, { once: true });
   window.addEventListener('touchstart',   sbloccaDopoPrimoGesto, { once: true });
  }
  private sorgenteSoloBlocca = new BehaviorSubject<boolean>(false);
  soloBlocca$ = this.sorgenteSoloBlocca.asObservable();
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

    setSoloBrowserBlocca(v: boolean): void {
    this.solo_brawser_blocca = v;
    this.sorgenteSoloBlocca.next(v);
  }
}
