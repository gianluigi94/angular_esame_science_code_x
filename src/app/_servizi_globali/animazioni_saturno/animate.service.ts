// Service che orchestra le animazioni principali della welcome, del titolo, della scena e del clearcoat.

import { Injectable } from '@angular/core';
import { gsap } from 'gsap';
import { CSSRulePlugin } from 'gsap/CSSRulePlugin';
import * as THREE from 'three';

import { AnimateTitoloHelper } from './animate_helpers/animate-titolo.helper';
import { AnimateIngressoHelper } from './animate_helpers/animate-ingresso.helper';
import { AnimateSceneHelper } from './animate_helpers/animate-scene.helper';
import {
  AnimateClearcoatHelper,
  ClearcoatMaterial,
} from './animate_helpers/animate-clearcoat.helper';

export type { ClearcoatMaterial };

@Injectable({ providedIn: 'root' })
export class AnimateService {
  private readonly titolo = new AnimateTitoloHelper(); // conservo l'helper dedicato alla gestione del titolo e della X
  private readonly ingresso = new AnimateIngressoHelper(); // conservo l'helper dedicato alle animazioni di ingresso
  private readonly scena = new AnimateSceneHelper(); // conservo l'helper dedicato al fade della scena e dello sfondo
  private readonly clearcoat = new AnimateClearcoatHelper(); // conservo l'helper dedicato all'animazione del clearcoat

  private mainTimeline: gsap.core.Timeline | null = null; // conservo la timeline principale di orchestrazione
  private headerTimeline: gsap.core.Timeline | null = null; // conservo la timeline dedicata all'header
  private lightTimeline: gsap.core.Timeline | null = null; // conservo la timeline dedicata alla luce
  private particlesTimeline: gsap.core.Timeline | null = null; // conservo la timeline dedicata ai gruppi particellari
  private scrolTimeline: gsap.core.Timeline | null = null; // conservo la timeline dedicata all'elemento scrol

  constructor() {
    gsap.registerPlugin(CSSRulePlugin); // registro il plugin CSSRulePlugin in GSAP
  }

  /**
   * Punto di ingresso placeholder per l'animazione welcome.
   *
   * @returns void
   */
  startWelcomeAnimation() {
    throw new Error('Method not implemented.'); // segnalo che questo metodo non e' stato ancora implementato
  }

  /**
   * Restituisce lo stato corrente del titolo rispetto alla posizione alta.
   *
   * @returns boolean
   */
  public isTitoloInPosizioneAlta(): boolean {
    return this.titolo.titoloInPosizioneAlta; // restituisco il flag interno che indica se il titolo e' in posizione alta
  }

  /**
   * Imposta globalmente il titolo nella posizione alta.
   *
   * @returns void
   */
  public setTitoloAltoGlobal(): void {
    this.titolo.setTitoloAltoGlobal(); // delego all'helper del titolo l'impostazione immediata della posizione alta
  }

  /**
   * Imposta globalmente il titolo nella posizione centrale.
   *
   * @returns void
   */
  public setTitoloCentraleGlobal(): void {
    this.titolo.setTitoloCentraleGlobal(); // delego all'helper del titolo l'impostazione immediata della posizione centrale
  }

  /**
   * Anima globalmente il titolo verso la posizione alta.
   *
   * @param durata Durata dell'animazione.
   * @param delay Ritardo iniziale dell'animazione.
   * @returns void
   */
  public animateTitoloVersoAltoGlobal(durata = 0.85, delay = 0.2): void {
    this.titolo.animateTitoloVersoAltoGlobal(durata, delay); // delego all'helper del titolo l'animazione verso l'alto
  }

  /**
   * Anima globalmente il titolo verso la posizione centrale.
   *
   * @param durata Durata dell'animazione.
   * @param delay Ritardo iniziale dell'animazione.
   * @returns void
   */
  public animateTitoloVersoCentroGlobal(durata = 0.85, delay = 0.2): void {
    this.titolo.animateTitoloVersoCentroGlobal(durata, delay); // delego all'helper del titolo l'animazione verso il centro
  }

  /**
   * Imposta la X nello stato normale.
   *
   * @returns void
   */
  public setXNormale(): void {
    this.titolo.setXNormale(); // delego all'helper del titolo il ripristino della X normale
  }

  /**
   * Imposta la X nello stato GIF.
   *
   * @returns void
   */
  public setXGif(): void {
    this.titolo.setXGif(); // delego all'helper del titolo l'attivazione della X in stato GIF
  }

  /**
   * Forza il refresh delle GIF della X.
   *
   * @returns void
   */
  public refreshXGif(): void {
    this.titolo.refreshXGif(); // delego all'helper del titolo il refresh delle GIF della X
  }

  /**
   * Esegue il fade out di Saturno e dello sfondo.
   *
   * @param durata Durata del fade.
   * @param onComplete Callback opzionale eseguita al termine.
   * @returns void
   */
  public fadeOutSaturnoESfondo(durata = 1, onComplete?: () => void): void {
    this.scena.fadeOutSaturnoESfondo(durata, onComplete); // delego all'helper della scena il fade out di Saturno e sfondo
  }

  /**
   * Esegue il fade in del solo sfondo.
   *
   * @param durata Durata del fade.
   * @param delay Ritardo iniziale del fade.
   * @returns void
   */
  public fadeInSoloSfondo(durata = 1, delay = 0): void {
    this.scena.fadeInSoloSfondo(durata, delay); // delego all'helper della scena il fade in del solo sfondo
  }

  /**
   * Abilita lo scroll della pagina.
   *
   * @returns void
   */
  public enablePageScroll(): void {
    this.scena.enablePageScroll(); // delego all'helper della scena la riabilitazione dello scroll pagina
  }

  /**
   * Disabilita lo scroll della pagina.
   *
   * @returns void
   */
  public disablePageScroll(): void {
    this.scena.disablePageScroll(); // delego all'helper della scena la disabilitazione dello scroll pagina
  }

  /**
   * Avvia l'animazione del clearcoat sul materiale ricevuto.
   *
   * @param material Materiale compatibile con l'animazione clearcoat.
   * @returns void
   */
  public animateClearcoat(material: ClearcoatMaterial): void {
    this.clearcoat.animateClearcoat(material); // delego all'helper clearcoat l'avvio dell'animazione sul materiale
  }

  /**
   * Mette in pausa l'animazione del clearcoat.
   *
   * @returns void
   */
  public pauseClearcoat(): void {
    this.clearcoat.pauseClearcoat(); // delego all'helper clearcoat la pausa dell'animazione
  }

  /**
   * Riprende l'animazione del clearcoat.
   *
   * @returns void
   */
  public resumeClearcoat(): void {
    this.clearcoat.resumeClearcoat(); // delego all'helper clearcoat la ripresa dell'animazione
  }

  /**
   * Crea e restituisce la timeline ciclica dell'elemento scrol.
   *
   * @param scrolElement Elemento HTML da animare.
   * @returns gsap.core.Timeline
   */
  public animateScrolElement(scrolElement: HTMLElement): gsap.core.Timeline {
    const scrolTimeline = gsap.timeline({
      repeat: -1,
      delay: 0,
      repeatDelay: 0,
    }); // creo la timeline infinita dell'elemento scrol
    scrolTimeline.set(scrolElement, { opacity: 0 }); // imposto lo stato iniziale invisibile dell'elemento
    scrolTimeline.to(scrolElement, {
      duration: 0.24,
      opacity: 0,
      ease: 'none',
    }); // mantengo inizialmente l'elemento invisibile
    scrolTimeline.to(scrolElement, {
      duration: 2.45,
      opacity: 1,
      ease: 'none',
    }); // faccio comparire gradualmente l'elemento
    scrolTimeline.to(scrolElement, {
      duration: 0.91,
      opacity: 0,
      ease: 'none',
    }); // faccio scomparire di nuovo l'elemento
    this.scrolTimeline = scrolTimeline; // salvo il riferimento alla timeline dello scrol
    return scrolTimeline; // restituisco la timeline creata
  }

  /**
   * Crea e restituisce la timeline delle animazioni dell'header.
   *
   * @param firstElement Primo elemento del titolo.
   * @param xElement Elemento X del titolo.
   * @returns gsap.core.Timeline
   */
  public animateHeaderElements(
    firstElement: HTMLElement | null,
    xElement: HTMLElement | null,
  ): gsap.core.Timeline {
    const headerTimeline = gsap.timeline(); // creo la timeline dedicata agli elementi dell'header
    const xAfterRule = CSSRulePlugin.getRule('.x::after'); // recupero la regola CSS dello pseudo-elemento della X

    if (xAfterRule) gsap.set(xAfterRule, { opacity: 0 }); // porto inizialmente a zero l'opacita' dello pseudo-elemento della X

    if (firstElement) {
      // controllo se il primo elemento dell'header esiste
      headerTimeline.fromTo(
        firstElement, // animo il primo elemento dell'header
        { translateX: '-40%', opacity: 0, scale: 0.7 }, // preparo lo stato iniziale spostato, invisibile e ridotto
        {
          translateX: '0%',
          opacity: 1,
          scale: 1,
          duration: 0.95,
          ease: 'power4.in',
        }, // porto l'elemento nello stato finale visibile e in posizione
        0.0, // faccio partire questa animazione dall'inizio della timeline
      );
    }

    if (xElement) {
      // controllo se l'elemento X esiste
      headerTimeline.fromTo(
        xElement, // animo l'elemento X
        { x: '80%', opacity: 0, scale: 0.7 }, // preparo lo stato iniziale spostato a destra, invisibile e ridotto
        { x: '0%', opacity: 1, scale: 1, duration: 0.95, ease: 'power4.in' }, // porto l'elemento X nello stato finale visibile e in posizione
        0.0, // faccio partire questa animazione dall'inizio della timeline
      );
      headerTimeline.to(
        xElement,
        { color: 'transparent', duration: 1, ease: 'power1.in' },
        1.25,
      ); // rendo trasparente il colore della X dopo l'ingresso
    }

    if (xAfterRule) {
      // controllo se la regola dello pseudo-elemento esiste
      headerTimeline.to(
        xAfterRule,
        { opacity: 1, duration: 2.4, ease: 'power1.in' },
        1.75,
      ); // faccio comparire gradualmente lo pseudo-elemento della X
    }

    this.headerTimeline = headerTimeline; // salvo il riferimento alla timeline dell'header
    return headerTimeline; // restituisco la timeline creata
  }

  /**
   * Orchestrato principale che attende il loader e poi avvia header, luce e particelle.
   *
   * @param firstElement Primo elemento del titolo.
   * @param xElement Elemento X del titolo.
   * @param light Luce direzionale opzionale da animare.
   * @param particleGroups Gruppi particellari opzionali da animare.
   * @param onLightComplete Callback opzionale al termine dell'animazione luce.
   * @param onComplete Callback opzionale al termine della timeline principale.
   * @returns Promise<gsap.core.Timeline>
   */
  public async animateAll(
    firstElement: HTMLElement | null,
    xElement: HTMLElement | null,
    light: THREE.DirectionalLight | null,
    particleGroups: THREE.Group[] | null,
    onLightComplete?: () => void,
    onComplete?: () => void,
  ): Promise<gsap.core.Timeline> {
    this.preparaHeaderPrimaDelLoader(firstElement, xElement); // preparo header e pseudo-elemento prima della scomparsa del loader
    await this.waitForLoadingOverlayToDisappear(); // aspetto che il loading overlay sparisca del tutto

    const mainTimeline = gsap.timeline({
      paused: true, // creo la timeline principale inizialmente in pausa
      onComplete: () => {
        if (onComplete) onComplete();
      }, // eseguo la callback finale se presente al completamento
    });

    mainTimeline.add(this.animateHeaderElements(firstElement, xElement), 0); // aggiungo la timeline dell'header all'inizio dell'orchestrazione principale

    if (light) {
      // controllo se ho ricevuto una luce da animare
      const lightTl = this.ingresso.animateLightPosition(light); // creo la timeline di ingresso della luce
      this.lightTimeline = lightTl; // salvo il riferimento alla timeline della luce
      if (onLightComplete) lightTl.eventCallback('onComplete', onLightComplete); // collego la callback di completamento luce se presente
      mainTimeline.add(lightTl, 0); // aggiungo la timeline della luce all'inizio della timeline principale
    }

    if (particleGroups && particleGroups.length > 0) {
      // controllo se ho ricevuto gruppi particellari validi da animare
      const particlesTl = this.ingresso.animateParticleGroups(particleGroups); // creo la timeline di ingresso dei gruppi particellari
      this.particlesTimeline = particlesTl; // salvo il riferimento alla timeline delle particelle
      mainTimeline.add(particlesTl, 0); // aggiungo la timeline delle particelle all'inizio della timeline principale
    }

    this.mainTimeline = mainTimeline; // salvo il riferimento alla timeline principale
    gsap.delayedCall(0, () => mainTimeline.play(0)); // faccio partire la timeline principale con una delayed call immediata
    return mainTimeline; // restituisco la timeline principale creata
  }

  /**
   * Ferma e resetta tutte le timeline e gli stati interni delle animazioni.
   *
   * @returns void
   */
  public resetAnimations(): void {
    this.mainTimeline?.kill();
    this.mainTimeline = null; // uccido e azzero la timeline principale se esiste
    this.headerTimeline?.kill();
    this.headerTimeline = null; // uccido e azzero la timeline dell'header se esiste
    this.lightTimeline?.kill();
    this.lightTimeline = null; // uccido e azzero la timeline della luce se esiste
    this.particlesTimeline?.kill();
    this.particlesTimeline = null; // uccido e azzero la timeline delle particelle se esiste
    this.scrolTimeline?.kill();
    this.scrolTimeline = null; // uccido e azzero la timeline dello scrol se esiste
    this.clearcoat.kill(); // fermo completamente l'animazione del clearcoat

    this.titolo.titoloInPosizioneAlta = false; // resetto il flag interno che traccia la posizione alta del titolo

    const xAfterRule = CSSRulePlugin.getRule('.x::after'); // recupero la regola CSS dello pseudo-elemento della X
    if (xAfterRule) gsap.set(xAfterRule, { opacity: 0 }); // ripristino l'opacita' a zero dello pseudo-elemento della X
  }

  /**
   * Prepara gli elementi dell'header prima della scomparsa del loader.
   *
   * @param firstElement Primo elemento del titolo.
   * @param xElement Elemento X del titolo.
   * @returns void
   */
  private preparaHeaderPrimaDelLoader(
    firstElement: HTMLElement | null,
    xElement: HTMLElement | null,
  ): void {
    try {
      const r = CSSRulePlugin.getRule('.x::after');
      if (r) gsap.set(r, { opacity: 0 });
    } catch {} // provo a nascondere subito lo pseudo-elemento della X
    try {
      if (firstElement) gsap.set(firstElement, { opacity: 0 });
    } catch {} // provo a nascondere subito il primo elemento del titolo
    try {
      if (xElement) gsap.set(xElement, { opacity: 0 });
    } catch {} // provo a nascondere subito l'elemento X del titolo
  }

  /**
   * Attende che il loading overlay sparisca dal DOM prima di proseguire.
   *
   * @returns Promise<void>
   */
  private waitForLoadingOverlayToDisappear(): Promise<void> {
    return new Promise<void>((resolve) => {
      // creo una promise che si risolve quando il loader sparisce
      const checkOverlay = () => {
        // preparo la funzione ricorsiva di controllo del loader
        const overlay = document.querySelector('.loading-overlay'); // recupero l'eventuale loading overlay dal DOM
        if (!overlay) {
          // controllo se il loader non esiste piu'
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())); // aspetto due frame e poi risolvo la promise
        } else {
          requestAnimationFrame(checkOverlay); // riprogrammo il controllo al frame successivo
        }
      };
      checkOverlay(); // avvio il primo controllo del loader
    });
  }
}
