// Guard che intercetta l'uscita dalla pagina di login per coordinare transizioni e animazioni prima della navigazione.

import { Injectable } from '@angular/core';
import { CanDeactivate, Router } from '@angular/router';
import { LoginComponent } from '../_benvenuto/login/login.component';
import { SaturnoService } from 'src/app/_servizi_globali/animazioni_saturno/three/saturno.service';
import { SaturnoRouteAnimazioniService } from 'src/app/_servizi_globali/animazioni_saturno/gsap/saturno-route-animazioni.service';
import { AnimateService } from 'src/app/_servizi_globali/animazioni_saturno/animate.service';

@Injectable({ providedIn: 'root' })
export class LoginUscitaGuard implements CanDeactivate<LoginComponent> {

  constructor(
    private router: Router,
    private saturnoService: SaturnoService,
    private saturnoRouteAnimazioniService: SaturnoRouteAnimazioniService,
    private animateService: AnimateService
  ) {}

  /**
   * Determina se e' possibile uscire dal componente di login.
   *
   * Gestisce il salto animazioni per cambio lingua, il salto richiesto
   * dal componente e l'eventuale ritorno verso l'area welcome.
   *
   * @param component Istanza del componente Login.
   * @param _currentRoute Rotta corrente non utilizzata.
   * @param _currentState Stato corrente non utilizzato.
   * @param nextState Stato di destinazione utile per leggere l'URL target.
   * @returns boolean | Promise<boolean>
   */
  canDeactivate(
    component: LoginComponent, // ricevo il componente login per leggere flag e lanciare la sua animazione di uscita
    _currentRoute: any, // ricevo la rotta corrente anche se qui non la uso
    _currentState: any, // ricevo lo stato corrente anche se qui non lo uso
    nextState?: any // ricevo lo stato successivo per capire verso quale URL sto navigando
  ): boolean | Promise<boolean> {
    const nav = this.router.getCurrentNavigation(); // leggo la navigazione Angular attualmente in corso
    const saltaAnimazioniPerCambioLingua =
      nav?.trigger === 'imperative' && // controllo se la navigazione e' stata avviata in modo imperativo
      !!nav?.extras?.state?.['saltaAnimazioniLogin']; // controllo se nello state e' stato chiesto di saltare le animazioni login

    if (saltaAnimazioniPerCambioLingua) { // verifico se devo saltare tutto per cambio lingua
      return true; // lascio uscire subito senza animazioni
    }

    if (component.saltaAnimazioneUscita) { // controllo se il componente chiede di saltare la sua animazione di uscita
      return true; // autorizzo subito la navigazione
    }

    const targetUrl =
      (nextState?.url as string) || // provo a leggere l'URL dalla destinazione successiva
      this.router.getCurrentNavigation()?.finalUrl?.toString() || // in alternativa provo a leggere la finalUrl della navigazione corrente
      ''; // uso stringa vuota se non trovo nulla

    const pathPulito = String(targetUrl || '').split('?')[0].split('#')[0]; // pulisco l'URL da query string e fragment

    const vaInBenvenuto =
      pathPulito === '/' || // controllo se sto andando alla root
      pathPulito === '' || // controllo se non ho un path esplicito
      /^\/(it|en)?\/?(benvenuto|welcome)(\/|$)/.test(pathPulito); // controllo se sto andando nell'area benvenuto o welcome

    if (vaInBenvenuto) { // verifico se la destinazione e' l'area welcome
      sessionStorage.removeItem('welcome_restore'); // rimuovo l'eventuale restore della welcome
      sessionStorage.removeItem('welcome_scrollTop'); // rimuovo l'eventuale scroll salvato della welcome

      const scroller = document.querySelector('.main-scroll') as HTMLElement | null; // recupero il contenitore principale di scroll
      if (scroller) scroller.scrollTop = 0; // riporto lo scroll in alto se il contenitore esiste

      const scene = this.saturnoService.getScene(); // recupero la scena 3D corrente
      const light = this.saturnoService.getDirectionalLight(); // recupero la luce direzionale corrente

      this.animateService.setXGif(); // ripristino la X in modalita' gif
      this.animateService.animateTitoloVersoCentroGlobal(1.25, 0); // riporto il titolo globale verso il centro

      if (scene) { // controllo se la scena e' disponibile
        this.saturnoRouteAnimazioniService.animaVerso(
          scene, // passo la scena 3D da animare
          'WELCOME_ALTO', // chiedo la posa alta della welcome
          1.25, // imposto la durata della transizione
          light || undefined // passo la luce se disponibile
        );
      }
    }

    return component.animaUscita().then(() => true); // avvio l'animazione di uscita del login e autorizzo la navigazione quando termina
  }
}
