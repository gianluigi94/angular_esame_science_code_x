export interface ParticleGroupOptions {
  innerRadius: number; // raggio iniziale del disco con buco (dove inizia)
  outerRadius: number; // raggio finale del disco con buco (dove finisce)
  particleCount: number; // numero di particelle di un gruppo specifico
  color: string | number; // color delle particelle di un gruppo specifico
  size: number; //dimensione delle pariticelle di un gruppo specifico
  rotationSpeed: number; // velocità rotazione del gruppo specifico
}
