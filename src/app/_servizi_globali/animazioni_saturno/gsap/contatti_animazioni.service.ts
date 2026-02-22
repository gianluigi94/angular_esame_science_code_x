import { Injectable } from '@angular/core';
import gsap from 'gsap';

@Injectable({ providedIn: 'root' })
export class ContattiAnimazioniService {
  private xIniziale = 26;     // spostati a destra
  private gap = 0.12;         // attesa tra i blocchi (sec)

  preparaStatoIniziale(container: HTMLElement, forzaNascosto: boolean = false): void {
    const title = container.querySelector('h2') as HTMLElement | null;
    const rows = Array.from(container.querySelectorAll('.contact-list .row')) as HTMLElement[];

    // container invisibile all'inizio
        // ✅ se loggato: il container resta completamente nascosto
    if (forzaNascosto) {
      gsap.set(container, { opacity: 0 });
      if (title) gsap.set(title, { opacity: 0, x: this.xIniziale });
      rows.forEach((r) => gsap.set(r, { opacity: 0, x: this.xIniziale }));
      return;
    }

    // normale: container "presente" ma figli invisibili
    gsap.set(container, { opacity: 1 });

    if (title) gsap.set(title, { opacity: 0, x: this.xIniziale });
    rows.forEach((r) => gsap.set(r, { opacity: 0, x: this.xIniziale }));
  }

  animaIngresso(container: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
      const title = container.querySelector('h2') as HTMLElement | null;
      const rows = Array.from(container.querySelectorAll('.contact-list .row')) as HTMLElement[];

      // sicurezza: kill di tween precedenti
      if (title) gsap.killTweensOf(title);
      rows.forEach((r) => gsap.killTweensOf(r));

      const tl = gsap.timeline({ onComplete: () => resolve() });

      // titolo
      if (title) {
        tl.to(title, {
          opacity: 1,
          x: 0,
          duration: 0.42,
          ease: 'power2.out',
        }, 0);
      }

      // 3 blocchi (row) uno alla volta
      rows.forEach((row, i) => {
        tl.to(row, {
          opacity: 1,
          x: 0,
          duration: 0.38,
          ease: 'power2.out',
        }, (title ? 0.15 : 0) + i * this.gap);
      });
    });
  }

  animaUscita(container: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
      const title = container.querySelector('h2') as HTMLElement | null;
      const rows = Array.from(container.querySelectorAll('.contact-list .row')) as HTMLElement[];

      const tl = gsap.timeline({ onComplete: () => resolve() });

      // esco al contrario: ultimo blocco -> primo blocco -> titolo
      const rowsRev = [...rows].reverse();
      rowsRev.forEach((row, i) => {
        tl.to(row, {
          opacity: 0,
          x: this.xIniziale,
          duration: 0.28,
          ease: 'power2.in',
        }, i * this.gap);
      });

      if (title) {
        tl.to(title, {
          opacity: 0,
          x: this.xIniziale,
          duration: 0.28,
          ease: 'power2.in',
        }, rowsRev.length * this.gap);
      }
    });
  }
}
