import { Injectable } from '@angular/core';
import gsap from 'gsap';

@Injectable({ providedIn: 'root' })
export class LoginAnimazioniService {
  durata: number = 1.25;

  // ENTRATA
  animaIngresso(el: HTMLElement): gsap.core.Tween {
    gsap.set(el, {
      position: 'fixed',
      top: '-100%',
      left: '100%',
      scale: 0.2,
      opacity: 0,
    });

    return gsap.to(el, {
      top: 0,
      left: 0,
      scale: 1,
      opacity: 1,
      duration: this.durata,
      ease: 'power2.out',
    });
  }

  // USCITA (ritroso)
  animaUscita(el: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
      gsap.to(el, {
        top: '-100%',
        left: '100%',
        scale: 0.2,
        opacity: 0,
        duration: this.durata,
        ease: 'power2.in',
        onComplete: () => resolve(),
      });
    });
  }
}
