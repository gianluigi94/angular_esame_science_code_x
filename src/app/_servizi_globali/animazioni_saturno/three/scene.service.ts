// servizio per definire la scena threeJs

import { Injectable } from '@angular/core';
import * as THREE from 'three';

@Injectable({
  providedIn: 'root',
})
export class SceneService {
  private size = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;

  constructor() {
    // Scena
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      55,
      this.size.width / this.size.height,
      0.1,
      10
    );
    this.camera.position.set(0, 0.45, 7);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true, // linee morbide
      alpha: true,
    });
    this.renderer.setSize(this.size.width, this.size.height); //disegna lo spazio 3D su tutto lo schermo
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // si adegua alla densità di pixel dello schermo, ma massimo 2
    this.renderer.setClearColor(0x000000, 0); //canvas di colore nero



    // Forza una prima configurazione
    this.handleResize();

    // Ascolto eventi di resize
    window.addEventListener('resize', () => this.handleResize());

  }

  /**
   * handleResize:
   * - Aggiorna sempre la camera.aspect e le dimensioni del renderer (per non deformare la scena).
   */
  private handleResize(): void {
    setTimeout(() => {
      this.size.width = window.innerWidth;
      this.size.height = window.innerHeight;

      //  Aggiorna camera
      const aspectRatio = this.size.width / this.size.height;
      this.camera.aspect = aspectRatio;
      this.camera.updateProjectionMatrix();

      //  Aggiorna renderer
      this.renderer.setSize(this.size.width, this.size.height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      //  Check orientamento più affidabile su iPhone
      const isMobileLandscape =
        this.size.width > this.size.height &&
        this.size.width / this.size.height >= 1.4 &&
        this.size.width <= 1024;

        // per schermi in orizontale
      const isDesktopLandscape =
        this.size.width > this.size.height &&
        this.size.width / this.size.height >= 1.4 &&
        this.size.width > 1024;

        // cambio su dispositivi mobili in orizontale
      if (!isMobileLandscape && !isDesktopLandscape) {

        this.camera.fov = 55; // cambio vicinanza camera
        this.camera.updateProjectionMatrix();

        // cambio camera sull'asse z al cambio di dimensioni schermo (cambio dinamico)
        if (this.size.width <= 500) {
          this.camera.position.z = 5;
        } else if (this.size.width <= 1000) {
          this.camera.position.z = 4.4;
        } else {
          this.camera.position.z = 4;
        }

        if (this.size.width <= 950) {
          this.camera.lookAt(-0.18, 0, 0);
        } else {
          this.camera.lookAt(-0.09, 0, 0);
        }
      } else if (isMobileLandscape) {
        // LANDSCAPE su dispositivi mobili
        this.camera.fov = 50;
        this.camera.updateProjectionMatrix();

        // Avvicino la camera solo su dispositivi mobili
        this.camera.position.z = 3.1;
        this.camera.lookAt(0, 0, 0);
      } else if (isDesktopLandscape) {
        // LANDSCAPE su PC e schermi grandi
        this.camera.fov = 51;
        this.camera.updateProjectionMatrix();

        // Imposto un valore diverso su PC
        this.camera.position.z = 3.8;
        this.camera.lookAt(0, 0, 0);
      }
    }, 200); // Ritardo per evitare problemi su iPhone
  }



  /**
   * animate():
   * Esegue qui il rendering continuo.
   */
  public animate(): void {
    // Esempio di loop
    requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
  }
}
