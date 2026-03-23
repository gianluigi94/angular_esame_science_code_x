import { Injectable } from '@angular/core';
import { CanDeactivate, Router } from '@angular/router';
import { IscrizioneComponent } from '../_benvenuto/iscrizione/iscrizione.component';
import { SaturnoService } from 'src/app/_servizi_globali/animazioni_saturno/three/saturno.service';
import { AnimateService } from 'src/app/_servizi_globali/animazioni_saturno/animate.service';
import { ScrollWelcomeService } from 'src/app/_servizi_globali/animazioni_saturno/gsap/scroll-welcome.service';
import gsap from 'gsap';
@Injectable({ providedIn: 'root' })
export class IscrizioneUscitaGuard implements CanDeactivate<IscrizioneComponent> {

  constructor(
    private router: Router,
    private saturnoService: SaturnoService,
    private animateService: AnimateService,
    private scrollWelcomeService: ScrollWelcomeService
  ) {}

async canDeactivate(
    component: IscrizioneComponent,
    _currentRoute: any,
    _currentState: any,
    nextState?: any
  ): Promise<boolean> {

    // cambio lingua: salto tutto, navigo subito
    const nav = this.router.getCurrentNavigation();
    const saltaPerCambioLingua =
      nav?.trigger === 'imperative' &&
      !!nav?.extras?.state?.['saltaAnimazioniLogin'];

    if (saltaPerCambioLingua) {
      return Promise.resolve(true);
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

  component.animaSfocatura(false);


  const scroller = document.querySelector('.main-scroll') as HTMLElement | null;
  if (scroller) scroller.scrollTop = 0;

  const scene = this.saturnoService.getScene();
  const light = this.saturnoService.getDirectionalLight();

  this.animateService.setXGif();
  this.animateService.animateTitoloVersoCentroGlobal(1.25, 0);

  if (scene && light) {
    this.scrollWelcomeService.animaRitornoVersoAlto(scene, light, 1.05);
  }

  const titolo = document.querySelector('.titolo-animato') as HTMLElement | null;
  const labels = document.querySelectorAll('.label-sopra');
  const righe = document.querySelectorAll('.campo-animato');

  if (titolo) gsap.to(titolo, { opacity: 0, duration: 0.3, ease: 'power2.in' });
  gsap.to(labels, { opacity: 0, duration: 0.3, ease: 'power2.in' });
  gsap.to(righe, { opacity: 0, scaleX: 0, duration: 0.3, ease: 'power2.in', stagger: 0.05 });

  const footer = document.querySelector('footer') as HTMLElement | null;
  if (footer) {
    gsap.to(footer, { scaleY: 0, opacity: 0, duration: 0.25, delay: 0.25, ease: 'power2.in' });
  }

  const footerP = document.querySelector('#footer-p') as HTMLElement | null;
  if (footerP) {
    gsap.to(footerP, { opacity: 0, duration: 0.2, ease: 'power1.in' });
  }

  return new Promise<boolean>((resolve) => {
    setTimeout(() => resolve(true), 1300);
  });
}

    return component.animaUscita().then(() => true);
  }
}
