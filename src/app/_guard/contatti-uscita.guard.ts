// Guard che gestisce l'uscita dalla pagina contatti coordinando animazioni HTML e scena Saturno.
import { Injectable } from '@angular/core';
import { CanDeactivate, Router } from '@angular/router';
import { ContattiComponent } from '../_componenti_comuni/contatti/contatti.component';
import { SaturnoService } from 'src/app/_servizi_globali/animazioni_saturno/three/saturno.service';
import { SaturnoRouteAnimazioniService } from 'src/app/_servizi_globali/animazioni_saturno/gsap/saturno-route-animazioni.service';
import { AnimateService } from 'src/app/_servizi_globali/animazioni_saturno/animate.service';
import gsap from 'gsap';
import { Authservice } from 'src/app/_benvenuto/login/_login_service/auth.service';

@Injectable({ providedIn: 'root' })
export class ContattiUscitaGuard implements CanDeactivate<ContattiComponent> {

  constructor(
    private router: Router,
    private saturnoService: SaturnoService,
    private saturnoRouteAnimazioniService: SaturnoRouteAnimazioniService,
    private animateService: AnimateService,
    private authService: Authservice
  ) {}

  /**
   * Determina se l'uscita dalla pagina contatti puo' proseguire subito
   * oppure se deve attendere il completamento delle animazioni di uscita.
   *
   * Gestisce i casi di ritorno verso login, welcome, catalogo
   * e il caso generico di navigazione verso altre pagine.
   *
   * @param component Istanza del componente contatti in uscita.
   * @param _currentRoute Snapshot della route corrente.
   * @param _currentState Stato corrente del router.
   * @param nextState Stato di destinazione del router.
   * @returns boolean | Promise<boolean>
   */
  canDeactivate(
    component: ContattiComponent,
    _currentRoute: any,
    _currentState: any,
    nextState?: any
  ): boolean | Promise<boolean> {
    /**
     * Anima la chiusura del footer e del suo contenuto testuale.
     *
     * @returns Promise<void>
     */
    const animaFooterOut = (): Promise<void> => {
      return new Promise((resolve) => {
        const footer = document.querySelector('footer') as HTMLElement | null; // recupero il footer dal DOM
        const footerP = document.querySelector('#footer-p') as HTMLElement | null; // recupero il testo interno del footer

        if (footerP) { // controllo se il testo del footer esiste
          gsap.killTweensOf(footerP); // fermo eventuali tween gia' attivi sul testo
          gsap.to(footerP, { opacity: 0, duration: 0.18, ease: 'power1.out' }); // faccio svanire il testo del footer
        }

        if (!footer) { // controllo se il footer non esiste
          resolve(); // sblocco subito la promise se non ho nulla da animare
          return; // interrompo il flusso dell'animazione footer
        }

        gsap.killTweensOf(footer); // fermo eventuali tween gia' attivi sul footer
        gsap.to(footer, {
          scaleY: 0, // comprimo il footer verticalmente
          opacity: 0, // faccio svanire il footer
          duration: 0.25, // imposto la durata dell'animazione
          ease: 'power2.in', // imposto l'easing di uscita
          transformOrigin: 'bottom center', // faccio chiudere il footer dal basso
          onComplete: () => resolve(), // risolvo la promise quando l'animazione e' finita
        });
      });
    };

    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms)); // creo una piccola attesa temporizzata
    const targetUrl = (nextState?.url as string) || ''; // leggo l'URL di destinazione o uso stringa vuota
    const pathPulito = String(targetUrl || '').split('?')[0].split('#')[0]; // pulisco l'URL da query string e fragment

    const sonoLoggato = !!this.authService.leggiObsAuth().value?.tk; // controllo se l'utente risulta autenticato
    if (sonoLoggato) { // verifico se l'utente e' loggato
      window.dispatchEvent(new CustomEvent('chiudi-dati-personali')); // richiedo la chiusura del pannello dati personali
    }

    const animaPannello = (): Promise<void> => {
      return sonoLoggato ? Promise.resolve() : component.animaUscita(); // animo il pannello solo se non sono loggato
    };

    const vaInLogin = /^\/(it|en)\/(benvenuto|welcome)\/(accedi|login)(\/|$)/.test(pathPulito); // verifico se la destinazione e' la pagina login
    if (vaInLogin) { // controllo il ramo di uscita verso login
      return Promise.all([animaPannello(), animaFooterOut()]).then(() => true); // aspetto le animazioni minime e poi sblocco la navigazione
    }

    const vaInBenvenuto =
      pathPulito === '/' || // controllo se sto andando alla root
      pathPulito === '' || // controllo se non ho un path esplicito
      /^\/(it|en)?\/?(benvenuto|welcome)(\/|$)/.test(pathPulito); // controllo se sto andando nell'area welcome

    if (vaInBenvenuto) { // controllo il ramo di uscita verso welcome
      sessionStorage.removeItem('welcome_restore'); // rimuovo l'eventuale stato di restore welcome
      sessionStorage.removeItem('welcome_scrollTop'); // rimuovo l'eventuale posizione scroll salvata della welcome

      const scroller = document.querySelector('.main-scroll') as HTMLElement | null; // recupero l'eventuale contenitore scroll principale
      if (scroller) scroller.scrollTop = 0; // riporto lo scroll in alto se il contenitore esiste

      const scene = this.saturnoService.getScene(); // recupero la scena 3D corrente
      const light = this.saturnoService.getDirectionalLight(); // recupero la luce direzionale corrente

      this.animateService.setXGif(); // ripristino la X in modalita' gif
      this.animateService.animateTitoloVersoCentroGlobal(1.25, 0); // riporto il titolo verso il centro

      if (scene) { // controllo se la scena 3D esiste
        this.saturnoRouteAnimazioniService.animaVerso(
          scene, 'WELCOME_ALTO', 1.25, light || undefined // animo Saturno verso l'assetto welcome alto
        );
      }

      return Promise.all([animaPannello(), animaFooterOut(), wait(1250)]).then(() => true); // aspetto pannello, footer e durata transizione globale
    }

    const vaInCatalogo = /^\/(it|en)\/(catalogo|catalog)(\/|$)/.test(pathPulito); // verifico se la destinazione e' il catalogo

    if (vaInCatalogo) { // controllo il ramo di uscita verso catalogo
      const scene = this.saturnoService.getScene(); // recupero la scena 3D corrente
      const light = this.saturnoService.getDirectionalLight(); // recupero la luce direzionale corrente

      if (scene) { // controllo se la scena 3D esiste
        this.saturnoRouteAnimazioniService.animaVerso(
          scene, 'CATALOGO_NASCOSTO', 1.2, light || undefined, // animo Saturno verso l'assetto nascosto del catalogo
          () => {
            this.saturnoService.spegniSaturno(); // spengo Saturno al termine della transizione
            this.animateService.pauseClearcoat(); // metto in pausa l'effetto clearcoat
          }
        );
      }

      return Promise.all([animaPannello(), animaFooterOut(), wait(1200)]).then(() => true); // aspetto pannello, footer e durata scena
    }

    return Promise.all([animaPannello(), animaFooterOut()]).then(() => true); // nel caso generico aspetto solo le animazioni HTML minime
  }
}
