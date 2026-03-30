// Service che gestisce le animazioni di Saturno tra i diversi stati delle route e l'ingresso della pagina 404.

import { Injectable, NgZone } from '@angular/core';
import gsap from 'gsap';
import * as THREE from 'three';
import {
  SaturnoPosizioniService,
  SaturnoStatoChiave,
} from '../saturno_posizioni.service';

@Injectable({ providedIn: 'root' })
export class SaturnoRouteAnimazioniService {
  constructor(
    private saturnoPosizioniService: SaturnoPosizioniService,
    private ngZone: NgZone,
  ) {
    this.ngZone.runOutsideAngular(() => {
      // eseguo questa configurazione fuori da Angular
      gsap.ticker.lagSmoothing(0); // disattivo il lag smoothing del ticker GSAP
    });
  }

  /**
   * Anima Saturno verso uno stato target con eventuale gestione della luce e callback finale.
   *
   * @param scene Scena Three.js da animare.
   * @param stato Chiave dello stato target di Saturno.
   * @param durata Durata base dell'animazione.
   * @param light Luce direzionale opzionale da sincronizzare.
   * @param onComplete Callback opzionale eseguita al termine.
   * @returns void
   */
  public animaVerso(
    scene: THREE.Scene,
    stato: SaturnoStatoChiave,
    durata: number = 0.9,
    light?: THREE.DirectionalLight,
    onComplete?: () => void,
  ): void {
    this.ngZone.runOutsideAngular(() => {
      // eseguo tutta l'animazione fuori da Angular
      const pose = this.saturnoPosizioniService.getPose(stato); // recupero la posa target per lo stato richiesto
      const isFromBasso = scene.scale.x > 2.5; // verifico se parto da una scala grande tipica dello stato basso
      const isFromCatalogo = scene.scale.x < 0.05; // verifico se parto da una scala molto piccola tipica del catalogo
      const conPiroetta = isFromBasso || isFromCatalogo; // decido se applicare la piroetta in base allo stato di partenza

      const durataAnim =
        stato === 'LOGIN_LATERALE' && conPiroetta ? durata + 0.4 : durata; // allungo la durata se devo fare la piroetta verso il login laterale

      const tl = gsap.timeline({
        // creo la timeline principale dell'animazione
        onComplete: () => {
          // reagisco al completamento della timeline
          if (onComplete) {
            // controllo se ho ricevuto una callback finale
            onComplete(); // eseguo la callback finale
          }
        },
      });

      if (stato === 'CATALOGO_NASCOSTO') {
        // controllo se devo usare la traiettoria curva verso il catalogo nascosto
        const startPos = {
          x: scene.position.x,
          y: scene.position.y,
          z: scene.position.z,
        }; // salvo la posizione iniziale della scena

        const endPos = pose.position; // leggo la posizione finale dalla posa target

        const controlPos = {
          x: (startPos.x + endPos.x) / 2,
          y: startPos.y + 0.2,
          z: (startPos.z + endPos.z) / 2,
        }; // calcolo il punto di controllo della curva di Bezier

        const curveProxy = { t: 0 }; // preparo un proxy numerico per animare il parametro della curva

        tl.to(
          curveProxy,
          {
            t: 1,
            duration: durataAnim,
            ease: 'power2.inOut',
            onUpdate: () => {
              const t = curveProxy.t; // leggo il parametro corrente della curva
              const inv = 1 - t; // calcolo il complemento del parametro corrente

              const x =
                inv * inv * startPos.x +
                2 * inv * t * controlPos.x +
                t * t * endPos.x; // calcolo la coordinata x sulla curva quadratica

              const y =
                inv * inv * startPos.y +
                2 * inv * t * controlPos.y +
                t * t * endPos.y; // calcolo la coordinata y sulla curva quadratica

              const z =
                inv * inv * startPos.z +
                2 * inv * t * controlPos.z +
                t * t * endPos.z; // calcolo la coordinata z sulla curva quadratica

              scene.position.set(x, y, z); // aggiorno la posizione della scena lungo la curva
            },
          },
          0,
        );
      } else {
        tl.to(
          scene.position,
          {
            x: pose.position.x,
            y: pose.position.y,
            z: pose.position.z,
            duration: durataAnim,
            ease: 'power2.inOut',
          },
          0,
        ); // animo la posizione della scena in modo lineare verso la posa target
      }

      tl.to(
        scene.scale,
        {
          x: pose.scale.x,
          y: pose.scale.y,
          z: pose.scale.z,
          duration: durataAnim,
          ease: 'power2.inOut',
        },
        0,
      ); // animo la scala della scena verso la posa target

      if (stato === 'LOGIN_LATERALE' && conPiroetta) {
        // controllo se devo applicare la rotazione con piroetta
        tl.to(
          scene.rotation,
          {
            x: pose.rotation.x,
            y: pose.rotation.y + Math.PI * 2,
            z: pose.rotation.z,
            duration: durataAnim,
            ease: 'power1.inOut',
            onComplete: () => {
              scene.rotation.y = pose.rotation.y; // riallineo esattamente la rotazione y al valore finale
            },
          },
          0,
        );
      } else {
        tl.to(
          scene.rotation,
          {
            x: pose.rotation.x,
            y: pose.rotation.y,
            z: pose.rotation.z,
            duration: durataAnim,
            ease: 'power2.inOut',
          },
          0,
        ); // animo la rotazione della scena verso la posa target senza piroetta
      }

      if (light) {
        // controllo se ho ricevuto una luce da sincronizzare
        let lightZ = 10.1001; // preparo il valore z di default della luce

        if (stato === 'WELCOME_BASSO') {
          // controllo se il target e' la welcome bassa
          lightZ = 5.1001; // imposto la profondita' luce dedicata alla welcome bassa
        } else if (stato === 'LOGIN_LATERALE') {
          // controllo se il target e' il login laterale
          lightZ = 0.1001; // imposto la profondita' luce dedicata al login laterale
        } else if (stato === 'CATALOGO_NASCOSTO') {
          // controllo se il target e' il catalogo nascosto
          lightZ = 0.1001; // imposto la profondita' luce dedicata al catalogo nascosto
        }

        tl.to(
          light.position,
          {
            z: lightZ,
            duration: durataAnim,
            ease: 'power2.inOut',
          },
          0,
        ); // animo la posizione z della luce in sincronia con la timeline
      }
    }); // chiudo l'esecuzione fuori da Angular
  }

  /**
   * Applica immediatamente una posa di Saturno senza animazione, con eventuale sincronizzazione della luce.
   *
   * @param scene Scena Three.js a cui applicare la posa.
   * @param stato Chiave dello stato da applicare subito.
   * @param light Luce direzionale opzionale da aggiornare.
   * @returns void
   */
  public applicaSubito(
    scene: THREE.Scene,
    stato: SaturnoStatoChiave,
    light?: THREE.DirectionalLight,
  ): void {
    this.saturnoPosizioniService.applicaPoseAScena(scene, stato); // applico subito la posa target alla scena
    if (light) {
      // controllo se ho ricevuto una luce da aggiornare
      let lightZ = 10.1001; // preparo il valore z di default della luce
      if (stato === 'WELCOME_BASSO') {
        // controllo se lo stato e' welcome basso
        lightZ = 5.1001; // imposto la profondita' luce dedicata alla welcome bassa
      } else if (stato === 'LOGIN_LATERALE') {
        // controllo se lo stato e' login laterale
        lightZ = 0.1001; // imposto la profondita' luce dedicata al login laterale
      }
      light.position.z = lightZ; // aggiorno subito la coordinata z della luce
    }
  }

  /**
   * Anima l'ingresso della pagina 404 sincronizzando Saturno, maschera, cifre e paragrafo.
   *
   * @param scene Scena Three.js di Saturno.
   * @param durataSaturno Durata dell'animazione di Saturno.
   * @param light Luce direzionale opzionale da sincronizzare.
   * @returns void
   */
  public animaIngresso404ConScritte(
    scene: THREE.Scene,
    durataSaturno: number,
    light?: THREE.DirectionalLight,
  ): void {
    this.ngZone.runOutsideAngular(() => {
      // eseguo tutta l'animazione della 404 fuori da Angular
      this.animaVerso(scene, 'WELCOME_ALTO', durataSaturno, light); // porto Saturno verso lo stato WELCOME_ALTO

      const mask = document.querySelector('.nf-mask') as HTMLElement | null; // recupero la maschera della 404 dal DOM
      if (!mask) return; // esco subito se la maschera non esiste

      const digits = document.querySelectorAll('.nf-num .d'); // recupero tutte le cifre della 404
      const paragrafo = document.querySelector(
        '.nf-num p',
      ) as HTMLElement | null; // recupero il paragrafo della 404

      mask.style.transition = 'none'; // disattivo temporaneamente la transition CSS della maschera

      gsap.set(mask, { width: '0%' }); // preparo la maschera con larghezza iniziale a zero
      if (digits.length) gsap.set(digits, { opacity: 0, y: 40, scale: 0.7 }); // preparo le cifre invisibili, abbassate e rimpicciolite
      if (paragrafo) gsap.set(paragrafo, { opacity: 0, y: 20 }); // preparo il paragrafo invisibile e leggermente abbassato

      const tl404 = gsap.timeline(); // creo la timeline dedicata alle scritte della 404

      tl404.to(
        mask,
        {
          width: '100%',
          duration: 1.4,
          ease: 'power2.inOut',
          onComplete: () => {
            mask.style.transition = ''; // ripristino la transition CSS originale della maschera
            mask.classList.add('show'); // aggiungo la classe finale di stato alla maschera
            gsap.set(mask, { clearProps: 'width' }); // pulisco la width inline della maschera
          },
        },
        0,
      ); // animo il wipe della maschera dall'inizio della timeline

      if (digits.length) {
        // controllo se esistono cifre da animare
        tl404.to(
          digits,
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.7,
            ease: 'back.out(1.4)',
            stagger: 0.15,
            onComplete: () => {
              gsap.set(digits, { clearProps: 'y,scale' }); // pulisco le trasformazioni inline sulle cifre
              digits.forEach((d) => {
                (d as HTMLElement).style.removeProperty('opacity'); // rimuovo l'opacita' inline da ogni cifra
              });
            },
          },
          0.3,
        ); // faccio entrare le cifre poco dopo l'inizio del wipe
      }

      if (paragrafo) {
        // controllo se esiste il paragrafo da animare
        tl404.to(
          paragrafo,
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power2.out',
            onComplete: () => {
              gsap.set(paragrafo, { clearProps: 'opacity,y' }); // pulisco le proprieta' inline del paragrafo
            },
          },
          0.75,
        ); // faccio entrare il paragrafo dopo le prime fasi dell'animazione
      }
    });
  }
}
