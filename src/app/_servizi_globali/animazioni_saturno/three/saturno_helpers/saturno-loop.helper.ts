// Helper che gestisce il loop di rendering a FPS fissi e l'aggiornamento continuo della scena di Saturno.

import { NgZone } from '@angular/core';
import * as THREE from 'three';
import { DiskService } from '../disk.service';
import { SaturnoStatoService } from '../../saturno-stato.service';
import { SaturnoMouseHelper } from './saturno-mouse.helper';

export class SaturnoLoopHelper {
  private animInterval: any = null; // conservo il riferimento all'intervallo del loop di rendering
  private lastTime = 0; // conservo l'ultimo timestamp usato per calcolare il delta time
  private firstRenderDone = false; // tengo traccia se il primo render e' gia' stato completato

  constructor(
    private ngZone: NgZone,
    private diskService: DiskService,
    private saturnoStatoService: SaturnoStatoService,
    private mouseHelper: SaturnoMouseHelper,
    private getPlanetMesh: () => THREE.Mesh | null,
    private getParticleGroups: () => THREE.Group[],
    private getCamera: () => THREE.Camera | null,
  ) {}

  /**
   * Avvia il loop di rendering a FPS fissi.
   *
   * @param scene Scena Three.js da renderizzare.
   * @param camera Camera Three.js attiva.
   * @param renderer Renderer WebGL usato per il render.
   * @returns void
   */
  start(
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
  ): void {
    this.lastTime = performance.now(); // salvo il timestamp iniziale del loop
    if (this.animInterval) clearInterval(this.animInterval); // interrompo un eventuale intervallo gia' attivo

    this.ngZone.runOutsideAngular(() => {
      // eseguo il loop fuori da Angular
      this.animInterval = setInterval(() => {
        // avvio l'intervallo fisso a 60 FPS
        const now = performance.now(); // leggo il timestamp corrente
        const deltaTime = (now - this.lastTime) / 1000; // calcolo il delta time in secondi
        this.lastTime = now; // aggiorno l'ultimo timestamp salvato
        this.renderAndUpdate(scene, camera, renderer, deltaTime); // eseguo render e aggiornamento della scena
      }, 1000 / 60);
    });
  }

  /**
   * Ferma il loop di rendering attivo.
   *
   * @returns void
   */
  stop(): void {
    if (this.animInterval) {
      // controllo se esiste un intervallo attivo
      clearInterval(this.animInterval); // interrompo l'intervallo del loop
      this.animInterval = null; // azzero il riferimento all'intervallo
    }
  }

  /**
   * Reimposta il flag del primo render.
   *
   * @returns void
   */
  resetFirstRender(): void {
    this.firstRenderDone = false; // segno che il primo render dovra' essere considerato di nuovo non eseguito
  }

  /**
   * Esegue il render della scena e aggiorna gli elementi animati.
   *
   * @param scene Scena Three.js da renderizzare.
   * @param camera Camera Three.js attiva.
   * @param renderer Renderer WebGL usato per il render.
   * @param deltaTime Tempo trascorso dall'ultimo frame in secondi.
   * @returns void
   */
  private renderAndUpdate(
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    deltaTime: number,
  ): void {
    renderer.render(scene, camera); // renderizzo la scena con la camera corrente

    if (!this.firstRenderDone) {
      // controllo se questo e' il primo render completato
      this.firstRenderDone = true; // segno che il primo render e' stato eseguito
      this.saturnoStatoService.setPronto(); // notifico che Saturno e' pronto
    }

    const planetMesh = this.getPlanetMesh(); // recupero il riferimento alla mesh del pianeta
    if (planetMesh) {
      // controllo se la mesh del pianeta esiste
      planetMesh.rotation.y += 0.004 * deltaTime * 60; // aggiorno la rotazione del pianeta in base al delta time
    }

    this.diskService.animateDisks(deltaTime); // aggiorno l'animazione dei dischi

    const cam = this.getCamera(); // recupero la camera corrente tramite helper
    if (cam) {
      // controllo se la camera esiste
      this.getParticleGroups().forEach((group) => {
        // scorro tutti i gruppi particellari
        this.mouseHelper.animateGroup(group, cam); // aggiorno il gruppo in base al comportamento del mouse
        group.rotation.y += group.userData['rotationSpeed'] * deltaTime * 60; // aggiorno la rotazione del gruppo in base alla sua velocita'
      });
    }
  }
}
