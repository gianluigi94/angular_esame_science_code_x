// servizio che gestisci i 'dischi di luce' su cui flutano gli asteroidi di saturno
import { Injectable } from '@angular/core';
import * as THREE from 'three';

// Definizione del tipo per i dischi
export interface Disk {
  mesh: THREE.Mesh<THREE.RingGeometry, THREE.Material | THREE.Material[]>; //definizione della mesh (geometria + materiale)
  speed: number; //eventuale velocità dei dischi di luce nel roteare
}

@Injectable({
  providedIn: 'root',
})
export class DiskService {
  private disks: Disk[] = []; //array di dischi

  // Metodo per creare un disco
  public createDisk(
    scene: THREE.Scene,
    vertexShader: string,
    fragmentShader: string,
    innerRadius: number,
    outerRadius: number,
    color: string | number,
    opacity: number,
    useShader: boolean,
    invertGradient: boolean,
    zOffset: number = 0,
    rotationSpeed: number = 0.001,
    thetaStart: number = 0,
    thetaLength: number = Math.PI * 2
  ): THREE.Mesh {
    // Creazione della geometria
    const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 184, 1, thetaStart, thetaLength);

    // Definizione del materiale
    let material: THREE.Material;
    if (useShader) {
      material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uInnerRadius: { value: innerRadius },
          uOuterRadius: { value: outerRadius },
          uColor: { value: new THREE.Color(color) },
          uOpacity: { value: opacity },
          uInvertGradient: { value: invertGradient },
        },
        transparent: true,
        side: THREE.DoubleSide,
      });
    } else {
      material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: opacity,
        side: THREE.DoubleSide,
      });
    }

    // Creazione del disco
    const disk = new THREE.Mesh(geometry, material);
    disk.rotation.x = THREE.MathUtils.degToRad(99); // Inclinazione del disco
    disk.position.z = zOffset; // Posizionamento sull'asse Z
    // disk.position.y = 0.75
    disk.position.y = 0.45
    scene.add(disk);

    // Memorizzazione del disco e della velocità
    this.disks.push({ mesh: disk, speed: rotationSpeed });

    return disk;
  }

  // Metodo per ottenere l'array dei dischi
  public getDisks(): Disk[] {
    return this.disks;
  }

  public clearDisks(): void {
    this.disks = [];
  }

  // Metodo per animare i dischi
  public animateDisks(deltaTime: number) {
  this.disks.forEach(({ mesh, speed }) => {
    mesh.rotation.z += speed; // Ruota il disco in base alla sua eventuale velocità
  });
}

}
