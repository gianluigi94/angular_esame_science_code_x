// Service che centralizza la navigazione verso la pagina contatti coordinando animazioni, stato auth e transizione video.

import { Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { CambioLinguaService } from './cambio-lingua.service';
import { Authservice } from '../_benvenuto/login/_login_service/auth.service';
import { StopVideoGlobaleService } from '../_catalogo/riga-categoria/categoria_services/stop-video-globale.service';

@Injectable({ providedIn: 'root' })
export class ContattiNavigazioneService {

 constructor(
  private injector: Injector,
  private cambioLinguaService: CambioLinguaService,
  private authService: Authservice,
  private router: Router,
  private stopVideoGlobale: StopVideoGlobaleService,
) {}

  /**
   * Indica se l'utente risulta autenticato leggendo il token corrente.
   *
   * @returns boolean
   */
  get sonoLoggato(): boolean {
    return !!this.authService.leggiObsAuth().value?.tk; // controllo se nello stato auth esiste un token valido
  }

  /**
   * Gestisce la navigazione verso la pagina contatti coordinando stato utente, lazy import e animazioni.
   *
   * @returns Promise<void>
   */
  async vai(): Promise<void> {
    if (this.sonoLoggato) { // controllo se l'utente risulta gia' loggato
      window.dispatchEvent(new CustomEvent('apri-dati-personali')); // notifico l'apertura dei dati personali
    }

    const [ // preparo i moduli caricati in lazy per non metterli nel main bundle
      { SaturnoService }, // recupero il service di Saturno
      { AnimateService }, // recupero il service delle animazioni generali
      { SaturnoRouteAnimazioniService }, // recupero il service delle animazioni route di Saturno
      { default: gsap }, // recupero gsap in lazy
    ] = await Promise.all([ // aspetto che tutti gli import dinamici siano pronti
      import('./animazioni_saturno/three/saturno.service'), // carico il service three di Saturno
      import('./animazioni_saturno/animate.service'), // carico il service animate
      import('./animazioni_saturno/gsap/saturno-route-animazioni.service'), // carico il service route animazioni di Saturno
      import('gsap'), // carico gsap dinamicamente
    ]);

    const saturnoService = this.injector.get(SaturnoService); // recupero l'istanza del service Saturno dall'injector
    const animateService = this.injector.get(AnimateService); // recupero l'istanza del service animate dall'injector
    const saturnoRouteAnimazioniService = this.injector.get(SaturnoRouteAnimazioniService); // recupero l'istanza del service route animazioni dall'injector

    const scene = saturnoService.getScene(); // leggo la scena corrente di Saturno
    const saturnoEl = document.querySelector('app-saturno') as HTMLElement | null; // recupero l'elemento DOM di Saturno
    const sfondoEl = document.querySelector('app-sfondo') as HTMLElement | null; // recupero l'elemento DOM dello sfondo

    const opacitaSaturno = saturnoEl ? parseFloat(getComputedStyle(saturnoEl).opacity) : 1; // leggo l'opacita' attuale di Saturno oppure uso 1 come fallback
    const opacitaSfondo = sfondoEl ? parseFloat(getComputedStyle(sfondoEl).opacity) : 1; // leggo l'opacita' attuale dello sfondo oppure uso 1 come fallback

    const saturnoNascosto = opacitaSaturno < 0.1; // considero Saturno nascosto se la sua opacita' e' molto bassa
    const sfondoNascosto = sfondoEl ? opacitaSfondo < 0.1 : false; // considero lo sfondo nascosto solo se l'elemento esiste ed e' quasi trasparente

    const navigaAContatti = async () => { // preparo la funzione che esegue la navigazione finale verso contatti
      const videoAttivo = Array.from(document.querySelectorAll('video')) // raccolgo tutti i video presenti nella pagina
        .some(v => !v.paused && !v.ended && v.readyState > 2); // verifico se almeno un video e' davvero in riproduzione

      if (videoAttivo) { // controllo se c'e' un video attivo prima di navigare
        await this.stopVideoGlobale.richiediSoloFadeAudio(350).catch(() => {}); // provo a eseguire solo il fade audio prima della navigazione
      }

      const codice = this.cambioLinguaService.leggiCodiceLingua(); // leggo il codice lingua corrente
      const segmento = codice === 'it' ? 'contatti' : 'contact'; // costruisco il segmento path coerente con la lingua
      this.router.navigate(['/', codice, segmento]); // navigo verso la pagina contatti corretta
    };

    if (saturnoNascosto || sfondoNascosto) { // controllo se Saturno o lo sfondo risultano nascosti
      const scena = saturnoService.getScene(); // recupero di nuovo la scena corrente
      const luce = saturnoService.getDirectionalLight(); // recupero la luce direzionale di Saturno

      saturnoService.riaccendiSaturno(); // riaccendo Saturno per rendere possibile la transizione animata

      if (saturnoEl) { // controllo se l'elemento DOM di Saturno esiste
        gsap.killTweensOf(saturnoEl); // fermo eventuali tween attivi su Saturno
        saturnoEl.style.opacity = '1'; // rendo subito visibile Saturno
      }

      const tl = gsap.timeline(); // creo una timeline GSAP per la transizione di riapparizione
      setTimeout(() => navigaAContatti(), 1050); // faccio partire la navigazione con un piccolo ritardo coerente con l'animazione

      if (sfondoEl) { // controllo se l'elemento DOM dello sfondo esiste
        gsap.killTweensOf(sfondoEl); // fermo eventuali tween attivi sullo sfondo
        sfondoEl.style.opacity = '0'; // imposto subito lo sfondo a invisibile prima del fade-in
        tl.fromTo(sfondoEl, { opacity: 0 }, { opacity: 1, duration: 1.25, ease: 'power2.out' }, 0); // animo lo sfondo da trasparente a visibile
      }

      if (scena) { // controllo se la scena e' disponibile
        saturnoRouteAnimazioniService.animaVerso(scena, 'LOGIN_LATERALE', 1.15, luce || undefined); // animo Saturno verso la posa laterale di login
      }

    } else { // entro qui se Saturno e sfondo sono gia' visibili
      const poseStimata = scene ? this.indovinaPose(scene.position, scene.scale) : 'SCONOSCIUTA'; // provo a stimare la posa corrente di Saturno

      if (poseStimata === 'WELCOME_BASSO') { // controllo se Saturno si trova nella posa welcome bassa
        const luce = saturnoService.getDirectionalLight(); // recupero la luce direzionale corrente
        animateService.setXNormale(); // ripristino la X nello stato normale
        animateService.animateTitoloVersoAltoGlobal(); // animo il titolo verso la posizione alta
        saturnoRouteAnimazioniService.animaVerso(scene!, 'LOGIN_LATERALE', 0.85, luce || undefined); // animo Saturno verso la posa laterale di login
        navigaAContatti(); // avvio la navigazione verso contatti
      } else { // entro qui se la posa non richiede animazioni specifiche
        navigaAContatti(); // navigo direttamente verso contatti
      }
    }
  }

  /**
   * Stima la posa corrente di Saturno in base a posizione e scala.
   *
   * @param pos Posizione corrente dell'oggetto nella scena.
   * @param scl Scala corrente dell'oggetto nella scena.
   * @returns string
   */
  private indovinaPose(
    pos: { x: number; y: number; z: number },
    scl: { x: number; y: number; z: number }
  ): string {
    if (Math.abs(scl.x - 0.01) < 0.05) return 'CATALOGO_NASCOSTO'; // riconosco la posa catalogo nascosto da una scala quasi azzerata
    if (Math.abs(scl.x - 1.4) < 0.2 && pos.x < -1) return 'LOGIN_LATERALE'; // riconosco la posa login laterale da scala e posizione sull'asse x
    if (Math.abs(scl.x - 3.8) < 0.3) return 'WELCOME_BASSO'; // riconosco la posa welcome basso da una scala molto grande
    if (Math.abs(scl.x - 1) < 0.15 && Math.abs(pos.x) < 0.5) return 'WELCOME_ALTO'; // riconosco la posa welcome alto da scala circa unitaria e posizione centrale
    return 'SCONOSCIUTA'; // ritorno sconosciuta se nessuna condizione combacia
  }
}
