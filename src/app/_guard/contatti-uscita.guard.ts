// src/app/_guard/contatti-uscita.guard.ts

import { Injectable } from '@angular/core';
import { CanDeactivate, Router } from '@angular/router';
import { ContattiComponent } from '../_componenti_comuni/contatti/contatti.component';
import { SaturnoService } from 'src/app/_servizi_globali/animazioni_saturno/three/saturno.service';
import { SaturnoRouteAnimazioniService } from 'src/app/_servizi_globali/animazioni_saturno/gsap/saturno-route-animazioni.service';
import { AnimateService } from 'src/app/_servizi_globali/animazioni_saturno/animate.service';
import gsap from 'gsap';
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
        const animaFooterOut = (): Promise<void> => {
      return new Promise((resolve) => {
        const footer = document.querySelector('footer') as HTMLElement | null;
        const footerP = document.querySelector('#footer-p') as HTMLElement | null;

        if (footerP) {
          gsap.killTweensOf(footerP);
          gsap.to(footerP, { opacity: 0, duration: 0.18, ease: 'power1.out' });
        }

        if (!footer) {
          resolve();
          return;
        }

        gsap.killTweensOf(footer);
        gsap.to(footer, {
          scaleY: 0,
          opacity: 0,
          duration: 0.25,
          ease: 'power2.in',
          transformOrigin: 'bottom center',
          onComplete: () => resolve(),
        });
      });
    };

    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const targetUrl = (nextState?.url as string) || '';
    const pathPulito = String(targetUrl || '').split('?')[0].split('#')[0];

    // ── Login (torno indietro da contatti a login) ──
    // ✅ NON animare pannello HTML (niente footer che vola)
    const vaInLogin = /^\/(it|en)\/(benvenuto|welcome)\/(accedi|login)(\/|$)/.test(pathPulito);
    if (vaInLogin) {
      return Promise.all([component.animaUscita(), animaFooterOut()]).then(() => true);
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

      // ✅ Lascia intatto: Saturno + titolo (come ora)
      this.animateService.setXGif();
      this.animateService.animateTitoloVersoCentroGlobal(1.25, 0);

      if (scene) {
        this.saturnoRouteAnimazioniService.animaVerso(
          scene, 'WELCOME_ALTO', 1.25, light || undefined
        );
      }

      // ✅ Niente animaUscita pannello: aspetto solo il tempo della transizione globale
      return Promise.all([component.animaUscita(), animaFooterOut(), wait(1250)]).then(() => true);
    }

    // ── Catalogo ──
    const vaInCatalogo = /^\/(it|en)\/(catalogo|catalog)(\/|$)/.test(pathPulito);

    if (vaInCatalogo) {
      const scene = this.saturnoService.getScene();
      const light = this.saturnoService.getDirectionalLight();

      // ✅ Lascia intatto: Saturno perfetto (come ora)
      if (scene) {
        this.saturnoRouteAnimazioniService.animaVerso(
          scene, 'CATALOGO_NASCOSTO', 1.2, light || undefined,
          () => {
            this.saturnoService.spegniSaturno();
            this.animateService.pauseClearcoat();
          }
        );
      }

      // ✅ Niente animaUscita pannello: aspetto solo la durata scena
      return Promise.all([component.animaUscita(), animaFooterOut(), wait(1200)]).then(() => true);
    }

    // ── Default ──
    // ✅ Nessuna animazione HTML
    return Promise.all([component.animaUscita(), animaFooterOut()]).then(() => true);
  }
}
