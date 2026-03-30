// Helper che crea i ScrollTrigger degli elementi UI nella welcome.

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { AnimateService } from '../../animate.service';
import { ScrollWelcomeState } from './scroll-welcome-state';
import { calcolaScaleTitle, calcolaLeftValue, calcolaTopValue, checkSpecialTablet} from './scroll-welcome-layout.utils';

const SCROLLER = '.main-scroll'; // definisco il selettore dello scroller principale
const TRIGGER = '#saturno-scrolle'; // definisco il selettore dell'elemento trigger
const START = '10px top'; // definisco il punto di start dei trigger

export class ScrollWelcomeUiHelper {
  constructor(
    private state: ScrollWelcomeState,
    private animateService: AnimateService,
  ) {}

  /**
   * Crea il trigger che anima il titolo tra posizione centrale e alta.
   *
   * @param title Elemento HTML del titolo da animare.
   * @returns void
   */
  creaTitleTrigger(title: HTMLElement): void {
    const { scaleX, scaleY } = calcolaScaleTitle(); // leggo le scale responsive del titolo
    const leftValue = calcolaLeftValue(); // leggo il valore left responsive
    const topValue = calcolaTopValue(); // leggo il valore top responsive
    const isTablet = window.innerWidth <= 868; // verifico se sono in viewport tablet o inferiore
    const softOffset = ((1 - scaleX) * 100) / 2; // calcolo l'offset morbido in base alla scala

    const titleTrigger = ScrollTrigger.create({
      // creo il trigger che gestisce l'animazione del titolo
      trigger: TRIGGER,
      scroller: SCROLLER,
      start: START, // imposto trigger, scroller e start del controllo scroll
      onEnter: () => {
        // reagisco quando entro nell'area attiva del trigger
        gsap.to(title, {
          // animo il titolo verso la posizione alta
          top: topValue,
          left: leftValue, // imposto top e left finali responsive
          xPercent: isTablet ? -softOffset : -softOffset * 1.1, // imposto l'offset orizzontale corretto
          yPercent: -softOffset, // imposto l'offset verticale corretto
          paddingTop: 0,
          marginTop: 0, // azzero padding e margine superiore
          scaleX,
          scaleY, // applico le scale finali del titolo
          minWidth: '60px',
          minHeight: '200px', // imposto i vincoli minimi di ingombro
          duration: this.state.restoringFromResize ? 0 : 0.85, // scelgo la durata in base al restore da resize
          delay: this.state.restoringFromResize ? 0 : 0.2, // scelgo il delay in base al restore da resize
          ease: 'power2.inOut', // applico un easing morbido
        });
      },
      onLeaveBack: () => {
        // reagisco quando torno indietro oltre il trigger
        gsap.to(title, {
          // riporto il titolo alla posizione centrale
          top: '50%',
          left: '50%', // ripristino il centro della viewport
          xPercent: -50,
          yPercent: -50, // ricentro il titolo rispetto al suo ingombro
          paddingTop: 210, // ripristino il padding alto originale
          marginTop: checkSpecialTablet() ? -120 : 0, // applico il margine speciale solo nei casi tablet dedicati
          scale: 1, // ripristino la scala originale
          clearProps: 'minWidth,minHeight', // rimuovo i minimi impostati nello stato alto
          duration: 0.85,
          delay: 0.2, // imposto durata e delay del ritorno
          ease: 'power2.inOut', // applico un easing morbido
        });
      },
    });
    this.state.triggers.push(titleTrigger); // salvo il trigger del titolo nello stato condiviso
  }

  /**
   * Crea il trigger che gestisce la scomparsa e ricomparsa del sottotitolo.
   *
   * @returns void
   */
  creaSubtitleTrigger(): void {
    gsap.to('.subtitle', {
      // creo il tween collegato allo scroll per il sottotitolo
      opacity: 0,
      duration: 0.5,
      ease: 'power1.out', // porto il sottotitolo in fade out con durata breve
      scrollTrigger: {
        // collego il tween a uno ScrollTrigger interno
        trigger: TRIGGER,
        scroller: SCROLLER,
        start: START, // imposto trigger, scroller e start del controllo scroll
        toggleActions: 'play reverse play reverse', // faccio eseguire e invertire il tween avanti e indietro
      },
    });
  }

  /**
   * Crea i trigger per l'elemento scrol e per lo stato visivo della X.
   *
   * @returns void
   */
  creaScrolTrigger(): void {
    const scrolElement = document.querySelector('.scrol') as HTMLElement; // recupero l'elemento scrol dal DOM
    this.state.scrolTimeline =
      this.animateService.animateScrolElement(scrolElement); // avvio e salvo la timeline dell'animazione scrol

    const scrolTrigger = ScrollTrigger.create({
      // creo il trigger che gestisce visibilita' e pausa di scrol
      trigger: TRIGGER,
      scroller: SCROLLER,
      start: START, // imposto trigger, scroller e start del controllo scroll
      onEnter: () =>
        setTimeout(() => {
          this.state.scrolTimeline?.pause();
          gsap.set(scrolElement, { opacity: 0 });
        }, 450), // metto in pausa la timeline e nascondo scrol entrando nel trigger
      onLeaveBack: () =>
        setTimeout(() => {
          this.state.scrolTimeline?.play();
          gsap.set(scrolElement, { opacity: 1 });
        }, 500), // riavvio la timeline e mostro scrol tornando indietro
    });
    this.state.triggers.push(scrolTrigger); // salvo il trigger di scrol nello stato condiviso

    const xTrigger = ScrollTrigger.create({
      // creo il trigger che gestisce il passaggio tra GIF e stato normale della X
      trigger: TRIGGER,
      scroller: SCROLLER,
      start: START,
      toggleActions: 'play reverse play reverse', // imposto trigger, scroller, start e toggle del controllo scroll
      onEnter: () =>
        setTimeout(() => {
          // reagisco entrando nell'area attiva del trigger
          this.state.scrolTimeline?.pause(); // metto in pausa la timeline di scrol
          gsap.set(scrolElement, { opacity: 0 }); // nascondo l'elemento scrol
          this.animateService.setXNormale(); // porto la X nello stato normale
        }, 450),
      onLeaveBack: () =>
        setTimeout(() => {
          // reagisco tornando indietro oltre il trigger
          this.state.scrolTimeline?.play(); // riavvio la timeline di scrol
          this.animateService.setXGif(); // ripristino la X nello stato GIF
        }, 500),
    });
    this.state.triggers.push(xTrigger); // salvo il trigger della X nello stato condiviso
  }

  /**
   * Crea il trigger che gestisce la comparsa e la scomparsa della CTA.
   *
   * @returns void
   */
  creaCtaTrigger(): void {
    const cta = document.querySelector('#cta') as HTMLElement; // recupero la CTA dal DOM
    if (!this.state.restoringFromResize) gsap.set(cta, { opacity: 0 }); // nascondo inizialmente la CTA se non sto ripristinando da resize

    const ctaTrigger = ScrollTrigger.create({
      // creo il trigger che controlla l'animazione della CTA
      trigger: TRIGGER,
      scroller: SCROLLER,
      start: START, // imposto trigger, scroller e start del controllo scroll
      onEnter: () => {
        // reagisco quando entro nell'area attiva del trigger
        gsap.killTweensOf(cta); // fermo eventuali tween attivi sulla CTA
        gsap.to(cta, {
          opacity: 1,
          delay: 0.9,
          duration: 2.2,
          ease: 'power2.out',
        }); // faccio comparire la CTA con un fade morbido
      },
      onLeaveBack: () => {
        // reagisco quando torno indietro oltre il trigger
        gsap.killTweensOf(cta); // fermo eventuali tween attivi sulla CTA
        gsap.to(cta, { opacity: 0, delay: 0, duration: 0.5, ease: 'none' }); // faccio sparire rapidamente la CTA
      },
    });
    this.state.triggers.push(ctaTrigger); // salvo il trigger della CTA nello stato condiviso
  }

  /**
   * Crea il trigger che gestisce la comparsa e la scomparsa del form email.
   *
   * @returns void
   */
  creaEmailFormTrigger(): void {
    const emailForm = document.querySelector('#email_form') as HTMLElement; // recupero il form email dal DOM
    if (!emailForm) return; // esco subito se il form non esiste
    if (!this.state.restoringFromResize)
      // controllo se non sto ripristinando da resize
      gsap.set(emailForm, {
        opacity: 0,
        scaleX: 0,
        transformOrigin: 'center center',
      }); // imposto lo stato iniziale nascosto e compresso del form

    const t = ScrollTrigger.create({
      // creo il trigger che controlla l'animazione del form email
      trigger: TRIGGER,
      scroller: SCROLLER,
      start: START, // imposto trigger, scroller e start del controllo scroll
      onEnter: () => {
        // reagisco quando entro nell'area attiva del trigger
        gsap.killTweensOf(emailForm); // fermo eventuali tween attivi sul form
        gsap.to(emailForm, {
          opacity: 1,
          scaleX: 1,
          delay: 0.95,
          duration: 1,
          ease: 'power2.out',
        }); // faccio comparire e apro il form in orizzontale
      },
      onLeaveBack: () => {
        // reagisco quando torno indietro oltre il trigger
        gsap.killTweensOf(emailForm); // fermo eventuali tween attivi sul form
        gsap.to(emailForm, {
          opacity: 0.5,
          scaleX: 0,
          delay: 0,
          duration: 0.4,
          ease: 'power2.in',
        }); // richiudo e attenuo il form
      },
    });
    this.state.triggers.push(t); // salvo il trigger del form email nello stato condiviso
  }

  /**
   * Crea i trigger che gestiscono comparsa e reset del footer e del suo testo.
   *
   * @returns void
   */
  creaFooterTrigger(): void {
    const footer = document.querySelector('footer') as HTMLElement; // recupero il footer dal DOM
    if (!footer) return; // esco subito se il footer non esiste
    gsap.set(footer, { scaleY: 0, transformOrigin: 'bottom center' }); // imposto lo stato iniziale del footer chiuso dal basso

    const footerTimeline = gsap.timeline({
      // creo la timeline collegata allo scroll per il footer
      scrollTrigger: {
        // collego la timeline a uno ScrollTrigger interno
        trigger: TRIGGER,
        scroller: SCROLLER,
        start: START, // imposto trigger, scroller e start del controllo scroll
        toggleActions: 'play reverse play reverse', // faccio eseguire e invertire la timeline avanti e indietro
      },
    });
    footerTimeline.fromTo(
      footer,
      { scaleY: 0, opacity: 0 },
      { scaleY: 1, opacity: 1, duration: 0.3, ease: 'power2.out', delay: 0.5 },
    ); // animo il footer da chiuso e invisibile a visibile e aperto

    const footerResetTrigger = ScrollTrigger.create({
      // creo il trigger che forza il reset del footer tornando indietro
      trigger: TRIGGER,
      scroller: SCROLLER,
      start: START, // imposto trigger, scroller e start del controllo scroll
      onLeaveBack: () => gsap.set(footer, { scaleY: 0 }), // richiudo subito il footer quando torno indietro
    });

    this.state.triggers.push(footerTimeline.scrollTrigger as ScrollTrigger); // salvo il trigger interno della timeline del footer nello stato condiviso
    this.state.triggers.push(footerResetTrigger); // salvo il trigger di reset del footer nello stato condiviso

    const footerP = document.querySelector('#footer-p') as HTMLElement; // recupero il paragrafo del footer dal DOM
    if (!footerP) return; // esco subito se il paragrafo non esiste
    gsap.set(footerP, { opacity: 0 }); // imposto il testo del footer inizialmente invisibile

    const footerPTrigger = ScrollTrigger.create({
      // creo il trigger che gestisce la comparsa del testo del footer
      trigger: TRIGGER,
      scroller: SCROLLER,
      start: START,
      toggleActions: 'play reverse play reverse', // imposto trigger, scroller, start e toggle del controllo scroll
      onEnter: () =>
        gsap.fromTo(
          footerP,
          { opacity: 0 },
          { opacity: 1, delay: 0.9, duration: 0.9, ease: 'power2.out' },
        ), // faccio comparire il testo del footer entrando nel trigger
      onLeaveBack: () => gsap.set(footerP, { opacity: 0 }), // nascondo di nuovo il testo del footer tornando indietro
    });
    this.state.triggers.push(footerPTrigger); // salvo il trigger del testo footer nello stato condiviso
  }
}
