// Service orchestratore che gestisce setup, destroy e ripristino delle animazioni scroll della welcome.

import { Injectable } from '@angular/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
import { AnimateService } from '../animate.service';
import { SaturnoPosizioniService } from '../saturno_posizioni.service';
import { isMobileOrTablet } from 'src/app/_helpers_globali/helpers';

import { ScrollWelcomeState } from './scroll_welcome/scroll-welcome-state';
import { ScrollWelcomeSaturnoHelper } from './scroll_welcome/scroll-welcome-saturno.helper';
import { ScrollWelcomeUiHelper } from './scroll_welcome/scroll-welcome-ui.helper';
import { ScrollWelcomeLoopingHelper } from './scroll_welcome/scroll-welcome-looping.helper';

gsap.registerPlugin(ScrollTrigger); // registro il plugin ScrollTrigger in GSAP

@Injectable({ providedIn: 'root' })
export class ScrollWelcomeService {
  private readonly state = new ScrollWelcomeState(); // conservo lo stato condiviso delle animazioni welcome
  private readonly saturno: ScrollWelcomeSaturnoHelper; // conservo l'helper dedicato alle animazioni di Saturno
  private readonly ui: ScrollWelcomeUiHelper; // conservo l'helper dedicato agli elementi UI
  private readonly looping: ScrollWelcomeLoopingHelper; // conservo l'helper dedicato alle animazioni cicliche

  private resizeHandler: (() => void) | null = null; // conservo il riferimento all'handler del resize
  private orientationHandler: (() => void) | null = null; // conservo il riferimento all'handler del cambio orientamento
  private visibilityHandler: (() => void) | null = null; // conservo il riferimento all'handler di visibilitychange

  constructor(
    private animateService: AnimateService,
    private saturnoPosizioniService: SaturnoPosizioniService,
  ) {
    this.saturno = new ScrollWelcomeSaturnoHelper(
      this.state,
      saturnoPosizioniService,
    ); // inizializzo l'helper di Saturno con lo stato condiviso
    this.ui = new ScrollWelcomeUiHelper(this.state, animateService); // inizializzo l'helper UI con lo stato condiviso
    this.looping = new ScrollWelcomeLoopingHelper(this.state); // inizializzo l'helper dei loop con lo stato condiviso
  }

  /**
   * Avvia tutte le animazioni e registra gli handler necessari della welcome.
   *
   * @param scene Scena Three.js principale.
   * @param camera Camera Three.js corrente.
   * @param light Luce direzionale associata alla scena.
   * @returns void
   */
  public runAllAnimations(
    scene: THREE.Scene,
    camera: THREE.Camera,
    light: THREE.DirectionalLight,
  ): void {
    const scrollerEl = document.querySelector(
      '.main-scroll',
    ) as HTMLElement | null; // recupero l'elemento scroller principale
    this.ripristinaScrollSeNecessario(scrollerEl); // provo a ripristinare la posizione scroll salvata se serve

    const title = document.querySelector('.title-container') as HTMLElement; // recupero il contenitore del titolo
    gsap.set(title, {
      top: '50%',
      left: '50%',
      xPercent: -50,
      yPercent: -50,
      paddingTop: 210,
    }); // imposto il titolo nella posizione iniziale centrale

    this.createScrollTriggers(scene, title, light); // creo tutti i trigger necessari della welcome
    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      ScrollTrigger.update();
    }); // forzo refresh e update dei trigger al frame successivo

    this.setupResizeHandler(scene, title, light); // registro l'handler del resize
    this.setupOrientationHandler(); // registro l'handler del cambio orientamento
    this.setupVisibilityHandler(scrollerEl); // registro l'handler del cambio visibilita' pagina
  }

  /**
   * Ferma tutte le animazioni scroll e rimuove gli event handler registrati.
   *
   * @returns void
   */
  public stopAllScrollAnimations(): void {
    this.destroyScrollTriggers(); // distruggo tutti i trigger e le timeline attive
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    } // rimuovo l'handler resize se esiste
    if (this.orientationHandler) {
      window.removeEventListener('orientationchange', this.orientationHandler);
      this.orientationHandler = null;
    } // rimuovo l'handler orientationchange se esiste
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    } // rimuovo l'handler visibilitychange se esiste
  }

  /**
   * Anima il ritorno di Saturno verso la posa alta della welcome.
   *
   * @param scene Scena Three.js da animare.
   * @param light Luce direzionale da sincronizzare.
   * @param durata Durata dell'animazione di ritorno.
   * @returns void
   */
  public animaRitornoVersoAlto(
    scene: THREE.Scene,
    light: THREE.DirectionalLight,
    durata = 0.87,
  ): void {
    const poseAlto = this.saturnoPosizioniService.getPose('WELCOME_ALTO'); // recupero la posa alta della welcome
    gsap.killTweensOf(scene.scale); // fermo eventuali tween attivi sulla scala della scena
    gsap.killTweensOf(scene.position); // fermo eventuali tween attivi sulla posizione della scena
    gsap.killTweensOf(scene.rotation); // fermo eventuali tween attivi sulla rotazione della scena
    gsap.killTweensOf(light.position); // fermo eventuali tween attivi sulla posizione della luce

    gsap.to(scene.scale, {
      x: poseAlto.scale.x,
      y: poseAlto.scale.y,
      z: poseAlto.scale.z,
      duration: durata,
      ease: 'power2.inOut',
    }); // animo la scala della scena verso la posa alta
    gsap.to(light.position, {
      z: 10.1001,
      duration: durata,
      ease: 'power2.inOut',
    }); // animo la luce verso la profondita' della posa alta
    gsap.to(scene.rotation, {
      z: poseAlto.rotation.z,
      duration: durata,
      ease: 'power1.out',
    }); // animo la rotazione z verso la posa alta
    gsap.to(scene.rotation, {
      y: poseAlto.rotation.y,
      duration: durata,
      ease: 'power4.out',
    }); // animo la rotazione y verso la posa alta

    const curveProxy = { t: 1.1 }; // preparo il proxy numerico per il ritorno sulla curva
    gsap.to(curveProxy, {
      t: 0,
      duration: durata,
      ease: 'none', // animo il parametro della curva dal valore basso al valore alto
      onUpdate: () => {
        const t = curveProxy.t; // leggo il valore corrente del parametro curva
        const baseY = window.innerWidth <= 868 ? -3.6 : -3.4; // scelgo la base verticale in modo responsive
        scene.position.x = 3.1 * t + 1.2 * Math.sin(Math.PI * t); // aggiorno la coordinata x lungo la curva sinusoidale
        scene.position.y = baseY * Math.pow(t, 2); // aggiorno la coordinata y lungo la parabola
      },
      onComplete: () => {
        scene.position.x = poseAlto.position.x; // riallineo esattamente la coordinata x finale alla posa alta
        scene.position.y = poseAlto.position.y; // riallineo esattamente la coordinata y finale alla posa alta
      },
    });
  }

  /**
   * Crea tutti i trigger necessari della welcome delegando agli helper dedicati.
   *
   * @param scene Scena Three.js principale.
   * @param title Elemento HTML del titolo.
   * @param light Luce direzionale associata alla scena.
   * @returns void
   */
  private createScrollTriggers(
    scene: THREE.Scene,
    title: HTMLElement,
    light: THREE.DirectionalLight,
  ): void {
    this.saturno.crea(scene, light); // creo i trigger dedicati a Saturno
    this.ui.creaTitleTrigger(title); // creo il trigger dedicato al titolo
    this.ui.creaSubtitleTrigger(); // creo il trigger dedicato al sottotitolo
    this.ui.creaScrolTrigger(); // creo i trigger dedicati a scrol e X
    this.ui.creaCtaTrigger(); // creo il trigger dedicato alla CTA
    this.ui.creaEmailFormTrigger(); // creo il trigger dedicato al form email
    this.looping.setupDefault(); // creo i loop standard dei container welcome
    this.ui.creaFooterTrigger(); // creo i trigger dedicati al footer
  }

  /**
   * Distrugge trigger, timeline e delayed call registrati nello stato condiviso.
   *
   * @returns void
   */
  private destroyScrollTriggers(): void {
    this.state.triggers.forEach((t) => t.kill()); // distruggo tutti gli ScrollTrigger salvati
    this.state.triggers = []; // svuoto l'array dei trigger
    this.state.scrolTimeline?.kill(); // distruggo la timeline dello scrol se esiste
    this.state.scrolTimeline = undefined; // azzero il riferimento alla timeline dello scrol
    this.state.loopingTimelines.forEach((tl) => tl.kill()); // distruggo tutte le timeline cicliche
    this.state.loopingTimelines = []; // svuoto l'array delle timeline cicliche
    this.state.loopingDelayedCalls.forEach((dc) => dc.kill()); // distruggo tutti i delayed call dei loop
    this.state.loopingDelayedCalls = []; // svuoto l'array dei delayed call
  }

  /**
   * Ripristina la posizione di scroll salvata se la pagina corrente e' la welcome.
   *
   * @param scrollerEl Elemento scroller principale.
   * @returns void
   */
  private ripristinaScrollSeNecessario(scrollerEl: HTMLElement | null): void {
    const shouldRestore = sessionStorage.getItem('welcome_restore') === '1'; // verifico se e' richiesto il ripristino dello scroll
    const saved = sessionStorage.getItem('welcome_scrollTop'); // recupero l'eventuale valore salvato di scrollTop
    const isWelcome = /^\/(it|en)\/(benvenuto|welcome)(\/|$)/.test(
      (window.location.pathname || '').split('?')[0].split('#')[0],
    ); // verifico se il path corrente appartiene alla welcome
    if (scrollerEl && isWelcome && shouldRestore && saved) {
      // controllo che tutte le condizioni per il ripristino siano soddisfatte
      const v = Number(saved); // converto il valore salvato in numero
      if (!Number.isNaN(v) && v > 0) scrollerEl.scrollTop = v; // ripristino scrollTop solo se il valore e' valido e positivo
    }
    sessionStorage.removeItem('welcome_restore'); // pulisco il flag di ripristino dallo storage
    sessionStorage.removeItem('welcome_scrollTop'); // pulisco il valore salvato di scrollTop dallo storage
  }

  /**
   * Registra l'handler di resize e ricrea i trigger mantenendo lo stato corretto.
   *
   * @param scene Scena Three.js principale.
   * @param title Elemento HTML del titolo.
   * @param light Luce direzionale associata alla scena.
   * @returns void
   */
  private setupResizeHandler(
    scene: THREE.Scene,
    title: HTMLElement,
    light: THREE.DirectionalLight,
  ): void {
    this.resizeHandler = () => {
      // preparo l'handler del resize della finestra
      if (isMobileOrTablet()) return; // esco subito se sono su mobile o tablet
      const scrollerEl = document.querySelector(
        '.main-scroll',
      ) as HTMLElement | null; // recupero di nuovo lo scroller principale
      const triggerEl = document.querySelector(
        '#saturno-scrolle',
      ) as HTMLElement | null; // recupero di nuovo l'elemento trigger di Saturno
      const eraScrollato =
        scrollerEl && triggerEl
          ? triggerEl.getBoundingClientRect().top <=
            scrollerEl.getBoundingClientRect().top + 10
          : false; // verifico se prima del resize la sezione era gia' oltre la soglia attiva

      this.destroyScrollTriggers(); // distruggo tutti i trigger correnti prima di ricrearli
      this.state.restoringFromResize = eraScrollato; // salvo nello stato se sto ripristinando una situazione gia' scrollata
      this.createScrollTriggers(scene, title, light); // ricreo tutti i trigger con i nuovi valori responsive
      ScrollTrigger.refresh(); // forzo il refresh dei trigger
      ScrollTrigger.update(); // forzo l'update immediato dei trigger
      this.state.restoringFromResize = false; // resetto il flag di restore da resize
    };
    window.addEventListener('resize', this.resizeHandler); // registro l'handler del resize sulla finestra
  }

  /**
   * Registra l'handler del cambio orientamento per aggiornare i trigger.
   *
   * @returns void
   */
  private setupOrientationHandler(): void {
    this.orientationHandler = () =>
      setTimeout(() => ScrollTrigger.refresh(), 500); // preparo l'handler che refresha i trigger dopo il cambio orientamento
    window.addEventListener('orientationchange', this.orientationHandler); // registro l'handler orientationchange sulla finestra
  }

  /**
   * Registra l'handler di visibilitychange per fermare e ripristinare i loop e gli elementi associati.
   *
   * @param scrollerEl Elemento scroller principale.
   * @returns void
   */
  private setupVisibilityHandler(scrollerEl: HTMLElement | null): void {
    this.visibilityHandler = () => {
      // preparo l'handler di visibilita' del documento
      if (document.visibilityState === 'hidden') {
        // controllo se la pagina sta diventando nascosta
        this.state.loopingTimelines.forEach((tl) => tl.kill()); // distruggo tutte le timeline cicliche attive
        this.state.loopingTimelines = []; // svuoto l'array delle timeline cicliche
        this.state.loopingDelayedCalls.forEach((dc) => dc.kill()); // distruggo tutti i delayed call attivi
        this.state.loopingDelayedCalls = []; // svuoto l'array dei delayed call
        ['#container_one', '#container_two', '#container_three'].forEach(
          (sel) => {
            // scorro i tre container del loop welcome
            const el = document.querySelector(sel) as HTMLElement | null; // recupero il container corrente dal DOM
            if (el) gsap.set(el, { opacity: 0, scale: 1, display: 'none' }); // lo nascondo e lo riporto allo stato iniziale
          },
        );
      } else if (document.visibilityState === 'visible') {
        // controllo se la pagina e' tornata visibile
        setTimeout(() => ScrollTrigger.refresh(), 300); // refresho i trigger poco dopo il ritorno in visibilita'
        this.animateService.refreshXGif(); // forzo il refresh delle GIF della X
        setTimeout(() => {
          // aspetto ancora un attimo prima di ripristinare i container e i loop
          ['#container_one', '#container_two', '#container_three'].forEach(
            (sel) => {
              // scorro i tre container del loop welcome
              const el = document.querySelector(sel) as HTMLElement | null; // recupero il container corrente dal DOM
              if (el) gsap.set(el, { opacity: 0, scale: 1, display: '' }); // ripristino il display normale e lo stato iniziale visivo
            },
          );
          const triggerEl = document.querySelector(
            '#saturno-scrolle',
          ) as HTMLElement | null; // recupero il trigger di Saturno dal DOM
          this.looping.riavviaSeNecessario(scrollerEl, triggerEl); // riavvio i loop se la posizione scroll lo richiede
        }, 100);
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler); // registro l'handler visibilitychange sul documento
  }
}
