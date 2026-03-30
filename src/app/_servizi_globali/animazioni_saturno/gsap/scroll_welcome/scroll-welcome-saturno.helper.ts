// Helper che crea i ScrollTrigger per animare Saturno nella sezione welcome.

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';
import { SaturnoPosizioniService } from '../../saturno_posizioni.service';
import { ScrollWelcomeState } from './scroll-welcome-state';

const SCROLLER = '.main-scroll'; // definisco il selettore dello scroller principale
const TRIGGER = '#saturno-scrolle'; // definisco il selettore dell'elemento trigger
const START = '10px top'; // definisco il punto di start dei trigger

export class ScrollWelcomeSaturnoHelper {
  constructor(
    private state: ScrollWelcomeState,
    private posizioniService: SaturnoPosizioniService,
  ) {}

  /**
   * Crea i trigger di animazione per scala, luce, posizione e rotazione di Saturno.
   *
   * @param scene Scena o gruppo Three.js da animare.
   * @param light Luce direzionale collegata a Saturno.
   * @returns void
   */
  crea(scene: THREE.Scene, light: THREE.DirectionalLight): void {
    const poseAlto = this.posizioniService.getPose('WELCOME_ALTO'); // recupero la posa alta di riferimento
    const poseBasso = this.posizioniService.getPose('WELCOME_BASSO'); // recupero la posa bassa di riferimento

    const saturnoTrigger = ScrollTrigger.create({
      // creo il trigger che gestisce scala e luce
      trigger: TRIGGER,
      scroller: SCROLLER,
      start: START, // imposto trigger, scroller e start del controllo scroll
      onEnter: () => {
        // reagisco quando entro nell'area attiva del trigger
        gsap.killTweensOf(scene.scale); // fermo eventuali tween attivi sulla scala della scena
        gsap.killTweensOf(light.position); // fermo eventuali tween attivi sulla posizione della luce
        const dur = this.state.restoringFromResize ? 0 : 1.33; // scelgo la durata in base al ripristino da resize
        gsap.to(scene.scale, {
          x: poseBasso.scale.x,
          y: poseBasso.scale.y,
          z: poseBasso.scale.z,
          duration: dur,
          ease: 'power2.inOut',
        }); // animo la scala verso la posa bassa
        gsap.to(light.position, {
          z: 5.1001,
          duration: dur,
          ease: 'power2.inOut',
        }); // animo la profondita' della luce verso il valore basso
      },
      onLeaveBack: () => {
        // reagisco quando torno indietro oltre il trigger
        gsap.killTweensOf(scene.scale); // fermo eventuali tween attivi sulla scala della scena
        gsap.killTweensOf(light.position); // fermo eventuali tween attivi sulla posizione della luce
        gsap.to(scene.scale, {
          x: poseAlto.scale.x,
          y: poseAlto.scale.y,
          z: poseAlto.scale.z,
          duration: 0.8,
          ease: 'power2.inOut',
        }); // animo la scala verso la posa alta
        gsap.to(light.position, {
          z: 10.1001,
          duration: 0.8,
          ease: 'power2.inOut',
        }); // animo la profondita' della luce verso il valore alto
      },
    });
    this.state.triggers.push(saturnoTrigger); // salvo il trigger di scala e luce nello stato condiviso

    const curveProxy = { t: 0 }; // preparo il proxy numerico usato per la curva della posizione
    const curveTrigger = gsap.to(curveProxy, {
      // creo il tween che controlla la traiettoria curva di Saturno
      t: 1.1,
      duration: 0.87, // animo il parametro t fino al valore finale
      scrollTrigger: {
        trigger: TRIGGER,
        scroller: SCROLLER,
        start: START,
        toggleActions: 'play reverse play reverse',
      }, // collego il tween allo scroll
      ease: 'none', // uso un avanzamento lineare del parametro
      onUpdate: () => {
        // aggiorno la posizione della scena a ogni step del tween
        const t = curveProxy.t; // leggo il valore corrente del parametro
        const baseY = window.innerWidth <= 868 ? -3.6 : -3.4; // scelgo la base verticale in modo responsive
        scene.position.x = 3.1 * t + 1.2 * Math.sin(Math.PI * t); // aggiorno la coordinata x con una curva sinusoidale
        scene.position.y = baseY * Math.pow(t, 2); // aggiorno la coordinata y con una parabola crescente
      },
    }).scrollTrigger;
    if (curveTrigger) this.state.triggers.push(curveTrigger); // salvo il trigger della curva nello stato condiviso se esiste

    const rotateZTrigger = ScrollTrigger.create({
      // creo il trigger che gestisce la rotazione sull'asse z
      trigger: TRIGGER,
      scroller: SCROLLER,
      start: START,
      toggleActions: 'play reverse play reverse', // imposto trigger, scroller, start e azioni di toggle
      onEnter: () =>
        gsap.to(scene.rotation, {
          z: poseBasso.rotation.z,
          duration: this.state.restoringFromResize ? 0 : 0.87,
          ease: 'power1.in',
        }), // animo la rotazione z verso la posa bassa
      onLeaveBack: () =>
        gsap.to(scene.rotation, {
          z: poseAlto.rotation.z,
          duration: 0.87,
          ease: 'power1.out',
        }), // animo la rotazione z verso la posa alta
    });
    this.state.triggers.push(rotateZTrigger); // salvo il trigger della rotazione z nello stato condiviso

    const rotateYTrigger = ScrollTrigger.create({
      // creo il trigger che gestisce la rotazione sull'asse y
      trigger: TRIGGER,
      scroller: SCROLLER,
      start: START,
      toggleActions: 'play reverse play reverse', // imposto trigger, scroller, start e azioni di toggle
      onEnter: () =>
        gsap.to(scene.rotation, {
          y: poseBasso.rotation.y,
          duration: this.state.restoringFromResize ? 0 : 0.87,
          ease: 'power4.in',
        }), // animo la rotazione y verso la posa bassa
      onLeaveBack: () =>
        gsap.to(scene.rotation, {
          y: poseAlto.rotation.y,
          duration: 0.87,
          ease: 'power4.out',
        }), // animo la rotazione y verso la posa alta
    });
    this.state.triggers.push(rotateYTrigger); // salvo il trigger della rotazione y nello stato condiviso
  }
}
