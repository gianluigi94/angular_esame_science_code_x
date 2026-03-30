// Helper che gestisce il listener del mouse e l'animazione hover delle particelle di Saturno.

import * as THREE from 'three';

export class SaturnoMouseHelper {
  private raycaster = new THREE.Raycaster(); // conservo il raycaster usato per proiettare il mouse nella scena
  readonly mouse = new THREE.Vector2(9999, 9999); // conservo la posizione normalizzata del mouse inizialmente fuori scena

  private gestoreMouseMove: ((event: MouseEvent) => void) | null = null; // conservo il riferimento al listener del mousemove

  /**
   * Attiva il listener del mouse aggiornando la posizione normalizzata del puntatore.
   *
   * @returns void
   */
  attivaHoverMouse(): void {
    if (this.gestoreMouseMove) {
      // controllo se esiste gia' un listener registrato
      window.removeEventListener('mousemove', this.gestoreMouseMove); // rimuovo il vecchio listener prima di registrarne uno nuovo
    }
    this.gestoreMouseMove = (event: MouseEvent) => {
      // preparo il nuovo listener del movimento mouse
      const correctedY = event.clientY + 150; // correggo la coordinata y con l'offset usato dal layout
      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1; // trasformo la coordinata x in spazio normalizzato WebGL
      this.mouse.y = -(correctedY / window.innerHeight) * 2 + 1; // trasformo la coordinata y corretta in spazio normalizzato WebGL
    };
    window.addEventListener('mousemove', this.gestoreMouseMove); // registro il listener del mousemove sulla finestra
  }

  /**
   * Rimuove il listener del mouse precedentemente registrato.
   *
   * @returns void
   */
  rimuoviHoverMouse(): void {
    if (this.gestoreMouseMove) {
      // controllo se esiste un listener registrato
      window.removeEventListener('mousemove', this.gestoreMouseMove); // rimuovo il listener del mousemove dalla finestra
      this.gestoreMouseMove = null; // azzero il riferimento al listener
    }
  }

  /**
   * Aggiorna un gruppo di particelle applicando floating e comportamento hover.
   *
   * @param group Gruppo Three.js contenente le particelle.
   * @param camera Camera Three.js usata per i calcoli di proiezione e distanza.
   * @returns void
   */
  animateGroup(group: THREE.Group, camera: THREE.Camera): void {
    const offsets = group.userData['offsets']; // recupero gli offset di floating associati al gruppo
    const originalPositions = group.userData[
      'originalPositions'
    ] as THREE.Vector3[]; // recupero le posizioni originali delle particelle
    const time = performance.now() * 0.001; // calcolo il tempo corrente in secondi per le oscillazioni

    this.raycaster.setFromCamera(this.mouse, camera); // aggiorno il raycaster usando il mouse e la camera correnti

    const approachInThreshold = 0.1; // definisco la soglia di ingresso nello stato hover
    const approachOutThreshold = 0.13; // definisco la soglia di uscita dallo stato hover

    group.children.forEach((particle: THREE.Object3D, i: number) => {
      // scorro tutte le particelle del gruppo con il relativo indice
      const data = particle.userData; // recupero i dati custom associati alla particella
      const off = offsets[i]; // recupero gli offset di floating della particella corrente
      const origPos = originalPositions[i]; // recupero la posizione originale della particella corrente

      const worldPos = new THREE.Vector3(); // preparo un vettore per la posizione world della particella
      particle.getWorldPosition(worldPos); // leggo la posizione world corrente della particella
      const screenPos = worldPos.clone().project(camera); // progetto la posizione world nello spazio schermo normalizzato

      const dy = screenPos.y - (this.mouse.y + (150 / window.innerHeight) * 2); // calcolo la distanza verticale 2D dal mouse correggendo l'offset layout
      const dx = screenPos.x - this.mouse.x; // calcolo la distanza orizzontale 2D dal mouse
      const distance2D = Math.sqrt(dx * dx + dy * dy); // calcolo la distanza euclidea 2D tra particella e mouse

      const now = performance.now(); // leggo il timestamp corrente in millisecondi
      const lastLift = data['lastLift'] || 0; // recupero l'ultimo timestamp di lift oppure uso zero
      const cooldown = 1050; // definisco il cooldown minimo tra due lift consecutivi

      if (data['state'] === 'idle' && distance2D < approachInThreshold) {
        // controllo se la particella e' idle e il mouse e' entrato nella soglia hover
        if (now - lastLift > cooldown) {
          // verifico che sia trascorso abbastanza tempo dall'ultimo lift
          data['state'] = 'hover'; // porto la particella nello stato hover
          data['lastLift'] = now; // salvo il timestamp del nuovo lift
        }
      }
      if (data['state'] === 'hover' && distance2D > approachOutThreshold) {
        // controllo se la particella e' hover e il mouse si e' allontanato abbastanza
        data['state'] = 'idle'; // riporto la particella nello stato idle
      }

      const distance = worldPos.distanceTo(camera.position); // calcolo la distanza 3D tra particella e camera
      const minDist = 0.8; // definisco la distanza minima utile per il lift dinamico
      const maxDist = 3.0; // definisco la distanza massima utile per il lift dinamico
      const liftMin = 0.01; // definisco il lift minimo applicabile
      const liftMax = 0.08; // definisco il lift massimo applicabile
      let t = (distance - minDist) / (maxDist - minDist); // normalizzo la distanza nel range min-max
      t = THREE.MathUtils.clamp(t, 0, 1); // limito il valore normalizzato tra 0 e 1
      const dynamicLift = THREE.MathUtils.lerp(liftMin, liftMax, t); // ricavo il lift finale interpolando in base alla distanza

      const floatX = Math.sin(time * off.freqX + off.timeOffset) * off.ampX; // calcolo l'oscillazione flottante sull'asse x
      const floatY = Math.sin(time * off.freqY + off.timeOffset) * off.ampY; // calcolo l'oscillazione flottante sull'asse y
      const floatZ = Math.sin(time * off.freqZ + off.timeOffset) * off.ampZ; // calcolo l'oscillazione flottante sull'asse z

      const finalX = origPos.x + floatX; // calcolo la posizione finale x sommando il floating alla posizione originale
      const finalY =
        (data['state'] === 'hover' // controllo se la particella si trova nello stato hover
          ? THREE.MathUtils.lerp(
              particle.position.y,
              data['originalY'] + dynamicLift,
              0.1,
            ) // avvicino gradualmente la y al valore sollevato
          : THREE.MathUtils.lerp(particle.position.y, data['originalY'], 0.1)) + // riporto gradualmente la y verso la posizione originale
        floatY; // aggiungo il floating verticale al valore base interpolato
      const finalZ = origPos.z + floatZ; // calcolo la posizione finale z sommando il floating alla posizione originale

      particle.position.set(finalX, finalY, finalZ); // applico la posizione finale aggiornata alla particella
    });
  }
}
