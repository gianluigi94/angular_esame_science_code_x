import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { SaturnoService } from 'src/app/_servizi_globali/animazioni_saturno/three/saturno.service';
import { SaturnoRouteAnimazioniService } from 'src/app/_servizi_globali/animazioni_saturno/gsap/saturno-route-animazioni.service';
import { AnimateService } from 'src/app/_servizi_globali/animazioni_saturno/animate.service';
import { Authservice } from 'src/app/_benvenuto/login/_login_service/auth.service';
import gsap from 'gsap';

@Injectable({ providedIn: 'root' })
export class CatalogoUscitaGuard implements CanDeactivate<any> {

  constructor(
    private saturnoService: SaturnoService,
    private saturnoRouteAnimazioniService: SaturnoRouteAnimazioniService,
    private animateService: AnimateService,
    private authService: Authservice,
  ) {}

  canDeactivate(
    _component: any,
    _currentRoute: any,
    _currentState: any,
    nextState?: any
  ): boolean | Promise<boolean> {
    const targetUrl = String(nextState?.url || '');
    const pathPulito = targetUrl.split('?')[0].split('#')[0];

    // Solo se andiamo verso contatti
    const vaInContatti = /^\/(it|en)\/(contatti|contact)(\/|$)/.test(pathPulito);
    if (!vaInContatti) return true;

    // Se loggato: apro subito DatiPersonali (come fa il footer)
    const sonoLoggato = !!this.authService.leggiObsAuth().value?.tk;
    if (sonoLoggato) {
      window.dispatchEvent(new CustomEvent('apri-dati-personali'));
    }

    // Controllo se sfondo/saturno sono nascosti (stato catalogo)
    const saturnoEl = document.querySelector('app-saturno') as HTMLElement | null;
    const sfondoEl  = document.querySelector('app-sfondo')  as HTMLElement | null;

    const opacitaSaturno = saturnoEl ? parseFloat(getComputedStyle(saturnoEl).opacity) : 1;
    const opacitaSfondo  = sfondoEl  ? parseFloat(getComputedStyle(sfondoEl).opacity)  : 1;

    const saturnoNascosto = opacitaSaturno < 0.1;
    const sfondoNascosto  = sfondoEl ? opacitaSfondo < 0.1 : false;

    // Se sono già visibili non serve fare nulla
    if (!saturnoNascosto && !sfondoNascosto) return true;

    // Ricomparsa sfondo + Saturno, poi naviga
    return new Promise<boolean>((resolve) => {
      const scena = this.saturnoService.getScene();
      const luce  = this.saturnoService.getDirectionalLight();

      this.saturnoService.riaccendiSaturno();

      if (saturnoEl) {
        gsap.killTweensOf(saturnoEl);
        saturnoEl.style.opacity = '1';
      }

      const tl = gsap.timeline();

      if (sfondoEl) {
        gsap.killTweensOf(sfondoEl);
        sfondoEl.style.opacity = '0';
        tl.fromTo(
          sfondoEl,
          { opacity: 0 },
          { opacity: 1, duration: 1.05, ease: 'power2.out' },
          0
        );
      }

      if (scena) {
        this.saturnoRouteAnimazioniService.animaVerso(
          scena, 'LOGIN_LATERALE', 0.75, luce || undefined
        );
      }

      setTimeout(() => resolve(true), 1050);
    });
  }
}
