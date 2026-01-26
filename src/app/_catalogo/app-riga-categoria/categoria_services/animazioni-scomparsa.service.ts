import { Injectable, ElementRef, QueryList } from '@angular/core';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

@Injectable({ providedIn: 'root' })
export class AnimazioniScomparsaService {

  constructor() {
    gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);
  }

  osservatori = new Map<HTMLElement, MutationObserver>();

  disconnettiOsservatori(): void {
    this.osservatori.forEach(o => {
      try { o.disconnect(); } catch {}
    });
    this.osservatori.clear();
  }

  inizializzaAnimazioni(righeCatalogo: QueryList<ElementRef>): void {
    ScrollTrigger.getAll().forEach(trigger => {
      if (!trigger.trigger || !document.contains(trigger.trigger)) trigger.kill();
    });

    this.disconnettiOsservatori();

    let refreshProgrammato = false;
    const programmaRefresh = () => {
      if (refreshProgrammato) return;
      refreshProgrammato = true;
      requestAnimationFrame(() => {
        refreshProgrammato = false;
        try { ScrollTrigger.refresh(); } catch {}
      });
    };

    const sogliaNascondiInterazione = 0.955;

    righeCatalogo.forEach(riga => {
      const elementoRiga = riga.nativeElement as HTMLElement;

      const selettoreDissolvenza = '.sparisci, .numero, .intestazione-categoria, .button';

      const applicaFadeDinamico = (progresso: number) => {
        const nodi = elementoRiga.querySelectorAll(selettoreDissolvenza);
        const alpha = 1 - Math.max(0, Math.min(1, progresso));
        gsap.set(nodi, { autoAlpha: alpha });
      };

      const getBottoni = () =>
        elementoRiga.querySelectorAll('.doppio_audio, app-bottone-preferiti');

      const applicaInterazione = (progresso: number) => {
        const oltre = progresso >= sogliaNascondiInterazione;
        const fascia = elementoRiga.querySelector('.contenitore-carosello') as HTMLElement;
        if (fascia) fascia.style.pointerEvents = oltre ? 'none' : 'auto';
        getBottoni().forEach(b => ((b as HTMLElement).style.display = oltre ? 'none' : ''));
      };

      gsap.set(elementoRiga, { pointerEvents: 'auto' });
      getBottoni().forEach(b => (b as HTMLElement).style.display = '');

      const lineaTempo = gsap.timeline({
        scrollTrigger: {
          trigger: elementoRiga,
          start: 'bottom bottom',
          end: '40% center',
          scrub: 0,
          onUpdate: stato => {
            applicaInterazione(stato.progress);
            applicaFadeDinamico(stato.progress);
          }
        }
      });

      lineaTempo.fromTo(
        elementoRiga,
        { scale: 1 },
        { scale: 0.87, ease: 'none' },
        0
      );

      try {
        const trig = lineaTempo.scrollTrigger;
        const prog = trig ? trig.progress : 0;
        applicaInterazione(prog);
        applicaFadeDinamico(prog);
      } catch {}

      const osservatore = new MutationObserver(() => {
        try {
          const trig = lineaTempo.scrollTrigger;
          const prog = trig ? trig.progress : 0;
          applicaInterazione(prog);
          applicaFadeDinamico(prog);
        } catch {}
        programmaRefresh();
      });

      try {
        osservatore.observe(elementoRiga, { childList: true, subtree: true });
        this.osservatori.set(elementoRiga, osservatore);
      } catch {}
    });

    setTimeout(() => ScrollTrigger.refresh(), 0);
  }

  gestisciWheel(evento: WheelEvent): void {
    evento.preventDefault();
    const fattore = 0.4;
    const deltaMassimo = 85;

    let spostamento = evento.deltaY * fattore;
    spostamento = Math.max(-deltaMassimo, Math.min(deltaMassimo, spostamento));

    gsap.to(window, {
      duration: 0.15,
      scrollTo: { y: window.scrollY + spostamento },
      ease: 'power2.out'
    });
  }

   scrollaA(y: number, durata: number = 0.35, onFine?: () => void): void {
 const target = Math.max(0, Math.floor(Number(y) || 0));
 gsap.to(window, {
 duration: durata,
 scrollTo: { y: target },
 ease: 'power2.out',
 onComplete: () => { try { onFine?.(); } catch {} }
 });
 }
}
