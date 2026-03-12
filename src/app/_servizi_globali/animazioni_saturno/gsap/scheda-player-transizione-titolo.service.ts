import { Injectable } from '@angular/core';
import { gsap } from 'gsap';
import { AnimateService } from '../animate.service';
@Injectable({ providedIn: 'root' })
export class SchedaPlayerTransizioneTitoloService {

  private tl: gsap.core.Timeline | null = null;
  constructor(
    private animateService: AnimateService,
  ) {}
 animaTitoloVersocentro(onComplete?: () => void): void {
  const title = document.querySelector('.title-container') as HTMLElement | null;
  if (!title) return;

  this.annulla();

 const first = document.querySelector('[data-titolo-first]') as HTMLElement | null;
  const x     = document.querySelector('[data-titolo-x]')     as HTMLElement | null;
  const link  = title.querySelector('.title-link') as HTMLElement | null;

  // ── PRE-CALCOLO POSIZIONE CENTRO (zero reflow durante animazione) ──
  const titleRect      = title.getBoundingClientRect();
  const vw             = window.innerWidth;
  const vh             = window.innerHeight;
  const targetCenterX  = vw / 2;
  const targetCenterY  = vh / 2 + 180;
  const currentCenterX = titleRect.left + titleRect.width  / 2;
  const currentCenterY = titleRect.top  + titleRect.height / 2;
  const deltaX         = targetCenterX - currentCenterX;
  const deltaY         = targetCenterY - currentCenterY;

  // ── PRE-PROMOZIONE GPU ─────────────────────────────────────────────
  const elementi = [title, first, x].filter(Boolean) as HTMLElement[];
  elementi.forEach(el => {
    el.style.willChange = 'transform, opacity';
    gsap.set(el, { force3D: true, z: 0 });
  });

  const avvia = () => {
    const DURATA_TITOLO_CENTRO = 1.45;
    const INIZIO_SCRITTE       = 0.1;
    const DURATA_SCRITTE       = 1.6;
    const INIZIO_SPLIT         = 0.65;
    const DURATA_SPLIT         = 1.9;
    const SPOSTA_X             = -3600;
    const SPOSTA_FIRST         = 1200;
    const SCALA_X              = 4;
    const SCALA_FIRST          = 0.3;

    title.style.transition    = 'none';
    title.style.pointerEvents = 'none';
    if (link) link.style.pointerEvents = 'none';

    this.tl = gsap.timeline({
      defaults: { force3D: true, immediateRender: false },
      onComplete: () => {
  elementi.forEach(el => { el.style.willChange = 'auto'; });
  // pointerEvents resta 'none' — impostato prima dell'animazione, non va ripristinato
  if (onComplete) onComplete();
},
    });

    this.tl.to(title, {
      x: deltaX,
      y: deltaY,
      scaleX: 1,
      scaleY: 1,
      duration: DURATA_TITOLO_CENTRO,
      ease: 'power2.inOut',
    }, 0);

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
        rotationY: 55, rotationX: -18,
        transformPerspective: 1200,
        transformOrigin: 'center center',
        duration: DURATA_SCRITTE,
        ease: 'power2.inOut',
      }, INIZIO_SCRITTE);
    }

    if (x) {
      this.tl.to(x, {
        x: SPOSTA_X,
        rotationY: 10, rotationX: 22,
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
  };

  // 3 rAF = ~50ms di "riscaldamento" layer prima di partire
  requestAnimationFrame(() =>
    requestAnimationFrame(() =>
      requestAnimationFrame(avvia)
    )
  );
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
      const link = title.querySelector('.title-link') as HTMLElement | null;
      if (link) link.style.pointerEvents = '';
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
