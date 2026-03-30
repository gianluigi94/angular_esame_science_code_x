// Helper che gestisce posizione, animazione del titolo e stato visivo della X.
import { gsap } from 'gsap';
import { CSSRulePlugin } from 'gsap/CSSRulePlugin';

export class AnimateTitoloHelper {

  titoloInPosizioneAlta = false; // tengo traccia se il titolo si trova nella posizione alta

  /**
   * Calcola la configurazione responsive del titolo in posizione alta.
   *
   * Restituisce coordinate, scale e offset percentuali
   * in base alle dimensioni e all'orientamento della finestra.
   *
   * @returns { top: number; left: number; scaleX: number; scaleY: number; xPercent: number; yPercent: number; }
   */
  getTitoloAltoConfig(): {
    top: number; left: number;
    scaleX: number; scaleY: number;
    xPercent: number; yPercent: number;
  } {
    let scaleValue: number; // preparo il valore base di scala
    if (window.innerWidth <= 375) scaleValue = 0.225; // imposto la scala per schermi molto piccoli
    else if (window.innerWidth <= 485) scaleValue = 0.21; // imposto la scala per schermi piccoli
    else if (window.innerWidth <= 868) scaleValue = 0.17; // imposto la scala per tablet o piccoli desktop
    else scaleValue = 0.15; // imposto la scala per schermi grandi

    const scaleX = scaleValue; // uso il valore base come scala orizzontale
    const scaleY = scaleValue * 1.3; // aumento leggermente la scala verticale

    let leftValue: number; // preparo il valore left responsive
    if (window.matchMedia('(max-width: 900px) and (max-height: 460px) and (orientation: landscape)').matches) leftValue = -22; // imposto left per landscape molto basso
    else if (window.matchMedia('(max-width: 1020px) and (max-height: 660px) and (orientation: landscape)').matches) leftValue = 12; // imposto left per landscape medio
    else if (window.innerWidth <= 560) leftValue = 6; // imposto left per schermi piccoli
    else if (window.innerWidth <= 868) leftValue = 0; // imposto left per tablet
    else if (window.innerWidth <= 1000) leftValue = 25; // imposto left per desktop piccoli
    else if (window.innerWidth <= 1200) leftValue = 15; // imposto left per desktop medi
    else if (window.innerWidth <= 1500) leftValue = 10; // imposto left per desktop larghi
    else leftValue = 25; // imposto left per schermi molto grandi

    let topValue: number; // preparo il valore top responsive
    if (window.matchMedia('(max-width: 900px) and (max-height: 460px) and (orientation: landscape)').matches) topValue = 16; // imposto top per landscape molto basso
    else if (window.matchMedia('(max-width: 1020px) and (max-height: 660px) and (orientation: landscape)').matches) topValue = 12; // imposto top per landscape medio
    else if (window.innerWidth <= 560) topValue = 15; // imposto top per schermi piccoli
    else if (window.innerWidth <= 900) topValue = 8; // imposto top per tablet e piccoli desktop
    else if (window.innerWidth <= 1000) topValue = 8; // mantengo top anche per desktop piccoli
    else topValue = 11; // imposto top per schermi grandi

    const softOffset = ((1 - scaleValue) * 100) / 2; // calcolo l'offset morbido in percentuale in base alla scala
    const isTablet = window.innerWidth <= 868; // verifico se sono in una larghezza da tablet o inferiore

    return {
      top: topValue, left: leftValue, // restituisco coordinate finali
      scaleX, scaleY, // restituisco le scale finali
      xPercent: isTablet ? -softOffset : -softOffset * 1.1, // restituisco l'offset orizzontale corretto
      yPercent: -softOffset, // restituisco l'offset verticale corretto
    };
  }

  /**
   * Imposta subito il titolo nella posizione alta.
   *
   * Applica la configurazione responsive senza animazione.
   *
   * @param title Elemento titolo da posizionare.
   * @returns void
   */
  setTitoloAlto(title: HTMLElement): void {
    const cfg = this.getTitoloAltoConfig(); // leggo la configurazione responsive del titolo alto
    gsap.set(title, {
      top: cfg.top, left: cfg.left, // imposto top e left finali
      xPercent: cfg.xPercent, yPercent: cfg.yPercent, // imposto gli offset percentuali finali
      paddingTop: 0, marginTop: 0, // azzero padding e margine superiore
      scaleX: cfg.scaleX, scaleY: cfg.scaleY, // imposto le scale finali
      transformOrigin: 'center center', // imposto l'origine della trasformazione al centro
    });
  }

  /**
   * Imposta subito il titolo in posizione centrale.
   *
   * Ripristina coordinate, scala e stato interno del titolo.
   *
   * @param title Elemento titolo da posizionare.
   * @returns void
   */
  setTitoloCentrale(title: HTMLElement): void {
    gsap.set(title, {
      top: '50%', left: '50%', // riporto il titolo al centro della viewport
      xPercent: -50, yPercent: -50, // centro esattamente il titolo rispetto al suo ingombro
      paddingTop: 210, marginTop: 0, // ripristino il padding alto e azzero il margine
      scaleX: 1, scaleY: 1, // riporto la scala a quella originale
      transformOrigin: 'center center', // mantengo l'origine di trasformazione al centro
    });
    this.titoloInPosizioneAlta = false; // segno che il titolo non e' piu' in posizione alta
  }

  /**
   * Anima il titolo verso la posizione alta.
   *
   * Applica la configurazione responsive con una transizione GSAP.
   *
   * @param title Elemento titolo da animare.
   * @param duration Durata dell'animazione.
   * @param delay Ritardo iniziale dell'animazione.
   * @returns void
   */
  animateTitoloVersoAlto(title: HTMLElement, duration = 0.85, delay = 0.2): void {
    const cfg = this.getTitoloAltoConfig(); // leggo la configurazione responsive del titolo alto
    gsap.to(title, {
      top: cfg.top, left: cfg.left, // animo top e left verso la posizione alta
      xPercent: cfg.xPercent, yPercent: cfg.yPercent, // animo gli offset percentuali finali
      paddingTop: 0, marginTop: 0, // azzero padding e margine superiore
      scaleX: cfg.scaleX, scaleY: cfg.scaleY, // animo la scala verso quella finale
      duration, delay, // uso durata e ritardo ricevuti
      ease: 'power2.inOut', // applico un easing morbido
      onComplete: () => { this.titoloInPosizioneAlta = true; }, // aggiorno lo stato a fine animazione
    });
  }

  /**
   * Anima globalmente il titolo verso l'alto cercando gli elementi nel DOM.
   *
   * Ripulisce subtitle, scroll e parti del titolo,
   * poi avvia l'animazione del contenitore principale.
   *
   * @param durata Durata dell'animazione.
   * @param delay Ritardo iniziale dell'animazione.
   * @returns void
   */
  animateTitoloVersoAltoGlobal(durata = 0.85, delay = 0.2): void {
    const title = document.querySelector('.title-container') as HTMLElement | null; // recupero il contenitore principale del titolo
    const subtitle = document.querySelector('.subtitle') as HTMLElement | null; // recupero il sottotitolo
    const scrol = document.querySelector('.scrol') as HTMLElement | null; // recupero l'elemento scroll
    const first = document.querySelector('[data-titolo-first]') as HTMLElement | null; // recupero il primo elemento del titolo
    const x = document.querySelector('[data-titolo-x]') as HTMLElement | null; // recupero l'elemento X del titolo

    if (subtitle) { gsap.killTweensOf(subtitle); gsap.set(subtitle, { opacity: 0, display: 'none' }); } // fermo e nascondo il sottotitolo
    if (scrol) { gsap.killTweensOf(scrol); gsap.set(scrol, { opacity: 0 }); } // fermo e nascondo l'elemento scroll
    if (first) { gsap.killTweensOf(first); gsap.set(first, { opacity: 1, clearProps: 'transform' }); } // fermo il primo elemento e ne ripristino visibilita' e transform
    if (x) { gsap.killTweensOf(x); gsap.set(x, { opacity: 1, clearProps: 'transform' }); } // fermo la X e ne ripristino visibilita' e transform

    if (title) { // controllo se il contenitore titolo esiste
      gsap.killTweensOf(title); // fermo eventuali tween attivi sul titolo
      gsap.set(title, { opacity: 1 }); // rendo il titolo sicuramente visibile
      setTimeout(() => { title.classList.add('titolo-alto'); }, 1000); // aggiungo dopo un po' la classe titolo-alto
      this.animateTitoloVersoAlto(title, durata, delay); // avvio l'animazione del titolo verso l'alto
    }
  }

  /**
   * Anima globalmente il titolo verso il centro cercando gli elementi nel DOM.
   *
   * Ripristina posizione centrale e riattiva il sottotitolo.
   *
   * @param durata Durata dell'animazione.
   * @param delay Ritardo iniziale dell'animazione.
   * @returns void
   */
  animateTitoloVersoCentroGlobal(durata = 0.85, delay = 0.2): void {
    const title = document.querySelector('.title-container') as HTMLElement | null; // recupero il contenitore principale del titolo
    const subtitle = document.querySelector('.subtitle') as HTMLElement | null; // recupero il sottotitolo

    if (title) { // controllo se il titolo esiste
      title.classList.remove('titolo-alto'); // rimuovo la classe che lo marca come titolo alto
      gsap.to(title, {
        top: '50%', left: '50%', // riporto il titolo verso il centro
        xPercent: -50, yPercent: -50, // riallineo gli offset di centratura
        paddingTop: 210, marginTop: 0, // ripristino il padding alto e azzero il margine
        scaleX: 1, scaleY: 1, // riporto la scala a quella iniziale
        duration: durata, delay, // uso durata e ritardo ricevuti
        ease: 'power2.inOut', // applico un easing morbido
        onComplete: () => { this.titoloInPosizioneAlta = false; }, // aggiorno lo stato a fine animazione
      });
    }

    if (subtitle) { // controllo se il sottotitolo esiste
      gsap.killTweensOf(subtitle); // fermo eventuali tween attivi sul sottotitolo
      gsap.set(subtitle, { display: 'block' }); // rendo il sottotitolo di nuovo partecipante al layout
      gsap.to(subtitle, { opacity: 1, duration: 0.5, delay, ease: 'power1.out' }); // faccio riapparire il sottotitolo
    }
  }

  /**
   * Imposta globalmente il titolo in posizione alta cercando gli elementi nel DOM.
   *
   * Ripulisce gli elementi secondari e applica subito lo stato alto.
   *
   * @returns void
   */
  setTitoloAltoGlobal(): void {
    const title = document.querySelector('.title-container') as HTMLElement | null; // recupero il contenitore principale del titolo
    const subtitle = document.querySelector('.subtitle') as HTMLElement | null; // recupero il sottotitolo
    const scrol = document.querySelector('.scrol') as HTMLElement | null; // recupero l'elemento scroll
    const first = document.querySelector('[data-titolo-first]') as HTMLElement | null; // recupero il primo elemento del titolo
    const x = document.querySelector('[data-titolo-x]') as HTMLElement | null; // recupero l'elemento X del titolo

    if (subtitle) { gsap.killTweensOf(subtitle); gsap.set(subtitle, { opacity: 0, display: 'none' }); } // fermo e nascondo il sottotitolo
    if (scrol) { gsap.killTweensOf(scrol); gsap.set(scrol, { opacity: 0 }); } // fermo e nascondo l'elemento scroll
    if (first) { gsap.killTweensOf(first); gsap.set(first, { opacity: 1, clearProps: 'transform' }); } // fermo il primo elemento e ne ripristino lo stato
    if (x) { gsap.killTweensOf(x); gsap.set(x, { opacity: 1, clearProps: 'transform' }); } // fermo la X e ne ripristino lo stato

    if (title) { // controllo se il contenitore titolo esiste
      gsap.killTweensOf(title); // fermo eventuali tween attivi sul titolo
      gsap.set(title, { opacity: 1 }); // rendo il titolo visibile
      title.classList.add('titolo-alto'); // aggiungo subito la classe titolo-alto
      this.setTitoloAlto(title); // imposto subito la posizione alta del titolo
    }

    this.titoloInPosizioneAlta = true; // segno che il titolo e' in posizione alta
  }

  /**
   * Imposta globalmente il titolo in posizione centrale cercando gli elementi nel DOM.
   *
   * Ripristina il titolo e rende visibile il sottotitolo.
   *
   * @returns void
   */
  setTitoloCentraleGlobal(): void {
    const title = document.querySelector('.title-container') as HTMLElement | null; // recupero il contenitore principale del titolo
    const subtitle = document.querySelector('.subtitle') as HTMLElement | null; // recupero il sottotitolo

    if (title) { // controllo se il titolo esiste
      title.classList.remove('titolo-alto'); // rimuovo la classe che indica il titolo alto
      this.setTitoloCentrale(title); // imposto subito la posizione centrale del titolo
    }

    if (subtitle) { // controllo se il sottotitolo esiste
      gsap.killTweensOf(subtitle); // fermo eventuali tween attivi sul sottotitolo
      gsap.set(subtitle, { opacity: 1, display: 'block' }); // rendo subito visibile il sottotitolo
    }

    this.titoloInPosizioneAlta = false; // segno che il titolo non e' in posizione alta
  }

  /**
   * Imposta la X nello stato normale.
   *
   * Ripristina le classi statiche arancioni sui due elementi della X.
   *
   * @returns void
   */
  setXNormale(): void {
    const xLow = document.querySelector('#x_low'); // recupero il segmento basso della X
    const xHigh = document.querySelector('#x_hegh'); // recupero il segmento alto della X
    if (xLow) { xLow.classList.add('x-orange'); xLow.classList.remove('x-low'); } // imposto la parte bassa in stato arancione normale
    if (xHigh) { xHigh.classList.add('x-orange'); xHigh.classList.remove('x-high'); } // imposto la parte alta in stato arancione normale
  }

  /**
   * Imposta la X nello stato GIF animato.
   *
   * Ripristina classi e visibilita' necessarie
   * per mostrare la X con pseudo-elemento animato.
   *
   * @returns void
   */
  setXGif(): void {
    const xLow = document.querySelector('#x_low'); // recupero il segmento basso della X
    const xHigh = document.querySelector('#x_hegh'); // recupero il segmento alto della X
    const xAfterRule = CSSRulePlugin.getRule('.x::after'); // recupero la regola CSS dello pseudo-elemento della X

    if (xLow) { // controllo se la parte bassa esiste
      gsap.killTweensOf(xLow); // fermo eventuali tween sulla parte bassa
      xLow.classList.remove('x-orange'); // rimuovo la classe arancione statica
      xLow.classList.add('x', 'x-low'); // applico le classi della versione GIF bassa
    }
    if (xHigh) { // controllo se la parte alta esiste
      gsap.killTweensOf(xHigh); // fermo eventuali tween sulla parte alta
      xHigh.classList.remove('x-orange'); // rimuovo la classe arancione statica
      xHigh.classList.add('x', 'x-high'); // applico le classi della versione GIF alta
      gsap.set(xHigh, { color: 'transparent', opacity: 1, clearProps: 'transform' }); // rendo trasparente il testo e ripristino lo stato visivo corretto
    }
    if (xAfterRule) gsap.set(xAfterRule, { opacity: 1 }); // rendo visibile lo pseudo-elemento animato della X
  }

  /**
   * Forza il refresh delle GIF della X.
   *
   * Aggiorna gli URL delle immagini con un timestamp
   * per evitare il riuso da cache.
   *
   * @returns void
   */
  refreshXGif(): void {
    const xAfterLow = CSSRulePlugin.getRule('.x-low::after'); // recupero la regola CSS dello pseudo-elemento basso
    const xAfterHigh = CSSRulePlugin.getRule('.x-high::after'); // recupero la regola CSS dello pseudo-elemento alto
    const ts = `?t=${Date.now()}`; // genero un timestamp per forzare il refresh delle immagini
    if (xAfterLow) gsap.set(xAfterLow, { backgroundImage: `url("/assets/img/x_piccola.gif${ts}")` }); // aggiorno la GIF della X bassa
    if (xAfterHigh) gsap.set(xAfterHigh, { backgroundImage: `url("/assets/img/x_grende.gif${ts}")` }); // aggiorno la GIF della X alta
  }
}
