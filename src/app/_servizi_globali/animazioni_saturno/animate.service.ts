import { Injectable }    from '@angular/core';
import { gsap }          from 'gsap';
import { CSSRulePlugin } from 'gsap/CSSRulePlugin';
import * as THREE        from 'three';

import { AnimateTitoloHelper }    from './animate_helpers/animate-titolo.helper';
import { AnimateIngressoHelper }  from './animate_helpers/animate-ingresso.helper';
import { AnimateSceneHelper }     from './animate_helpers/animate-scene.helper';
import { AnimateClearcoatHelper, ClearcoatMaterial } from './animate_helpers/animate-clearcoat.helper';

export type { ClearcoatMaterial };

@Injectable({ providedIn: 'root' })
export class AnimateService {

  private readonly titolo    = new AnimateTitoloHelper();
  private readonly ingresso  = new AnimateIngressoHelper();
  private readonly scena     = new AnimateSceneHelper();
  private readonly clearcoat = new AnimateClearcoatHelper();

  // Timeline di orchestrazione (per resetAnimations)
  private mainTimeline:      gsap.core.Timeline | null = null;
  private headerTimeline:    gsap.core.Timeline | null = null;
  private lightTimeline:     gsap.core.Timeline | null = null;
  private particlesTimeline: gsap.core.Timeline | null = null;
  private scrolTimeline:     gsap.core.Timeline | null = null;

  constructor() {
    gsap.registerPlugin(CSSRulePlugin);
  }

  startWelcomeAnimation() {
    throw new Error('Method not implemented.');
  }

  // ── Getter stato titolo ───────────────────────────────────────────────────
  public isTitoloInPosizioneAlta(): boolean {
    return this.titolo.titoloInPosizioneAlta;
  }

  // ── Titolo ────────────────────────────────────────────────────────────────
  public setTitoloAltoGlobal():          void { this.titolo.setTitoloAltoGlobal(); }
  public setTitoloCentraleGlobal():      void { this.titolo.setTitoloCentraleGlobal(); }
  public animateTitoloVersoAltoGlobal(durata = 0.85, delay = 0.2): void {
    this.titolo.animateTitoloVersoAltoGlobal(durata, delay);
  }
  public animateTitoloVersoCentroGlobal(durata = 0.85, delay = 0.2): void {
    this.titolo.animateTitoloVersoCentroGlobal(durata, delay);
  }

  // ── X ─────────────────────────────────────────────────────────────────────
  public setXNormale():  void { this.titolo.setXNormale(); }
  public setXGif():      void { this.titolo.setXGif(); }
  public refreshXGif():  void { this.titolo.refreshXGif(); }

  // ── Fade / scroll ─────────────────────────────────────────────────────────
  public fadeOutSaturnoESfondo(durata = 1, onComplete?: () => void): void {
    this.scena.fadeOutSaturnoESfondo(durata, onComplete);
  }
  public fadeInSoloSfondo(durata = 1, delay = 0): void {
    this.scena.fadeInSoloSfondo(durata, delay);
  }
  public enablePageScroll():  void { this.scena.enablePageScroll(); }
  public disablePageScroll(): void { this.scena.disablePageScroll(); }

  // ── Clearcoat ─────────────────────────────────────────────────────────────
  public animateClearcoat(material: ClearcoatMaterial): void { this.clearcoat.animateClearcoat(material); }
  public pauseClearcoat():  void { this.clearcoat.pauseClearcoat(); }
  public resumeClearcoat(): void { this.clearcoat.resumeClearcoat(); }

  // ── Scrol element ─────────────────────────────────────────────────────────
  public animateScrolElement(scrolElement: HTMLElement): gsap.core.Timeline {
    const scrolTimeline = gsap.timeline({ repeat: -1, delay: 0, repeatDelay: 0 });
    scrolTimeline.set(scrolElement, { opacity: 0 });
    scrolTimeline.to(scrolElement, { duration: 0.24, opacity: 0, ease: 'none' });
    scrolTimeline.to(scrolElement, { duration: 2.45, opacity: 1, ease: 'none' });
    scrolTimeline.to(scrolElement, { duration: 0.91, opacity: 0, ease: 'none' });
    this.scrolTimeline = scrolTimeline;
    return scrolTimeline;
  }

  // ── Header elements ───────────────────────────────────────────────────────
  public animateHeaderElements(
    firstElement: HTMLElement | null,
    xElement:     HTMLElement | null,
  ): gsap.core.Timeline {
    const headerTimeline = gsap.timeline();
    const xAfterRule     = CSSRulePlugin.getRule('.x::after');

    if (xAfterRule) gsap.set(xAfterRule, { opacity: 0 });

    if (firstElement) {
      headerTimeline.fromTo(
        firstElement,
        { translateX: '-40%', opacity: 0, scale: 0.7 },
        { translateX: '0%',   opacity: 1, scale: 1, duration: 0.95, ease: 'power4.in' },
        0.0,
      );
    }

    if (xElement) {
      headerTimeline.fromTo(
        xElement,
        { x: '80%', opacity: 0, scale: 0.7 },
        { x: '0%',  opacity: 1, scale: 1, duration: 0.95, ease: 'power4.in' },
        0.0,
      );
      headerTimeline.to(xElement, { color: 'transparent', duration: 1, ease: 'power1.in' }, 1.25);
    }

    if (xAfterRule) {
      headerTimeline.to(xAfterRule, { opacity: 1, duration: 2.4, ease: 'power1.in' }, 1.75);
    }

    this.headerTimeline = headerTimeline;
    return headerTimeline;
  }

  // ── Orchestrazione principale ─────────────────────────────────────────────
  public async animateAll(
    firstElement:    HTMLElement | null,
    xElement:        HTMLElement | null,
    light:           THREE.DirectionalLight | null,
    particleGroups:  THREE.Group[] | null,
    onLightComplete?: () => void,
    onComplete?:      () => void,
  ): Promise<gsap.core.Timeline> {
    this.preparaHeaderPrimaDelLoader(firstElement, xElement);
    await this.waitForLoadingOverlayToDisappear();

    const mainTimeline = gsap.timeline({
      paused: true,
      onComplete: () => { if (onComplete) onComplete(); },
    });

    mainTimeline.add(this.animateHeaderElements(firstElement, xElement), 0);

    if (light) {
      const lightTl = this.ingresso.animateLightPosition(light);
      this.lightTimeline = lightTl;
      if (onLightComplete) lightTl.eventCallback('onComplete', onLightComplete);
      mainTimeline.add(lightTl, 0);
    }

    if (particleGroups && particleGroups.length > 0) {
      const particlesTl = this.ingresso.animateParticleGroups(particleGroups);
      this.particlesTimeline = particlesTl;
      mainTimeline.add(particlesTl, 0);
    }

    this.mainTimeline = mainTimeline;
    gsap.delayedCall(0, () => mainTimeline.play(0));
    return mainTimeline;
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  public resetAnimations(): void {
    this.mainTimeline?.kill();      this.mainTimeline      = null;
    this.headerTimeline?.kill();    this.headerTimeline    = null;
    this.lightTimeline?.kill();     this.lightTimeline     = null;
    this.particlesTimeline?.kill(); this.particlesTimeline = null;
    this.scrolTimeline?.kill();     this.scrolTimeline     = null;
    this.clearcoat.kill();

    this.titolo.titoloInPosizioneAlta = false;

    const xAfterRule = CSSRulePlugin.getRule('.x::after');
    if (xAfterRule) gsap.set(xAfterRule, { opacity: 0 });
  }

  // ── Privati ───────────────────────────────────────────────────────────────
  private preparaHeaderPrimaDelLoader(
    firstElement: HTMLElement | null,
    xElement:     HTMLElement | null,
  ): void {
    try { const r = CSSRulePlugin.getRule('.x::after'); if (r) gsap.set(r, { opacity: 0 }); } catch {}
    try { if (firstElement) gsap.set(firstElement, { opacity: 0 }); } catch {}
    try { if (xElement)     gsap.set(xElement,     { opacity: 0 }); } catch {}
  }

  private waitForLoadingOverlayToDisappear(): Promise<void> {
    return new Promise<void>((resolve) => {
      const checkOverlay = () => {
        const overlay = document.querySelector('.loading-overlay');
        if (!overlay) {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        } else {
          requestAnimationFrame(checkOverlay);
        }
      };
      checkOverlay();
    });
  }
}
