import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { DiskService } from './disk.service';
import { vertexShader, fragmentShader } from './saturno-shaders';

@Injectable({ providedIn: 'root' })
export class SaturnoDischiService {
  constructor(private diskService: DiskService) {}

  public creaDischi(scene: THREE.Scene): void {
    this.diskService.createDisk(scene, vertexShader, fragmentShader, 1.17,  1.305, 0xffffff, 0.18,  true, true,  0.01,  0);
    this.diskService.createDisk(scene, vertexShader, fragmentShader, 1.245, 1.27,  0xffffff, 0.45,  true, true,  0.03,  0);
    this.diskService.createDisk(scene, vertexShader, fragmentShader, 1.27,  1.49,  0xfffee9, 0.55,  true, true,  -0.01, 0);
    this.diskService.createDisk(scene, vertexShader, fragmentShader, 1.34,  1.39,  0xfffee9, 0.65,  true, true,  0.01,  0); //piccolo
    this.diskService.createDisk(scene, vertexShader, fragmentShader, 1.54,  1.74,  0xffffff, 0.05,  true, true,  -0.01, 0);
    this.diskService.createDisk(scene, vertexShader, fragmentShader, 1.57,  1.97,  0xfff4e9, 0.25,  true, true,  0.01,  0);
    this.diskService.createDisk(scene, vertexShader, fragmentShader, 1.715, 1.799, 0xfff4e9, 0.25,  true, true,  0.03,  0); //piccolo
    this.diskService.createDisk(scene, vertexShader, fragmentShader, 1.9,   2.17,  0xffffff, 0.055, true, false, 0.03,  0);
  }
}
