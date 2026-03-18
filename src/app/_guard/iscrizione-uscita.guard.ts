import { Injectable } from '@angular/core';
import { CanDeactivate, Router } from '@angular/router';
import { IscrizioneComponent } from '../_benvenuto/iscrizione/iscrizione.component';
import { SaturnoService } from 'src/app/_servizi_globali/animazioni_saturno/three/saturno.service';
import { SaturnoRouteAnimazioniService } from 'src/app/_servizi_globali/animazioni_saturno/gsap/saturno-route-animazioni.service';
import { AnimateService } from 'src/app/_servizi_globali/animazioni_saturno/animate.service';

@Injectable({ providedIn: 'root' })
export class IscrizioneUscitaGuard implements CanDeactivate<IscrizioneComponent> {

  constructor(
    private router: Router,
    private saturnoService: SaturnoService,
    private saturnoRouteAnimazioniService: SaturnoRouteAnimazioniService,
    private animateService: AnimateService
  ) {}

  canDeactivate(
    component: IscrizioneComponent,
    _currentRoute: any,
    _currentState: any,
    nextState?: any
  ): boolean | Promise<boolean> {

    // cambio lingua: salto tutto, navigo subito
    const nav = this.router.getCurrentNavigation();
    const saltaPerCambioLingua =
      nav?.trigger === 'imperative' &&
      !!nav?.extras?.state?.['saltaAnimazioniLogin'];

    if (saltaPerCambioLingua) {
      return true;
    }

    const targetUrl =
      (nextState?.url as string) ||
      this.router.getCurrentNavigation()?.finalUrl?.toString() ||
      '';

    const pathPulito = String(targetUrl || '').split('?')[0].split('#')[0];

    const vaInBenvenuto =
      pathPulito === '/' ||
      pathPulito === '' ||
      /^\/(it|en)?\/?(benvenuto|welcome)(\/|$)/.test(pathPulito);

    if (vaInBenvenuto) {
      sessionStorage.removeItem('welcome_restore');
      sessionStorage.removeItem('welcome_scrollTop');

      const scroller = document.querySelector('.main-scroll') as HTMLElement | null;
      if (scroller) scroller.scrollTop = 0;

      const scene = this.saturnoService.getScene();
      const light = this.saturnoService.getDirectionalLight();

      this.animateService.setXGif();
      this.animateService.animateTitoloVersoCentroGlobal(1.25, 0); // animazione dura 1250ms

      if (scene) {
        this.saturnoRouteAnimazioniService.animaVerso(
          scene,
          'WELCOME_ALTO',
          1.25,
          light || undefined
        );
      }

      // aspetto che l'animazione del titolo finisca prima di navigare,
      // altrimenti Angular carica WelcomeComponent e resetta la posizione a metà animazione
      return new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(true), 1300); // 1250ms di durata + 50ms di buffer
      });
    }

    return component.animaUscita().then(() => true);
  }
}
