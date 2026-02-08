import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { gsap } from 'gsap';

@Injectable({ providedIn: 'root' })
export class Sfondo404Guard implements CanActivate {
  canActivate(): boolean {
    const precedente = document.referrer || '';

    // Se arrivo da URL con catalogo/catalog (qualsiasi lingua)
    const venivoDaCatalogo =
      /\/(it|en)\/(catalogo|catalog)(\/|$)/.test(precedente) ||
      /\/(catalogo|catalog)(\/|$)/.test(precedente);

    if (venivoDaCatalogo) {
      const sfondo = document.querySelector('app-sfondo') as HTMLElement | null;
      if (sfondo) {
        gsap.killTweensOf(sfondo);
        gsap.set(sfondo, { opacity: 0 });
        gsap.to(sfondo, {
          opacity: 1,
          duration: 1.0,
          ease: 'power2.out',
        });
      }
    }

    return true;
  }
}
