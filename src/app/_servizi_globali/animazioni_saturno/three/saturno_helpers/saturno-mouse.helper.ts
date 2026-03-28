// Gestisce il listener del mouse e l'animazione hover delle particelle
// Estratto da saturno.service.ts

import * as THREE from 'three';

export class SaturnoMouseHelper {

  private raycaster = new THREE.Raycaster();
  readonly mouse    = new THREE.Vector2(9999, 9999);

  private gestoreMouseMove: ((event: MouseEvent) => void) | null = null;

  // ── Estratto da attivaHoverMouse() ───────────────────────────────────────
  attivaHoverMouse(): void {
    if (this.gestoreMouseMove) {
      window.removeEventListener('mousemove', this.gestoreMouseMove);
    }
    this.gestoreMouseMove = (event: MouseEvent) => {
      const correctedY  = event.clientY + 150;
      this.mouse.x      = (event.clientX / window.innerWidth)  *  2 - 1;
      this.mouse.y      = -(correctedY   / window.innerHeight) *  2 + 1;
    };
    window.addEventListener('mousemove', this.gestoreMouseMove);
  }

  rimuoviHoverMouse(): void {
    if (this.gestoreMouseMove) {
      window.removeEventListener('mousemove', this.gestoreMouseMove);
      this.gestoreMouseMove = null;
    }
  }

  // ── Estratto da animateGroup() ────────────────────────────────────────────
  animateGroup(group: THREE.Group, camera: THREE.Camera): void {
    const offsets           = group.userData['offsets'];
    const originalPositions = group.userData['originalPositions'] as THREE.Vector3[];
    const time              = performance.now() * 0.001;

    this.raycaster.setFromCamera(this.mouse, camera);

    const approachInThreshold  = 0.1;
    const approachOutThreshold = 0.13;

    group.children.forEach((particle: THREE.Object3D, i: number) => {
      const data    = particle.userData;
      const off     = offsets[i];
      const origPos = originalPositions[i];

      const worldPos  = new THREE.Vector3();
      particle.getWorldPosition(worldPos);
      const screenPos = worldPos.clone().project(camera);

      const dy         = screenPos.y - (this.mouse.y + (150 / window.innerHeight) * 2);
      const dx         = screenPos.x - this.mouse.x;
      const distance2D = Math.sqrt(dx * dx + dy * dy);

      const now      = performance.now();
      const lastLift = data['lastLift'] || 0;
      const cooldown = 1050;

      if (data['state'] === 'idle' && distance2D < approachInThreshold) {
        if (now - lastLift > cooldown) {
          data['state']    = 'hover';
          data['lastLift'] = now;
        }
      }
      if (data['state'] === 'hover' && distance2D > approachOutThreshold) {
        data['state'] = 'idle';
      }

      const distance   = worldPos.distanceTo(camera.position);
      const minDist    = 0.8;
      const maxDist    = 3.0;
      const liftMin    = 0.01;
      const liftMax    = 0.08;
      let t            = (distance - minDist) / (maxDist - minDist);
      t                = THREE.MathUtils.clamp(t, 0, 1);
      const dynamicLift = THREE.MathUtils.lerp(liftMin, liftMax, t);

      const floatX = Math.sin(time * off.freqX + off.timeOffset) * off.ampX;
      const floatY = Math.sin(time * off.freqY + off.timeOffset) * off.ampY;
      const floatZ = Math.sin(time * off.freqZ + off.timeOffset) * off.ampZ;

      const finalX = origPos.x + floatX;
      const finalY =
        (data['state'] === 'hover'
          ? THREE.MathUtils.lerp(particle.position.y, data['originalY'] + dynamicLift, 0.1)
          : THREE.MathUtils.lerp(particle.position.y, data['originalY'], 0.1)
        ) + floatY;
      const finalZ = origPos.z + floatZ;

      particle.position.set(finalX, finalY, finalZ);
    });
  }
}
