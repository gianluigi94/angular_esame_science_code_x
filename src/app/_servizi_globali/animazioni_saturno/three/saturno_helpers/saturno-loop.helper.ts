// Gestisce il loop di rendering a FPS fissi e l'aggiornamento della scena.
// Estratto da saturno.service.ts

import { NgZone }    from '@angular/core';
import * as THREE    from 'three';
import { DiskService } from '../disk.service';
import { SaturnoStatoService } from '../../saturno-stato.service';
import { SaturnoMouseHelper } from './saturno-mouse.helper';

export class SaturnoLoopHelper {

  private animInterval: any  = null;
  private lastTime           = 0;
  private firstRenderDone    = false;

  constructor(
    private ngZone:              NgZone,
    private diskService:         DiskService,
    private saturnoStatoService: SaturnoStatoService,
    private mouseHelper:         SaturnoMouseHelper,
    private getPlanetMesh:       () => THREE.Mesh | null,
    private getParticleGroups:   () => THREE.Group[],
    private getCamera:           () => THREE.Camera | null,
  ) {}

  // ── Estratto da startFixedFPSLoop() ──────────────────────────────────────
  start(
    scene:    THREE.Scene,
    camera:   THREE.Camera,
    renderer: THREE.WebGLRenderer,
  ): void {
    this.lastTime = performance.now();
    if (this.animInterval) clearInterval(this.animInterval);

    this.ngZone.runOutsideAngular(() => {
      this.animInterval = setInterval(() => {
        const now       = performance.now();
        const deltaTime = (now - this.lastTime) / 1000;
        this.lastTime   = now;
        this.renderAndUpdate(scene, camera, renderer, deltaTime);
      }, 1000 / 60);
    });
  }

  // ── Estratto da spegniSaturno() (solo la parte loop) ─────────────────────
  stop(): void {
    if (this.animInterval) {
      clearInterval(this.animInterval);
      this.animInterval = null;
    }
  }

  resetFirstRender(): void {
    this.firstRenderDone = false;
  }

  // ── Estratto da renderAndUpdate() ────────────────────────────────────────
  private renderAndUpdate(
    scene:    THREE.Scene,
    camera:   THREE.Camera,
    renderer: THREE.WebGLRenderer,
    deltaTime: number,
  ): void {
    renderer.render(scene, camera);

    if (!this.firstRenderDone) {
      this.firstRenderDone = true;
      this.saturnoStatoService.setPronto();
    }

    const planetMesh = this.getPlanetMesh();
    if (planetMesh) {
      planetMesh.rotation.y += 0.004 * deltaTime * 60;
    }

    this.diskService.animateDisks(deltaTime);

    const cam = this.getCamera();
    if (cam) {
      this.getParticleGroups().forEach((group) => {
        this.mouseHelper.animateGroup(group, cam);
        group.rotation.y += group.userData['rotationSpeed'] * deltaTime * 60;
      });
    }
  }
}
