import { OffsetData } from "./IOffsetData.interface";
import * as THREE from 'three';

export interface GroupUserData {
  rotationSpeed: number; // velocità di rotazione
  offsets: OffsetData[]; // array di dati di oscillazione
  originalPositions: THREE.Vector3[]; //ricordo posizione iniziale per ritornare al posto di origine, dopo che il mouse è passato altrove
}
