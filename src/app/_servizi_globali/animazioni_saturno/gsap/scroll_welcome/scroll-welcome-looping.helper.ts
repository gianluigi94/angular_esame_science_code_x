// ─── scroll-welcome-looping.helper.ts ────────────────────────────────────────
// Gestisce le animazioni cicliche (container_one/two/three).
// Estratto da setupLoopingAnimation() in scroll-welcome.service.ts.

import gsap              from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollWelcomeState } from './scroll-welcome-state';

export interface LoopingOptions {
  selector:       string;
  delayStart:     number;
  fadeInDuration: number;
  scaleDuration:  number;
  scaleTo:        number;
  fadeOutDuration: number;
  loopDelay:      number;
}

const SCROLLER = '.main-scroll';
const TRIGGER  = '#saturno-scrolle';
const START    = '10px top';

export class ScrollWelcomeLoopingHelper {
  constructor(private state: ScrollWelcomeState) {}

  // ── Estratto da setupLoopingAnimation() ───────────────────────────────────
  setup(options: LoopingOptions): void {
    const el = document.querySelector(options.selector) as HTMLElement;
    if (!el) return;

    gsap.set(el, { opacity: 0, scale: 1 });

    let tl:          gsap.core.Timeline | null = null;
    let delayedCall: gsap.core.Tween    | null = null;

    const loopingTrigger = ScrollTrigger.create({
      trigger: TRIGGER, scroller: SCROLLER, start: START,
      onEnter: () => {
        delayedCall = gsap.delayedCall(options.delayStart, () => {
          tl = gsap.timeline({
            repeat: -1, repeatDelay: options.loopDelay,
            defaults: { ease: 'power1.inOut' },
          });
          tl.set(el, { opacity: 0, scale: 1 })
            .to(el, { opacity: 1, duration: options.fadeInDuration })
            .to(el, { scale: options.scaleTo, duration: options.scaleDuration }, '<')
            .to(el, { opacity: 0, duration: options.fadeOutDuration }, `-=${options.fadeOutDuration}`)
            .set(el, { scale: 1, opacity: 0 });
          this.state.loopingTimelines.push(tl);
        });
        if (delayedCall) this.state.loopingDelayedCalls.push(delayedCall);
      },
      onLeaveBack: () => {
        if (delayedCall) {
          delayedCall.kill();
          this.state.loopingDelayedCalls = this.state.loopingDelayedCalls.filter(dc => dc !== delayedCall);
          delayedCall = null;
        }
        if (tl) {
          tl.kill();
          this.state.loopingTimelines = this.state.loopingTimelines.filter(t => t !== tl);
          tl = null;
        }
        gsap.set(el, { opacity: 0, scale: 1 });
      },
    });
    this.state.triggers.push(loopingTrigger);
  }

  // Avvia le 3 animazioni standard della pagina welcome
  setupDefault(): void {
    this.setup({ selector: '#container_one',   delayStart: 3,  fadeInDuration: 1, scaleDuration: 4, scaleTo: 1.4, fadeOutDuration: 1, loopDelay: 11.55 });
    this.setup({ selector: '#container_two',   delayStart: 8,  fadeInDuration: 1, scaleDuration: 4, scaleTo: 1.4, fadeOutDuration: 1, loopDelay: 11.55 });
    this.setup({ selector: '#container_three', delayStart: 13, fadeInDuration: 1, scaleDuration: 4, scaleTo: 1.4, fadeOutDuration: 1, loopDelay: 11.55 });
  }

  riavviaSeNecessario(scroller: HTMLElement | null, trigger: HTMLElement | null): void {
    if (scroller && trigger && trigger.getBoundingClientRect().top <= scroller.getBoundingClientRect().top + 10) {
      this.setupDefault();
    }
  }
}
