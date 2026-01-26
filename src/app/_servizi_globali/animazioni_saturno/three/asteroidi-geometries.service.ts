//servizio threeJs per creazione dele tre forme per gli asteroidi della scena

import { Injectable } from '@angular/core';
import * as THREE from 'three';

export type GeometryType = THREE.DodecahedronGeometry; //geometria

@Injectable({
  providedIn: 'root',
})
export class AsteroidiGeometriesService {
  // forma geometrica da cui partiranno
  private geometryStandard: GeometryType = new THREE.DodecahedronGeometry(0.02, 0);

  // Funzione per creare una geometria scalata
  private createScaledGeometry(
    baseGeometry: GeometryType,
    scaleX: number,
    scaleY: number,
    scaleZ: number
  ): GeometryType {
    const geometry = baseGeometry.clone();
    geometry.scale(scaleX, scaleY, scaleZ);
    return geometry;
  }

  // Getter per ottenere le geometrie possibili in un arrey (un asteroide avrà casualmente una di queste tre forme)
  public getPossibleGeometries(): GeometryType[] {
    const geometryVertical = this.createScaledGeometry(this.geometryStandard, 1, 1.5, 1);
    const geometryHorizontal = this.createScaledGeometry(this.geometryStandard, 1.7, 0.4, 1.6);

    return [
      this.geometryStandard, //asteroide normale
      geometryVertical, //asteroide sviluppato in verticale
      geometryHorizontal, //asteroide sviluppato in orizontale
    ];
  }
}
