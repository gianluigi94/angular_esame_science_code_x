// Guard che intercetta l’uscita dalla pagina di login per coordinare transizioni/animazioni prima della navigazione.

import { Injectable } from '@angular/core';
import { CanDeactivate, Router } from '@angular/router';
import { LoginComponent } from '../_benvenuto/login/login.component';
import { SaturnoService } from 'src/app/_servizi_globali/animazioni_saturno/three/saturno.service';
import { SaturnoRouteAnimazioniService } from 'src/app/_servizi_globali/animazioni_saturno/gsap/saturno-route-animazioni.service';
import { AnimateService } from 'src/app/_servizi_globali/animazioni_saturno/animate.service';

@Injectable({ providedIn: 'root' })
export class LoginUscitaGuard implements CanDeactivate<LoginComponent> { //(forse deprecato, ma funzionante. devo informarmi)

  constructor(
  private router: Router,
  private saturnoService: SaturnoService,
  private saturnoRouteAnimazioniService: SaturnoRouteAnimazioniService,
  private animateService: AnimateService
) {}


  /**
   * Determina se è possibile uscire dal componente di login.
   *
   * - se il componente richiede di saltare l'animazione, la navigazione è immediata
   * - se la destinazione è una pagina di benvenuto:
   *   - anima il titolo e gli elementi UI
   *   - anima la scena di Saturno verso la pose di welcome
   * - attende il completamento dell'animazione di uscita del login
   *
   * La navigazione viene autorizzata solo al termine delle animazioni.
   *
   * @link https://v17.angular.io/guide/router#router-guards
   * @link https://v17.angular.io/api/router/CanDeactivate (forse deprecato, ma funzionante. devo informarmi)
   *
   *
   * @param component Istanza del componente Login.
   * @param _currentRoute Rotta corrente (non utilizzata).
   * @param _currentState Stato di navigazione corrente (non utilizzato).
   * @param nextState Stato di destinazione per determinare l'URL target.
   * @returns true se la navigazione è consentita, oppure Promise risolta a true al termine delle animazioni.
   */
   canDeactivate(
    component: LoginComponent, // ricevo l'istanza del componente così posso leggere flag e chiamare le sue animazioni
    _currentRoute: any, // ricevo la rotta attuale
    _currentState: any, // ricevo lo stato attuale
    nextState?: any // ricevo lo stato di destinazione per capire dove sto andando
  ): boolean | Promise<boolean> { // dichiaro che posso restituire subito un booleano oppure una promessa
        const saltaAnimazioniPerCambioLingua =
      !!this.router.getCurrentNavigation()?.extras?.state?.['saltaAnimazioniLogin'];

    if (saltaAnimazioniPerCambioLingua) {
      return true;
    }

    if (component.saltaAnimazioneUscita) { // se il componente mi dice di saltare l'animazione di uscita
      return true; // permetto l'uscita immediata senza fare altro
    }

    const targetUrl = // ricavo l'URL verso cui sto navigando, usando più tentativi per coprire casi diversi
      (nextState?.url as string) || // provo prima a leggere l'url dal nextState se esiste
      this.router.getCurrentNavigation()?.finalUrl?.toString() || // se non c'è, provo a leggere l'URL finale dalla navigazione corrente
      ''; // se non trovo nulla, mi assicuro di avere una stringa vuota

    const vaInBenvenuto = // decido se la destinazione è una pagina di benvenuto
      targetUrl === '/' || // considero benvenuto anche la root
      targetUrl === '' || // considero benvenuto anche l'url vuoto
      targetUrl === '/benvenuto' || // considero benvenuto la rotta esatta
      targetUrl.startsWith('/benvenuto'); // considero benvenuto anche qualsiasi sotto-rotta

    if (vaInBenvenuto) { // se sto tornando alle pagine di benvenuto
      const scene = this.saturnoService.getScene(); // recupero la scena 3D attuale per poterla animare
      const light = this.saturnoService.getDirectionalLight(); // recupero la luce direzionale da usare durante l'animazione

      this.animateService.setXGif(); // imposto l'animazione grafica 'X' come indicatore visivo
      this.animateService.animateTitoloVersoCentroGlobal(1.25, 0); // porto il titolo verso il centro con durata e ritardo stabiliti

      if (scene) { // proseguo solo se ho davvero una scena disponibile
        this.saturnoRouteAnimazioniService.animaVerso( // avvio l'animazione di transizione della scena verso una posizione predefinita
          scene, // passo la scena da animare
          'WELCOME_ALTO', // scelgo la podsizione in cui deve ritornare il titolo
          1.25, // imposto la durata dell'animazione
          light || undefined // passo la luce se esiste, altrimenti lascio indefinito
        );
      }
    }

    return component.animaUscita().then(() => true); // avvio l'animazione di uscita del login e poi autorizzo la navigazione
  }

}
