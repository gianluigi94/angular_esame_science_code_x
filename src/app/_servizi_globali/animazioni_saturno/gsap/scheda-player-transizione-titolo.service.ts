import { Injectable } from '@angular/core';
import { gsap } from 'gsap';
import { AnimateService } from '../animate.service';
@Injectable({ providedIn: 'root' })
export class SchedaPlayerTransizioneTitoloService {

  private tl: gsap.core.Timeline | null = null;
  constructor(
    private animateService: AnimateService,
  ) {}
  animaTitoloVersocentro(
    onComplete?: () => void
  ): void {
    const title = document.querySelector('.title-container') as HTMLElement | null;
    if (!title) return;

    this.annulla();

    const first = document.querySelector('[data-titolo-first]') as HTMLElement | null;
    const x     = document.querySelector('[data-titolo-x]')     as HTMLElement | null;

    // ======================================================
    // CONTROLLO DURATE — modifica solo questi valori
    // ======================================================
    const DELAY_INIZIO         = 0;
    const DURATA_TITOLO_CENTRO = 1.45;
    const INIZIO_SCRITTE       = 0.1;
    const DURATA_SCRITTE       = 1.6;
   const INIZIO_SPLIT         = 0.65;
    const DURATA_SPLIT         = 1.9;
    const SPOSTA_X             = -3600;
    const SPOSTA_FIRST         = 1200;
    const SCALA_X              = 4.8;     // scala elemento x (secondo movimento)
    const SCALA_FIRST          = 0.3;   // scala elemento first (secondo movimento)
    // ======================================================

    const transitionOriginale = title.style.transition;
    title.style.transition = 'none';
    title.style.willChange = 'transform';
    title.style.pointerEvents = 'none';

    this.tl = gsap.timeline({
      delay: DELAY_INIZIO,
      onComplete: () => {
        title.style.transition = transitionOriginale;
        title.style.willChange = 'auto';
        if (onComplete) onComplete();
      },
    });

    // Primo movimento: titolo va al centro
    this.tl.to(title, {
      top: '50%',
      left: '50%',
      xPercent: -50,
      yPercent: -50,
      paddingTop: 210,
      marginTop: 0,
      scaleX: 1,
      scaleY: 1,
      duration: DURATA_TITOLO_CENTRO,
      ease: 'power2.inOut',
    }, 0);

    // Secondo movimento
    if (first) {
     this.tl.to(first, {
        scale: SCALA_FIRST,
        duration: DURATA_SCRITTE,
        ease: 'power2.inOut',
      }, INIZIO_SCRITTE);
    }

        if (x) {
      this.tl.to(x, {
        scale: SCALA_X,
        rotationY: 55,
        rotationX: -18,
        transformPerspective: 1200,
        transformOrigin: 'center center',
        duration: DURATA_SCRITTE,
        ease: 'power2.inOut',
      }, INIZIO_SCRITTE);
    }

    // Terzo movimento: x va a sinistra, first va a destra
        if (x) {
      this.tl.to(x, {
        x: SPOSTA_X,
        rotationY: 10,
        rotationX: 22,
        transformPerspective: 1200,
        duration: DURATA_SPLIT,
        ease: 'power2.inOut',
      }, INIZIO_SPLIT);
    }

    if (first) {
      this.tl.to(first, {
        x: SPOSTA_FIRST,
        duration: DURATA_SPLIT,
        ease: 'power2.inOut',
      }, INIZIO_SPLIT);
    }
  }

  annulla(): void {
    if (this.tl) {
      this.tl.kill();
      this.tl = null;
    }
  }


  ripristinaTitoloOrigineScheda(): void {
    this.annulla();

    const title = document.querySelector('.title-container') as HTMLElement | null;
    const first = document.querySelector('[data-titolo-first]') as HTMLElement | null;
    const x     = document.querySelector('[data-titolo-x]') as HTMLElement | null;

    if (title) {
      gsap.killTweensOf(title);
      gsap.set(title, {
        clearProps: 'x,y,scale,scaleX,scaleY,rotationX,rotationY,transform,paddingTop,marginTop,top,left,xPercent,yPercent'
      });
      title.style.pointerEvents = '';
    }

    if (first) {
      gsap.killTweensOf(first);
      gsap.set(first, {
        clearProps: 'x,y,scale,rotationX,rotationY,transform',
        opacity: 1
      });
    }

    if (x) {
      gsap.killTweensOf(x);
      gsap.set(x, {
        clearProps: 'x,y,scale,rotationX,rotationY,transform',
        opacity: 1
      });
    }

    this.animateService.setXNormale();
    this.animateService.setTitoloAltoGlobal();
  }
}
