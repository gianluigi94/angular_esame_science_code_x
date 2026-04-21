import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { ProfiloComponent } from '../_componenti_comuni/profilo/profilo.component';
import { SaturnoService } from 'src/app/_servizi_globali/animazioni_saturno/three/saturno.service';
import { SaturnoRouteAnimazioniService } from 'src/app/_servizi_globali/animazioni_saturno/gsap/saturno-route-animazioni.service';
import { AnimateService } from 'src/app/_servizi_globali/animazioni_saturno/animate.service';
import gsap from 'gsap';

@Injectable({ providedIn: 'root' })
export class ProfiloUscitaGuard implements CanDeactivate<ProfiloComponent> {

  constructor(
    private saturnoService: SaturnoService,
    private saturnoRouteAnimazioniService: SaturnoRouteAnimazioniService,
    private animateService: AnimateService,
  ) {}

  canDeactivate(
    component: ProfiloComponent,
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

        if (!footer) { resolve(); return; }

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

    const animaChiudiBox = (): Promise<void> => {
      return new Promise((resolve) => {
        const titolo = document.querySelector('.profilo-titolo') as HTMLElement | null;
        const box = document.querySelector('.profilo-box') as HTMLElement | null;
        const titoloSezione = document.querySelector('.titolo-sezione') as HTMLElement | null;
        const righe = document.querySelectorAll('.campo-animato');
        const sfocatura = document.querySelector('.sfocatura') as HTMLElement | null;
        const bottoneIndietro = document.querySelector('.profilo-indietro-btn') as HTMLElement | null;

        if (titolo) {
          gsap.killTweensOf(titolo);
          gsap.to(titolo, { opacity: 0, duration: 0.2, ease: 'power2.in' });
        }
        if (titoloSezione) {
          gsap.killTweensOf(titoloSezione);
          gsap.to(titoloSezione, { opacity: 0, duration: 0.2, ease: 'power2.in' });
        }
        if (sfocatura) {
          gsap.killTweensOf(sfocatura);
          gsap.to(sfocatura, { opacity: 0, duration: 0.4, ease: 'power2.in' });
        }
        if (bottoneIndietro) {
          gsap.killTweensOf(bottoneIndietro);
          gsap.to(bottoneIndietro, { opacity: 0, duration: 0.2, ease: 'power2.in' });
        }
        if (righe.length) {
          gsap.killTweensOf(righe);
          gsap.to(righe, { opacity: 0, scaleX: 0, duration: 0.4, ease: 'power2.in', transformOrigin: 'center center' });
        }
        if (!box) { resolve(); return; }

        gsap.killTweensOf(box);
        gsap.to(box, {
          opacity: 0,
          scaleX: 0,
          duration: 0.4,
          ease: 'power2.in',
          transformOrigin: 'center center',
          onComplete: () => resolve(),
        });
      });
    };

    const vaInLogin = /^\/(it|en)\/(benvenuto|welcome)\/(accedi|login)(\/|$)/.test(pathPulito);
    if (vaInLogin) {
      return Promise.all([animaFooterOut(), animaChiudiBox()]).then(() => true);
    }

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

      return Promise.all([animaFooterOut(), animaChiudiBox(), wait(1250)]).then(() => true);
    }

    const vaInCatalogo = /^\/(it|en)\/(catalogo|catalog)(\/|$)/.test(pathPulito);

    if (vaInCatalogo) {
      const scene = this.saturnoService.getScene();
      const light = this.saturnoService.getDirectionalLight();

      if (scene) {
        this.saturnoRouteAnimazioniService.animaVerso(
          scene, 'CATALOGO_NASCOSTO', 1.4, light || undefined,
          () => {
            this.saturnoService.spegniSaturno();
            this.animateService.pauseClearcoat();
          }
        );
      }

      return Promise.all([animaFooterOut(), animaChiudiBox(), wait(1400)]).then(() => true);
    }

    return Promise.all([animaFooterOut(), animaChiudiBox()]).then(() => true);
  }
}
