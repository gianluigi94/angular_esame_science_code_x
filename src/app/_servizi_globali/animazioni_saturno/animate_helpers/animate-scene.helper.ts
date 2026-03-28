// ─── animate-scene.helper.ts ─────────────────────────────────────────────────
// Fade saturno/sfondo e controllo scroll pagina.
// Estratto da animate.service.ts.

import { gsap } from 'gsap';

export class AnimateSceneHelper {

  // ── Estratto da fadeOutSaturnoESfondo() ──────────────────────────────────
  fadeOutSaturnoESfondo(durata = 1, onComplete?: () => void): void {
    const saturno = document.querySelector('app-saturno') as HTMLElement | null;
    const sfondo  = document.querySelector('app-sfondo')  as HTMLElement | null;

    const tl = gsap.timeline({ onComplete: () => { if (onComplete) onComplete(); } });

    if (saturno) tl.to(saturno, { opacity: 0, duration: durata, ease: 'power2.out' }, 0);
    if (sfondo)  tl.to(sfondo,  { opacity: 0, duration: durata, ease: 'power2.out' }, 0);
  }

  // ── Estratto da fadeInSoloSfondo() ───────────────────────────────────────
  fadeInSoloSfondo(durata = 1, delay = 0): void {
    const sfondo = document.querySelector('app-sfondo') as HTMLElement | null;
    if (!sfondo) return;
    gsap.killTweensOf(sfondo);
    gsap.set(sfondo, { opacity: 0 });
    gsap.to(sfondo, { opacity: 1, duration: durata, delay, ease: 'power2.out' });
  }

  // ── Estratto da enablePageScroll() / disablePageScroll() ─────────────────
  enablePageScroll(): void {
    document.documentElement.classList.add('scrollable');
    document.body.classList.add('scrollable');
  }

  disablePageScroll(): void {
    document.documentElement.classList.remove('scrollable');
    document.body.classList.remove('scrollable');
  }
}
