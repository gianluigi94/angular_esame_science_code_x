// ─── scroll-welcome-ui.helper.ts ─────────────────────────────────────────────
// Crea i ScrollTrigger per gli elementi UI (titolo, sottotitolo, scrol, X, CTA,
// email form, footer).
// Estratto da createScrollTriggers() in scroll-welcome.service.ts.

import gsap              from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AnimateService } from '../../animate.service';
import { ScrollWelcomeState } from './scroll-welcome-state';
import {
  calcolaScaleTitle, calcolaLeftValue, calcolaTopValue, checkSpecialTablet,
} from './scroll-welcome-layout.utils';

const SCROLLER = '.main-scroll';
const TRIGGER  = '#saturno-scrolle';
const START    = '10px top';

export class ScrollWelcomeUiHelper {
  constructor(
    private state:          ScrollWelcomeState,
    private animateService: AnimateService,
  ) {}

  // ── Titolo ────────────────────────────────────────────────────────────────
  creaTitleTrigger(title: HTMLElement): void {
    const { scaleX, scaleY } = calcolaScaleTitle();
    const leftValue  = calcolaLeftValue();
    const topValue   = calcolaTopValue();
    const isTablet   = window.innerWidth <= 868;
    const softOffset = ((1 - (scaleX)) * 100) / 2;

    const titleTrigger = ScrollTrigger.create({
      trigger: TRIGGER, scroller: SCROLLER, start: START,
      onEnter: () => {
        gsap.to(title, {
          top: topValue, left: leftValue,
          xPercent: isTablet ? -softOffset : -softOffset * 1.1,
          yPercent: -softOffset,
          paddingTop: 0, marginTop: 0,
          scaleX, scaleY,
          minWidth: '60px', minHeight: '200px',
          duration: this.state.restoringFromResize ? 0 : 0.85,
          delay:    this.state.restoringFromResize ? 0 : 0.2,
          ease: 'power2.inOut',
        });
      },
      onLeaveBack: () => {
        gsap.to(title, {
          top: '50%', left: '50%',
          xPercent: -50, yPercent: -50,
          paddingTop: 210,
          marginTop: checkSpecialTablet() ? -120 : 0,
          scale: 1,
          clearProps: 'minWidth,minHeight',
          duration: 0.85, delay: 0.2,
          ease: 'power2.inOut',
        });
      },
    });
    this.state.triggers.push(titleTrigger);
  }

  // ── Sottotitolo ───────────────────────────────────────────────────────────
  creaSubtitleTrigger(): void {
    gsap.to('.subtitle', {
      opacity: 0, duration: 0.5, ease: 'power1.out',
      scrollTrigger: {
        trigger: TRIGGER, scroller: SCROLLER, start: START,
        toggleActions: 'play reverse play reverse',
      },
    });
  }

  // ── Scrol + lettere X ─────────────────────────────────────────────────────
  creaScrolTrigger(): void {
    const scrolElement = document.querySelector('.scrol') as HTMLElement;
    this.state.scrolTimeline = this.animateService.animateScrolElement(scrolElement);

    const scrolTrigger = ScrollTrigger.create({
      trigger: TRIGGER, scroller: SCROLLER, start: START,
      onEnter:    () => setTimeout(() => { this.state.scrolTimeline?.pause(); gsap.set(scrolElement, { opacity: 0 }); }, 450),
      onLeaveBack:() => setTimeout(() => { this.state.scrolTimeline?.play();  gsap.set(scrolElement, { opacity: 1 }); }, 500),
    });
    this.state.triggers.push(scrolTrigger);

    const xTrigger = ScrollTrigger.create({
      trigger: TRIGGER, scroller: SCROLLER, start: START, toggleActions: 'play reverse play reverse',
      onEnter: () => setTimeout(() => {
        this.state.scrolTimeline?.pause();
        gsap.set(scrolElement, { opacity: 0 });
        this.animateService.setXNormale();
      }, 450),
      onLeaveBack: () => setTimeout(() => {
        this.state.scrolTimeline?.play();
        this.animateService.setXGif();
      }, 500),
    });
    this.state.triggers.push(xTrigger);
  }

  // ── CTA ───────────────────────────────────────────────────────────────────
  creaCtaTrigger(): void {
    const cta = document.querySelector('#cta') as HTMLElement;
    if (!this.state.restoringFromResize) gsap.set(cta, { opacity: 0 });

    const ctaTrigger = ScrollTrigger.create({
      trigger: TRIGGER, scroller: SCROLLER, start: START,
      onEnter: () => {
        gsap.killTweensOf(cta);
        gsap.to(cta, { opacity: 1, delay: 0.9, duration: 2.2, ease: 'power2.out' });
      },
      onLeaveBack: () => {
        gsap.killTweensOf(cta);
        gsap.to(cta, { opacity: 0, delay: 0, duration: 0.5, ease: 'none' });
      },
    });
    this.state.triggers.push(ctaTrigger);
  }

  // ── Email Form ────────────────────────────────────────────────────────────
  creaEmailFormTrigger(): void {
    const emailForm = document.querySelector('#email_form') as HTMLElement;
    if (!emailForm) return;
    if (!this.state.restoringFromResize)
      gsap.set(emailForm, { opacity: 0, scaleX: 0, transformOrigin: 'center center' });

    const t = ScrollTrigger.create({
      trigger: TRIGGER, scroller: SCROLLER, start: START,
      onEnter: () => {
        gsap.killTweensOf(emailForm);
        gsap.to(emailForm, { opacity: 1, scaleX: 1, delay: 0.95, duration: 1, ease: 'power2.out' });
      },
      onLeaveBack: () => {
        gsap.killTweensOf(emailForm);
        gsap.to(emailForm, { opacity: 0.5, scaleX: 0, delay: 0, duration: 0.4, ease: 'power2.in' });
      },
    });
    this.state.triggers.push(t);
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  creaFooterTrigger(): void {
    const footer = document.querySelector('footer') as HTMLElement;
    if (!footer) return;
    gsap.set(footer, { scaleY: 0, transformOrigin: 'bottom center' });

    const footerTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: TRIGGER, scroller: SCROLLER, start: START,
        toggleActions: 'play reverse play reverse',
      },
    });
    footerTimeline.fromTo(footer, { scaleY: 0, opacity: 0 }, { scaleY: 1, opacity: 1, duration: 0.3, ease: 'power2.out', delay: 0.5 });

    const footerResetTrigger = ScrollTrigger.create({
      trigger: TRIGGER, scroller: SCROLLER, start: START,
      onLeaveBack: () => gsap.set(footer, { scaleY: 0 }),
    });

    this.state.triggers.push(footerTimeline.scrollTrigger as ScrollTrigger);
    this.state.triggers.push(footerResetTrigger);

    const footerP = document.querySelector('#footer-p') as HTMLElement;
    if (!footerP) return;
    gsap.set(footerP, { opacity: 0 });

    const footerPTrigger = ScrollTrigger.create({
      trigger: TRIGGER, scroller: SCROLLER, start: START, toggleActions: 'play reverse play reverse',
      onEnter:    () => gsap.fromTo(footerP, { opacity: 0 }, { opacity: 1, delay: 0.9, duration: 0.9, ease: 'power2.out' }),
      onLeaveBack:() => gsap.set(footerP, { opacity: 0 }),
    });
    this.state.triggers.push(footerPTrigger);
  }
}
