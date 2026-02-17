import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { SaturnoService } from '../../_servizi_globali/animazioni_saturno/three/saturno.service';
import { AnimateService } from '../../_servizi_globali/animazioni_saturno/animate.service';
import { SaturnoRouteAnimazioniService } from '../../_servizi_globali/animazioni_saturno/gsap/saturno-route-animazioni.service';
import { CambioLinguaService } from '../../_servizi_globali/cambio-lingua.service';
import gsap from 'gsap';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
})
export class FooterComponent {

  constructor(
    private saturnoService: SaturnoService,
    private animateService: AnimateService,
    private saturnoRouteAnimazioniService: SaturnoRouteAnimazioniService,
    private cambioLinguaService: CambioLinguaService,
    private router: Router
  ) {}

  onContattiClick(event: Event): void {
    event.preventDefault();

    const scene = this.saturnoService.getScene();
    const saturnoEl = document.querySelector('app-saturno') as HTMLElement | null;
    const sfondoEl = document.querySelector('app-sfondo') as HTMLElement | null;

    const opacitaSaturno = saturnoEl ? parseFloat(getComputedStyle(saturnoEl).opacity) : 1;
    const opacitaSfondo = sfondoEl ? parseFloat(getComputedStyle(sfondoEl).opacity) : 1;

    const saturnoNascosto = opacitaSaturno < 0.1;
    const sfondoNascosto = sfondoEl ? opacitaSfondo < 0.1 : false;

    console.log('[Contatti] Stato visibilità:', {
      saturno: saturnoNascosto ? 'NASCOSTO' : 'VISIBILE',
      sfondo: sfondoNascosto ? 'NASCOSTO' : 'VISIBILE',
      opacitaSaturno,
      opacitaSfondo,
    });

    if (scene) {
      const pos = scene.position;
      const scl = scene.scale;
      console.log('[Contatti] Pose Saturno:', {
        position: { x: pos.x, y: pos.y, z: pos.z },
        scale: { x: scl.x, y: scl.y, z: scl.z },
        stimata: this.indovinaPose(pos, scl),
      });
    }

    const navigaAContatti = () => {
      const codice = this.cambioLinguaService.leggiCodiceLingua();
      const segmento = codice === 'it' ? 'contatti' : 'contact';
      this.router.navigate(['/', codice, segmento]);
    };

    if (saturnoNascosto || sfondoNascosto) {
      console.log('[Contatti] Ricomparsa sfondo + Saturno verso LOGIN_LATERALE, poi navigo...');

      const scena = this.saturnoService.getScene();
      const luce = this.saturnoService.getDirectionalLight();

      // Riaccendo il loop di rendering (era spento dal catalogo)
      this.saturnoService.riaccendiSaturno();

      // app-saturno: compare subito, tutto di colpo
      if (saturnoEl) {
        gsap.killTweensOf(saturnoEl);
        saturnoEl.style.opacity = '1';
      }

      // app-sfondo: fade-in progressivo + Saturno 3D: partono insieme
      const tl = gsap.timeline({
        onComplete: () => navigaAContatti(),
      });

      if (sfondoEl) {
        gsap.killTweensOf(sfondoEl);
        sfondoEl.style.opacity = '0';
        tl.fromTo(sfondoEl, { opacity: 0 }, { opacity: 1, duration: 1.85, ease: 'power2.out' }, 0);
      }

      // Contemporaneamente: sposto Saturno 3D da CATALOGO_NASCOSTO a LOGIN_LATERALE
      if (scena) {
        this.saturnoRouteAnimazioniService.animaVerso(
          scena, 'LOGIN_LATERALE', 1.15, luce || undefined
        );
      }
    } else {
      console.log('[Contatti] Già visibili, navigo subito.');
      navigaAContatti();
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
