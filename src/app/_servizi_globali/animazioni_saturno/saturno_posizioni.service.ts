import { Injectable } from '@angular/core';
import * as THREE from 'three';

export type SaturnoStatoChiave =
  | 'WELCOME_ALTO'   // posizione centrale, pagina benvenuto in alto
  | 'WELCOME_BASSO'  // posizione bassa, pagina benvenuto dopo lo scroll
  | 'CATALOGO_NASCOSTO'
  | 'LOGIN_LATERALE'; // nuova posizione laterale per /login


export interface SaturnoPoseConfig {
  position: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number }; // in radianti
}

@Injectable({ providedIn: 'root' })
export class SaturnoPosizioniService {
  // ✅ qui centralizziamo le pose "canoniche"
  private poseMap: Record<SaturnoStatoChiave, SaturnoPoseConfig> = {
     WELCOME_ALTO: {
      // stato "centrale" iniziale (come lo hai ora in saturno.service)
      position: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      rotation: {
        x: THREE.MathUtils.degToRad(1),
        y: THREE.MathUtils.degToRad(1),
        z: THREE.MathUtils.degToRad(15),
      },
    },

    WELCOME_BASSO: {

      position: { x: 3.1, y: -3.4, z: 0 },
      scale: { x: 3.8, y: 3.8, z: 3.8 },
      rotation: {
        x: THREE.MathUtils.degToRad(1),
        y: THREE.MathUtils.degToRad(41),
        z: THREE.MathUtils.degToRad(-28),
      },
    },

  LOGIN_LATERALE: {
      position: { x: -1.5, y: -0.3, z: 0.25 },
      scale: { x: 1.4 , y: 1.2, z: 1.2 },
      rotation: {
        x: THREE.MathUtils.degToRad(-10),
        y: THREE.MathUtils.degToRad(150),
        z: THREE.MathUtils.degToRad(19),
      },
    },
    CATALOGO_NASCOSTO: {
      position: { x: 4.8, y: -3, z: 0.25 },
      scale: { x: 0.01 , y: 0.01, z: 0.01 },
      rotation: {
        x: THREE.MathUtils.degToRad(-10),
        y: THREE.MathUtils.degToRad(150),
        z: THREE.MathUtils.degToRad(19),
      },
    },
  };

  public getPose(stato: SaturnoStatoChiave): SaturnoPoseConfig {
    return this.poseMap[stato];
  }

  // Helper comodo: applica subito la pose a una scena Three.js
  public applicaPoseAScena(scene: THREE.Scene, stato: SaturnoStatoChiave): void {
    const pose = this.poseMap[stato];
    scene.position.set(pose.position.x, pose.position.y, pose.position.z);
    scene.scale.set(pose.scale.x, pose.scale.y, pose.scale.z);
    scene.rotation.set(pose.rotation.x, pose.rotation.y, pose.rotation.z);
  }
}

