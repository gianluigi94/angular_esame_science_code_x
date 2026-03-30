// Service che gestisce la transizione del titolo della scheda player verso il centro e il suo ripristino.

import { Injectable } from '@angular/core';
import { gsap } from 'gsap';
import { AnimateService } from '../animate.service';

@Injectable({ providedIn: 'root' })
export class SchedaPlayerTransizioneTitoloService {
  private tl: gsap.core.Timeline | null = null; // conservo la timeline attiva della transizione del titolo

  constructor(private animateService: AnimateService) {}

  /**
   * Anima il titolo verso il centro applicando anche la separazione degli elementi interni.
   *
   * @param onComplete Callback opzionale eseguita al termine dell'animazione.
   * @returns void
   */
  animaTitoloVersocentro(onComplete?: () => void): void {
    const title = document.querySelector(
      '.title-container',
    ) as HTMLElement | null; // recupero il contenitore principale del titolo
    if (!title) return; // esco subito se il titolo non esiste

    this.annulla(); // annullo un'eventuale timeline precedente ancora attiva

    const first = document.querySelector(
      '[data-titolo-first]',
    ) as HTMLElement | null; // recupero il primo elemento del titolo
    const x = document.querySelector('[data-titolo-x]') as HTMLElement | null; // recupero l'elemento X del titolo
    const link = title.querySelector('.title-link') as HTMLElement | null; // recupero l'eventuale link interno del titolo

    const titleRect = title.getBoundingClientRect(); // leggo il rettangolo attuale del titolo
    const vw = window.innerWidth; // leggo la larghezza corrente della viewport
    const vh = window.innerHeight; // leggo l'altezza corrente della viewport
    const targetCenterX = vw / 2; // calcolo il centro orizzontale target della viewport
    const targetCenterY = vh / 2 + 180; // calcolo il centro verticale target con offset verso il basso
    const currentCenterX = titleRect.left + titleRect.width / 2; // calcolo il centro orizzontale attuale del titolo
    const currentCenterY = titleRect.top + titleRect.height / 2; // calcolo il centro verticale attuale del titolo
    const deltaX = targetCenterX - currentCenterX; // calcolo lo spostamento orizzontale necessario
    const deltaY = targetCenterY - currentCenterY; // calcolo lo spostamento verticale necessario

    const elementi = [title, first, x].filter(Boolean) as HTMLElement[]; // raccolgo gli elementi da promuovere su layer dedicato
    elementi.forEach((el) => {
      // scorro tutti gli elementi rilevanti della transizione
      el.style.willChange = 'transform, opacity'; // preparo il browser a ottimizzare transform e opacity
      gsap.set(el, { force3D: true, z: 0 }); // forzo la promozione GPU dell'elemento
    });

    const avvia = () => {
      // preparo la funzione che avvia davvero la timeline dopo il preriscaldamento
      const DURATA_TITOLO_CENTRO = 1.45; // definisco la durata dello spostamento del titolo al centro
      const INIZIO_SCRITTE = 0.1; // definisco il tempo iniziale delle animazioni interne
      const DURATA_SCRITTE = 1.6; // definisco la durata delle animazioni interne
      const INIZIO_SPLIT = 0.65; // definisco il tempo iniziale della separazione finale
      const DURATA_SPLIT = 1.9; // definisco la durata della separazione finale
      const SPOSTA_X = -3600; // definisco lo spostamento finale dell'elemento X
      const SPOSTA_FIRST = 1200; // definisco lo spostamento finale del primo elemento
      const SCALA_X = 4; // definisco la scala da applicare all'elemento X
      const SCALA_FIRST = 0.3; // definisco la scala da applicare al primo elemento

      title.style.transition = 'none'; // disattivo eventuali transition CSS sul titolo
      title.style.pointerEvents = 'none'; // disabilito le interazioni sul titolo durante e dopo l'animazione
      if (link) link.style.pointerEvents = 'none'; // disabilito le interazioni anche sul link interno se esiste

      this.tl = gsap.timeline({
        // creo la timeline principale della transizione
        defaults: { force3D: true, immediateRender: false }, // imposto i default GSAP per evitare render anticipati e usare il layer GPU
        onComplete: () => {
          // reagisco al completamento della timeline
          elementi.forEach((el) => {
            el.style.willChange = 'auto';
          }); // ripristino il willChange degli elementi
          if (onComplete) onComplete(); // eseguo la callback finale se presente
        },
      });

      this.tl.to(
        title,
        {
          // animo il contenitore del titolo verso il centro target
          x: deltaX, // applico lo spostamento orizzontale calcolato
          y: deltaY, // applico lo spostamento verticale calcolato
          scaleX: 1, // riporto la scala orizzontale a 1
          scaleY: 1, // riporto la scala verticale a 1
          duration: DURATA_TITOLO_CENTRO, // uso la durata prevista per il titolo
          ease: 'power2.inOut', // applico un easing morbido
        },
        0,
      );

      if (first) {
        // controllo se il primo elemento del titolo esiste
        this.tl.to(
          first,
          {
            // animo la scala del primo elemento
            scale: SCALA_FIRST, // riduco la scala del primo elemento
            duration: DURATA_SCRITTE, // uso la durata prevista per le scritte
            ease: 'power2.inOut', // applico un easing morbido
          },
          INIZIO_SCRITTE,
        );
      }

      if (x) {
        // controllo se l'elemento X esiste
        this.tl.to(
          x,
          {
            // animo la trasformazione iniziale della X
            scale: SCALA_X, // aumento la scala della X
            rotationY: 55,
            rotationX: -18, // applico la rotazione tridimensionale iniziale
            transformPerspective: 1200, // imposto la prospettiva 3D della trasformazione
            transformOrigin: 'center center', // imposto l'origine della trasformazione al centro
            duration: DURATA_SCRITTE, // uso la durata prevista per le scritte
            ease: 'power2.inOut', // applico un easing morbido
          },
          INIZIO_SCRITTE,
        );
      }

      if (x) {
        // controllo di nuovo se l'elemento X esiste per la fase di split
        this.tl.to(
          x,
          {
            // animo lo spostamento finale della X
            x: SPOSTA_X, // sposto la X molto verso sinistra
            rotationY: 10,
            rotationX: 22, // aggiorno la rotazione tridimensionale finale
            transformPerspective: 1200, // mantengo la prospettiva 3D coerente
            duration: DURATA_SPLIT, // uso la durata prevista per lo split
            ease: 'power2.inOut', // applico un easing morbido
          },
          INIZIO_SPLIT,
        );
      }

      if (first) {
        // controllo se il primo elemento esiste per la fase di split
        this.tl.to(
          first,
          {
            // animo lo spostamento finale del primo elemento
            x: SPOSTA_FIRST, // sposto il primo elemento verso destra
            duration: DURATA_SPLIT, // uso la durata prevista per lo split
            ease: 'power2.inOut', // applico un easing morbido
          },
          INIZIO_SPLIT,
        );
      }
    };

    requestAnimationFrame(() =>
      // aspetto un frame prima di proseguire con il preriscaldamento
      requestAnimationFrame(
        () =>
          // aspetto un secondo frame per consolidare i layer
          requestAnimationFrame(avvia), // aspetto un terzo frame e poi avvio la timeline
      ),
    );
  }

  /**
   * Annulla la timeline attiva della transizione del titolo.
   *
   * @returns void
   */
  annulla(): void {
    if (this.tl) {
      // controllo se esiste una timeline attiva
      this.tl.kill(); // interrompo la timeline corrente
      this.tl = null; // azzero il riferimento alla timeline
    }
  }

  /**
   * Ripristina il titolo alla configurazione originale della scheda.
   *
   * @returns void
   */
  ripristinaTitoloOrigineScheda(): void {
    this.annulla(); // annullo prima qualsiasi timeline ancora attiva

    const title = document.querySelector(
      '.title-container',
    ) as HTMLElement | null; // recupero il contenitore principale del titolo
    const first = document.querySelector(
      '[data-titolo-first]',
    ) as HTMLElement | null; // recupero il primo elemento del titolo
    const x = document.querySelector('[data-titolo-x]') as HTMLElement | null; // recupero l'elemento X del titolo

    if (title) {
      // controllo se il titolo esiste
      gsap.killTweensOf(title); // fermo eventuali tween attivi sul titolo
      gsap.set(title, {
        // ripulisco tutte le proprieta' inline del titolo che possono essere state alterate
        clearProps:
          'x,y,scale,scaleX,scaleY,rotationX,rotationY,transform,paddingTop,marginTop,top,left,xPercent,yPercent',
      });
      title.style.pointerEvents = ''; // ripristino il pointerEvents del titolo
      const link = title.querySelector('.title-link') as HTMLElement | null; // recupero l'eventuale link interno del titolo
      if (link) link.style.pointerEvents = ''; // ripristino il pointerEvents del link se esiste
    }

    if (first) {
      // controllo se il primo elemento esiste
      gsap.killTweensOf(first); // fermo eventuali tween attivi sul primo elemento
      gsap.set(first, {
        // ripristino le proprieta' principali del primo elemento
        clearProps: 'x,y,scale,rotationX,rotationY,transform',
        opacity: 1,
      });
    }

    if (x) {
      // controllo se l'elemento X esiste
      gsap.killTweensOf(x); // fermo eventuali tween attivi sulla X
      gsap.set(x, {
        // ripristino le proprieta' principali della X
        clearProps: 'x,y,scale,rotationX,rotationY,transform',
        opacity: 1,
      });
    }

    this.animateService.setXNormale(); // ripristino la X nello stato normale
    this.animateService.setTitoloAltoGlobal(); // ripristino il titolo nella configurazione alta globale
  }
}
