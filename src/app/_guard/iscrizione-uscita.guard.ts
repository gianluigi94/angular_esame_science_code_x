// Guard che gestisce l'uscita dalla pagina iscrizione coordinando animazioni e navigazione.
import { Injectable } from '@angular/core';
import { CanDeactivate, Router } from '@angular/router';
import { IscrizioneComponent } from '../_benvenuto/registrazione/iscrizione.component';
import { SaturnoService } from 'src/app/_servizi_globali/animazioni_saturno/three/saturno.service';
import { AnimateService } from 'src/app/_servizi_globali/animazioni_saturno/animate.service';
import { ScrollWelcomeService } from 'src/app/_servizi_globali/animazioni_saturno/gsap/scroll-welcome.service';
import { animaUscita, animaSfocatura } from '../_benvenuto/registrazione/iscrizione_helpers/animazioni.helper';
import { SaturnoRouteAnimazioniService } from 'src/app/_servizi_globali/animazioni_saturno/gsap/saturno-route-animazioni.service';
import gsap from 'gsap';

@Injectable({ providedIn: 'root' })
export class IscrizioneUscitaGuard implements CanDeactivate<IscrizioneComponent> {

  constructor(
    private router: Router,
    private saturnoService: SaturnoService,
    private animateService: AnimateService,
    private scrollWelcomeService: ScrollWelcomeService,
    private saturnoRouteAnimazioniService: SaturnoRouteAnimazioniService
  ) {}

  /**
   * Determina se l'uscita dalla pagina iscrizione puo' proseguire
   * subito oppure dopo il completamento delle animazioni.
   *
   * Gestisce separatamente il cambio lingua, il ritorno alla welcome
   * e il caso generico di uscita dalla pagina.
   *
   * @param component Istanza del componente iscrizione in uscita.
   * @param _currentRoute Snapshot della route corrente.
   * @param _currentState Stato corrente del router.
   * @param nextState Stato di destinazione del router.
   * @returns Promise<boolean>
   */
  async canDeactivate(
    component: IscrizioneComponent,
    _currentRoute: any,
    _currentState: any,
    nextState?: any
  ): Promise<boolean> {

    const nav = this.router.getCurrentNavigation(); // leggo la navigazione corrente del router
    const saltaPerCambioLingua =
      nav?.trigger === 'imperative' && // controllo se la navigazione e' stata avviata in modo imperativo
      !!nav?.extras?.state?.['saltaAnimazioniLogin']; // controllo se e' stato chiesto di saltare le animazioni login

    if (saltaPerCambioLingua) { // verifico se devo saltare tutte le animazioni
      return Promise.resolve(true); // lascio proseguire subito la navigazione
    }

    const targetUrl =
      (nextState?.url as string) || // provo a leggere l'URL dalla destinazione successiva
      this.router.getCurrentNavigation()?.finalUrl?.toString() || // in alternativa leggo la finalUrl della navigazione corrente
      ''; // uso stringa vuota se non trovo nulla

    const pathPulito = String(targetUrl || '').split('?')[0].split('#')[0]; // pulisco l'URL da query string e fragment

    const vaInBenvenuto =
      pathPulito === '/' || // controllo se sto tornando alla root
      pathPulito === '' || // controllo se non ho un path esplicito
      /^\/(it|en)?\/?(benvenuto|welcome)(\/|$)/.test(pathPulito); // controllo se sto andando nell'area benvenuto o welcome

    if (vaInBenvenuto) { // gestisco il ramo di ritorno verso la welcome
      sessionStorage.removeItem('welcome_restore'); // rimuovo l'eventuale stato di restore della welcome
      sessionStorage.removeItem('welcome_scrollTop'); // rimuovo l'eventuale scroll salvato della welcome

      animaSfocatura(false); // disattivo la sfocatura della vista

      const scroller = document.querySelector('.main-scroll') as HTMLElement | null; // recupero il contenitore principale di scroll
      if (scroller) scroller.scrollTop = 0; // riporto in alto lo scroll se il contenitore esiste

      const scene = this.saturnoService.getScene(); // recupero la scena 3D corrente
      const light = this.saturnoService.getDirectionalLight(); // recupero la luce direzionale corrente

      this.animateService.setXGif(); // ripristino la X in modalita' gif
      this.animateService.animateTitoloVersoCentroGlobal(1.25, 0); // riporto il titolo globale verso il centro

      if (scene && light) { // controllo se scena e luce sono entrambe disponibili
        if (component.stepAttuale === 4) { // verifico se mi trovo nello step finale della registrazione
          this.saturnoRouteAnimazioniService.animaVerso(scene, 'WELCOME_ALTO', 1.05, light); // torno direttamente alla posizione alta della welcome
        } else {
          this.scrollWelcomeService.animaRitornoVersoAlto(scene, light, 1.05); // torno verso l'alto con l'animazione dedicata della welcome
        }
      }

      const titolo = document.querySelector('.titolo-animato') as HTMLElement | null; // recupero il titolo animato dal DOM
      const labels = document.querySelectorAll('.label-sopra'); // recupero tutte le label sopra i campi
      const righe = document.querySelectorAll('.campo-animato'); // recupero tutti i campi animati

      if (titolo) gsap.to(titolo, { opacity: 0, duration: 0.3, ease: 'power2.in' }); // faccio svanire il titolo se esiste
      gsap.to(labels, { opacity: 0, duration: 0.3, ease: 'power2.in' }); // faccio svanire le label
      gsap.to(righe, { opacity: 0, scaleX: 0, duration: 0.3, ease: 'power2.in', stagger: 0.05 }); // chiudo e faccio svanire i campi in cascata

      const footer = document.querySelector('footer') as HTMLElement | null; // recupero il footer dal DOM
      if (footer) {
        gsap.to(footer, { scaleY: 0, opacity: 0, duration: 0.25, delay: 0.25, ease: 'power2.in' }); // faccio chiudere e svanire il footer
      }

      const footerP = document.querySelector('#footer-p') as HTMLElement | null; // recupero il testo interno del footer
      if (footerP) {
        gsap.to(footerP, { opacity: 0, duration: 0.2, ease: 'power1.in' }); // faccio svanire il testo del footer
      }

      return new Promise<boolean>((resolve) => { // aspetto la fine della transizione complessiva prima di uscire
        setTimeout(() => resolve(true), 1300); // sblocco la navigazione dopo il tempo dell'animazione
      });
    }

    return animaUscita().then(() => true); // negli altri casi eseguo l'animazione di uscita standard
  }
}
