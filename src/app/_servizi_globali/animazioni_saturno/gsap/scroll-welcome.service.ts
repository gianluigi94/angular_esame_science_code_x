// ─── scroll-welcome.service.ts ───────────────────────────────────────────────
// Orchestratore: setup event handlers, delega la creazione dei trigger agli helper,
// gestisce destroy e animaRitornoVersoAlto.

import { Injectable }    from '@angular/core';
import gsap              from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE        from 'three';
import { AnimateService }           from '../animate.service';
import { SaturnoPosizioniService }  from '../saturno_posizioni.service';
import { isMobileOrTablet }         from 'src/app/_helpers_globali/helpers';

import { ScrollWelcomeState }         from './scroll_welcome/scroll-welcome-state';
import { ScrollWelcomeSaturnoHelper } from './scroll_welcome/scroll-welcome-saturno.helper';
import { ScrollWelcomeUiHelper } from './scroll_welcome/scroll-welcome-ui.helper';
import { ScrollWelcomeLoopingHelper } from './scroll_welcome/scroll-welcome-looping.helper';

gsap.registerPlugin(ScrollTrigger);

@Injectable({ providedIn: 'root' })
export class ScrollWelcomeService {

  private readonly state   = new ScrollWelcomeState();
  private readonly saturno: ScrollWelcomeSaturnoHelper;
  private readonly ui:      ScrollWelcomeUiHelper;
  private readonly looping: ScrollWelcomeLoopingHelper;

  private resizeHandler:      (() => void) | null = null;
  private orientationHandler: (() => void) | null = null;
  private visibilityHandler:  (() => void) | null = null;

  constructor(
    private animateService:          AnimateService,
    private saturnoPosizioniService: SaturnoPosizioniService,
  ) {
    this.saturno = new ScrollWelcomeSaturnoHelper(this.state, saturnoPosizioniService);
    this.ui      = new ScrollWelcomeUiHelper(this.state, animateService);
    this.looping = new ScrollWelcomeLoopingHelper(this.state);
  }

  // ── Entry point ───────────────────────────────────────────────────────────
  public runAllAnimations(
    scene: THREE.Scene,
    camera: THREE.Camera,
    light: THREE.DirectionalLight,
  ): void {
    const scrollerEl = document.querySelector('.main-scroll') as HTMLElement | null;
    this.ripristinaScrollSeNecessario(scrollerEl);

    const title = document.querySelector('.title-container') as HTMLElement;
    gsap.set(title, { top: '50%', left: '50%', xPercent: -50, yPercent: -50, paddingTop: 210 });

    this.createScrollTriggers(scene, title, light);
    requestAnimationFrame(() => { ScrollTrigger.refresh(); ScrollTrigger.update(); });

    this.setupResizeHandler(scene, title, light);
    this.setupOrientationHandler();
    this.setupVisibilityHandler(scrollerEl);
  }

  // ── Destroy ───────────────────────────────────────────────────────────────
  public stopAllScrollAnimations(): void {
    this.destroyScrollTriggers();
    if (this.resizeHandler)      { window.removeEventListener('resize',            this.resizeHandler);      this.resizeHandler      = null; }
    if (this.orientationHandler) { window.removeEventListener('orientationchange', this.orientationHandler); this.orientationHandler = null; }
    if (this.visibilityHandler)  { document.removeEventListener('visibilitychange', this.visibilityHandler); this.visibilityHandler  = null; }
  }

  // ── Ritorno verso alto (usato dalla navigazione) ──────────────────────────
  public animaRitornoVersoAlto(
    scene: THREE.Scene,
    light: THREE.DirectionalLight,
    durata = 0.87,
  ): void {
    const poseAlto = this.saturnoPosizioniService.getPose('WELCOME_ALTO');
    gsap.killTweensOf(scene.scale);
    gsap.killTweensOf(scene.position);
    gsap.killTweensOf(scene.rotation);
    gsap.killTweensOf(light.position);

    gsap.to(scene.scale,    { x: poseAlto.scale.x,    y: poseAlto.scale.y,    z: poseAlto.scale.z,    duration: durata, ease: 'power2.inOut' });
    gsap.to(light.position, { z: 10.1001,                                                               duration: durata, ease: 'power2.inOut' });
    gsap.to(scene.rotation, { z: poseAlto.rotation.z, duration: durata, ease: 'power1.out' });
    gsap.to(scene.rotation, { y: poseAlto.rotation.y, duration: durata, ease: 'power4.out' });

    const curveProxy = { t: 1.1 };
    gsap.to(curveProxy, {
      t: 0, duration: durata, ease: 'none',
      onUpdate: () => {
        const t = curveProxy.t;
        const baseY = window.innerWidth <= 868 ? -3.6 : -3.4;
        scene.position.x = 3.1 * t + 1.2 * Math.sin(Math.PI * t);
        scene.position.y = baseY * Math.pow(t, 2);
      },
      onComplete: () => {
        scene.position.x = poseAlto.position.x;
        scene.position.y = poseAlto.position.y;
      },
    });
  }

  // ── Privati ───────────────────────────────────────────────────────────────

  private createScrollTriggers(scene: THREE.Scene, title: HTMLElement, light: THREE.DirectionalLight): void {
    this.saturno.crea(scene, light);
    this.ui.creaTitleTrigger(title);
    this.ui.creaSubtitleTrigger();
    this.ui.creaScrolTrigger();
    this.ui.creaCtaTrigger();
    this.ui.creaEmailFormTrigger();
    this.looping.setupDefault();
    this.ui.creaFooterTrigger();
  }

  private destroyScrollTriggers(): void {
    this.state.triggers.forEach(t => t.kill());
    this.state.triggers = [];
    this.state.scrolTimeline?.kill();
    this.state.scrolTimeline = undefined;
    this.state.loopingTimelines.forEach(tl => tl.kill());
    this.state.loopingTimelines = [];
    this.state.loopingDelayedCalls.forEach(dc => dc.kill());
    this.state.loopingDelayedCalls = [];
  }

  private ripristinaScrollSeNecessario(scrollerEl: HTMLElement | null): void {
    const shouldRestore = sessionStorage.getItem('welcome_restore') === '1';
    const saved         = sessionStorage.getItem('welcome_scrollTop');
    const isWelcome     = /^\/(it|en)\/(benvenuto|welcome)(\/|$)/.test(
      (window.location.pathname || '').split('?')[0].split('#')[0]
    );
    if (scrollerEl && isWelcome && shouldRestore && saved) {
      const v = Number(saved);
      if (!Number.isNaN(v) && v > 0) scrollerEl.scrollTop = v;
    }
    sessionStorage.removeItem('welcome_restore');
    sessionStorage.removeItem('welcome_scrollTop');
  }

  private setupResizeHandler(scene: THREE.Scene, title: HTMLElement, light: THREE.DirectionalLight): void {
    this.resizeHandler = () => {
      if (isMobileOrTablet()) return;
      const scrollerEl  = document.querySelector('.main-scroll')    as HTMLElement | null;
      const triggerEl   = document.querySelector('#saturno-scrolle') as HTMLElement | null;
      const eraScrollato = scrollerEl && triggerEl
        ? triggerEl.getBoundingClientRect().top <= scrollerEl.getBoundingClientRect().top + 10
        : false;

      this.destroyScrollTriggers();
      this.state.restoringFromResize = eraScrollato;
      this.createScrollTriggers(scene, title, light);
      ScrollTrigger.refresh();
      ScrollTrigger.update();
      this.state.restoringFromResize = false;
    };
    window.addEventListener('resize', this.resizeHandler);
  }

  private setupOrientationHandler(): void {
    this.orientationHandler = () => setTimeout(() => ScrollTrigger.refresh(), 500);
    window.addEventListener('orientationchange', this.orientationHandler);
  }

  private setupVisibilityHandler(scrollerEl: HTMLElement | null): void {
    this.visibilityHandler = () => {
      if (document.visibilityState === 'hidden') {
        this.state.loopingTimelines.forEach(tl => tl.kill());
        this.state.loopingTimelines = [];
        this.state.loopingDelayedCalls.forEach(dc => dc.kill());
        this.state.loopingDelayedCalls = [];
        ['#container_one', '#container_two', '#container_three'].forEach(sel => {
          const el = document.querySelector(sel) as HTMLElement | null;
          if (el) gsap.set(el, { opacity: 0, scale: 1, display: 'none' });
        });
      } else if (document.visibilityState === 'visible') {
        setTimeout(() => ScrollTrigger.refresh(), 300);
        this.animateService.refreshXGif();
        setTimeout(() => {
          ['#container_one', '#container_two', '#container_three'].forEach(sel => {
            const el = document.querySelector(sel) as HTMLElement | null;
            if (el) gsap.set(el, { opacity: 0, scale: 1, display: '' });
          });
          const triggerEl = document.querySelector('#saturno-scrolle') as HTMLElement | null;
          this.looping.riavviaSeNecessario(scrollerEl, triggerEl);
        }, 100);
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }
}
