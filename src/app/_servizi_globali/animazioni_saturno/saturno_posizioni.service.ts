// Service che centralizza le pose canoniche di Saturno e permette di applicarle alla scena.

import { Injectable } from '@angular/core';
import * as THREE from 'three';

export type SaturnoStatoChiave =
  | 'WELCOME_ALTO'
  | 'WELCOME_BASSO'
  | 'REGISTRAZIONE_BASSO'
  | 'CATALOGO_NASCOSTO'
  | 'CATALOGO_NASCOSTO_DUE'
  | 'LOGIN_LATERALE';

export interface SaturnoPoseConfig {
  position: { x: number; y: number; z: number }; // definisco la posizione 3D della posa
  scale: { x: number; y: number; z: number }; // definisco la scala 3D della posa
  rotation: { x: number; y: number; z: number }; // definisco la rotazione 3D della posa in radianti
}

@Injectable({ providedIn: 'root' })
export class SaturnoPosizioniService {
  private poseMap: Record<SaturnoStatoChiave, SaturnoPoseConfig> = { // centralizzo tutte le pose canoniche di Saturno in una mappa indicizzata per chiave
    WELCOME_ALTO: {
      position: { x: 0, y: 0, z: 0 }, // imposto la posizione della posa alta iniziale
      scale: { x: 1, y: 1, z: 1 }, // imposto la scala unitaria della posa alta iniziale
      rotation: {
        x: THREE.MathUtils.degToRad(1), // imposto la rotazione x della posa alta convertendo i gradi in radianti
        y: THREE.MathUtils.degToRad(1), // imposto la rotazione y della posa alta convertendo i gradi in radianti
        z: THREE.MathUtils.degToRad(15), // imposto la rotazione z della posa alta convertendo i gradi in radianti
      },
    },

    WELCOME_BASSO: {
      position: { x: 3.1, y: -3.4, z: 0 }, // imposto la posizione della posa bassa welcome
      scale: { x: 3.8, y: 3.8, z: 3.8 }, // imposto la scala della posa bassa welcome
      rotation: {
        x: THREE.MathUtils.degToRad(1), // imposto la rotazione x della posa bassa welcome
        y: THREE.MathUtils.degToRad(41), // imposto la rotazione y della posa bassa welcome
        z: THREE.MathUtils.degToRad(-28), // imposto la rotazione z della posa bassa welcome
      },
    },

    REGISTRAZIONE_BASSO: {
      position: { x: 3.04, y: -4.11, z: 0 }, // imposto la posizione della posa bassa registrazione
      scale: { x: 3.8, y: 3.8, z: 3.8 }, // imposto la scala della posa bassa registrazione
      rotation: {
        x: THREE.MathUtils.degToRad(1), // imposto la rotazione x della posa bassa registrazione
        y: THREE.MathUtils.degToRad(41), // imposto la rotazione y della posa bassa registrazione
        z: THREE.MathUtils.degToRad(-28), // imposto la rotazione z della posa bassa registrazione
      },
    },

    LOGIN_LATERALE: {
      position: { x: -1.5, y: -0.3, z: 0.25 }, // imposto la posizione della posa laterale login
      scale: { x: 1.4, y: 1.2, z: 1.2 }, // imposto la scala della posa laterale login
      rotation: {
        x: THREE.MathUtils.degToRad(-10), // imposto la rotazione x della posa laterale login
        y: THREE.MathUtils.degToRad(150), // imposto la rotazione y della posa laterale login
        z: THREE.MathUtils.degToRad(19), // imposto la rotazione z della posa laterale login
      },
    },

    CATALOGO_NASCOSTO_DUE: {
      position: { x: 7.9, y: -7.8, z: 3.25 }, // imposto la posizione della posa catalogo nascosto
      scale: { x: 3.8, y: 3.8, z: 3.8 },
      rotation: {

         x: THREE.MathUtils.degToRad(10), // imposto la rotazione x della posa alta convertendo i gradi in radianti
        y: THREE.MathUtils.degToRad(-300), // imposto la rotazione y della posa alta convertendo i gradi in radianti
        z: THREE.MathUtils.degToRad(-5), // imposto la rotazione z della posa alta convertendo i gradi in radianti
      },
    },
    CATALOGO_NASCOSTO: {
      position: { x: 3, y: -2, z: 0.25 }, // imposto la posizione della posa catalogo nascosto
      scale: { x: 0.01, y: 0.01, z: 0.01 }, // imposto la scala quasi nulla della posa catalogo nascosto
      rotation: {
        x: THREE.MathUtils.degToRad(-10), // imposto la rotazione x della posa catalogo nascosto
        y: THREE.MathUtils.degToRad(150), // imposto la rotazione y della posa catalogo nascosto
        z: THREE.MathUtils.degToRad(19), // imposto la rotazione z della posa catalogo nascosto
      },
    },
  };

  /**
   * Restituisce la configurazione della posa associata allo stato richiesto.
   *
   * @param stato Chiave dello stato di Saturno.
   * @returns SaturnoPoseConfig
   */
  public getPose(stato: SaturnoStatoChiave): SaturnoPoseConfig {
    return this.poseMap[stato]; // restituisco la posa corrispondente alla chiave richiesta
  }

  /**
   * Applica immediatamente una posa a una scena Three.js.
   *
   * @param scene Scena Three.js a cui applicare la posa.
   * @param stato Chiave dello stato di Saturno da applicare.
   * @returns void
   */
  public applicaPoseAScena(scene: THREE.Scene, stato: SaturnoStatoChiave): void {
    const pose = this.poseMap[stato]; // recupero la posa corrispondente allo stato richiesto
    scene.position.set(pose.position.x, pose.position.y, pose.position.z); // applico la posizione della posa alla scena
    scene.scale.set(pose.scale.x, pose.scale.y, pose.scale.z); // applico la scala della posa alla scena
    scene.rotation.set(pose.rotation.x, pose.rotation.y, pose.rotation.z); // applico la rotazione della posa alla scena
  }
}
