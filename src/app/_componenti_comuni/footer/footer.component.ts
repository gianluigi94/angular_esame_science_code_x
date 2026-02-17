import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { SaturnoService } from '../../_servizi_globali/animazioni_saturno/three/saturno.service';
import { AnimateService } from '../../_servizi_globali/animazioni_saturno/animate.service';
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
    private cambioLinguaService: CambioLinguaService,
    private router: Router
  ) {}

  onContattiClick(event: Event): void {
    event.preventDefault();

    const scene = this.saturnoService.getScene();
    const saturnoEl = document.querySelector('app-saturno') as HTMLElement | null;
    const sfondoEl = document.querySelector('app-sfondo') as HTMLElement | null;

    // Leggo l'opacità corrente dei due elementi
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

    // Se sono nascosti, li faccio ricomparire con fade-in (stessa logica del 404)
    if (saturnoNascosto || sfondoNascosto) {
      console.log('[Contatti] Ricomparsa Saturno + Sfondo...');

      if (saturnoEl) {
        gsap.killTweensOf(saturnoEl);
        gsap.set(saturnoEl, { opacity: 0 });
        gsap.to(saturnoEl, {
          opacity: 1,
          duration: 1.85,
          ease: 'power2.out',
        });
      }

      if (sfondoEl) {
        gsap.killTweensOf(sfondoEl);
        gsap.set(sfondoEl, { opacity: 0 });
        gsap.to(sfondoEl, {
          opacity: 1,
          duration: 1.85,
          ease: 'power2.out',
        });
      }
    } else {
      console.log('[Contatti] Saturno e sfondo già visibili, nessuna ricomparsa necessaria.');
    }

    // Navigo alla pagina contatti con il prefisso lingua corretto
    const codice = this.cambioLinguaService.leggiCodiceLingua();
    const segmento = codice === 'it' ? 'contatti' : 'contact';
    this.router.navigate(['/', codice, segmento]);
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
