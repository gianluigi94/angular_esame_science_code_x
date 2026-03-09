import { Injectable } from '@angular/core';
import { gsap } from 'gsap';

@Injectable({ providedIn: 'root' })
export class SchedaPlayerTransizioneTitoloService {

  private tl: gsap.core.Timeline | null = null;

  animaTitoloVersocentro(
    onComplete?: () => void
  ): void {
    const title = document.querySelector('.title-container') as HTMLElement | null;
    if (!title) return;

    this.annulla();

    const first = document.querySelector('[data-titolo-first]') as HTMLElement | null;
    const x     = document.querySelector('[data-titolo-x]')     as HTMLElement | null;

    // ======================================================
    // CONTROLLO DURATE — modifica solo questi valori
    // ======================================================
    const DELAY_INIZIO         = 0;
    const DURATA_TITOLO_CENTRO = 1.4;
    const INIZIO_SCRITTE       = 0.1;
    const DURATA_SCRITTE       = 1.6;
   const INIZIO_SPLIT         = 0.5;
    const DURATA_SPLIT         = 2.1;
    const SPOSTA_X             = -2000;
    const SPOSTA_FIRST         = 1200;
    const SCALA_X              = 4;     // scala elemento x (secondo movimento)
    const SCALA_FIRST          = 0.5;   // scala elemento first (secondo movimento)
    // ======================================================

    const transitionOriginale = title.style.transition;
    title.style.transition = 'none';
    title.style.willChange = 'transform';
    title.style.pointerEvents = 'none';

    this.tl = gsap.timeline({
      delay: DELAY_INIZIO,
      onComplete: () => {
        title.style.transition = transitionOriginale;
        title.style.willChange = 'auto';
        if (onComplete) onComplete();
      },
    });

    // Primo movimento: titolo va al centro
    this.tl.to(title, {
      top: '50%',
      left: '50%',
      xPercent: -50,
      yPercent: -50,
      paddingTop: 210,
      marginTop: 0,
      scaleX: 1,
      scaleY: 1,
      duration: DURATA_TITOLO_CENTRO,
      ease: 'power2.inOut',
    }, 0);

    // Secondo movimento
    if (first) {
     this.tl.to(first, {
        scale: SCALA_FIRST,
        duration: DURATA_SCRITTE,
        ease: 'power2.inOut',
      }, INIZIO_SCRITTE);
    }

        if (x) {
      this.tl.to(x, {
        scale: SCALA_X,
        rotationY: 55,
        rotationX: -18,
        transformPerspective: 1200,
        transformOrigin: 'center center',
        duration: DURATA_SCRITTE,
        ease: 'power2.inOut',
      }, INIZIO_SCRITTE);
    }

    // Terzo movimento: x va a sinistra, first va a destra
        if (x) {
      this.tl.to(x, {
        x: SPOSTA_X,
        rotationY: 10,
        rotationX: 22,
        transformPerspective: 1200,
        duration: DURATA_SPLIT,
        ease: 'power2.inOut',
      }, INIZIO_SPLIT);
    }

    if (first) {
      this.tl.to(first, {
        x: SPOSTA_FIRST,
        duration: DURATA_SPLIT,
        ease: 'power2.inOut',
      }, INIZIO_SPLIT);
    }
  }

  annulla(): void {
    if (this.tl) {
      this.tl.kill();
      this.tl = null;
    }
  }
}

// import { Injectable } from '@angular/core';
// import { gsap } from 'gsap';

// @Injectable({ providedIn: 'root' })
// export class SchedaPlayerTransizioneTitoloService {

//   private tl: gsap.core.Timeline | null = null;

//   animaTitoloVersocentro(
//     onComplete?: () => void
//   ): void {
//     const title = document.querySelector('.title-container') as HTMLElement | null;
//     if (!title) return;

//     this.annulla();

//     const first = document.querySelector('[data-titolo-first]') as HTMLElement | null;
//     const x = document.querySelector('[data-titolo-x]') as HTMLElement | null;

//     // ======================================================
//     // CONTROLLO DURATE — modifica solo questi valori
//     // ======================================================
//     const DELAY_INIZIO = 0;
//     const DURATA_ENTRATA_CENTRO = 1.25;
//     const INIZIO_ASSETTO = 1.0;
//     const DURATA_ASSETTO = 0.55;
//     const INIZIO_CARICA_X = 1.18;
//     const DURATA_CARICA_X = 0.95;
//     const INIZIO_SPLIT = 1.55;
//     const DURATA_SPLIT = 1.35;

//     const SPOSTA_X = -540;
//     const SPOSTA_FIRST = 980;

//     const SCALA_FIRST_FINALE = 0.72;
//     const SCALA_X_FINALE = 3.6;

//     const ROTAZIONE_X_Y = -58;
//     const ROTAZIONE_X_X = 16;
//     const PROSPETTIVA_X = 1400;
//     // ======================================================

//     const transitionOriginale = title.style.transition;
//     const willChangeOriginale = title.style.willChange;
//     const pointerEventsOriginale = title.style.pointerEvents;
//     const perspectiveOriginale = title.style.perspective;
//     const transformStyleOriginale = title.style.transformStyle;

//     title.style.transition = 'none';
//     title.style.willChange = 'transform, opacity, filter';
//     title.style.pointerEvents = 'none';
//     title.style.perspective = '1400px';
//     title.style.transformStyle = 'preserve-3d';

//     if (x) {
//       gsap.set(x, {
//         transformPerspective: PROSPETTIVA_X,
//         transformOrigin: 'center center',
//         rotationY: 0,
//         rotationX: 0,
//         z: 0,
//         filter: 'brightness(1)',
//         willChange: 'transform, filter, opacity',
//       });
//     }

//     if (first) {
//       gsap.set(first, {
//         transformOrigin: 'center center',
//         filter: 'brightness(1)',
//         willChange: 'transform, filter, opacity',
//       });
//     }

//     this.tl = gsap.timeline({
//       delay: DELAY_INIZIO,
//       onComplete: () => {
//         title.style.transition = transitionOriginale;
//         title.style.willChange = willChangeOriginale || 'auto';
//         title.style.pointerEvents = pointerEventsOriginale;
//         title.style.perspective = perspectiveOriginale;
//         title.style.transformStyle = transformStyleOriginale;

//         if (x) x.style.willChange = 'auto';
//         if (first) first.style.willChange = 'auto';

//         if (onComplete) onComplete();
//       },
//     });

//     // 1) Il titolo conquista il centro
//     this.tl.to(title, {
//       top: '50%',
//       left: '50%',
//       xPercent: -50,
//       yPercent: -50,
//       paddingTop: 210,
//       marginTop: 0,
//       scaleX: 1,
//       scaleY: 1,
//       duration: DURATA_ENTRATA_CENTRO,
//       ease: 'power3.inOut',
//     }, 0);

//     // 2) Il blocco si assesta, diventa piu' autorevole
//     this.tl.to(title, {
//       scale: 1.04,
//       duration: DURATA_ASSETTO,
//       ease: 'power2.out',
//     }, INIZIO_ASSETTO);

//     // 3) First si comprime leggermente e lascia protagonismo alla x
//     if (first) {
//       this.tl.to(first, {
//         scale: SCALA_FIRST_FINALE,
//         x: 18,
//         opacity: 0.96,
//         filter: 'brightness(0.92)',
//         duration: DURATA_CARICA_X,
//         ease: 'power2.inOut',
//       }, INIZIO_CARICA_X);
//     }

//     // 4) La x carica energia: cresce, avanza e si inclina in 3D
//     if (x) {
//       this.tl.to(x, {
//         scale: SCALA_X_FINALE,
//         rotationY: ROTAZIONE_X_Y,
//         rotationX: ROTAZIONE_X_X,
//         z: 180,
//         filter: 'brightness(1.28)',
//         duration: DURATA_CARICA_X,
//         ease: 'power3.out',
//       }, INIZIO_CARICA_X);
//     }

//     // 5) Split finale netto, da intro piattaforma
//     if (x) {
//       this.tl.to(x, {
//         x: SPOSTA_X,
//         rotationY: 8,
//         rotationX: 10,
//         z: 40,
//         filter: 'brightness(1.05)',
//         duration: DURATA_SPLIT,
//         ease: 'power3.inOut',
//       }, INIZIO_SPLIT);
//     }

//     if (first) {
//       this.tl.to(first, {
//         x: SPOSTA_FIRST,
//         scale: 0.68,
//         opacity: 0.92,
//         filter: 'brightness(0.88)',
//         duration: DURATA_SPLIT,
//         ease: 'power3.inOut',
//       }, INIZIO_SPLIT);
//     }

//     // 6) Il contenitore si rilassa appena dopo il picco
//     this.tl.to(title, {
//       scale: 1,
//       duration: 0.45,
//       ease: 'power2.out',
//     }, INIZIO_SPLIT + 0.55);
//   }

//   annulla(): void {
//     if (this.tl) {
//       this.tl.kill();
//       this.tl = null;
//     }
//   }
// }


// import { Injectable } from '@angular/core';
// import { gsap } from 'gsap';

// @Injectable({ providedIn: 'root' })
// export class SchedaPlayerTransizioneTitoloService {

//   private tl: gsap.core.Timeline | null = null;


// animaTitoloVersocentro(onComplete?: () => void): void {
//   const title = document.querySelector('.title-container') as HTMLElement | null;
//   if (!title) return;
//   this.annulla();

//   const first = document.querySelector('[data-titolo-first]') as HTMLElement | null;
//   const x     = document.querySelector('[data-titolo-x]')     as HTMLElement | null;

//   // ======================================================
//   // "MAGNETISMO INVERSO"
//   // attrazione → tensione → tremito → esplosione diagonale
//   // ======================================================
//   const DELAY_INIZIO  = 0.15;
//   const DURATA_RUSH   = 0.85;  // rush al centro

//   const INIZIO_ATTRAZ = DURATA_RUSH - 0.1;
//   const DURATA_ATTRAZ = 0.55;  // gli elementi si avvicinano come calamite

//   const INIZIO_REPULS = INIZIO_ATTRAZ + DURATA_ATTRAZ - 0.05;
//   const DURATA_REPULS = 1.0;   // esplosione diagonale

//   // Quanto si avvicinano prima di esplodere
//   const ATTRAZ_X  =   80;   // x si sposta verso first
//   const ATTRAZ_F  =  -60;   // first si sposta verso x

//   // Direzioni finali — diagonali, asimmetriche
//   const REP_X_X   = -2200;  // x:     sinistra
//   const REP_X_Y   =   600;  // x:     giù
//   const REP_F_X   =  1800;  // first: destra
//   const REP_F_Y   =  -500;  // first: su
//   // ======================================================

//   const transitionOriginale = title.style.transition;
//   title.style.transition  = 'none';
//   title.style.willChange  = 'transform';
//   title.style.pointerEvents = 'none';

//   gsap.set(x     ?? [], { transformOrigin: 'center center', transformPerspective: 1400 });
//   gsap.set(first ?? [], { transformOrigin: 'center center' });

//   this.tl = gsap.timeline({
//     delay: DELAY_INIZIO,
//     onComplete: () => {
//       title.style.transition = transitionOriginale;
//       title.style.willChange = 'auto';
//       if (onComplete) onComplete();
//     },
//   });

//   // 1) Rush al centro — deciso ma non brutale
//   this.tl.to(title, {
//     top: '50%', left: '50%',
//     xPercent: -50, yPercent: -50,
//     paddingTop: 210, marginTop: 0,
//     scaleX: 1, scaleY: 1,
//     duration: DURATA_RUSH,
//     ease: 'power3.inOut',
//   }, 0);

//   // 2) Attrazione: si avvicinano lentamente — il momento di "carica"
//   if (x) {
//     this.tl.to(x, {
//       x: ATTRAZ_X,
//       scaleX: 1.12,
//       duration: DURATA_ATTRAZ,
//       ease: 'power2.in',
//     }, INIZIO_ATTRAZ);
//   }
//   if (first) {
//     this.tl.to(first, {
//       x: ATTRAZ_F,
//       scale: 0.88,
//       duration: DURATA_ATTRAZ,
//       ease: 'power2.in',
//     }, INIZIO_ATTRAZ);
//   }

//   // 3) Tremito sul container — tensione prima dell'esplosione
//   this.tl.to(title, {
//     x: 5, duration: 0.04,
//     repeat: 6, yoyo: true, ease: 'none',
//   }, INIZIO_REPULS - 0.28);

//   // 4) Esplosione diagonale con tumbling e motion-blur
//   if (x) {
//     this.tl.to(x, {
//       x: REP_X_X,
//       y: REP_X_Y,
//       rotationZ: -24,          // tumble
//       rotationY:  38,          // svolta in 3D
//       scaleX: 2.6, scaleY: 0.45, // motion blur da velocità
//       opacity: 0,
//       transformPerspective: 1400,
//       duration: DURATA_REPULS,
//       ease: 'expo.in',         // lentissimo poi catapulta
//     }, INIZIO_REPULS);
//   }
//   if (first) {
//     this.tl.to(first, {
//       x: REP_F_X,
//       y: REP_F_Y,
//       rotationZ:  14,
//       scaleX: 1.9, scaleY: 0.55,
//       opacity: 0,
//       duration: DURATA_REPULS,
//       ease: 'expo.in',
//     }, INIZIO_REPULS);
//   }

//   // 5) Container evapora dopo lo split
//   this.tl.to(title, {
//     opacity: 0,
//     duration: 0.25,
//     ease: 'power2.in',
//   }, INIZIO_REPULS + 0.38);
// }
//   annulla(): void {
//     if (this.tl) {
//       this.tl.kill();
//       this.tl = null;
//     }
//   }
// }
