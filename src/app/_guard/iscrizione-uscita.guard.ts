import { Injectable } from '@angular/core';
import { CanDeactivate, Router } from '@angular/router';
import { IscrizioneComponent } from '../_benvenuto/iscrizione/iscrizione.component';
import { SaturnoService } from 'src/app/_servizi_globali/animazioni_saturno/three/saturno.service';
import { AnimateService } from 'src/app/_servizi_globali/animazioni_saturno/animate.service';
import { ScrollWelcomeService } from 'src/app/_servizi_globali/animazioni_saturno/gsap/scroll-welcome.service';

@Injectable({ providedIn: 'root' })
export class IscrizioneUscitaGuard implements CanDeactivate<IscrizioneComponent> {

  constructor(
    private router: Router,
    private saturnoService: SaturnoService,
    private animateService: AnimateService,
    private scrollWelcomeService: ScrollWelcomeService
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
      this.animateService.animateTitoloVersoCentroGlobal(1.25, 0);

      // usa la stessa curva sinusoidale dello scroll (giro largo), non la retta diretta
      if (scene && light) {
        this.scrollWelcomeService.animaRitornoVersoAlto(scene, light, 1.05);
      }

      return new Promise<boolean>((resolve) => {
        setTimeout(() => resolve(true), 1300); // 870ms di durata + 80ms di buffer
      });
    }

    return component.animaUscita().then(() => true);
  }
}
