// Helper che gestisce le animazioni di ingresso della scena su luce e gruppi di particelle.
import { gsap } from 'gsap';
import * as THREE from 'three';

export class AnimateIngressoHelper {

  /**
   * Anima l'ingresso della luce direzionale.
   *
   * Imposta uno stato iniziale nascosto e poi anima
   * insieme posizione e intensita' della luce.
   *
   * @param light Luce direzionale da animare.
   * @returns gsap.core.Timeline Timeline dell'animazione della luce.
   */
  animateLightPosition(light: THREE.DirectionalLight): gsap.core.Timeline {
    const lightTimeline = gsap.timeline(); // creo la timeline dedicata alla luce

    gsap.set(light.position, { z: -13.1001 }); // imposto la posizione iniziale della luce fuori ingresso
    gsap.set(light, { intensity: 0 }); // imposto l'intensita' iniziale a zero

    lightTimeline.to(light.position, { z: 9.4001, duration: 0.95, ease: 'power2.in' }, 0); // animo la posizione z della luce verso il valore finale
    lightTimeline.to(light, { intensity: 2.8, duration: 0.95, ease: 'power2.in' }, 0); // animo l'intensita' della luce in parallelo

    return lightTimeline; // restituisco la timeline della luce
  }

  /**
   * Anima l'ingresso dei gruppi di particelle.
   *
   * Per ogni gruppo accelera temporaneamente la velocita' di rotazione
   * e poi la riporta al valore originale.
   *
   * @param particleGroups Gruppi di particelle da animare.
   * @returns gsap.core.Timeline Timeline complessiva dei gruppi.
   */
  animateParticleGroups(particleGroups: THREE.Group[]): gsap.core.Timeline {
    const mainTimeline = gsap.timeline(); // creo la timeline principale dei gruppi

    particleGroups.forEach((group) => { // scorro tutti i gruppi di particelle
      const originalSpeed = group.userData['rotationSpeed']; // leggo la velocita' originale del gruppo
      const groupTl = gsap.timeline(); // creo la timeline del singolo gruppo

      groupTl.to(group.userData, { duration: 0.019, rotationSpeed: originalSpeed + 0.008, ease: 'power4.in' }); // aumento per un attimo la velocita' di rotazione
      groupTl.to(group.userData, { duration: 1.2, rotationSpeed: originalSpeed, ease: 'power4.in' }); // riporto la velocita' al valore originale

      mainTimeline.add(groupTl, 0); // aggancio la timeline del gruppo all'inizio della timeline principale
    });

    return mainTimeline; // restituisco la timeline complessiva dei gruppi
  }
}
