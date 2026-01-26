//servizio threeJs per creazione del materiale degli asteroidi della scena

import { Injectable } from '@angular/core';
import * as THREE from 'three';

@Injectable({
  providedIn: 'root',
})
export class AsteroidiMaterialService {

  private texturePath: string = 'assets/texture/'; //la rotta da cui prendere le texture

  // Campi in cui memorizzo le texture caricate
  private rockTexture!: THREE.Texture;  // roccia.jpg
  private normalMap!: THREE.Texture;    // aomap.png (usato come normal)
  private aoMap!: THREE.Texture;        // aomap.png

  // Flag per sapere se sono già state caricate
  private texturesLoaded: boolean = false;

  /**
   * Carica tutte le texture necessarie agli asteroidi.
   * Restituisce una Promise che si risolve quando TUTTE le texture sono caricate.
   */
  public loadAllTextures(): Promise<void> {
    if (this.texturesLoaded) {
      // Se già caricate in precedenza, restituisco una promise risolta.
      return Promise.resolve();
    }

    const textureLoader = new THREE.TextureLoader(); //definisco la texture di three.js

    // Array di Promise per le singole texture
    const promises: Promise<THREE.Texture>[] = [];

    // Helper per creare una promise di caricamento texture
    const loadTexture = (fileName: string): Promise<THREE.Texture> => {
      return new Promise((resolve, reject) => {
        textureLoader.load(
          this.texturePath + fileName, // load mi da path + nome
          (tex) => resolve(tex), // se è ok
          undefined,
          (err) => reject(err) //errore
        );
      });
    };

    // Aggiungo le promesse per le 3 texture
    promises.push(loadTexture('roccia.webp'));
    promises.push(loadTexture('aomap.webp'));
    promises.push(loadTexture('aomap.webp'));

    // Attendo che tutte siano risolte
    return Promise.all(promises).then(([rockTex, normalTex, aoTex]) => {
      this.rockTexture = rockTex;
      this.normalMap = normalTex;
      this.aoMap = aoTex;

      this.texturesLoaded = true;
    });
  }

  /**
   * Restituisce un materiale  che lo userò per tutti gli asteroidi.
   */
  public getBaseMaterial(): THREE.MeshPhysicalMaterial {

    const mat = new THREE.MeshPhysicalMaterial({
      map: this.rockTexture,
      normalMap: this.normalMap,
      roughness: 10.3,
      metalness: 0.1,
      normalScale: new THREE.Vector2(2, 2),
      aoMap: this.aoMap,
      aoMapIntensity: 1.5,
    });
    return mat;
  }
}
