// Service che gestisce lo stato globale del consenso audio e il blocco imposto solo dal browser.

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AudioGlobaleService {
  chiaveStorage = 'audio_consentito'; // conservo la chiave usata nel localStorage per il consenso audio
  valorePredefinito = true; // conservo il valore predefinito del consenso audio
  statoCorrente = this.valorePredefinito; // conservo lo stato corrente del consenso audio
  sorgenteStato = new BehaviorSubject<boolean>(false); // creo la sorgente osservabile dello stato audio
  statoAudio$ = this.sorgenteStato.asObservable(); // espongo lo stream osservabile dello stato audio
  solo_brawser_blocca = false; // tengo traccia se il blocco audio dipende solo dal browser

  constructor() {
    const iniziale = this.leggiDaStorage(); // leggo il valore iniziale del consenso audio dal localStorage
    this.statoCorrente = iniziale; // aggiorno lo stato corrente con il valore iniziale letto
    this.sorgenteStato.next(iniziale); // emetto il valore iniziale nello stream dello stato audio

    window.addEventListener('storage', (evento) => { // ascolto le modifiche al localStorage da altre tab o finestre
      if (evento.key === this.chiaveStorage) { // controllo se la modifica riguarda la chiave del consenso audio
        const nuovo = evento.newValue === 'true'; // converto il nuovo valore del localStorage in boolean
        this.statoCorrente = nuovo; // aggiorno lo stato corrente con il nuovo valore
        this.sorgenteStato.next(nuovo); // emetto il nuovo valore nello stream dello stato audio
      }
    });

  }

  private sorgenteSoloBlocca = new BehaviorSubject<boolean>(false); // creo la sorgente osservabile dello stato di solo blocco browser
  soloBlocca$ = this.sorgenteSoloBlocca.asObservable(); // espongo lo stream osservabile del solo blocco browser
  handlerNascondiSoloBlocca: any = null; // conservo il riferimento all'handler che nasconde il solo blocco
  soloBloccaListenerAttivo = false; // tengo traccia se il listener per nascondere il solo blocco e' attivo

  /**
   * Legge il consenso audio dal localStorage applicando il valore predefinito se assente o in errore.
   *
   * @returns boolean
   */
  leggiDaStorage(): boolean {
    try {
      const v = localStorage.getItem(this.chiaveStorage); // leggo il valore salvato dal localStorage
      if (v === 'true' || v === 'false') return v === 'true'; // restituisco il boolean se il valore salvato e' valido
      localStorage.setItem(this.chiaveStorage, String(this.valorePredefinito)); // salvo il valore predefinito se non esiste un valore valido
      return this.valorePredefinito; // restituisco il valore predefinito
    } catch {
      return this.valorePredefinito; // restituisco il valore predefinito se il localStorage non e' accessibile
    }
  }

  /**
   * Salva il consenso audio nel localStorage.
   *
   * @param valore Valore del consenso audio da salvare.
   * @returns void
   */
  salvaSuStorage(valore: boolean): void {
    try { localStorage.setItem(this.chiaveStorage, String(valore)); } catch {} // provo a salvare il valore nel localStorage
  }

  /**
   * Imposta il consenso audio aggiornando stato, storage e stream osservabile.
   *
   * @param consentito Nuovo valore del consenso audio.
   * @returns void
   */
  imposta(consentito: boolean): void {
    this.statoCorrente = consentito; // aggiorno lo stato corrente del consenso audio
    this.salvaSuStorage(consentito); // salvo il nuovo valore nel localStorage
    this.sorgenteStato.next(consentito); // emetto il nuovo valore nello stream dello stato audio
    if (consentito) this.setSoloBrowserBlocca(false); // se l'audio e' consentito disattivo il solo blocco browser
  }

  /**
   * Inverte il consenso audio corrente.
   *
   * @returns void
   */
  toggle(): void {
    this.imposta(!this.statoCorrente); // inverto lo stato corrente del consenso audio
  }

  /**
   * Aggancia i listener che nascondono il solo blocco browser al primo click o touch.
   *
   * @returns void
   */
  agganciaNascondiSoloBloccaAlPrimoClick(): void {
    if (this.soloBloccaListenerAttivo) return; // esco subito se il listener e' gia' attivo
    this.soloBloccaListenerAttivo = true; // segno che il listener e' stato attivato

    this.handlerNascondiSoloBlocca = () => { // preparo l'handler che nasconde lo stato di solo blocco browser
      this.setSoloBrowserBlocca(false); // disattivo il solo blocco browser al primo click o touch
    };

    setTimeout(() => { // aspetto un micro-delay per evitare che il click iniziale richiuda subito il blocco
      if (!this.solo_brawser_blocca) { // controllo se nel frattempo il blocco browser e' gia' stato disattivato
        this.staccaNascondiSoloBlocca(); // stacco i listener se non servono piu'
        return; // esco subito se il blocco non e' piu' attivo
      }
      document.addEventListener('click', this.handlerNascondiSoloBlocca, true); // aggancio il listener di click in capture
      document.addEventListener('touchstart', this.handlerNascondiSoloBlocca, true); // aggancio il listener touchstart in capture
    }, 0);
  }

  /**
   * Stacca i listener che nascondono il solo blocco browser.
   *
   * @returns void
   */
  staccaNascondiSoloBlocca(): void {
    if (!this.soloBloccaListenerAttivo) return; // esco subito se il listener non e' attivo
    this.soloBloccaListenerAttivo = false; // segno che il listener non e' piu' attivo
    try { document.removeEventListener('click', this.handlerNascondiSoloBlocca, true); } catch {} // provo a rimuovere il listener di click
    try { document.removeEventListener('touchstart', this.handlerNascondiSoloBlocca, true); } catch {} // provo a rimuovere il listener di touchstart
    this.handlerNascondiSoloBlocca = null; // azzero il riferimento all'handler
  }

  /**
   * Imposta lo stato di solo blocco browser aggiornando stream e listener associati.
   *
   * @param v Nuovo valore del solo blocco browser.
   * @returns void
   */
  setSoloBrowserBlocca(v: boolean): void {
    this.solo_brawser_blocca = v; // aggiorno lo stato interno del solo blocco browser
    this.sorgenteSoloBlocca.next(v); // emetto il nuovo valore nello stream del solo blocco browser

    if (v) this.agganciaNascondiSoloBloccaAlPrimoClick(); // se il blocco e' attivo aggancio i listener di chiusura
    else this.staccaNascondiSoloBlocca(); // se il blocco non e' attivo stacco i listener di chiusura
  }
}
