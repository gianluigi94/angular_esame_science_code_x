// Service che gestisce le animazioni di ingresso e uscita della schermata login.

import { Injectable } from '@angular/core';
import gsap from 'gsap';

@Injectable({ providedIn: 'root' })
export class LoginAnimazioniService {
  durata: number = 1.25; // conservo la durata base delle animazioni del login

  /**
   * Anima l'ingresso dell'elemento portandolo in vista.
   *
   * @param el Elemento HTML da animare in ingresso.
   * @returns gsap.core.Tween
   */
  animaIngresso(el: HTMLElement): gsap.core.Tween {
    gsap.set(el, { // imposto subito lo stato iniziale fuori scena dell'elemento
      position: 'fixed', // fisso l'elemento rispetto alla viewport
      top: '-100%', // porto l'elemento sopra la viewport
      left: '100%', // porto l'elemento sul lato destro della viewport
      scale: 0.2, // riduco inizialmente la scala dell'elemento
      opacity: 0, // rendo inizialmente invisibile l'elemento
    });

    return gsap.to(el, { // animo l'elemento verso lo stato finale visibile
      top: 0, // porto il bordo superiore alla posizione finale
      left: 0, // porto il bordo sinistro alla posizione finale
      scale: 1, // ripristino la scala normale dell'elemento
      opacity: 1, // rendo completamente visibile l'elemento
      duration: this.durata, // uso la durata configurata nel service
      ease: 'power2.out', // applico un easing morbido in uscita
    });
  }

  /**
   * Anima l'uscita dell'elemento riportandolo fuori scena.
   *
   * @param el Elemento HTML da animare in uscita.
   * @returns Promise<void>
   */
  animaUscita(el: HTMLElement): Promise<void> {
    return new Promise((resolve) => { // creo una promise che si risolve a fine animazione
      gsap.to(el, { // animo l'elemento verso lo stato finale fuori scena
        top: '-100%', // riporto l'elemento sopra la viewport
        left: '100%', // riporto l'elemento sul lato destro della viewport
        scale: 0.2, // riduco di nuovo la scala dell'elemento
        opacity: 0, // rendo invisibile l'elemento
        duration: this.durata, // uso la durata configurata nel service
        ease: 'power2.in', // applico un easing morbido in entrata
        onComplete: () => resolve(), // risolvo la promise quando l'animazione termina
      });
    });
  }
}
