// Service che gestisce la preparazione e le animazioni di ingresso/uscita delle liste contatti.

import { Injectable } from '@angular/core';
import gsap from 'gsap';

export interface ListaAnimataConfig {
  titleSelector?: string; // permetto di personalizzare il selettore del titolo
  rowSelector?: string; // permetto di personalizzare il selettore delle righe
  forzaNascosto?: boolean; // permetto di forzare lo stato completamente nascosto
  xIniziale?: number; // permetto di personalizzare l'offset iniziale orizzontale
  gap?: number; // permetto di personalizzare la distanza temporale tra le animazioni
}

@Injectable({ providedIn: 'root' })
export class ContattiAnimazioniService {
  private xIniziale = 26; // conservo l'offset orizzontale iniziale di default
  private gap = 0.12; // conservo il gap temporale di default tra le animazioni

  /**
   * Prepara lo stato iniziale del container, del titolo e delle righe.
   *
   * @param container Elemento contenitore della lista animata.
   * @param cfg Configurazione opzionale dei selettori e dei valori iniziali.
   * @returns void
   */
  prepara(container: HTMLElement, cfg: ListaAnimataConfig = {}): void {
    const titleSel = cfg.titleSelector ?? 'h2'; // leggo il selettore del titolo oppure uso quello di default
    const rowSel = cfg.rowSelector ?? '.contact-list .row'; // leggo il selettore delle righe oppure uso quello di default
    const x0 = cfg.xIniziale ?? this.xIniziale; // leggo l'offset iniziale oppure uso quello di default
    const forzaNascosto = cfg.forzaNascosto ?? false; // leggo il flag di nascondimento forzato oppure uso false

    const title = container.querySelector(titleSel) as HTMLElement | null; // recupero il titolo dal container
    const rows = Array.from(container.querySelectorAll(rowSel)) as HTMLElement[]; // recupero tutte le righe dal container

    if (forzaNascosto) { // controllo se devo nascondere completamente il blocco
      gsap.set(container, { opacity: 0 }); // porto il container a opacita' zero
      if (title) gsap.set(title, { opacity: 0, x: x0 }); // nascondo e sposto il titolo se esiste
      rows.forEach((r) => gsap.set(r, { opacity: 0, x: x0 })); // nascondo e sposto tutte le righe
      return; // esco subito dopo aver applicato lo stato forzato
    }

    gsap.set(container, { opacity: 1 }); // tengo il container visibile
    if (title) gsap.set(title, { opacity: 0, x: x0 }); // preparo il titolo invisibile e traslato se esiste
    rows.forEach((r) => gsap.set(r, { opacity: 0, x: x0 })); // preparo tutte le righe invisibili e traslate
  }

  /**
   * Anima l'ingresso del titolo e delle righe del container.
   *
   * @param container Elemento contenitore della lista animata.
   * @param cfg Configurazione opzionale dei selettori e dei tempi.
   * @returns Promise<void>
   */
  ingresso(container: HTMLElement, cfg: ListaAnimataConfig = {}): Promise<void> {
    const titleSel = cfg.titleSelector ?? 'h2'; // leggo il selettore del titolo oppure uso quello di default
    const rowSel = cfg.rowSelector ?? '.contact-list .row'; // leggo il selettore delle righe oppure uso quello di default
    const x0 = cfg.xIniziale ?? this.xIniziale; // leggo l'offset iniziale oppure uso quello di default
    const gap = cfg.gap ?? this.gap; // leggo il gap temporale oppure uso quello di default

    return new Promise((resolve) => { // creo una promise che si risolve a fine timeline
      const title = container.querySelector(titleSel) as HTMLElement | null; // recupero il titolo dal container
      const rows = Array.from(container.querySelectorAll(rowSel)) as HTMLElement[]; // recupero tutte le righe dal container

      if (title) gsap.killTweensOf(title); // fermo eventuali tween attivi sul titolo
      rows.forEach((r) => gsap.killTweensOf(r)); // fermo eventuali tween attivi su tutte le righe

      const tl = gsap.timeline({ onComplete: () => resolve() }); // creo la timeline e risolvo la promise al completamento

      if (title) { // controllo se il titolo esiste
        tl.to(title, { opacity: 1, x: 0, duration: 0.42, ease: 'power2.out' }, 0); // animo il titolo in ingresso all'inizio della timeline
      }

      rows.forEach((row, i) => { // scorro tutte le righe con il loro indice
        tl.to(
          row, // animo la riga corrente
          { opacity: 1, x: 0, duration: 0.38, ease: 'power2.out' }, // porto la riga in vista e nella posizione finale
          (title ? 0.15 : 0) + i * gap // calcolo l'offset temporale in base alla presenza del titolo e all'indice
        );
      });
    });
  }

  /**
   * Anima l'uscita del titolo e delle righe del container.
   *
   * @param container Elemento contenitore della lista animata.
   * @param cfg Configurazione opzionale dei selettori e dei tempi.
   * @returns Promise<void>
   */
  uscita(container: HTMLElement, cfg: ListaAnimataConfig = {}): Promise<void> {
    const titleSel = cfg.titleSelector ?? 'h2'; // leggo il selettore del titolo oppure uso quello di default
    const rowSel = cfg.rowSelector ?? '.contact-list .row'; // leggo il selettore delle righe oppure uso quello di default
    const x0 = cfg.xIniziale ?? this.xIniziale; // leggo l'offset iniziale oppure uso quello di default
    const gap = cfg.gap ?? this.gap; // leggo il gap temporale oppure uso quello di default

    return new Promise((resolve) => { // creo una promise che si risolve a fine timeline
      const title = container.querySelector(titleSel) as HTMLElement | null; // recupero il titolo dal container
      const rows = Array.from(container.querySelectorAll(rowSel)) as HTMLElement[]; // recupero tutte le righe dal container

      const tl = gsap.timeline({ onComplete: () => resolve() }); // creo la timeline e risolvo la promise al completamento

      [...rows].reverse().forEach((row, i) => { // scorro le righe in ordine inverso con il loro indice
        tl.to(
          row, // animo la riga corrente
          { opacity: 0, x: x0, duration: 0.28, ease: 'power2.in' }, // nascondo la riga e la riporto verso destra
          i * gap // sfalso temporalmente ogni riga in base all'indice inverso
        );
      });

      if (title) { // controllo se il titolo esiste
        tl.to(
          title, // animo il titolo in uscita
          { opacity: 0, x: x0, duration: 0.28, ease: 'power2.in' }, // nascondo il titolo e lo riporto verso destra
          rows.length * gap // faccio partire il titolo dopo l'uscita di tutte le righe
        );
      }
    });
  }

  /**
   * Prepara lo stato iniziale compatibile con l'API precedente del modulo contatti.
   *
   * @param container Elemento contenitore della lista animata.
   * @param forzaNascosto Flag per forzare il container nascosto.
   * @returns void
   */
  preparaStatoIniziale(container: HTMLElement, forzaNascosto: boolean = false): void {
    this.prepara(container, { forzaNascosto }); // delego alla versione generica passando il flag ricevuto
  }

  /**
   * Avvia l'animazione di ingresso compatibile con l'API precedente del modulo contatti.
   *
   * @param container Elemento contenitore della lista animata.
   * @returns Promise<void>
   */
  animaIngresso(container: HTMLElement): Promise<void> {
    return this.ingresso(container); // delego alla funzione generica di ingresso
  }

  /**
   * Avvia l'animazione di uscita compatibile con l'API precedente del modulo contatti.
   *
   * @param container Elemento contenitore della lista animata.
   * @returns Promise<void>
   */
  animaUscita(container: HTMLElement): Promise<void> {
    return this.uscita(container); // delego alla funzione generica di uscita
  }
}
