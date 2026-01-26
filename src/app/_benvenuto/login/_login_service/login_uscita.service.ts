// Servizio che gestisce l'animazione di uscita della schermata di login.

import { Injectable, ElementRef } from '@angular/core';
import { LoginAnimazioniService } from 'src/app/_servizi_globali/animazioni_saturno/gsap/login_animazioni.service';
import gsap from 'gsap';

@Injectable({ providedIn: 'root' }) // Registro il servizio nel root injector
export class LoginUscitaService {
  constructor(
    private loginAnimazioniService: LoginAnimazioniService
  ) {}

  /**
 * Avvia l’animazione di uscita della schermata di login (pannello + footer).
 * Se richiesto, può saltare completamente l’animazione (es. dopo login riuscito),
 * così un guard di routing può procedere subito al cambio rotta.
 *
 * Comportamento:
 * - Se saltaAnimazioneUscita è true → termina immediatamente.
 * - Altrimenti:
 *   - anima l’uscita del contenuto login tramite LoginAnimazioniService (se presente)
 *   - anima il footer (scaleY + opacity) con GSAP (se presente)
 *   - anima il testo footer-p (opacity) con GSAP (se presente)
 * - Attende che tutte le animazioni avviate siano terminate.
 *
 * @param loginContenuto ElementRef<HTMLElement> | undefined
 *  Riferimento al contenitore del login (può essere undefined). Se presente, viene animato in uscita.
 * @param saltaAnimazioneUscita boolean
 *  Se true, non esegue alcuna animazione e risolve subito.
 *
 * @returns Promise<void>
 *  Promise risolta quando:
 *  - l’animazione è stata saltata, oppure
 *  - tutte le animazioni avviate sono terminate.
 */
  animaUscita(
    loginContenuto: ElementRef<HTMLElement> | undefined, // ricevo il riferimento al login del componente
    saltaAnimazioneUscita: boolean // ricevo il flag per decidere se saltare l'animazione, (dopo un login riuscito)
  ): Promise<void> {
    if (saltaAnimazioneUscita) {
      return Promise.resolve(); // chiudo subito restituendo una promise risolta
    }

    const animazioni: Promise<void>[] = []; // raccolgo tutte le animazioni da eseguire in parallelo

    if (loginContenuto?.nativeElement) { // controllo di avere l'elemento del pannello login su cui animare l'uscita
      animazioni.push( // aggiungo alla promisea dell'animazione di uscita alla lista
        this.loginAnimazioniService.animaUscita(  // avvio l'uscita del pannello tramite il servizio specifico
          loginContenuto.nativeElement // passo l'elemento reale su cui applicare l'animazione
        )
      );
    }

    const footer = document.querySelector('footer') as HTMLElement | null; // cerco il footer nel DOM per animarlo in uscita
    if (footer) {
      animazioni.push(  // aggiungo anche questa animazione alla lista da aspettare
        new Promise<void>((resolve) => {
          // creo una promise che risolvo quando l'animazione GSAP è finita
          gsap.to(footer, {
            // animo il footer verso lo stato di uscita
            scaleY: 0,
            opacity: 0,
            duration: 0.25,
            delay: 0.25, // ritardo leggero
            ease: 'power2.in',
            onComplete: resolve, // risolvo la promise quando l'animazione è completata
          });
        })
      );
    }

    const footerP = document.querySelector('#footer-p') as HTMLElement | null; // cerco il testo del footer per farlo svanire
    if (footerP) {
      animazioni.push( // aggiungo anche questa animazione alla lista da aspettare
        new Promise<void>((resolve) => { // creo una promise che risolvo quando l'animazione GSAP è finita
          gsap.to(footerP, {
            // animo il testo footer-p verso lo stato di uscita
            opacity: 0,
            duration: 0.2,
            ease: 'power1.in',
            onComplete: resolve, // risolvo la promise quando l'animazione è completata
          });
        })
      );
    }

    if (animazioni.length === 0) {  // controllo se non ho trovato nulla da animare
      return Promise.resolve(); // torno subito senza aspettare niente
    }

    return Promise.all(animazioni).then(() => {}); // aspetto che tutte le animazioni finiscano prima di considerare completata l'uscita
  }
}
