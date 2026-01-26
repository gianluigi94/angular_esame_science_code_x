import { Injectable } from '@angular/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
import { AnimateService } from '../animate.service';
import { SaturnoPosizioniService } from '../saturno_posizioni.service';

gsap.registerPlugin(ScrollTrigger);

@Injectable({
  providedIn: 'root',
})
export class ScrollWelcomeService {
  private triggers: ScrollTrigger[] = [];
  private scrolTimeline?: gsap.core.Timeline;
  private loopingTimelines: gsap.core.Timeline[] = [];
  private loopingDelayedCalls: gsap.core.Tween[] = [];

  private resizeHandler: (() => void) | null = null;
  private orientationHandler: (() => void) | null = null;
  private visibilityHandler: (() => void) | null = null;

  constructor(
  private animateService: AnimateService,
  private saturnoPosizioniService: SaturnoPosizioniService
) {}


  public runAllAnimations(
  scene: THREE.Scene,
  camera: THREE.Camera,
  light: THREE.DirectionalLight
): void {
  const title = document.querySelector('.title-container') as HTMLElement;
  gsap.set(title, {
    top: '50%',
    left: '50%',
    xPercent: -50,
    yPercent: -50,
    paddingTop: 210,
  });

  // Crea le ScrollTrigger iniziali
  this.createScrollTriggers(scene, title, light);

    // DOPO
this.resizeHandler = () => {
  this.destroyScrollTriggers();

  this.createScrollTriggers(scene, title, light);  // ✅ passa anche light
  ScrollTrigger.refresh();

  const triggerElement = document.querySelector('#saturno-scrolle');
  const scrollerElement = document.querySelector('.main-scroll');
  if (triggerElement && scrollerElement) {
    const triggerTop = triggerElement.getBoundingClientRect().top;
    const scrollerTop = scrollerElement.getBoundingClientRect().top;
    if (triggerTop <= scrollerTop + 10) {
      gsap.set(title, {
        marginTop: this.checkSpecialTablet() ? -120 : 0,
      });
    }
  }
};

    window.addEventListener('resize', this.resizeHandler);

    this.orientationHandler = () => {
      setTimeout(() => {
        ScrollTrigger.refresh();
      }, 500);
    };
    window.addEventListener('orientationchange', this.orientationHandler);

    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        setTimeout(() => {
          ScrollTrigger.refresh();
        }, 300);
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);




  }

private createScrollTriggers(
  scene: THREE.Scene,
  title: HTMLElement,
  light: THREE.DirectionalLight
): void {
  const poseAlto = this.saturnoPosizioniService.getPose('WELCOME_ALTO');
  const poseBasso = this.saturnoPosizioniService.getPose('WELCOME_BASSO');

 // DOPO
const saturnoTrigger = ScrollTrigger.create({
  trigger: '#saturno-scrolle',
  scroller: '.main-scroll',
  start: '10px top',
  onEnter: () => {
    // 🧼 importantissimo: uccido qualunque tween precedente su scala e luce
    gsap.killTweensOf(scene.scale);
    gsap.killTweensOf(light.position);

    gsap.to(scene.scale, {
      x: poseBasso.scale.x,
      y: poseBasso.scale.y,
      z: poseBasso.scale.z,
      duration: 1.33,
      ease: 'power2.inOut',
    });

    gsap.to(light.position, {
      z: 5.1001, // WELCOME_BASSO
      duration: 1.33,
      ease: 'power2.inOut',
    });
  },
  onLeaveBack: () => {
    // 🧼 idem quando risalgo: niente tween “vecchi” che rimangono appesi
    gsap.killTweensOf(scene.scale);
    gsap.killTweensOf(light.position);

    gsap.to(scene.scale, {
      x: poseAlto.scale.x,
      y: poseAlto.scale.y,
      z: poseAlto.scale.z,
      duration: 0.8,
      ease: 'power2.inOut',
    });

    gsap.to(light.position, {
      z: 10.1001, // WELCOME_ALTO
      duration: 0.8,
      ease: 'power2.inOut',
    });
  },
});


  this.triggers.push(saturnoTrigger);

    // Proxy per curvare la posizione
    const curveProxy = { t: 0 };
    const curveTrigger = gsap.to(curveProxy, {
      t: 1.1,
      duration: 0.87,
      scrollTrigger: {
        trigger: '#saturno-scrolle',
        scroller: '.main-scroll',
        start: '10px top',
        toggleActions: 'play reverse play reverse',
      },
      ease: 'none',
      onUpdate: () => {
        const t = curveProxy.t;
        const finalX = 3.1 * t;
        const offsetX = 1.2 * Math.sin(Math.PI * t);
        const baseY = window.innerWidth <= 868 ? -3.6 : -3.4;
        const curvedY = baseY * Math.pow(t, 2);

        scene.position.x = finalX + offsetX;
        scene.position.y = curvedY;
      },
    }).scrollTrigger;
    if (curveTrigger) this.triggers.push(curveTrigger);

   const rotateZTrigger = ScrollTrigger.create({
  trigger: '#saturno-scrolle',
  scroller: '.main-scroll',
  start: '10px top',
  toggleActions: 'play reverse play reverse',
  onEnter: () => {
    gsap.to(scene.rotation, {
      z: poseBasso.rotation.z,
      duration: 0.87,
      ease: 'power1.in',
    });
  },
  onLeaveBack: () => {
    gsap.to(scene.rotation, {
      z: poseAlto.rotation.z,
      duration: 0.87,
      ease: 'power1.out',
    });
  },
});

    this.triggers.push(rotateZTrigger);

    const rotateYTrigger = ScrollTrigger.create({
  trigger: '#saturno-scrolle',
  scroller: '.main-scroll',
  start: '10px top',
  toggleActions: 'play reverse play reverse',
  onEnter: () => {
    gsap.to(scene.rotation, {
      y: poseBasso.rotation.y,
      duration: 0.87,
      ease: 'power4.in',
    });
  },
  onLeaveBack: () => {
    gsap.to(scene.rotation, {
      y: poseAlto.rotation.y,
      duration: 0.87,
      ease: 'power4.out',
    });
  },
});

    this.triggers.push(rotateYTrigger);
    if (rotateYTrigger) this.triggers.push(rotateYTrigger);

    // Calcolo di scale e offset per titoli in base alla larghezza finestra
    let scaleValue: number;
    if (window.innerWidth <= 375) {
      scaleValue = 0.225;
    } else if (window.innerWidth <= 485) {
      scaleValue = 0.21;
    } else if (window.innerWidth <= 868) {
      scaleValue = 0.17;
    } else {
      scaleValue = 0.15;
    }

       const scaleX = scaleValue;
   const scaleY = scaleValue * 1.3;

    let leftValue: number;
    if (
      window.matchMedia(
        '(max-width: 900px) and (max-height: 460px) and (orientation: landscape)'
      ).matches
    ) {
      leftValue = -22;
    } else if (
      window.matchMedia(
        '(max-width: 1020px) and (max-height: 660px) and (orientation: landscape)'
      ).matches
    ) {
      leftValue = 12;
    } else if (window.innerWidth <= 560) {
      leftValue = 6;
    } else if (window.innerWidth <= 868) {
      leftValue = 0;
    } else if (window.innerWidth <= 1000) {
      leftValue = 25;
    } else if (window.innerWidth <= 1200) {
      leftValue = 15;
    } else if (window.innerWidth <= 1500) {
      leftValue = 10;
    } else {
      // leftValue = 6;
      leftValue = 25;
    }

    let topValue: number;
    if (
      window.matchMedia(
        '(max-width: 900px) and (max-height: 460px) and (orientation: landscape)'
      ).matches
    ) {
      topValue = 16;
    } else if (
      window.matchMedia(
        '(max-width: 1020px) and (max-height: 660px) and (orientation: landscape)'
      ).matches
    ) {
      topValue = 12;
    } else if (window.innerWidth <= 560) {
      topValue = 15;
    } else if (window.innerWidth <= 900) {
      topValue = 8;
    } else if (window.innerWidth <= 1000) {
      topValue = 8;
    } else {
      // topValue = 3;
      topValue = 11;
    }

    const softOffset = ((1 - scaleValue) * 100) / 2;
    const isTablet = window.innerWidth <= 868;


    // Trigger per la posizione e dimensione del titolo
    const titleTrigger = ScrollTrigger.create({
      trigger: '#saturno-scrolle',
      scroller: '.main-scroll',
      start: '10px top',
      onEnter: () => {
        gsap.to(title, {
          top: topValue,
          left: leftValue,
          xPercent: isTablet ? -softOffset : -softOffset * 1.1,
          yPercent: -softOffset,
          paddingTop: 0,
          marginTop: 0,
                   scaleX: scaleX,
         scaleY: scaleY,
          minWidth: '60px',
          minHeight: '200px',
          duration: 0.85,
          delay: 0.2,
          ease: 'power2.inOut',
        });
      },
      onLeaveBack: () => {
        gsap.to(title, {
          top: '50%',
          left: '50%',
          xPercent: -50,
          yPercent: -50,
          paddingTop: 210,
          marginTop: this.checkSpecialTablet() ? -120 : 0,
          scale: 1,
          clearProps: 'minWidth,minHeight',
          duration: 0.85,
          delay: 0.2,
          ease: 'power2.inOut',
        });
      },
    });
    this.triggers.push(titleTrigger);

    // Sottotitolo
    gsap.to('.subtitle', {
      opacity: 0,
      duration: 0.5,
      ease: 'power1.out',
      scrollTrigger: {
        trigger: '#saturno-scrolle',
        scroller: '.main-scroll',
        start: '10px top',
        toggleActions: 'play reverse play reverse',
      },
    });

    // Timeline dello scroll
    const scrolElement = document.querySelector('.scrol') as HTMLElement;
    this.scrolTimeline = this.animateService.animateScrolElement(scrolElement);

    const scrolTrigger = ScrollTrigger.create({
      trigger: '#saturno-scrolle',
      scroller: '.main-scroll',
      start: '10px top',
      onEnter: () => {
        setTimeout(() => {
          this.scrolTimeline?.pause();
          gsap.set(scrolElement, { opacity: 0 });
        }, 450);
      },
      onLeaveBack: () => {
        setTimeout(() => {
          this.scrolTimeline?.play();
          gsap.set(scrolElement, { opacity: 1 });
        }, 500);
      },
    });
    this.triggers.push(scrolTrigger);

       // Lettere X
    const xTrigger = ScrollTrigger.create({
      trigger: '#saturno-scrolle',
      scroller: '.main-scroll',
      start: '10px top',
      toggleActions: 'play reverse play reverse',
      onEnter: () => {
        setTimeout(() => {
          this.scrolTimeline?.pause();
          gsap.set(scrolElement, { opacity: 0 });

          // 🔹 usa helper centralizzato
          this.animateService.setXNormale();
        }, 450);
      },
      onLeaveBack: () => {
        setTimeout(() => {
          this.scrolTimeline?.play();

          // 🔹 ripristina la X con gif
          this.animateService.setXGif();
        }, 500);
      },
    });
    this.triggers.push(xTrigger);


    // CTA (Call to Action)
    const cta = document.querySelector('#cta') as HTMLElement;
    gsap.set(cta, { opacity: 0 });

    const ctaTrigger = ScrollTrigger.create({
      trigger: '#saturno-scrolle',
      scroller: '.main-scroll',
      start: '10px top',
      onEnter: () => {
        gsap.killTweensOf(cta); // 🧼 ferma eventuali animazioni in corso
        gsap.to(cta, {
          opacity: 1,
          delay: 0.9,
          duration: 2.2,
          ease: 'power2.out',
        });
      },
      onLeaveBack: () => {
        gsap.killTweensOf(cta);
        gsap.to(cta, {
          opacity: 0,
          delay: 0,
          duration: 0.5,
          ease: 'none',
        });
      },
    });
    this.triggers.push(ctaTrigger);

    // Form Email
    const emailForm = document.querySelector('#email_form') as HTMLElement;
    if (emailForm) {
      gsap.set(emailForm, {
        opacity: 0,
        scaleX: 0,
        transformOrigin: 'center center',
      });

      const emailFormTrigger = ScrollTrigger.create({
        trigger: '#saturno-scrolle',
        scroller: '.main-scroll',
        start: '10px top',
        onEnter: () => {
          gsap.killTweensOf(emailForm);
          gsap.to(emailForm, {
            opacity: 1,
            scaleX: 1,
            delay: 0.95,
            duration: 1,
            ease: 'power2.out',
          });
        },
        onLeaveBack: () => {
          gsap.killTweensOf(emailForm);
          gsap.to(emailForm, {
            opacity: 0.5,
            scaleX: 0,
            delay: 0,
            duration: 0.4,
            ease: 'power2.in',
          });
        },
      });
      this.triggers.push(emailFormTrigger);
    }

    // Impostiamo le animazioni cicliche
    this.setupLoopingAnimation({
      selector: '#container_one',
      delayStart: 3,
      fadeInDuration: 1,
      scaleDuration: 4,
      scaleTo: 1.4,
      fadeOutDuration: 1,
      loopDelay: 11.55,
    });

    this.setupLoopingAnimation({
      selector: '#container_two',
      delayStart: 8,
      fadeInDuration: 1,
      scaleDuration: 4,
      scaleTo: 1.4,
      fadeOutDuration: 1,
      loopDelay: 11.55,
    });

    this.setupLoopingAnimation({
      selector: '#container_three',
      delayStart: 13,
      fadeInDuration: 1,
      scaleDuration: 4,
      scaleTo: 1.4,
      fadeOutDuration: 1,
      loopDelay: 11.55,
    });


    const footer = document.querySelector('footer') as HTMLElement;
    if (footer) {
      gsap.set(footer, { scaleY: 0, transformOrigin: 'bottom center' });

      const footerTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: '#saturno-scrolle',
      scroller: '.main-scroll',
      start: '10px top',
          toggleActions: 'play reverse play reverse',
        },
      });

      footerTimeline.fromTo(
        footer,
        { scaleY: 0, opacity:0 },
        {
          scaleY: 1,
          opacity: 1,
          duration: 0.3,
          ease: 'power2.out',
          delay: 0.5,
        }
      );

      const footerResetTrigger = ScrollTrigger.create({
        trigger: '#saturno-scrolle',
        scroller: '.main-scroll',
        start: '10px top',
        onLeaveBack: () => {
          gsap.set(footer, { scaleY: 0 });
        },
      });

      this.triggers.push(footerTimeline.scrollTrigger as ScrollTrigger);
      this.triggers.push(footerResetTrigger);
    }

    const footerP = document.querySelector('#footer-p') as HTMLElement;
if (footerP) {
  gsap.set(footerP, { opacity: 0 });

  const footerPTrigger = ScrollTrigger.create({
    trigger: '#saturno-scrolle',
    scroller: '.main-scroll',
    start: '10px top',
    toggleActions: 'play reverse play reverse',
    onEnter: () => {
      gsap.fromTo(
        footerP,
        { opacity: 0.00 },
        {
          opacity: 1,
          delay: 0.9,
          duration: 0.9,
          ease: 'power2.out',
        }
      );
    },
    onLeaveBack: () => {
      gsap.set(footerP, { opacity: 0 });
    },
  });

  this.triggers.push(footerPTrigger);
}



  }



  private checkSpecialTablet(): boolean {
    return window.matchMedia(
      '(orientation: landscape) and (min-aspect-ratio: 7/5) and (max-width: 985px), ' +
        '(orientation: landscape) and (max-width: 1020px) and (max-height: 560px)'
    ).matches;
  }

   private destroyScrollTriggers(): void {
    this.triggers.forEach((trigger) => trigger.kill());
    this.triggers = [];

    if (this.scrolTimeline) {
      this.scrolTimeline.kill();
      this.scrolTimeline = undefined;
    }

    this.loopingTimelines.forEach((tl) => tl.kill());
    this.loopingTimelines = [];
    this.loopingDelayedCalls.forEach((dc) => dc.kill());
    this.loopingDelayedCalls = [];
  }

  public stopAllScrollAnimations(): void {
    this.destroyScrollTriggers();

    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    if (this.orientationHandler) {
      window.removeEventListener('orientationchange', this.orientationHandler);
      this.orientationHandler = null;
    }
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }


  private setupLoopingAnimation(options: {
    selector: string;
    delayStart: number;
    fadeInDuration: number;
    scaleDuration: number;
    scaleTo: number;
    fadeOutDuration: number;
    loopDelay: number;
  }): void {
    const el = document.querySelector(options.selector) as HTMLElement;
    if (!el) return;

    gsap.set(el, { opacity: 0, scale: 1 });

    // Creiamo variabili per gestire timeline e delayedCall (verranno pulite su destroyScrollTriggers)
    let tl: gsap.core.Timeline | null = null;
    let delayedCall: gsap.core.Tween | null = null;

    const loopingTrigger = ScrollTrigger.create({
      trigger: '#saturno-scrolle',
      scroller: '.main-scroll',
      start: '10px top',
      onEnter: () => {
        delayedCall = gsap.delayedCall(options.delayStart, () => {
          tl = gsap.timeline({
            repeat: -1,
            repeatDelay: options.loopDelay,
            defaults: { ease: 'power1.inOut' },
          });

          tl.set(el, { opacity: 0, scale: 1 })
            .to(el, { opacity: 1, duration: options.fadeInDuration })
            .to(
              el,
              {
                scale: options.scaleTo,
                duration: options.scaleDuration,
              },
              '<'
            )
            .to(
              el,
              {
                opacity: 0,
                duration: options.fadeOutDuration,
              },
              `-=${options.fadeOutDuration}`
            )
            .set(el, { scale: 1, opacity: 0 });

          // Memorizziamo la timeline in un array, così da poterla uccidere al bisogno
          this.loopingTimelines.push(tl);
        });

        if (delayedCall) {
          this.loopingDelayedCalls.push(delayedCall);
        }
      },
      onLeaveBack: () => {
        // Se era partito un delayedCall, lo killiamo
        if (delayedCall) {
          delayedCall.kill();
          this.loopingDelayedCalls = this.loopingDelayedCalls.filter(
            (dc) => dc !== delayedCall
          );
          delayedCall = null;
        }
        if (tl) {
          tl.kill();
          this.loopingTimelines = this.loopingTimelines.filter(
            (storedTl) => storedTl !== tl
          );
          tl = null;
        }
        // Reset dell’elemento
        gsap.set(el, { opacity: 0, scale: 1 });
      },
    });

    this.triggers.push(loopingTrigger);
  }
}
