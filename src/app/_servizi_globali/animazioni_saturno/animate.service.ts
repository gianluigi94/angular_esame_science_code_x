import { Injectable } from '@angular/core';
import { gsap } from 'gsap';
import { CSSRulePlugin } from 'gsap/CSSRulePlugin'; //utile per animare pseudo elementi
import * as THREE from 'three';

export interface ClearcoatMaterial { // materiale threeJs che crea alone di luce
  clearcoat: number;
}

@Injectable({
  providedIn: 'root',
})
export class AnimateService {
  startWelcomeAnimation() {
    throw new Error('Method not implemented.');
  }



  // variabili usate per il controllo dell'animazione del cerchio di luce
  private duration: number = 1.85;
  private delay: number = 5;

  // riferimenti alle timeline principali (per poterle killare al cambio route)
   private mainTimeline: gsap.core.Timeline | null = null;
  private headerTimeline: gsap.core.Timeline | null = null;
  private lightTimeline: gsap.core.Timeline | null = null;
  private particlesTimeline: gsap.core.Timeline | null = null;
  private scrolTimeline: gsap.core.Timeline | null = null;
  private clearcoatTimeline: gsap.core.Timeline | null = null;
  private titoloInPosizioneAlta: boolean = false;

  public isTitoloInPosizioneAlta(): boolean {
    return this.titoloInPosizioneAlta;
  }

  constructor() {
    gsap.registerPlugin(CSSRulePlugin); //serve per animare pseudo elementi
  }

public animateScrolElement(scrolElement: HTMLElement): gsap.core.Timeline { // animazione dell'invito a scrollare la pagina
  // Creo una timeline con repeat infinito e un delay iniziale di 5 secondi,
  const scrolTimeline = gsap.timeline({
    repeat: -1,
    delay: 0,
    repeatDelay: 0, // nel caso volessi aumentare il tempo tra una serie e l'altra
  });

  // Imposto subito l'opacità a 0
  scrolTimeline.set(scrolElement, { opacity: 0 });

  // scritta non visibile per 3.64 secondi
  scrolTimeline.to(scrolElement, {
    duration: 0.24,
    opacity: 0,
    ease: 'none',
  });

  // scritta visibile per 1.45 secondi
  scrolTimeline.to(scrolElement, {
    duration: 2.45,
    opacity: 1,
    ease: 'none',
  });

  // scomparsa
  scrolTimeline.to(scrolElement, {
    duration: 0.91,
    opacity: 0,
    ease: 'none',
  });
this.scrolTimeline = scrolTimeline;
  // Alla fine di 6 secondi totali, la timeline riparte (ripetizione infinita)
  return scrolTimeline;
}

  /**
   * Funzione di utilità che verifica periodicamente la presenza
   * dell'elemento .loading-overlay nel DOM e risolve la Promise
   * quando non è più presente. Serve per aiutare a sincronizzare le animazioni, solo dopo che il loader è sparito
   */
  private waitForLoadingOverlayToDisappear(): Promise<void> {
  return new Promise<void>((resolve) => {
    const checkOverlay = () => {
      const overlay = document.querySelector('.loading-overlay');
      if (!overlay) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      } else {
        requestAnimationFrame(checkOverlay);
      }
    };
    checkOverlay();
  });
}

  /**
   * Animo gli elementi i titoli
   */
  public animateHeaderElements(
  firstElement: HTMLElement | null,
  xElement: HTMLElement | null
): gsap.core.Timeline {
  const headerTimeline = gsap.timeline();

  const xAfterRule = CSSRulePlugin.getRule('.x::after');

  // reset gif
  if (xAfterRule) {
    gsap.set(xAfterRule, { opacity: 0 });
  }

  // titolo prima parte
  if (firstElement) {
    headerTimeline.fromTo(
      firstElement,
      { translateX: '-40%', opacity: 0, scale: 0.7 },
      {
        translateX: '0%',
        opacity: 1,
        scale: 1,
        duration: 0.95,
        ease: 'power4.in',
      },
      0.0
    );
  }

  // X arancione
  if (xElement) {
    headerTimeline.fromTo(
      xElement,
      { x: '80%', opacity: 0, scale: 0.7 },
      {
        x: '0%',
        opacity: 1,
        scale: 1,
        duration: 0.95,
        ease: 'power4.in',
      },
      0.0
    );

    headerTimeline.to(
      xElement,
      {
        color: 'transparent',
        duration: 1,
        ease: 'power1.in',
      },
      1.25
    );
  }

  // X con gif
  if (xAfterRule) {
    headerTimeline.to(
      xAfterRule,
      {
        opacity: 1,
        duration: 2.4,
        ease: 'power1.in',
      },
      1.75
    );
  }

  this.headerTimeline = headerTimeline;
  return headerTimeline;
}


  /**
   * Anima la posizione della luce per rivelare saturno.
   */
  // DOPO
public animateLightPosition(light: THREE.DirectionalLight): gsap.core.Timeline {
  const lightTimeline = gsap.timeline();

  // Stato iniziale FORZATO ogni volta che rientri nella welcome:
  // - luce dietro al pianeta
  // - intensità a 0 (saturno completamente buio)
  gsap.set(light.position, { z: -13.1001 });
  gsap.set(light, { intensity: 0 });

  // In parallelo:
  // - la luce si avvicina (z: 5.1001)
  // - l'intensità sale a 2.8
  lightTimeline.to(
    light.position,
    {
      z: 9.4001,
      duration: 0.95,
      ease: 'power2.in',
    },
    0 // inizio subito
  );

  lightTimeline.to(
    light,
    {
      intensity: 2.8,
      duration: 0.95,
      ease: 'power2.in',
    },
    0 // inizio in parallelo allo spostamento
  );

  return lightTimeline;
}


  /**
   * Anima i gruppi di particelle, per dare l'effetto spinta veloce agli anelli di saturno, prima della rivelazione del pianeta e della scritta.
   */
  public animateParticleGroups(particleGroups: THREE.Group[]): gsap.core.Timeline { // CreO una funzione che riceve più gruppi 3D, li animO con GSAP e restituisce un'unica timeline sincronizzata per tutte le animazioni.
    const mainTimeline = gsap.timeline();

    particleGroups.forEach((group) => { // ciclo tutti i gruppi di particelle
      const originalSpeed = group.userData['rotationSpeed']; //recupero la velocità originale del campo userData
      const groupTl = gsap.timeline();

      groupTl.to(group.userData, {
        duration: 0.019,
        rotationSpeed: originalSpeed + 0.008, //appena l'animazione parte le particelle roteano più velocemente
        ease: 'power4.in',
      });

      groupTl.to(group.userData, {
        duration: 1.2,
        rotationSpeed: originalSpeed, // ritorna la velocità di default
        ease: 'power4.in',
      });

      mainTimeline.add(groupTl, 0); // agiungo la timeline nella timeline principale e la faccio partire all'inizio
    });

    return mainTimeline;
  }

  /**
   * Eseguo un ciclo di animazione sul clearcoat del materiale (anello di luce, riflesso).
   */
 public animateClearcoat(material: ClearcoatMaterial): void {
  if (this.clearcoatTimeline) {
    this.clearcoatTimeline.kill();
    this.clearcoatTimeline = null;
  }

  const tl = gsap.timeline({
    repeat: -1,
    repeatDelay: this.delay,
  });

  tl.to(material, {
    clearcoat: 0.5,
    duration: this.duration,
    ease: 'power1.inOut',
  }).to(material, {
    clearcoat: 0.155,
    duration: this.duration,
    ease: 'power1.inOut',
  });

  this.clearcoatTimeline = tl;
}
public pauseClearcoat(): void {
  if (this.clearcoatTimeline) {
    this.clearcoatTimeline.pause();
  }
}

public resumeClearcoat(): void {
  if (this.clearcoatTimeline) {
    this.clearcoatTimeline.play();
  }
}

// 🔹 NUOVO: forza la X "normale" arancione (gif spenta)
public setXNormale(): void {
  const xLow = document.querySelector('#x_low');
  const xHigh = document.querySelector('#x_hegh');

  if (xLow) {
       xLow.classList.add('x-orange');      // tengo SEMPRE 'x'
   xLow.classList.remove('x-low');      // opzionale: se vuoi spegnere la gif
  }
  if (xHigh) {
       xHigh.classList.add('x-orange');
   xHigh.classList.remove('x-high');
  }
}

// 🔹 NUOVO: ripristina la X con gif (stato iniziale)
public setXGif(): void {
  const xLow = document.querySelector('#x_low');
  const xHigh = document.querySelector('#x_hegh');

  if (xLow) {
    xLow.classList.remove('x-orange');
    xLow.classList.add('x', 'x-low');
  }
  if (xHigh) {
    xHigh.classList.remove('x-orange');
    xHigh.classList.add('x', 'x-high');
  }
}


  public async animateAll(
  firstElement: HTMLElement | null,
  xElement: HTMLElement | null,
  light: THREE.DirectionalLight | null,
  particleGroups: THREE.Group[] | null,
  onLightComplete?: () => void,
  onComplete?: () => void
): Promise<gsap.core.Timeline> {
this.preparaHeaderPrimaDelLoader(firstElement, xElement);
  await this.waitForLoadingOverlayToDisappear();

  const mainTimeline = gsap.timeline({
    paused: true, // 👈 parte in pausa
    onComplete: () => {
      if (onComplete) {
        onComplete();
      }
    },
  });

  // Header
  const headerTl = this.animateHeaderElements(firstElement, xElement);
  mainTimeline.add(headerTl, 0);

  // Luce
  if (light) {
    const lightTl = this.animateLightPosition(light);
    this.lightTimeline = lightTl;

    if (onLightComplete) {
      lightTl.eventCallback('onComplete', onLightComplete);
    }

    mainTimeline.add(lightTl, 0);
  }

  // Particelle
  if (particleGroups && particleGroups.length > 0) {
    const particlesTl = this.animateParticleGroups(particleGroups);
    this.particlesTimeline = particlesTl;
    mainTimeline.add(particlesTl, 0);
  }

  this.mainTimeline = mainTimeline;

gsap.delayedCall(0, () => mainTimeline.play(0));

return mainTimeline;
}



    // DOPO
public resetAnimations(): void {
  if (this.mainTimeline) {
    this.mainTimeline.kill();
    this.mainTimeline = null;
  }
  if (this.headerTimeline) {
    this.headerTimeline.kill();
    this.headerTimeline = null;
  }
  if (this.lightTimeline) {
    this.lightTimeline.kill();
    this.lightTimeline = null;
  }
  if (this.particlesTimeline) {
    this.particlesTimeline.kill();
    this.particlesTimeline = null;
  }
  if (this.scrolTimeline) {
    this.scrolTimeline.kill();
    this.scrolTimeline = null;
  }
  if (this.clearcoatTimeline) {
    this.clearcoatTimeline.kill();
    this.clearcoatTimeline = null;
  }

  this.titoloInPosizioneAlta = false;

  const xAfterRule = CSSRulePlugin.getRule('.x::after');
  if (xAfterRule) {
    gsap.set(xAfterRule, { opacity: 0 });
  }
}

private getTitoloAltoConfig(): {
  top: number;
  left: number;
  scaleX: number;
  scaleY: number;
  xPercent: number;
  yPercent: number;
} {
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
    topValue = 12;
  }

  const softOffset = ((1 - scaleValue) * 100) / 2;
  const isTablet = window.innerWidth <= 868;

  return {
    top: topValue,
    left: leftValue,
    scaleX,
    scaleY,
    xPercent: isTablet ? -softOffset : -softOffset * 1.1,
    yPercent: -softOffset,
  };
}

public setTitoloAlto(title: HTMLElement): void {
  const cfg = this.getTitoloAltoConfig();
  gsap.set(title, {
    top: cfg.top,
    left: cfg.left,
    xPercent: cfg.xPercent,
    yPercent: cfg.yPercent,
    paddingTop: 0,
    marginTop: 0,
    scaleX: cfg.scaleX,
    scaleY: cfg.scaleY,
    transformOrigin: 'center center',
  });
}

public animateTitoloVersoAlto(
  title: HTMLElement,
  duration: number = 0.85,
  delay: number = 0.2
): void {
  const cfg = this.getTitoloAltoConfig();
  gsap.to(title, {
    top: cfg.top,
    left: cfg.left,
    xPercent: cfg.xPercent,
    yPercent: cfg.yPercent,
    paddingTop: 0,
    marginTop: 0,
    scaleX: cfg.scaleX,
    scaleY: cfg.scaleY,
    duration,
    delay,
    ease: 'power2.inOut',
    onComplete: () => {
      this.titoloInPosizioneAlta = true;
    },
  });
}



// 🔹 NUOVO: anima il titolo verso l'alto cercando la .title-container nel DOM
// DOPO
public animateTitoloVersoAltoGlobal(
  durata: number = 0.85,
  delay: number = 0.2
): void {
  const title = document.querySelector('.title-container') as HTMLElement | null;
  const subtitle = document.querySelector('.subtitle') as HTMLElement | null;
  const scrol = document.querySelector('.scrol') as HTMLElement | null;

  if (subtitle) {
    gsap.killTweensOf(subtitle);
    gsap.set(subtitle, { opacity: 0, display: 'none' });
  }

  if (scrol) {
    gsap.killTweensOf(scrol);
    gsap.set(scrol, { opacity: 0 });
  }

  if (title) {
    // 🔹 aspetto 100ms prima di rendere il titolo "cliccabile"
    setTimeout(() => {
      title.classList.add('titolo-alto');
    }, 1000);

    this.animateTitoloVersoAlto(title, durata, delay);
  }
}




public animateTitoloVersoCentroGlobal(
  durata: number = 0.85,
  delay: number = 0.2
): void {
  const title = document.querySelector('.title-container') as HTMLElement | null;
  const subtitle = document.querySelector('.subtitle') as HTMLElement | null;

  if (title) {
    // 🔹 tornando al centro niente mano, niente interazione
    title.classList.remove('titolo-alto');

    gsap.to(title, {
      top: '50%',
      left: '50%',
      xPercent: -50,
      yPercent: -50,
      paddingTop: 210,
      marginTop: 0,
      scaleX: 1,
      scaleY: 1,
      duration: durata,
      delay,
      ease: 'power2.inOut',
      onComplete: () => {
        this.titoloInPosizioneAlta = false;
      },
    });
  }

  if (subtitle) {
    gsap.killTweensOf(subtitle);
    gsap.set(subtitle, { display: 'block' });
    gsap.to(subtitle, {
      opacity: 1,
      duration: 0.5,
      delay,
      ease: 'power1.out',
    });
  }
}



public setTitoloCentrale(title: HTMLElement): void {
  gsap.set(title, {
    top: '50%',
    left: '50%',
    xPercent: -50,
    yPercent: -50,
    paddingTop: 210,
    marginTop: 0,
    scaleX: 1,
    scaleY: 1,
    transformOrigin: 'center center',
  });

  this.titoloInPosizioneAlta = false;
}

public setTitoloCentraleGlobal(): void {
  const title = document.querySelector('.title-container') as HTMLElement | null;
  const subtitle = document.querySelector('.subtitle') as HTMLElement | null;

  if (title) {
    title.classList.remove('titolo-alto');  // 🔹 nessuna mano al centro
    this.setTitoloCentrale(title);
  }

  if (subtitle) {
    gsap.killTweensOf(subtitle);
    gsap.set(subtitle, { opacity: 1, display: 'block' });
  }

  this.titoloInPosizioneAlta = false;
}

/* ✅ NUOVO: stato finale immediato (senza animazione) */
public setTitoloAltoGlobal(): void {
  const title = document.querySelector('.title-container') as HTMLElement | null;
  const subtitle = document.querySelector('.subtitle') as HTMLElement | null;
  const scrol = document.querySelector('.scrol') as HTMLElement | null;

  if (subtitle) {
    gsap.killTweensOf(subtitle);
    gsap.set(subtitle, { opacity: 0, display: 'none' });
  }

  if (scrol) {
    gsap.killTweensOf(scrol);
    gsap.set(scrol, { opacity: 0 });
  }

  if (title) {
    title.classList.add('titolo-alto');
    this.setTitoloAlto(title);
  }

  this.titoloInPosizioneAlta = true;
}


public fadeOutSaturnoESfondo(
  durata: number = 1,
  onComplete?: () => void
): void {
  const saturno = document.querySelector('app-saturno') as HTMLElement | null;
  const sfondo = document.querySelector('app-sfondo') as HTMLElement | null;

  const tl = gsap.timeline({
    onComplete: () => {
      if (onComplete) {
        onComplete();
      }
    },
  });

  if (saturno) {
    tl.to(
      saturno,
      {
        opacity: 0,
        duration: durata,
        ease: 'power2.out',
      },
      0
    );
  }

  if (sfondo) {
    tl.to(
      sfondo,
      {
        opacity: 0,
        duration: durata,
        ease: 'power2.out',
      },
      0
    );
  }
}


public enablePageScroll(): void {
  const html = document.documentElement;
  const body = document.body;

  html.classList.add('scrollable');
  body.classList.add('scrollable');
}

public disablePageScroll(): void {
  const html = document.documentElement;
  const body = document.body;

  html.classList.remove('scrollable');
  body.classList.remove('scrollable');
}

private preparaHeaderPrimaDelLoader(
  firstElement: HTMLElement | null,
  xElement: HTMLElement | null
): void {
  try {
    const xAfterRule = CSSRulePlugin.getRule('.x::after');
    if (xAfterRule) gsap.set(xAfterRule, { opacity: 0 });
  } catch {}

  try {
    if (firstElement) gsap.set(firstElement, { opacity: 0 });
  } catch {}

  try {
    if (xElement) gsap.set(xElement, { opacity: 0 });
  } catch {}
}



}
