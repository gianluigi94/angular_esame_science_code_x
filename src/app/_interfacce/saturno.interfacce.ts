import * as THREE from 'three';

export interface ParticleGroupOptions {
  innerRadius:   number;
  outerRadius:   number;
  particleCount: number;
  color:         string | number;
  size:          number;
  rotationSpeed: number;
}

export interface OffsetData {
  timeOffset: number;
  freqX: number; freqY: number; freqZ: number;
  ampX:  number; ampY:  number; ampZ:  number;
}

export interface ParticleUserData {
  state:     'idle' | 'hover';
  originalY: number;
  targetY:   number;
}

export interface GroupUserData {
  rotationSpeed:     number;
  offsets:           OffsetData[];
  originalPositions: THREE.Vector3[];
}

export interface Disk {
  mesh:  THREE.Mesh<THREE.RingGeometry, THREE.Material | THREE.Material[]>;
  speed: number;
}
