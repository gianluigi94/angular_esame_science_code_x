// src/app/_guard/contatti-uscita.guard.ts

import { Injectable } from '@angular/core';
import { CanDeactivate, Router } from '@angular/router';
import { ContattiComponent } from '../_componenti_comuni/contatti/contatti.component';
import { SaturnoService } from 'src/app/_servizi_globali/animazioni_saturno/three/saturno.service';
import { SaturnoRouteAnimazioniService } from 'src/app/_servizi_globali/animazioni_saturno/gsap/saturno-route-animazioni.service';
import { AnimateService } from 'src/app/_servizi_globali/animazioni_saturno/animate.service';

@Injectable({ providedIn: 'root' })
export class ContattiUscitaGuard implements CanDeactivate<ContattiComponent> {

  constructor(
    private router: Router,
    private saturnoService: SaturnoService,
    private saturnoRouteAnimazioniService: SaturnoRouteAnimazioniService,
    private animateService: AnimateService
  ) {}

  canDeactivate(
    component: ContattiComponent,
    _currentRoute: any,
    _currentState: any,
    nextState?: any
  ): boolean | Promise<boolean> {

    const targetUrl = (nextState?.url as string) || '';
    const pathPulito = String(targetUrl || '').split('?')[0].split('#')[0];

    // ── Login (es. torno indietro da contatti a login) ──
    // Saturno e titolo sono già nella posizione corretta: sposto solo il pannello
    const vaInLogin = /^\/(it|en)\/(benvenuto|welcome)\/(accedi|login)(\/|$)/.test(pathPulito);
    if (vaInLogin) {
      return component.animaUscita().then(() => true);
    }

    // ── Welcome ──
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

      if (scene) {
        this.saturnoRouteAnimazioniService.animaVerso(
          scene, 'WELCOME_ALTO', 1.25, light || undefined
        );
      }

      return component.animaUscita().then(() => true);
    }

    // ── Catalogo ──
    const vaInCatalogo = /^\/(it|en)\/(catalogo|catalog)(\/|$)/.test(pathPulito);

    if (vaInCatalogo) {
      const scene = this.saturnoService.getScene();
      const light = this.saturnoService.getDirectionalLight();

      // Saturno: LOGIN_LATERALE → CATALOGO_NASCOSTO (in parallelo al pannello)
      if (scene) {
        this.saturnoRouteAnimazioniService.animaVerso(
          scene, 'CATALOGO_NASCOSTO', 1.2, light || undefined,
          () => {
            this.saturnoService.spegniSaturno();
            this.animateService.pauseClearcoat();
          }
        );
      }

      // Il pannello contatti scivola via (1.25s) — guida la navigazione
      return component.animaUscita().then(() => true);
    }

    // ── Default (login o altro): solo uscita pannello ──
    return component.animaUscita().then(() => true);
  }
}
