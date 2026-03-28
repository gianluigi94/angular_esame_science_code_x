// ─── scroll-welcome-state.ts ─────────────────────────────────────────────────
// Oggetto di stato condiviso tra tutti gli helper dello scroll welcome.

import { ScrollTrigger } from 'gsap/ScrollTrigger';
import gsap              from 'gsap';

export class ScrollWelcomeState {
  triggers:              ScrollTrigger[]          = [];
  scrolTimeline?:        gsap.core.Timeline;
  loopingTimelines:      gsap.core.Timeline[]     = [];
  loopingDelayedCalls:   gsap.core.Tween[]        = [];
  restoringFromResize    = false;
}
