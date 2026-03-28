// ─── animate-ingresso.helper.ts ──────────────────────────────────────────────
// Animazioni di ingresso della scena: luce e particelle.
// Estratto da animate.service.ts.

import { gsap } from 'gsap';
import * as THREE from 'three';

export class AnimateIngressoHelper {

  // ── Estratto da animateLightPosition() ───────────────────────────────────
  animateLightPosition(light: THREE.DirectionalLight): gsap.core.Timeline {
    const lightTimeline = gsap.timeline();

    gsap.set(light.position, { z: -13.1001 });
    gsap.set(light, { intensity: 0 });

    lightTimeline.to(light.position, { z: 9.4001,  duration: 0.95, ease: 'power2.in' }, 0);
    lightTimeline.to(light,          { intensity: 2.8, duration: 0.95, ease: 'power2.in' }, 0);

    return lightTimeline;
  }

  // ── Estratto da animateParticleGroups() ──────────────────────────────────
  animateParticleGroups(particleGroups: THREE.Group[]): gsap.core.Timeline {
    const mainTimeline = gsap.timeline();

    particleGroups.forEach((group) => {
      const originalSpeed = group.userData['rotationSpeed'];
      const groupTl = gsap.timeline();

      groupTl.to(group.userData, { duration: 0.019, rotationSpeed: originalSpeed + 0.008, ease: 'power4.in' });
      groupTl.to(group.userData, { duration: 1.2,   rotationSpeed: originalSpeed,          ease: 'power4.in' });

      mainTimeline.add(groupTl, 0);
    });

    return mainTimeline;
  }
}
