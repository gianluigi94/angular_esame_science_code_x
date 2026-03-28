import { Injectable, NgZone } from '@angular/core';
import gsap from 'gsap';
import * as THREE from 'three';
import {
  SaturnoPosizioniService,
  SaturnoStatoChiave,
} from '../saturno_posizioni.service';

@Injectable({ providedIn: 'root' })
export class SaturnoRouteAnimazioniService {

  constructor(
    private saturnoPosizioniService: SaturnoPosizioniService,
    private ngZone: NgZone
  ) {
    this.ngZone.runOutsideAngular(() => {
      gsap.ticker.lagSmoothing(0);
    });
  }

  public animaVerso(
    scene: THREE.Scene,
    stato: SaturnoStatoChiave,
    durata: number = 0.9,
    light?: THREE.DirectionalLight,
    onComplete?: () => void
  ): void {
    this.ngZone.runOutsideAngular(() => {
      const pose = this.saturnoPosizioniService.getPose(stato);
      const isFromBasso = scene.scale.x > 2.5;
      const isFromCatalogo = scene.scale.x < 0.05;
      const conPiroetta = isFromBasso || isFromCatalogo;

      const durataAnim =
        stato === 'LOGIN_LATERALE' && conPiroetta ? durata + 0.4 : durata;

      const tl = gsap.timeline({
        onComplete: () => {
          if (onComplete) {
            onComplete();
          }
        },
      });

      // POSIZIONE
      if (stato === 'CATALOGO_NASCOSTO') {
        const startPos = {
          x: scene.position.x,
          y: scene.position.y,
          z: scene.position.z,
        };
        const endPos = pose.position;

        const controlPos = {
          x: (startPos.x + endPos.x) / 2,
          y: startPos.y + 0.2,
          z: (startPos.z + endPos.z) / 2,
        };

        const curveProxy = { t: 0 };

        tl.to(
          curveProxy,
          {
            t: 1,
            duration: durataAnim,
            ease: 'power2.inOut',
            onUpdate: () => {
              const t = curveProxy.t;
              const inv = 1 - t;

              const x =
                inv * inv * startPos.x +
                2 * inv * t * controlPos.x +
                t * t * endPos.x;
              const y =
                inv * inv * startPos.y +
                2 * inv * t * controlPos.y +
                t * t * endPos.y;
              const z =
                inv * inv * startPos.z +
                2 * inv * t * controlPos.z +
                t * t * endPos.z;

              scene.position.set(x, y, z);
            },
          },
          0
        );
      } else {
        tl.to(
          scene.position,
          {
            x: pose.position.x,
            y: pose.position.y,
            z: pose.position.z,
            duration: durataAnim,
            ease: 'power2.inOut',
          },
          0
        );
      }

      // SCALA
      tl.to(
        scene.scale,
        {
          x: pose.scale.x,
          y: pose.scale.y,
          z: pose.scale.z,
          duration: durataAnim,
          ease: 'power2.inOut',
        },
        0
      );

      // ROTAZIONE
      if (stato === 'LOGIN_LATERALE' && conPiroetta) {
        tl.to(
          scene.rotation,
          {
            x: pose.rotation.x,
            y: pose.rotation.y + Math.PI * 2,
            z: pose.rotation.z,
            duration: durataAnim,
            ease: 'power1.inOut',
            onComplete: () => {
              scene.rotation.y = pose.rotation.y;
            },
          },
          0
        );
      } else {
        tl.to(
          scene.rotation,
          {
            x: pose.rotation.x,
            y: pose.rotation.y,
            z: pose.rotation.z,
            duration: durataAnim,
            ease: 'power2.inOut',
          },
          0
        );
      }

      // LUCE
      if (light) {
        let lightZ = 10.1001;
        if (stato === 'WELCOME_BASSO') {
          lightZ = 5.1001;
        } else if (stato === 'LOGIN_LATERALE') {
          lightZ = 0.1001;
        } else if (stato === 'CATALOGO_NASCOSTO') {
          lightZ = 0.1001;
        }

        tl.to(
          light.position,
          {
            z: lightZ,
            duration: durataAnim,
            ease: 'power2.inOut',
          },
          0
        );
      }
    }); // chiude runOutsideAngular
  }

  public applicaSubito(
    scene: THREE.Scene,
    stato: SaturnoStatoChiave,
    light?: THREE.DirectionalLight
  ): void {
    this.saturnoPosizioniService.applicaPoseAScena(scene, stato);
    if (light) {
      let lightZ = 10.1001;
      if (stato === 'WELCOME_BASSO') {
        lightZ = 5.1001;
      } else if (stato === 'LOGIN_LATERALE') {
        lightZ = 0.1001;
      }
      light.position.z = lightZ;
    }
  }

  /**
   * Timeline unificata: Saturno + scritte 404.
   * Saturno sale verso WELCOME_ALTO mentre maschera, cifre e paragrafo entrano con GSAP.
   */
  public animaIngresso404ConScritte(
    scene: THREE.Scene,
    durataSaturno: number,
    light?: THREE.DirectionalLight
  ): void {
    this.ngZone.runOutsideAngular(() => {
      // ── 1) Saturno verso WELCOME_ALTO ──
      this.animaVerso(scene, 'WELCOME_ALTO', durataSaturno, light);

      // ── 2) Scritte 404: maschera wipe + cifre + paragrafo ──
      const mask = document.querySelector('.nf-mask') as HTMLElement | null;
      if (!mask) return;

      const digits = document.querySelectorAll('.nf-num .d');
      const paragrafo = document.querySelector('.nf-num p') as HTMLElement | null;

      mask.style.transition = 'none';

      gsap.set(mask, { width: '0%' });
      if (digits.length) gsap.set(digits, { opacity: 0, y: 40, scale: 0.7 });
      if (paragrafo) gsap.set(paragrafo, { opacity: 0, y: 20 });

      const tl404 = gsap.timeline();

      tl404.to(mask, {
        width: '100%',
        duration: 1.4,
        ease: 'power2.inOut',
        onComplete: () => {
          mask.style.transition = '';
          mask.classList.add('show');
          gsap.set(mask, { clearProps: 'width' });
        },
      }, 0);

      if (digits.length) {
        tl404.to(digits, {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.7,
          ease: 'back.out(1.4)',
          stagger: 0.15,
          onComplete: () => {
            gsap.set(digits, { clearProps: 'y,scale' });
            digits.forEach((d) => {
              (d as HTMLElement).style.removeProperty('opacity');
            });
          },
        }, 0.3);
      }

      if (paragrafo) {
        tl404.to(paragrafo, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power2.out',
          onComplete: () => {
            gsap.set(paragrafo, { clearProps: 'opacity,y' });
          },
        }, 0.75);
      }
    });
  }
}
