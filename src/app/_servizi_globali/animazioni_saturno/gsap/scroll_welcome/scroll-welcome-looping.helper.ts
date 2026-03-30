// Helper che gestisce le animazioni cicliche dei container nella welcome.

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollWelcomeState } from './scroll-welcome-state';

export interface LoopingOptions {
  selector: string;
  delayStart: number;
  fadeInDuration: number;
  scaleDuration: number;
  scaleTo: number;
  fadeOutDuration: number;
  loopDelay: number;
}

const SCROLLER = '.main-scroll'; // definisco il selettore dello scroller principale
const TRIGGER = '#saturno-scrolle'; // definisco il selettore dell'elemento trigger
const START = '10px top'; // definisco il punto di start dello ScrollTrigger

export class ScrollWelcomeLoopingHelper {
  constructor(private state: ScrollWelcomeState) {}

  /**
   * Configura una singola animazione ciclica per un container.
   *
   * @param options Opzioni di configurazione del loop.
   * @returns void
   */
  setup(options: LoopingOptions): void {
    const el = document.querySelector(options.selector) as HTMLElement; // recupero l'elemento da animare tramite selettore
    if (!el) return; // esco subito se l'elemento non esiste

    gsap.set(el, { opacity: 0, scale: 1 }); // imposto lo stato iniziale invisibile e con scala normale

    let tl: gsap.core.Timeline | null = null; // preparo il riferimento alla timeline del loop
    let delayedCall: gsap.core.Tween | null = null; // preparo il riferimento al delayedCall iniziale

    const loopingTrigger = ScrollTrigger.create({
      // creo lo ScrollTrigger che avvia e ferma il loop
      trigger: TRIGGER,
      scroller: SCROLLER,
      start: START, // imposto trigger, scroller e start del controllo scroll
      onEnter: () => {
        // reagisco quando entro nell'area attiva del trigger
        delayedCall = gsap.delayedCall(options.delayStart, () => {
          // avvio il loop dopo il ritardo configurato
          tl = gsap.timeline({
            // creo la timeline ciclica dell'elemento
            repeat: -1,
            repeatDelay: options.loopDelay, // imposto ripetizione infinita e pausa tra i cicli
            defaults: { ease: 'power1.inOut' }, // imposto un easing morbido di default
          });
          tl.set(el, { opacity: 0, scale: 1 }) // riporto l'elemento allo stato iniziale all'inizio del ciclo
            .to(el, { opacity: 1, duration: options.fadeInDuration }) // faccio comparire l'elemento
            .to(
              el,
              { scale: options.scaleTo, duration: options.scaleDuration },
              '<',
            ) // animo la scala in parallelo al fade in
            .to(
              el,
              { opacity: 0, duration: options.fadeOutDuration },
              `-=${options.fadeOutDuration}`,
            ) // faccio sparire l'elemento sovrapponendo la parte finale
            .set(el, { scale: 1, opacity: 0 }); // ripristino lo stato finale pronto per il ciclo successivo
          this.state.loopingTimelines.push(tl); // salvo la timeline nello stato condiviso
        });
        if (delayedCall) this.state.loopingDelayedCalls.push(delayedCall); // salvo il delayedCall nello stato condiviso se esiste
      },
      onLeaveBack: () => {
        // reagisco quando torno indietro oltre il trigger
        if (delayedCall) {
          // controllo se esiste un delayedCall attivo
          delayedCall.kill(); // interrompo il delayedCall ancora pendente
          this.state.loopingDelayedCalls =
            this.state.loopingDelayedCalls.filter((dc) => dc !== delayedCall); // rimuovo il delayedCall dalla lista condivisa
          delayedCall = null; // azzero il riferimento locale al delayedCall
        }
        if (tl) {
          // controllo se esiste una timeline attiva
          tl.kill(); // interrompo la timeline del loop
          this.state.loopingTimelines = this.state.loopingTimelines.filter(
            (t) => t !== tl,
          ); // rimuovo la timeline dalla lista condivisa
          tl = null; // azzero il riferimento locale alla timeline
        }
        gsap.set(el, { opacity: 0, scale: 1 }); // ripristino l'elemento allo stato iniziale
      },
    });
    this.state.triggers.push(loopingTrigger); // salvo il trigger creato nello stato condiviso
  }

  /**
   * Configura le tre animazioni cicliche standard della pagina welcome.
   *
   * @returns void
   */
  setupDefault(): void {
    this.setup({
      selector: '#container_one',
      delayStart: 3,
      fadeInDuration: 1,
      scaleDuration: 4,
      scaleTo: 1.4,
      fadeOutDuration: 1,
      loopDelay: 11.55,
    }); // configuro il loop del primo container
    this.setup({
      selector: '#container_two',
      delayStart: 8,
      fadeInDuration: 1,
      scaleDuration: 4,
      scaleTo: 1.4,
      fadeOutDuration: 1,
      loopDelay: 11.55,
    }); // configuro il loop del secondo container
    this.setup({
      selector: '#container_three',
      delayStart: 13,
      fadeInDuration: 1,
      scaleDuration: 4,
      scaleTo: 1.4,
      fadeOutDuration: 1,
      loopDelay: 11.55,
    }); // configuro il loop del terzo container
  }

  /**
   * Riavvia le animazioni standard se trigger e scroller sono nella posizione corretta.
   *
   * @param scroller Elemento contenitore dello scroll.
   * @param trigger Elemento trigger da confrontare.
   * @returns void
   */
  riavviaSeNecessario(
    scroller: HTMLElement | null,
    trigger: HTMLElement | null,
  ): void {
    if (
      scroller &&
      trigger &&
      trigger.getBoundingClientRect().top <=
        scroller.getBoundingClientRect().top + 10
    ) {
      // verifico se gli elementi esistono e se il trigger e' gia' nella soglia corretta
      this.setupDefault(); // riavvio le tre animazioni standard
    }
  }
}
