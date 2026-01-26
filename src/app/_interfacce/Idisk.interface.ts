import * as THREE from 'three';

export interface Disk {
  mesh: THREE.Mesh<THREE.RingGeometry, THREE.Material | THREE.Material[]>;
  speed: number;
}
