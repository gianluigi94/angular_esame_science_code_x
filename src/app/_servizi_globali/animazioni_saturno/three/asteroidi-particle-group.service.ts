// in questo codice definisco la logica usata per la creazione dei gruppi di particelle. Queste particelle saranno formate dalla forma geometrica e dal materiale, definiti negli altri servizzi per la costruzione degli asteroidi

import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { AsteroidiMaterialService } from './asteroidi-material.service';
import { AsteroidiGeometriesService } from './asteroidi-geometries.service';
import {
  ParticleGroupOptions,
  OffsetData,
  ParticleUserData,
  GroupUserData,
} from 'src/app/_interfacce/saturno.interfacce';

@Injectable({
  providedIn: 'root',
})
// materiali e geometrie
export class AsteroidiParticleGroupService {
  constructor(
    private materialService: AsteroidiMaterialService,
    private geometriesService: AsteroidiGeometriesService
  ) {}

  // Funzione per creare il gruppo di particelle
  public createParticleGroup({
    innerRadius,
    outerRadius,
    particleCount,
    color,
    size,
    rotationSpeed,
  }: ParticleGroupOptions): THREE.Group {
    const group = new THREE.Group();
    group.position.y = 0.45; //altezza del disco
    group.rotation.x = THREE.MathUtils.degToRad(8.5); // inclinazione dei gruppi di particelle

    const offsets: OffsetData[] = []; //racolta dati
    const originalPositions: THREE.Vector3[] = []; //posizione originale

    // Ottengo le tre geometrie disponibili
    const possibleGeometries = this.geometriesService.getPossibleGeometries();

    // Ottengo il materiale base (già pronto)
    const baseMaterial = this.materialService.getBaseMaterial();

    for (let i = 0; i < particleCount; i++) {
      // Generazione della posizione casuale sul piano (anello)
      const angle = Math.random() * Math.PI * 2;
      const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
      const posX = radius * Math.cos(angle);
      const posZ = radius * Math.sin(angle);

      // Scelta casuale di una delle tre geometrie disponibili per ogni singolo meteorite + deformazione casuale per unicità
      const randomGeomIndex = Math.floor(Math.random() * possibleGeometries.length);
      const chosenGeometry = possibleGeometries[randomGeomIndex];

      // Clono il materiale base e imposto il colore
      const material = baseMaterial.clone();
      material.color = new THREE.Color(color);

      // Creazione della singola particella (mesh)
      const particle = new THREE.Mesh(chosenGeometry, material);
      particle.position.set(posX, 0, posZ);
      particle.scale.setScalar(size * (0.8 + Math.random() * 0.4)); //scala casuale
      particle.rotation.set( //rotazione della posizione casuale per effetto spaziale realistico
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );

      group.add(particle);
      originalPositions.push(particle.position.clone());

      // Creazione dei dati di offset (per oscillazioni)
      offsets.push({
        timeOffset: Math.random() * 100,
        freqX: 0.2 + Math.random() * 0.4,
        freqY: 0.2 + Math.random() * 0.4,
        freqZ: 0.2 + Math.random() * 0.4,
        ampX: 0.023 + Math.random() * 0.005,
        ampY: 0.0013 + Math.random() * 0.003,
        ampZ: 0.003 + Math.random() * 0.005,
      });

      // Dati aggiuntivi per la particella da ferma
      particle.userData = <ParticleUserData>{
        state: 'idle',
        originalY: particle.position.y,
        targetY: 0,
      };
    }

    // Aggiunta dei dati al group
    group.userData = <GroupUserData>{
      rotationSpeed: rotationSpeed,
      offsets: offsets,
      originalPositions: originalPositions,
    };

    return group;
  }
}
