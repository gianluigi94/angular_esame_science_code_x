// ─── animate-clearcoat.helper.ts ─────────────────────────────────────────────
// Gestisce l'animazione ciclica del clearcoat (alone di luce).
// Estratto da animate.service.ts.

import { gsap } from 'gsap';

export interface ClearcoatMaterial {
  clearcoat: number;
}

export class AnimateClearcoatHelper {

  private clearcoatTimeline: gsap.core.Timeline | null = null;
  private readonly duration = 1.85;
  private readonly delay    = 5;

  // ── Estratto da animateClearcoat() ───────────────────────────────────────
  animateClearcoat(material: ClearcoatMaterial): void {
    if (this.clearcoatTimeline) {
      this.clearcoatTimeline.kill();
      this.clearcoatTimeline = null;
    }

    const tl = gsap.timeline({ repeat: -1, repeatDelay: this.delay });
    tl.to(material, { clearcoat: 0.5,   duration: this.duration, ease: 'power1.inOut' })
      .to(material, { clearcoat: 0.155, duration: this.duration, ease: 'power1.inOut' });

    this.clearcoatTimeline = tl;
  }

  pauseClearcoat(): void {
    this.clearcoatTimeline?.pause();
  }

  resumeClearcoat(): void {
    this.clearcoatTimeline?.play();
  }

  kill(): void {
    if (this.clearcoatTimeline) {
      this.clearcoatTimeline.kill();
      this.clearcoatTimeline = null;
    }
  }
}
