// Helper che gestisce fade di Saturno e sfondo, oltre al controllo dello scroll pagina.
import { gsap } from 'gsap';

export class AnimateSceneHelper {

  /**
   * Esegue il fade out di Saturno e sfondo.
   *
   * Recupera i due elementi dal DOM e anima la loro opacita'
   * in parallelo, eseguendo opzionalmente una callback finale.
   *
   * @param durata Durata del fade.
   * @param onComplete Callback opzionale da eseguire al termine.
   * @returns void
   */
  fadeOutSaturnoESfondo(durata = 1, onComplete?: () => void): void {
    const saturno = document.querySelector('app-saturno') as HTMLElement | null; // recupero l'elemento Saturno dal DOM
    const sfondo = document.querySelector('app-sfondo') as HTMLElement | null; // recupero l'elemento sfondo dal DOM

    const tl = gsap.timeline({ onComplete: () => { if (onComplete) onComplete(); } }); // creo la timeline con callback finale opzionale

    if (saturno) tl.to(saturno, { opacity: 0, duration: durata, ease: 'power2.out' }, 0); // faccio svanire Saturno se esiste
    if (sfondo) tl.to(sfondo, { opacity: 0, duration: durata, ease: 'power2.out' }, 0); // faccio svanire lo sfondo se esiste
  }

  /**
   * Esegue il fade in del solo sfondo.
   *
   * Ferma eventuali tween precedenti, imposta l'opacita' iniziale
   * e anima lo sfondo fino alla piena visibilita'.
   *
   * @param durata Durata del fade in.
   * @param delay Ritardo iniziale dell'animazione.
   * @returns void
   */
  fadeInSoloSfondo(durata = 1, delay = 0): void {
    const sfondo = document.querySelector('app-sfondo') as HTMLElement | null; // recupero l'elemento sfondo dal DOM
    if (!sfondo) return; // esco subito se lo sfondo non esiste
    gsap.killTweensOf(sfondo); // fermo eventuali animazioni gia' attive sullo sfondo
    gsap.set(sfondo, { opacity: 0 }); // imposto lo sfondo inizialmente invisibile
    gsap.to(sfondo, { opacity: 1, duration: durata, delay, ease: 'power2.out' }); // animo lo sfondo fino a opacita' piena
  }

  /**
   * Abilita lo scroll della pagina.
   *
   * Applica la classe scrollable a html e body.
   *
   * @returns void
   */
  enablePageScroll(): void {
    document.documentElement.classList.add('scrollable'); // abilito lo scroll sull'elemento html
    document.body.classList.add('scrollable'); // abilito lo scroll sull'elemento body
  }

  /**
   * Disabilita lo scroll della pagina.
   *
   * Rimuove la classe scrollable da html e body.
   *
   * @returns void
   */
  disablePageScroll(): void {
    document.documentElement.classList.remove('scrollable'); // disabilito lo scroll sull'elemento html
    document.body.classList.remove('scrollable'); // disabilito lo scroll sull'elemento body
  }
}
