import { Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { CambioLinguaService } from './cambio-lingua.service';
import { Authservice } from '../_benvenuto/login/_login_service/auth.service';
import { StopVideoGlobaleService } from '../_catalogo/riga-categoria/categoria_services/stop-video-globale.service';

@Injectable({ providedIn: 'root' })
export class ContattiNavigazioneService {

 constructor(
  private injector: Injector,
  private cambioLinguaService: CambioLinguaService,
  private authService: Authservice,
  private router: Router,
  private stopVideoGlobale: StopVideoGlobaleService,
) {}

  get sonoLoggato(): boolean {
    return !!this.authService.leggiObsAuth().value?.tk;
  }

  async vai(): Promise<void> {
    if (this.sonoLoggato) {
      window.dispatchEvent(new CustomEvent('apri-dati-personali'));
    }

    // importazione lazy: non finisce nel main bundle
    const [
      { SaturnoService },
      { AnimateService },
      { SaturnoRouteAnimazioniService },
      { default: gsap },
    ] = await Promise.all([
      import('./animazioni_saturno/three/saturno.service'),
      import('./animazioni_saturno/animate.service'),
      import('./animazioni_saturno/gsap/saturno-route-animazioni.service'),
      import('gsap'),
    ]);

    const saturnoService = this.injector.get(SaturnoService);
    const animateService = this.injector.get(AnimateService);
    const saturnoRouteAnimazioniService = this.injector.get(SaturnoRouteAnimazioniService);

    const scene = saturnoService.getScene();
    const saturnoEl = document.querySelector('app-saturno') as HTMLElement | null;
    const sfondoEl = document.querySelector('app-sfondo') as HTMLElement | null;

    const opacitaSaturno = saturnoEl ? parseFloat(getComputedStyle(saturnoEl).opacity) : 1;
    const opacitaSfondo = sfondoEl ? parseFloat(getComputedStyle(sfondoEl).opacity) : 1;

    const saturnoNascosto = opacitaSaturno < 0.1;
    const sfondoNascosto = sfondoEl ? opacitaSfondo < 0.1 : false;

   const navigaAContatti = async () => {
  const videoAttivo = Array.from(document.querySelectorAll('video'))
    .some(v => !v.paused && !v.ended && v.readyState > 2);
  if (videoAttivo) {
    await this.stopVideoGlobale.richiediSoloFadeAudio(350).catch(() => {});
  }
  const codice = this.cambioLinguaService.leggiCodiceLingua();
  const segmento = codice === 'it' ? 'contatti' : 'contact';
  this.router.navigate(['/', codice, segmento]);
};

    if (saturnoNascosto || sfondoNascosto) {
      const scena = saturnoService.getScene();
      const luce = saturnoService.getDirectionalLight();

      saturnoService.riaccendiSaturno();

      if (saturnoEl) {
        gsap.killTweensOf(saturnoEl);
        saturnoEl.style.opacity = '1';
      }

      const tl = gsap.timeline();
      setTimeout(() => navigaAContatti(), 1050);

      if (sfondoEl) {
        gsap.killTweensOf(sfondoEl);
        sfondoEl.style.opacity = '0';
        tl.fromTo(sfondoEl, { opacity: 0 }, { opacity: 1, duration: 1.05, ease: 'power2.out' }, 0);
      }

      if (scena) {
        saturnoRouteAnimazioniService.animaVerso(scena, 'LOGIN_LATERALE', 0.75, luce || undefined);
      }

    } else {
      const poseStimata = scene ? this.indovinaPose(scene.position, scene.scale) : 'SCONOSCIUTA';

      if (poseStimata === 'WELCOME_BASSO') {
        const luce = saturnoService.getDirectionalLight();
        animateService.setXNormale();
        animateService.animateTitoloVersoAltoGlobal();
        saturnoRouteAnimazioniService.animaVerso(scene!, 'LOGIN_LATERALE', 0.85, luce || undefined);
        navigaAContatti();
      } else {
        navigaAContatti();
      }
    }
  }

  private indovinaPose(
    pos: { x: number; y: number; z: number },
    scl: { x: number; y: number; z: number }
  ): string {
    if (Math.abs(scl.x - 0.01) < 0.05) return 'CATALOGO_NASCOSTO';
    if (Math.abs(scl.x - 1.4) < 0.2 && pos.x < -1) return 'LOGIN_LATERALE';
    if (Math.abs(scl.x - 3.8) < 0.3) return 'WELCOME_BASSO';
    if (Math.abs(scl.x - 1) < 0.15 && Math.abs(pos.x) < 0.5) return 'WELCOME_ALTO';
    return 'SCONOSCIUTA';
  }
}
