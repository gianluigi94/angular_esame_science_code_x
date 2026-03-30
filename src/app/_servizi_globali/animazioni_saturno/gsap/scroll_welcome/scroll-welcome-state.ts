// Stato condiviso usato dagli helper dello scroll welcome.

import { ScrollTrigger } from 'gsap/ScrollTrigger';
import gsap from 'gsap';

export class ScrollWelcomeState {
  triggers: ScrollTrigger[] = []; // conservo tutti gli ScrollTrigger creati
  scrolTimeline?: gsap.core.Timeline; // conservo la timeline principale dello scroll
  loopingTimelines: gsap.core.Timeline[] = []; // conservo le timeline cicliche dei container
  loopingDelayedCalls: gsap.core.Tween[] = []; // conservo i delayedCall associati ai loop
  restoringFromResize = false; // tengo traccia se sto ripristinando lo stato dopo un resize
}
