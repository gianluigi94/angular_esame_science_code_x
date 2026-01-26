export interface ParticleUserData {
  state: 'idle' | 'hover'; // i due stati possibili, particella a riposo, o particella 'spostata' dal movimento del mouse
  originalY: number; // posizione asse y a riposo
  targetY: number; // posizione asse y sollecitata dal passaggio mouse
}
