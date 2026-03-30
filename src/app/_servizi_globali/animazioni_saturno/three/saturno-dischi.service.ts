// Service che crea i dischi di Saturno usando gli shader condivisi e il servizio dedicato.

import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { DiskService } from './disk.service';
import { vertexShader, fragmentShader } from './saturno-shaders';

@Injectable({ providedIn: 'root' })
export class SaturnoDischiService {
  constructor(private diskService: DiskService) {}

  /**
   * Crea tutti i dischi di Saturno e li aggiunge alla scena.
   *
   * @param scene Scena Three.js in cui inserire i dischi.
   * @returns void
   */
  public creaDischi(scene: THREE.Scene): void {
    this.diskService.createDisk(scene, vertexShader, fragmentShader, 1.17,  1.305, 0xffffff, 0.18,  true, true,  0.01,  0);
    this.diskService.createDisk(scene, vertexShader, fragmentShader, 1.245, 1.27,  0xffffff, 0.45,  true, true,  0.03,  0);
    this.diskService.createDisk(scene, vertexShader, fragmentShader, 1.27,  1.49,  0xfffee9, 0.55,  true, true,  -0.01, 0);
    this.diskService.createDisk(scene, vertexShader, fragmentShader, 1.34,  1.39,  0xfffee9, 0.65,  true, true,  0.01,  0);
    this.diskService.createDisk(scene, vertexShader, fragmentShader, 1.54,  1.74,  0xffffff, 0.05,  true, true,  -0.01, 0);
    this.diskService.createDisk(scene, vertexShader, fragmentShader, 1.57,  1.97,  0xfff4e9, 0.25,  true, true,  0.01,  0);
    this.diskService.createDisk(scene, vertexShader, fragmentShader, 1.715, 1.799, 0xfff4e9, 0.25,  true, true,  0.03,  0);
    this.diskService.createDisk(scene, vertexShader, fragmentShader, 1.9,   2.17,  0xffffff, 0.055, true, false, 0.03,  0);
  }
}
