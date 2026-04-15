import { Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { CambioLinguaService } from './cambio-lingua.service';
import { StopVideoGlobaleService } from '../_catalogo/riga-categoria/categoria_services/stop-video-globale.service';

@Injectable({ providedIn: 'root' })
export class CambioPianoAnimazioneService {

  constructor(
    private injector: Injector,
    private router: Router,
    private cambioLinguaService: CambioLinguaService,
    private stopVideoGlobale: StopVideoGlobaleService,
  ) {}

  async apriPannelloPiano(): Promise<void> {
    const [
      { SaturnoService },
      { SaturnoRouteAnimazioniService },
      { default: gsap },
    ] = await Promise.all([
      import('./animazioni_saturno/three/saturno.service'),
      import('./animazioni_saturno/gsap/saturno-route-animazioni.service'),
      import('gsap'),
    ]);

    const saturnoService = this.injector.get(SaturnoService);
    const saturnoRouteAnimazioniService = this.injector.get(SaturnoRouteAnimazioniService);

    const scene = saturnoService.getScene();
    const luce = saturnoService.getDirectionalLight();

    const saturnoEl = document.querySelector('app-saturno') as HTMLElement | null;
    const sfondoEl = document.querySelector('app-sfondo') as HTMLElement | null;

    const opacitaSaturno = saturnoEl ? parseFloat(getComputedStyle(saturnoEl).opacity) : 1;
    const opacitaSfondo = sfondoEl ? parseFloat(getComputedStyle(sfondoEl).opacity) : 1;

    const saturnoNascosto = opacitaSaturno < 0.1;
    const sfondoNascosto = sfondoEl ? opacitaSfondo < 0.1 : false;

    const navigaAPiano = async () => {
      const videoAttivo = Array.from(document.querySelectorAll('video'))
        .some(v => !v.paused && !v.ended && v.readyState > 2);

      if (videoAttivo) {
        await this.stopVideoGlobale.richiediSoloFadeAudio(350).catch(() => {});
      }

      const codice = this.cambioLinguaService.leggiCodiceLingua();
      const segmento = codice === 'it' ? 'piano' : 'plan';
      this.router.navigate(['/', codice, segmento]);
    };

    if (saturnoNascosto || sfondoNascosto) {
      saturnoService.riaccendiSaturno();

      if (saturnoEl) {
        gsap.killTweensOf(saturnoEl);
        saturnoEl.style.opacity = '1';
      }

      if (sfondoEl) {
        gsap.killTweensOf(sfondoEl);
        sfondoEl.style.opacity = '0';
        gsap.to(sfondoEl, { opacity: 1, duration: 1.05, ease: 'power2.out' });
      }

      if (scene) {
        saturnoRouteAnimazioniService.animaVerso(scene, 'LOGIN_LATERALE', 0.75, luce || undefined);
      }

      window.dispatchEvent(new CustomEvent('apri-pannello-piano'));
      setTimeout(() => navigaAPiano(), 1050);
    } else {
      if (scene) {
        saturnoRouteAnimazioniService.animaVerso(scene, 'LOGIN_LATERALE', 0.85, luce || undefined);
      }

      window.dispatchEvent(new CustomEvent('apri-pannello-piano'));
      navigaAPiano();
    }
  }
}
