import { Injectable } from '@angular/core';
import gsap from 'gsap';
import * as THREE from 'three';
import {
  SaturnoPosizioniService,
  SaturnoStatoChiave,
} from '../saturno_posizioni.service';

@Injectable({ providedIn: 'root' })
export class SaturnoRouteAnimazioniService {

  constructor(private saturnoPosizioniService: SaturnoPosizioniService) {}

public animaVerso(
  scene: THREE.Scene,
  stato: SaturnoStatoChiave,
  durata: number = 0.9,
  light?: THREE.DirectionalLight,
  onComplete?: () => void
): void {
  const pose = this.saturnoPosizioniService.getPose(stato);
  const isFromBasso = scene.scale.x > 2.5;

  const durataAnim =
    stato === 'LOGIN_LATERALE' && isFromBasso ? durata + 0.4 : durata;

  const tl = gsap.timeline({
    onComplete: () => {
      if (onComplete) {
        onComplete();
      }
    },
  });

  // POSIZIONE
  if (stato === 'CATALOGO_NASCOSTO') {
    // movimento curvo (tipo parabola) verso CATALOGO_NASCOSTO
    const startPos = {
      x: scene.position.x,
      y: scene.position.y,
      z: scene.position.z,
    };
    const endPos = pose.position;

    // punto di controllo più in alto per creare l'arco
    const controlPos = {
      x: (startPos.x + endPos.x) / 2,
      y: startPos.y + 0.2, // alza/abbassa questo per cambiare la curvatura
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

          // interpolazione quadratica (bezier)
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
    // tutti gli altri stati: interpolazione lineare come prima
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

  // SCALA (come prima)
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

  // ROTAZIONE (come prima)
  if (stato === 'LOGIN_LATERALE' && isFromBasso) {
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

  // LUCE (come prima)
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
}
