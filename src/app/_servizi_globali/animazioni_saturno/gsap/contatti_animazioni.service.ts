import { Injectable } from '@angular/core';
import gsap from 'gsap';

export interface ListaAnimataConfig {
  titleSelector?: string;     // default 'h2'
  rowSelector?: string;       // default '.contact-list .row'
  forzaNascosto?: boolean;    // default false
  xIniziale?: number;         // default 26
  gap?: number;               // default 0.12
}

@Injectable({ providedIn: 'root' })
export class ContattiAnimazioniService {
  private xIniziale = 26;
  private gap = 0.12;

  // ====== ✅ GENERICI (riusabili ovunque) ======

  prepara(container: HTMLElement, cfg: ListaAnimataConfig = {}): void {
    const titleSel = cfg.titleSelector ?? 'h2';
    const rowSel = cfg.rowSelector ?? '.contact-list .row';
    const x0 = cfg.xIniziale ?? this.xIniziale;
    const forzaNascosto = cfg.forzaNascosto ?? false;

    const title = container.querySelector(titleSel) as HTMLElement | null;
    const rows = Array.from(container.querySelectorAll(rowSel)) as HTMLElement[];

    // se vuoi nasconderlo del tutto (es. guest)
    if (forzaNascosto) {
      gsap.set(container, { opacity: 0 });
      if (title) gsap.set(title, { opacity: 0, x: x0 });
      rows.forEach((r) => gsap.set(r, { opacity: 0, x: x0 }));
      return;
    }

    // container presente, figli invisibili
    gsap.set(container, { opacity: 1 });
    if (title) gsap.set(title, { opacity: 0, x: x0 });
    rows.forEach((r) => gsap.set(r, { opacity: 0, x: x0 }));
  }

  ingresso(container: HTMLElement, cfg: ListaAnimataConfig = {}): Promise<void> {
    const titleSel = cfg.titleSelector ?? 'h2';
    const rowSel = cfg.rowSelector ?? '.contact-list .row';
    const x0 = cfg.xIniziale ?? this.xIniziale;
    const gap = cfg.gap ?? this.gap;

    return new Promise((resolve) => {
      const title = container.querySelector(titleSel) as HTMLElement | null;
      const rows = Array.from(container.querySelectorAll(rowSel)) as HTMLElement[];

      if (title) gsap.killTweensOf(title);
      rows.forEach((r) => gsap.killTweensOf(r));

      const tl = gsap.timeline({ onComplete: () => resolve() });

      if (title) {
        tl.to(title, { opacity: 1, x: 0, duration: 0.42, ease: 'power2.out' }, 0);
      }

      rows.forEach((row, i) => {
        tl.to(
          row,
          { opacity: 1, x: 0, duration: 0.38, ease: 'power2.out' },
          (title ? 0.15 : 0) + i * gap
        );
      });
    });
  }

  uscita(container: HTMLElement, cfg: ListaAnimataConfig = {}): Promise<void> {
    const titleSel = cfg.titleSelector ?? 'h2';
    const rowSel = cfg.rowSelector ?? '.contact-list .row';
    const x0 = cfg.xIniziale ?? this.xIniziale;
    const gap = cfg.gap ?? this.gap;

    return new Promise((resolve) => {
      const title = container.querySelector(titleSel) as HTMLElement | null;
      const rows = Array.from(container.querySelectorAll(rowSel)) as HTMLElement[];

      const tl = gsap.timeline({ onComplete: () => resolve() });

      [...rows].reverse().forEach((row, i) => {
        tl.to(
          row,
          { opacity: 0, x: x0, duration: 0.28, ease: 'power2.in' },
          i * gap
        );
      });

      if (title) {
        tl.to(
          title,
          { opacity: 0, x: x0, duration: 0.28, ease: 'power2.in' },
          rows.length * gap
        );
      }
    });
  }

  // ====== ✅ WRAPPER (compatibilità: non rompi Contatti) ======

  preparaStatoIniziale(container: HTMLElement, forzaNascosto: boolean = false): void {
    this.prepara(container, { forzaNascosto });
  }

  animaIngresso(container: HTMLElement): Promise<void> {
    return this.ingresso(container);
  }

  animaUscita(container: HTMLElement): Promise<void> {
    return this.uscita(container);
  }
}
