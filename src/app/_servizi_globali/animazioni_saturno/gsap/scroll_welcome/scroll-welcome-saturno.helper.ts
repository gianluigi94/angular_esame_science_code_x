// ─── scroll-welcome-saturno.helper.ts ────────────────────────────────────────
// Crea i ScrollTrigger per le animazioni di Saturno (scala, luce, posizione, rotazione).
// Estratto da createScrollTriggers() in scroll-welcome.service.ts.

import gsap              from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE        from 'three';
import { SaturnoPosizioniService } from '../../saturno_posizioni.service';
import { ScrollWelcomeState }      from './scroll-welcome-state';

const SCROLLER  = '.main-scroll';
const TRIGGER   = '#saturno-scrolle';
const START     = '10px top';

export class ScrollWelcomeSaturnoHelper {
  constructor(
    private state: ScrollWelcomeState,
    private posizioniService: SaturnoPosizioniService,
  ) {}

  // ── Estratto dal blocco saturnoTrigger + curveTrigger + rotateZTrigger + rotateYTrigger
  crea(scene: THREE.Scene, light: THREE.DirectionalLight): void {
    const poseAlto  = this.posizioniService.getPose('WELCOME_ALTO');
    const poseBasso = this.posizioniService.getPose('WELCOME_BASSO');

    // ── Scala e luce ─────────────────────────────────────────────────────
    const saturnoTrigger = ScrollTrigger.create({
      trigger: TRIGGER, scroller: SCROLLER, start: START,
      onEnter: () => {
        gsap.killTweensOf(scene.scale);
        gsap.killTweensOf(light.position);
        const dur = this.state.restoringFromResize ? 0 : 1.33;
        gsap.to(scene.scale,    { x: poseBasso.scale.x, y: poseBasso.scale.y, z: poseBasso.scale.z, duration: dur, ease: 'power2.inOut' });
        gsap.to(light.position, { z: 5.1001, duration: dur, ease: 'power2.inOut' });
      },
      onLeaveBack: () => {
        gsap.killTweensOf(scene.scale);
        gsap.killTweensOf(light.position);
        gsap.to(scene.scale,    { x: poseAlto.scale.x, y: poseAlto.scale.y, z: poseAlto.scale.z, duration: 0.8, ease: 'power2.inOut' });
        gsap.to(light.position, { z: 10.1001, duration: 0.8, ease: 'power2.inOut' });
      },
    });
    this.state.triggers.push(saturnoTrigger);

    // ── Posizione curva sinusoidale ───────────────────────────────────────
    const curveProxy = { t: 0 };
    const curveTrigger = gsap.to(curveProxy, {
      t: 1.1, duration: 0.87,
      scrollTrigger: { trigger: TRIGGER, scroller: SCROLLER, start: START, toggleActions: 'play reverse play reverse' },
      ease: 'none',
      onUpdate: () => {
        const t = curveProxy.t;
        const baseY = window.innerWidth <= 868 ? -3.6 : -3.4;
        scene.position.x = 3.1 * t + 1.2 * Math.sin(Math.PI * t);
        scene.position.y = baseY * Math.pow(t, 2);
      },
    }).scrollTrigger;
    if (curveTrigger) this.state.triggers.push(curveTrigger);

    // ── Rotazione Z ───────────────────────────────────────────────────────
    const rotateZTrigger = ScrollTrigger.create({
      trigger: TRIGGER, scroller: SCROLLER, start: START, toggleActions: 'play reverse play reverse',
      onEnter:    () => gsap.to(scene.rotation, { z: poseBasso.rotation.z, duration: this.state.restoringFromResize ? 0 : 0.87, ease: 'power1.in' }),
      onLeaveBack:() => gsap.to(scene.rotation, { z: poseAlto.rotation.z,  duration: 0.87, ease: 'power1.out' }),
    });
    this.state.triggers.push(rotateZTrigger);

    // ── Rotazione Y ───────────────────────────────────────────────────────
    const rotateYTrigger = ScrollTrigger.create({
      trigger: TRIGGER, scroller: SCROLLER, start: START, toggleActions: 'play reverse play reverse',
      onEnter:    () => gsap.to(scene.rotation, { y: poseBasso.rotation.y, duration: this.state.restoringFromResize ? 0 : 0.87, ease: 'power4.in' }),
      onLeaveBack:() => gsap.to(scene.rotation, { y: poseAlto.rotation.y,  duration: 0.87, ease: 'power4.out' }),
    });
    this.state.triggers.push(rotateYTrigger);
  }
}
