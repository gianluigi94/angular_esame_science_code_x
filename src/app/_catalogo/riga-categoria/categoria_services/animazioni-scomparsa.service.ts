// Servizio che inizializza le animazioni di scomparsa delle righe catalogo e gestisce lo scroll animato.

import { Injectable, ElementRef, QueryList } from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

@Injectable({ providedIn: 'root' })
export class AnimazioniScomparsaService {
  osservatori = new Map<HTMLElement, MutationObserver>(); // tengo gli osservatori collegati alle righe

  constructor() {
    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin); // registro i plugin GSAP che uso nel servizio
  }

  /**
   * Disconnette tutti i MutationObserver attualmente registrati.
   *
   * @returns void
   */
  disconnettiOsservatori(): void {
    this.osservatori.forEach((o) => {
      try {
        o.disconnect();
      } catch {}
    }); // provo a disconnettere ogni osservatore registrato
    this.osservatori.clear(); // svuoto la mappa degli osservatori
  }

  /**
   * Inizializza le animazioni di scomparsa e riduzione sulle righe del catalogo.
   * - Pulisce i trigger non piu' validi
   * - Disconnette gli osservatori precedenti
   * - Crea timeline GSAP per ogni riga
   * - Aggiorna fade e interazioni in base al progresso dello scroll
   * - Osserva le mutazioni DOM per riallineare stato e refresh
   *
   * @param righeCatalogo Lista delle righe del catalogo da animare.
   * @returns void
   */
  inizializzaAnimazioni(righeCatalogo: QueryList<ElementRef>): void {
    ScrollTrigger.getAll().forEach((trigger) => {
      if (!trigger.trigger || !document.contains(trigger.trigger)) trigger.kill();
    }); // elimino i trigger che puntano a elementi non piu' presenti nel DOM

    this.disconnettiOsservatori(); // pulisco gli osservatori del ciclo precedente

    let refreshProgrammato = false; // segno se ho gia' pianificato un refresh al frame successivo
    const programmaRefresh = () => {
      if (refreshProgrammato) return; // evito di programmare refresh duplicati nello stesso frame
      refreshProgrammato = true; // segno che il refresh e' stato pianificato
      requestAnimationFrame(() => {
        refreshProgrammato = false; // riapro la possibilita' di pianificare un nuovo refresh
        try {
          ScrollTrigger.refresh();
        } catch {}
      }); // provo a riallineare i trigger al frame successivo
    };

    const sogliaNascondiInterazione = 0.955; // imposto la soglia oltre cui disattivo le interazioni

    righeCatalogo.forEach((riga) => {
      const elementoRiga = riga.nativeElement as HTMLElement; // ricavo l'elemento reale della riga corrente

      const selettoreDissolvenza =
        '.sparisci, .numero, .intestazione-categoria, .button'; // definisco i nodi che devono dissolversi

      const applicaFadeDinamico = (progresso: number) => {
        const nodi = elementoRiga.querySelectorAll(selettoreDissolvenza); // recupero i nodi da dissolvere nella riga
        const alpha = 1 - Math.max(0, Math.min(1, progresso)); // ricavo un alpha clampato tra 0 e 1
        gsap.set(nodi, { autoAlpha: alpha }); // applico la dissolvenza ai nodi selezionati
      };

      const getBottoni = () =>
        elementoRiga.querySelectorAll('.doppio_audio, app-bottone-preferiti'); // recupero i bottoni da mostrare o nascondere

      const applicaInterazione = (progresso: number) => {
        const oltre = progresso >= sogliaNascondiInterazione; // verifico se ho superato la soglia di blocco interazione
        const fascia = elementoRiga.querySelector('.contenitore-carosello') as HTMLElement; // cerco il contenitore principale del carosello nella riga
        if (fascia) fascia.style.pointerEvents = oltre ? 'none' : 'auto'; // abilito o disabilito le interazioni sul carosello
        getBottoni().forEach(
          (b) => (((b as HTMLElement).style.display = oltre ? 'none' : '')),
        ); // nascondo o ripristino i bottoni in base alla soglia
      };

      gsap.set(elementoRiga, { pointerEvents: 'auto' }); // imposto lo stato iniziale delle interazioni sulla riga
      getBottoni().forEach((b) => ((b as HTMLElement).style.display = '')); // ripristino la visibilita' iniziale dei bottoni

      const lineaTempo = gsap.timeline({
        scrollTrigger: {
          trigger: elementoRiga,
          start: 'bottom bottom',
          end: '40% center',
          scrub: 0,
          onUpdate: (stato) => {
            applicaInterazione(stato.progress); // aggiorno le interazioni in base al progresso corrente
            applicaFadeDinamico(stato.progress); // aggiorno la dissolvenza in base al progresso corrente
          },
        },
      }); // creo la timeline legata allo scroll per la riga corrente

      lineaTempo.fromTo(
        elementoRiga,
        { scale: 1 },
        { scale: 0.87, ease: 'none' },
        0,
      ); // animo la scala della riga lungo la timeline

      try {
        const trig = lineaTempo.scrollTrigger; // recupero lo ScrollTrigger collegato alla timeline
        const prog = trig ? trig.progress : 0; // leggo il progresso corrente oppure uso zero come fallback
        applicaInterazione(prog); // allineo subito lo stato interattivo al progresso reale
        applicaFadeDinamico(prog); // allineo subito la dissolvenza al progresso reale
      } catch {}

      const osservatore = new MutationObserver(() => {
        try {
          const trig = lineaTempo.scrollTrigger; // recupero lo ScrollTrigger della timeline corrente
          const prog = trig ? trig.progress : 0; // leggo il progresso corrente oppure zero come fallback
          applicaInterazione(prog); // riallineo le interazioni dopo la mutazione
          applicaFadeDinamico(prog); // riallineo la dissolvenza dopo la mutazione
        } catch {}
        programmaRefresh(); // pianifico un refresh dei trigger dopo la mutazione
      });

      try {
        osservatore.observe(elementoRiga, { childList: true, subtree: true }); // osservo le mutazioni della riga e dei suoi discendenti
        this.osservatori.set(elementoRiga, osservatore); // salvo l'osservatore associato alla riga
      } catch {}
    });

    setTimeout(() => ScrollTrigger.refresh(), 0); // faccio un refresh finale asincrono dopo l'inizializzazione
  }

  /**
   * Gestisce lo scroll da wheel applicando uno spostamento animato e limitato.
   *
   * @param evento Evento wheel ricevuto dalla finestra o dal contenitore.
   * @returns void
   */
  gestisciWheel(evento: WheelEvent): void {
    evento.preventDefault(); // blocco lo scroll nativo del browser
    const fattore = 0.4; // imposto il fattore di attenuazione del delta wheel
    const deltaMassimo = 85; // imposto il delta massimo consentito per singolo gesto

    let spostamento = evento.deltaY * fattore; // trasformo il delta wheel nello spostamento desiderato
    spostamento = Math.max(-deltaMassimo, Math.min(deltaMassimo, spostamento)); // limito lo spostamento dentro il range consentito

    gsap.to(window, {
      duration: 0.15,
      scrollTo: { y: window.scrollY + spostamento },
      ease: 'power2.out',
    }); // animo lo scroll della finestra verso la nuova posizione
  }

  /**
   * Scorre la finestra fino a una coordinata verticale specifica.
   *
   * @param y Coordinata verticale di destinazione.
   * @param durata Durata dell'animazione di scroll.
   * @param onFine Callback opzionale da eseguire al termine.
   * @returns void
   */
  scrollaA(y: number, durata: number = 0.35, onFine?: () => void): void {
    const target = Math.max(0, Math.floor(Number(y) || 0)); // normalizzo la coordinata target a un valore valido
    gsap.to(window, {
      duration: durata,
      scrollTo: { y: target },
      ease: 'power2.out',
      onComplete: () => {
        try {
          onFine?.();
        } catch {}
      }, // provo a eseguire la callback finale senza rompere il flusso
    });
  }
}
