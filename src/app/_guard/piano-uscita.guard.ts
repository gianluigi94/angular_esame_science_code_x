import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { PianoComponent } from '../_componenti_comuni/piano/piano.component';
import { SaturnoService } from 'src/app/_servizi_globali/animazioni_saturno/three/saturno.service';
import { SaturnoRouteAnimazioniService } from 'src/app/_servizi_globali/animazioni_saturno/gsap/saturno-route-animazioni.service';
import { AnimateService } from 'src/app/_servizi_globali/animazioni_saturno/animate.service';
import gsap from 'gsap';

@Injectable({ providedIn: 'root' })
export class PianoUscitaGuard implements CanDeactivate<PianoComponent> {

  constructor(
    private saturnoService: SaturnoService,
    private saturnoRouteAnimazioniService: SaturnoRouteAnimazioniService,
    private animateService: AnimateService,
  ) {}

  /**
   * Determina se l'uscita dalla pagina piano puo' proseguire subito
   * oppure se deve attendere il completamento delle animazioni di uscita.
   *
   * @param component Istanza del componente piano in uscita.
   * @param _currentRoute Snapshot della route corrente.
   * @param _currentState Stato corrente del router.
   * @param nextState Stato di destinazione del router.
   * @returns boolean | Promise<boolean>
   */
  canDeactivate(
    component: PianoComponent,
    _currentRoute: any,
    _currentState: any,
    nextState?: any
  ): boolean | Promise<boolean> {
    const animaFooterOut = (): Promise<void> => {
      return new Promise((resolve) => {
        const footer = document.querySelector('footer') as HTMLElement | null; // recupero il footer dal DOM
        const footerP = document.querySelector('#footer-p') as HTMLElement | null; // recupero il testo interno del footer

        if (footerP) {
          gsap.killTweensOf(footerP); // fermo eventuali tween gia' attivi sul testo
          gsap.to(footerP, { opacity: 0, duration: 0.18, ease: 'power1.out' }); // faccio svanire il testo del footer
        }

        if (!footer) {
          resolve(); // sblocco subito la promise se non ho nulla da animare
          return;
        }

        gsap.killTweensOf(footer); // fermo eventuali tween gia' attivi sul footer
        gsap.to(footer, {
          scaleY: 0,
          opacity: 0,
          duration: 0.25,
          ease: 'power2.in',
          transformOrigin: 'bottom center',
          onComplete: () => resolve(), // risolvo la promise quando l'animazione e' finita
        });
      });
    };

    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)); // creo una piccola attesa temporizzata
    const targetUrl = (nextState?.url as string) || ''; // leggo l'URL di destinazione o uso stringa vuota
    const pathPulito = String(targetUrl || '').split('?')[0].split('#')[0]; // pulisco l'URL da query string e fragment

    window.dispatchEvent(new CustomEvent('chiudi-pannello-piano'));
    const vaInLogin = /^\/(it|en)\/(benvenuto|welcome)\/(accedi|login)(\/|$)/.test(pathPulito);
    if (vaInLogin) {
      return Promise.all([animaFooterOut()]).then(() => true); // aspetto solo il footer e sblocco la navigazione
    }

    const vaInBenvenuto =
      pathPulito === '/' ||
      pathPulito === '' ||
      /^\/(it|en)?\/?(benvenuto|welcome)(\/|$)/.test(pathPulito); // verifico se sto andando nell'area welcome

    if (vaInBenvenuto) {
      sessionStorage.removeItem('welcome_restore'); // rimuovo l'eventuale stato di restore welcome
      sessionStorage.removeItem('welcome_scrollTop'); // rimuovo l'eventuale posizione scroll salvata della welcome

      const scroller = document.querySelector('.main-scroll') as HTMLElement | null; // recupero l'eventuale contenitore scroll principale
      if (scroller) scroller.scrollTop = 0; // riporto lo scroll in alto se il contenitore esiste

      const scene = this.saturnoService.getScene(); // recupero la scena 3D corrente
      const light = this.saturnoService.getDirectionalLight(); // recupero la luce direzionale corrente

      this.animateService.setXGif(); // ripristino la X in modalita' gif
      this.animateService.animateTitoloVersoCentroGlobal(1.25, 0); // riporto il titolo verso il centro

      if (scene) {
        this.saturnoRouteAnimazioniService.animaVerso(
          scene, 'WELCOME_ALTO', 1.25, light || undefined // animo Saturno verso l'assetto welcome alto
        );
      }

      return Promise.all([animaFooterOut(), wait(1250)]).then(() => true); // aspetto footer e durata transizione globale
    }

    const vaInCatalogo = /^\/(it|en)\/(catalogo|catalog)(\/|$)/.test(pathPulito); // verifico se la destinazione e' il catalogo

    if (vaInCatalogo) {
      const scene = this.saturnoService.getScene(); // recupero la scena 3D corrente
      const light = this.saturnoService.getDirectionalLight(); // recupero la luce direzionale corrente

      if (scene) {
        this.saturnoRouteAnimazioniService.animaVerso(
          scene, 'CATALOGO_NASCOSTO_DUE', 1.2, light || undefined, // animo Saturno verso l'assetto nascosto del catalogo
          () => {
            this.saturnoService.spegniSaturno(); // spengo Saturno al termine della transizione
            this.animateService.pauseClearcoat(); // metto in pausa l'effetto clearcoat
          }
        );
      }

      return Promise.all([animaFooterOut(), wait(1200)]).then(() => true); // aspetto footer e durata scena
    }

    return Promise.all([animaFooterOut()]).then(() => true); // nel caso generico aspetto solo il footer
  }
}
