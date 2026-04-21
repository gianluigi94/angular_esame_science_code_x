import { Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { CambioLinguaService } from './cambio-lingua.service';
import { StopVideoGlobaleService } from '../_catalogo/riga-categoria/categoria_services/stop-video-globale.service';

@Injectable({ providedIn: 'root' })
export class CambioRicevuteAnimazioneService {

  spinnerVisibile$ = new BehaviorSubject<boolean>(false);

  constructor(
    private injector: Injector,
    private router: Router,
    private cambioLinguaService: CambioLinguaService,
    private stopVideoGlobale: StopVideoGlobaleService,
  ) {}

  async apriRicevute(): Promise<void> {
    setTimeout(() => this.spinnerVisibile$.next(true), 750);
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

    const navigaARicevute = async () => {
      const videoAttivo = Array.from(document.querySelectorAll('video'))
        .some(v => !v.paused && !v.ended && v.readyState > 2);

      if (videoAttivo) {
        await this.stopVideoGlobale.richiediSoloFadeAudio(350).catch(() => {});
      }

      const codice = this.cambioLinguaService.leggiCodiceLingua();
      const segmento = codice === 'it' ? 'ricevute' : 'receipts';
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
        saturnoRouteAnimazioniService.animaVerso(scene, 'WELCOME_BASSO', 0.75, luce || undefined);
        gsap.killTweensOf(scene.position);
        const t = 1.1;
        const baseY = window.innerWidth <= 868 ? -3.6 : -3.4;
        gsap.to(scene.position, {
          x: 3.1 * t + 1.2 * Math.sin(Math.PI * t),
          y: baseY * Math.pow(t, 2),
          duration: 0.75,
          ease: 'power2.inOut',
        });
      }

      setTimeout(() => navigaARicevute(), 1050);
    } else {
      if (scene) {
        console.log('PRIMA animazione - posizione:', scene.position.x, scene.position.y);
        saturnoRouteAnimazioniService.animaVerso(scene, 'WELCOME_BASSO', 0.85, luce || undefined, () => {
          console.log('onComplete scattato');
          const t = 1.1;
          const baseY = window.innerWidth <= 868 ? -3.6 : -3.4;
          const nuovoX = 3.1 * t + 1.2 * Math.sin(Math.PI * t);
          const nuovoY = baseY * Math.pow(t, 2);
          console.log('Imposto posizione:', nuovoX, nuovoY);
          scene.position.x = nuovoX;
          scene.position.y = nuovoY;
          console.log('DOPO impostazione - posizione:', scene.position.x, scene.position.y);
          navigaARicevute();
        });
      } else {
        console.log('scene è null, navigo direttamente');
        navigaARicevute();
      }
    }
  }
}
