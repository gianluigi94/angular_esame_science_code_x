// Service che gestisce il codice principale della scena di Saturno in Three.js.

import { Injectable, NgZone } from '@angular/core';
import * as THREE from 'three';
import { SceneService } from './scene.service';
import { DiskService } from './disk.service';
import { AsteroidiParticleGroupService } from './asteroidi-particle-group.service';
import { AnimateService } from '../animate.service';
import { AsteroidiMaterialService } from './asteroidi-material.service';
import { PerformanceService } from '../../performance.service';
import { SaturnoPosizioniService } from '../saturno_posizioni.service';
import { Router } from '@angular/router';
import { SaturnoRouteAnimazioniService } from '../gsap/saturno-route-animazioni.service';
import { CaricamentoCaroselloService } from 'src/app/_catalogo/carosello-novita/carosello_services/caricamento-carosello.service';
import { ToastService } from 'src/app/_servizi_globali/toast.service';
import { SaturnoStatoService } from '../saturno-stato.service';
import { ScorrimentoCatalogoService } from 'src/app/_catalogo/riga-categoria/categoria_services/scorrimento-catalogo.service';
import { leggiPathDaSessionStorage, isAreaCatalogo} from 'src/app/_helpers_globali/helpers';
import gsap from 'gsap';
import { GRUPPI_CONFIG } from './saturno-gruppi-config';
import { SaturnoDischiService } from './saturno-dischi.service';
import { SaturnoMouseHelper } from './saturno_helpers/saturno-mouse.helper';
import { SaturnoLoopHelper } from './saturno_helpers/saturno-loop.helper';
import { eRottaCatalogo, eRottaWelcome, eRottaLogin, eRottaRegistrazione, eRottaNotFound, eRottaContatti, eRottaPiano, eRottaRicevute, eSchedaCatalogo, leggiUrlAttuale } from './saturno-url.utils';

@Injectable({ providedIn: 'root' })
export class SaturnoService {
  private pathPrecedenteSessioneAllAvvio: string = ''; // conservo il path precedente letto dalla sessione all'avvio del service
  saturnoPronto$ = this.saturnoStatoService.saturnoPronto$; // espongo lo stream che segnala quando Saturno e' pronto
  transizioneDa404ACatalogo: boolean = false; // tengo traccia se devo gestire la transizione dalla 404 al catalogo
  private scenaInizializzata: boolean = false; // tengo traccia se la scena e' gia' stata inizializzata almeno una volta

  private catalogoGiaAnimato: boolean = false; // tengo traccia se il catalogo ha gia' fatto la sua animazione di ingresso

  private groupsConfig = [...GRUPPI_CONFIG]; // preparo la configurazione dei gruppi particellari partendo dalla costante condivisa

  private scene: THREE.Scene | null = null; // conservo il riferimento alla scena Three.js
  private camera: THREE.Camera | null = null; // conservo il riferimento alla camera Three.js
  private renderer: THREE.WebGLRenderer | null = null; // conservo il riferimento al renderer Three.js

  private planetMesh: THREE.Mesh | null = null; // conservo il riferimento alla mesh principale di Saturno
  private particleGroups: THREE.Group[] = []; // conservo i gruppi di particelle creati attorno a Saturno

  private directionalLight: THREE.DirectionalLight | null = null; // conservo il riferimento alla luce direzionale principale
  private skipLoginIntroOnce: boolean = false; // tengo traccia se devo saltare una volta l'intro del login
  private skipRegistrazioneIntroOnce: boolean = false; // tengo traccia se devo saltare una volta l'intro della registrazione

  private readonly mouseHelper = new SaturnoMouseHelper(); // creo l'helper dedicato al mouse e all'hover delle particelle
  private loopHelper!: SaturnoLoopHelper; // conservo l'helper che gestisce il loop di rendering

  /**
   * Verifica se il dispositivo corrente e' mobile o tablet.
   *
   * @returns boolean
   */
  private isMobileOrTablet(): boolean {
    const userAgent = navigator.userAgent.toLowerCase(); // leggo la user agent corrente in minuscolo
    return /android|iphone|ipad|ipod|blackberry|opera mini|iemobile|wpdesktop/.test(
      userAgent,
    ); // verifico se la user agent appartiene a un dispositivo mobile o tablet
  }

  /**
   * Riduce il numero di particelle per alleggerire la scena su device meno performanti.
   *
   * @returns void
   */
  private reduceParticles(): void {
    this.groupsConfig = this.groupsConfig.map((group) => ({
      // ricreo tutte le configurazioni dei gruppi
      ...group, // mantengo tutte le proprieta' originali del gruppo
      particleCount: Math.max(group.particleCount - 200, 30), // riduco le particelle senza scendere sotto la soglia minima
    }));
  }

  constructor(
    private sceneService: SceneService,
    private diskService: DiskService,
    private saturnoDischiService: SaturnoDischiService,
    private particleGroupService: AsteroidiParticleGroupService,
    private toastService: ToastService,
    private animateService: AnimateService,
    private asteroidiMaterialService: AsteroidiMaterialService,
    private performanceService: PerformanceService,
    private saturnoStatoService: SaturnoStatoService,
    private saturnoPosizioniService: SaturnoPosizioniService,
    private router: Router,
    private saturnoRouteAnimazioniService: SaturnoRouteAnimazioniService,
    private caricamentoCaroselloService: CaricamentoCaroselloService,
    private scorrimentoCatalogo: ScorrimentoCatalogoService,
    private ngZone: NgZone,
  ) {
    this.loopHelper = new SaturnoLoopHelper( // inizializzo l'helper del loop passando tutti i riferimenti necessari
      ngZone, // passo la NgZone per eseguire il loop fuori da Angular
      diskService, // passo il service dei dischi per animare gli anelli
      saturnoStatoService, // passo il service di stato per segnalare quando Saturno e' pronto
      this.mouseHelper, // passo l'helper del mouse per animare i gruppi particellari
      () => this.planetMesh, // passo la funzione che restituisce la mesh del pianeta
      () => this.particleGroups, // passo la funzione che restituisce i gruppi di particelle
      () => this.camera, // passo la funzione che restituisce la camera corrente
    );
    this.performanceService.isLowEndPC$.subscribe((isLowEnd) => {
      // mi sottoscrivo al flag che indica macchine poco performanti
      if (isLowEnd || this.isMobileOrTablet()) {
        // controllo se la macchina e' low-end oppure se il device e' mobile/tablet
        this.reduceParticles(); // riduco il numero di particelle per alleggerire la scena
      }
    });
    this.transizioneDa404ACatalogo = this.leggiFlagTransizione404Catalogo(); // leggo subito l'eventuale flag di transizione 404 -> catalogo

    this.skipLoginIntroOnce =
      this.isPageReload() && eRottaLogin(window.location.pathname); // preparo il flag per saltare una volta l'intro login in caso di reload
    this.skipRegistrazioneIntroOnce =
      this.isPageReload() && eRottaRegistrazione(window.location.pathname); // preparo il flag per saltare una volta l'intro registrazione in caso di reload
    this.pathPrecedenteSessioneAllAvvio = leggiPathDaSessionStorage(); // salvo il path precedente disponibile in session storage all'avvio
  }

  /**
   * Distrugge completamente la scena di Saturno, le animazioni e i riferimenti associati.
   *
   * @returns void
   */
  private distruggiSaturno(): void {
    this.animateService.resetAnimations?.(); // fermo e resetto le animazioni GSAP se il metodo e' disponibile

    this.loopHelper.stop(); // fermo il loop di rendering

    this.mouseHelper.rimuoviHoverMouse(); // rimuovo il listener del mouse

    if (this.scene) {
      // controllo se la scena esiste
      if (this.planetMesh) {
        // controllo se la mesh del pianeta esiste
        this.scene.remove(this.planetMesh); // rimuovo la mesh del pianeta dalla scena
      }

      this.particleGroups.forEach((group) => {
        // scorro tutti i gruppi di particelle
        this.scene!.remove(group); // rimuovo ogni gruppo dalla scena
      });

      if (this.directionalLight) {
        // controllo se la luce direzionale esiste
        this.scene.remove(this.directionalLight); // rimuovo la luce dalla scena
      }

      this.diskService.getDisks().forEach(({ mesh }) => {
        // scorro tutti i dischi registrati nel service
        this.scene!.remove(mesh); // rimuovo ciascun disco dalla scena
      });
    }

    this.planetMesh = null; // azzero il riferimento alla mesh del pianeta
    this.particleGroups = []; // svuoto l'array dei gruppi di particelle
    this.directionalLight = null; // azzero il riferimento alla luce direzionale
    this.diskService.clearDisks(); // pulisco l'archivio dei dischi nel service dedicato

    if (this.renderer) {
      // controllo se il renderer esiste
      const canvas = this.renderer.domElement; // recupero il canvas del renderer
      if (canvas.parentElement) {
        // controllo se il canvas e' montato nel DOM
        canvas.parentElement.removeChild(canvas); // rimuovo il canvas dal DOM
      }
    }

    this.scene = null; // azzero il riferimento alla scena
    this.camera = null; // azzero il riferimento alla camera
    this.renderer = null; // azzero il riferimento al renderer

    this.loopHelper.resetFirstRender(); // resetto il flag del primo render nel loop helper
    this.saturnoStatoService.reset(); // resetto lo stato globale di Saturno
    this.catalogoGiaAnimato = false; // resetto il flag che indica se il catalogo e' gia' stato animato
  }

  /**
   * Spegne Saturno fermando loop e hover senza distruggere la scena.
   *
   * @returns void
   */
  public spegniSaturno(): void {
    this.loopHelper.stop(); // fermo il loop di rendering ma mantengo la scena viva
    this.mouseHelper.rimuoviHoverMouse(); // rimuovo il listener del mouse
  }

  /**
   * Avvia il loop di rendering a FPS fissi usando i riferimenti correnti.
   *
   * @returns void
   */
  private startFixedFPSLoop(): void {
    this.loopHelper.start(this.scene!, this.camera!, this.renderer!); // avvio il loop passando scena, camera e renderer attuali
  }

  /**
   * Carica la texture del pianeta Saturno in una Promise.
   *
   * @returns Promise<THREE.Texture>
   */
  private loadPlanetTexture(): Promise<THREE.Texture> {
    const textureLoader = new THREE.TextureLoader(); // creo il loader delle texture Three.js
    return new Promise((resolve, reject) => {
      // creo una promise che si risolve quando la texture e' pronta
      const textureCacheHit = localStorage.getItem('saturnoTextureLoaded'); // verifico se ho gia' un flag locale che indica il caricamento texture

      if (textureCacheHit) {
        // controllo se il flag locale esiste gia'
        console.log(
          'NON PRIMA VOLTA: La texture di Saturno è stata caricata dalla cache.',
        ); // loggo che la texture era gia' stata caricata in precedenza
      } else {
        console.log(
          'PRIMA VOLTA: Caricamento texture di Saturno per la prima volta.',
        ); // loggo che questa e' la prima volta che carico la texture
        localStorage.setItem('saturnoTextureLoaded', 'true'); // salvo il flag locale per i caricamenti successivi
      }

      textureLoader.load(
        'assets/texture/saturno.webp', // indico il path della texture di Saturno
        (texture) => resolve(texture), // risolvo la promise quando la texture e' stata caricata
        undefined, // non uso un callback di progress
        (error) => reject(error), // rigetto la promise se il caricamento fallisce
      );
    });
  }

  /**
   * Attende che il carosello sia pronto oppure che scada il timeout.
   *
   * @param timeoutMs Timeout massimo di attesa in millisecondi.
   * @returns Promise<void>
   */
  private attendiCaroselloPronto(timeoutMs: number = 12000): Promise<void> {
    return new Promise((resolve) => {
      // creo una promise che si risolve quando il carosello e' pronto o scade il timeout
      if (this.caricamentoCaroselloService.caroselloPronto$.value)
        // controllo se il carosello e' gia' pronto
        return resolve(); // risolvo subito se il carosello e' gia' disponibile

      const sub = this.caricamentoCaroselloService.caroselloPronto$.subscribe(
        (ok) => {
          // mi sottoscrivo allo stream di prontezza del carosello
          if (!ok) return; // esco se il valore emesso non e' ancora true
          try {
            sub.unsubscribe();
          } catch {} // provo a rimuovere la sottoscrizione
          resolve(); // risolvo la promise quando il carosello diventa pronto
        },
      );

      setTimeout(() => {
        // preparo il timeout di sicurezza
        try {
          sub.unsubscribe();
        } catch {} // provo a rimuovere la sottoscrizione anche allo scadere del timeout
        resolve(); // risolvo comunque la promise allo scadere del tempo massimo
      }, timeoutMs);
    });
  }

  /**
   * Inizializza Saturno oppure riusa la scena esistente in base alla rotta corrente.
   *
   * @param usaAnimazioniWelcome Flag che decide se usare le animazioni di ingresso della welcome.
   * @returns Promise<void>
   */
  public initializeSaturn(usaAnimazioniWelcome: boolean = true): Promise<void> {
    return new Promise((resolve, reject) => {
      // creo la promise principale di inizializzazione di Saturno

      const urlSubito = leggiUrlAttuale(); // leggo subito l'URL completo attuale
      const vengoDaContattiFlag =
        sessionStorage.getItem('vengo_da_contatti') === 'true'; // verifico se arrivo dai contatti tramite flag di sessione
      const vengoDaPianoFlag =
        sessionStorage.getItem('vengo_da_piano') === 'true';
      const vengoDaRicevuteFlag =
        sessionStorage.getItem('vengo_da_ricevute') === 'true';
      if (
        (vengoDaContattiFlag || vengoDaPianoFlag || vengoDaRicevuteFlag) &&
        this.scenaInizializzata && // controllo se la scena era gia' stata inizializzata
        (eRottaCatalogo(urlSubito) || eSchedaCatalogo(urlSubito)) && // controllo se sono in catalogo o in una scheda catalogo
        !this.catalogoGiaAnimato // controllo che il catalogo non risulti gia' animato
      ) {
        try {
          sessionStorage.removeItem('vengo_da_contatti');
          sessionStorage.removeItem('vengo_da_piano');
          sessionStorage.removeItem('vengo_da_ricevute');
        } catch {}
        const saturno = document.querySelector(
          'app-saturno',
        ) as HTMLElement | null;
        const sfondo = document.querySelector(
          'app-sfondo',
        ) as HTMLElement | null;
        if (saturno) {
          gsap.killTweensOf(saturno);
          gsap.set(saturno, { opacity: 1 });
        }
        if (sfondo) {
          gsap.killTweensOf(sfondo);
          gsap.set(sfondo, { opacity: 1 });
        }
        this.animateService.fadeOutSaturnoESfondo(1.25, () => {
          this.animateService.enablePageScroll();
        });
      }

      if (
        this.scenaInizializzata && // controllo se la scena e' gia' stata inizializzata in precedenza
        this.scene && // controllo se la scena Three.js esiste ancora
        this.camera && // controllo se la camera esiste ancora
        this.renderer // controllo se il renderer esiste ancora
      ) {
        const url = leggiUrlAttuale(); // leggo l'URL corrente completo
        const da404 = this.leggiFlagTransizione404Catalogo(); // leggo l'eventuale flag di transizione 404 -> catalogo

        if (eRottaCatalogo(url) && this.catalogoGiaAnimato && !da404) {
          // controllo se sono in catalogo gia' animato e non provengo da 404
          const container = document.getElementById('three-container'); // recupero il contenitore attuale del canvas Three.js
          if (
            container &&
            this.renderer.domElement.parentElement !== container
          ) {
            // verifico se devo riattaccare il canvas a un nuovo contenitore
            container.appendChild(this.renderer.domElement); // riattacco il canvas al contenitore corretto
          }

          const vengoDaContatti =
            (sessionStorage.getItem('vengo_da_contatti') || '') === 'true';
          const vengoDaPiano =
            (sessionStorage.getItem('vengo_da_piano') || '') === 'true';
          const vengoDaRicevute =
            (sessionStorage.getItem('vengo_da_ricevute') || '') === 'true';

          if (vengoDaContatti || vengoDaPiano || vengoDaRicevute) {
            try {
              sessionStorage.removeItem('vengo_da_contatti');
              sessionStorage.removeItem('vengo_da_piano');
              sessionStorage.removeItem('vengo_da_ricevute');
            } catch {}

            const saturno = document.querySelector(
              'app-saturno',
            ) as HTMLElement | null; // recupero il contenitore di Saturno dal DOM
            const sfondo = document.querySelector(
              'app-sfondo',
            ) as HTMLElement | null; // recupero il contenitore dello sfondo dal DOM

            if (saturno) {
              gsap.killTweensOf(saturno);
              gsap.set(saturno, { opacity: 1 });
            } // fermo i tween e rendo visibile Saturno se esiste
            if (sfondo) {
              gsap.killTweensOf(sfondo);
              gsap.set(sfondo, { opacity: 1 });
            } // fermo i tween e rendo visibile lo sfondo se esiste

            requestAnimationFrame(() => {
              // aspetto il frame successivo prima di lanciare il fade
              this.animateService.fadeOutSaturnoESfondo(1.25, () => {
                // faccio partire il fade out di Saturno e sfondo
                this.animateService.enablePageScroll(); // riabilito lo scroll al termine del fade
              });
            });
          } else {
            this.animateService.fadeOutSaturnoESfondo(0); // porto subito Saturno e sfondo nello stato finale di fade out
            this.animateService.enablePageScroll(); // abilito subito lo scroll pagina
          }

          this.spegniSaturno(); // spengo Saturno senza distruggere la scena
          this.animateService.pauseClearcoat(); // metto in pausa l'animazione del clearcoat

          resolve(); // risolvo la promise perche' il riuso e' completato
          return; // esco dalla funzione
        }

        const container = document.getElementById('three-container'); // recupero il contenitore del canvas Three.js
        if (!container) {
          // controllo se il contenitore non esiste
          console.error('Contenitore non trovato: three-container'); // loggo l'errore di contenitore mancante
          resolve(); // risolvo comunque la promise per non bloccare il flusso
          return; // esco dalla funzione
        }

        if (this.renderer.domElement.parentElement !== container) {
          // controllo se il canvas e' montato in un contenitore diverso
          container.appendChild(this.renderer.domElement); // riattacco il canvas al contenitore corretto
        }

        const durata = 0.85; // preparo la durata standard delle transizioni principali
        const durataCatalogo = 1.6; // preparo la durata standard della transizione verso il catalogo

        if (eRottaLogin(url)) {
          // controllo se la rotta corrente e' login
          if (this.skipLoginIntroOnce) {
            // controllo se devo saltare una volta l'intro del login
            this.animateService.setXNormale(); // porto la X nello stato normale
            this.animateService.setTitoloAltoGlobal(); // porto subito il titolo nella posizione alta
            this.skipLoginIntroOnce = false; // consumo il flag di skip dell'intro login
          } else {
            this.animateService.animateTitoloVersoAltoGlobal(); // animo il titolo verso l'alto
            this.animateService.setXNormale(); // porto la X nello stato normale
          }
          this.saturnoRouteAnimazioniService.animaVerso(
            this.scene,
            'LOGIN_LATERALE',
            durata,
            this.directionalLight || undefined,
          ); // animo Saturno verso la posa laterale del login
        } else if (eRottaNotFound(url)) {
          // controllo se la rotta corrente e' not found
          const scenaCorrente = this.scene; // salvo un riferimento locale alla scena corrente
          if (!scenaCorrente) {
            resolve();
            return;
          } // esco se per qualche motivo la scena non esiste
          this.ensureRingsAndParticlesIfMissing(scenaCorrente); // ricreo anelli e particelle se mancanti
          this.saturnoPosizioniService.applicaPoseAScena(
            scenaCorrente,
            'CATALOGO_NASCOSTO',
          ); // applico subito la posa catalogo nascosto
          this.animateService.setXNormale(); // porto la X nello stato normale
          this.animateService.setTitoloAltoGlobal(); // porto il titolo nella posizione alta
          this.animateService.enablePageScroll(); // abilito lo scroll pagina
          requestAnimationFrame(() => {
            // aspetto il frame successivo prima di avviare l'ingresso della 404
            this.saturnoRouteAnimazioniService.animaIngresso404ConScritte(
              scenaCorrente,
              1.45,
              this.directionalLight || undefined,
            ); // animo l'ingresso della 404 con Saturno e scritte
          });
        } else if (eRottaWelcome(url)) {
          // controllo se la rotta corrente e' welcome
          this.animateService.setTitoloCentraleGlobal(); // porto il titolo al centro
          this.animateService.setXGif(); // porto la X nello stato GIF
        } else if (eRottaCatalogo(url)) {
          // controllo se la rotta corrente e' catalogo
          const da404 = this.leggiFlagTransizione404Catalogo(); // leggo di nuovo il flag di transizione 404 -> catalogo

          if (da404) {
            // controllo se devo gestire il caso speciale da 404 verso catalogo
            const durataCatalogo = 1.6; // preparo la durata del passaggio verso catalogo
            const anticipoMs = 400; // preparo l'anticipo del fade finale rispetto alla fine animazione
            this.scorrimentoCatalogo.impostaSpinnerScroll(true); // attivo lo spinner di scroll del catalogo
            this.attendiCaroselloPronto().finally(() => {
              // aspetto che il carosello sia pronto prima di completare la transizione
              setTimeout(
                () => {
                  // preparo il fade in anticipo rispetto alla fine del movimento di Saturno
                  this.animateService.fadeOutSaturnoESfondo(1.25, () => {
                    // faccio partire il fade out di Saturno e sfondo
                    this.animateService.enablePageScroll(); // riabilito lo scroll al termine del fade
                  });
                },
                durataCatalogo * 1000 - anticipoMs,
              );
              this.saturnoRouteAnimazioniService.animaVerso(
                this.scene!,
                'CATALOGO_NASCOSTO',
                durataCatalogo,
                this.directionalLight || undefined,
                () => {
                  this.spegniSaturno(); // spengo Saturno al termine della transizione
                  this.animateService.pauseClearcoat(); // metto in pausa il clearcoat
                  this.catalogoGiaAnimato = true; // segno che il catalogo ha gia' completato l'animazione
                  this.consumaFlagTransizione404Catalogo(); // consumo il flag di transizione 404 -> catalogo
                  this.scorrimentoCatalogo.impostaSpinnerScroll(false); // disattivo lo spinner di scroll del catalogo
                },
              );
            });
            this.attivaHoverMouse(); // riattivo l'hover del mouse sulle particelle
            this.startFixedFPSLoop(); // riavvio il loop di rendering
            resolve(); // risolvo la promise subito dopo avere innescato il flusso
            return; // esco dalla funzione
          }

          const anticipoMs = 400; // preparo l'anticipo del fade finale rispetto alla fine animazione

          if (this.animateService.isTitoloInPosizioneAlta()) {
            // controllo se il titolo e' gia' in posizione alta
            const durataCatalogo = 1.6; // preparo la durata della transizione catalogo
            this.attendiCaroselloPronto().finally(() => {
              // aspetto che il carosello sia pronto prima della transizione
              this.toastService.chiudi('accesso_ok'); // chiudo l'eventuale toast di accesso riuscito
              setTimeout(
                () => {
                  // preparo il fade out verso il catalogo
                  this.animateService.fadeOutSaturnoESfondo(1.25, () => {
                    // faccio partire il fade out di Saturno e sfondo
                    this.animateService.enablePageScroll(); // riabilito lo scroll al termine del fade
                  });
                  this.animateService.enablePageScroll(); // abilito comunque lo scroll
                  this.animateService.fadeOutSaturnoESfondo(1.25); // rilancio anche il fade out come nel codice originale
                },
                durataCatalogo * 1000 - anticipoMs,
              );
              this.saturnoRouteAnimazioniService.animaVerso(
                this.scene!,
                'CATALOGO_NASCOSTO',
                durataCatalogo,
                this.directionalLight || undefined,
                () => {
                  this.spegniSaturno(); // spengo Saturno al termine della transizione
                  this.animateService.pauseClearcoat(); // metto in pausa il clearcoat
                  this.catalogoGiaAnimato = true; // segno che il catalogo ha gia' completato l'animazione
                },
              );
            });
          } else {
            this.animateService.setTitoloCentraleGlobal(); // porto il titolo al centro prima della transizione verso catalogo
            const durataCatalogo = 1.6; // preparo la durata della transizione catalogo
            this.attendiCaroselloPronto().finally(() => {
              // aspetto che il carosello sia pronto prima della transizione
              setTimeout(
                () => {
                  // preparo il fade out verso il catalogo
                  this.animateService.fadeOutSaturnoESfondo(1.25, () => {
                    // faccio partire il fade out di Saturno e sfondo
                    this.animateService.enablePageScroll(); // riabilito lo scroll al termine del fade
                  });
                },
                durataCatalogo * 1000 - anticipoMs,
              );
              this.saturnoRouteAnimazioniService.animaVerso(
                this.scene!,
                'CATALOGO_NASCOSTO',
                durataCatalogo,
                this.directionalLight || undefined,
                () => {
                  this.spegniSaturno(); // spengo Saturno al termine della transizione
                  this.animateService.pauseClearcoat(); // metto in pausa il clearcoat
                  this.animateService.setXNormale(); // riporto la X nello stato normale
                  this.animateService.animateTitoloVersoAltoGlobal(); // animo il titolo verso l'alto a fine transizione
                  this.catalogoGiaAnimato = true; // segno che il catalogo ha gia' completato l'animazione
                },
              );
            });
          }
        } else if (eRottaRegistrazione(url)) {
          // controllo se la rotta corrente e' registrazione
          const giaInBasso = this.scene.scale.x > 3; // verifico se Saturno e' gia' in posa bassa
          const titoloGiaAlto = this.animateService.isTitoloInPosizioneAlta(); // verifico se il titolo e' gia' alto
          if (!titoloGiaAlto) {
            // controllo se il titolo non e' ancora alto
            this.animateService.setXNormale(); // porto la X nello stato normale
            this.animateService.animateTitoloVersoAltoGlobal(); // animo il titolo verso l'alto
          } else {
            this.animateService.setXNormale(); // porto comunque la X nello stato normale
          }
          if (!giaInBasso) {
            // controllo se Saturno non e' gia' nella posa bassa
            this.saturnoRouteAnimazioniService.animaVerso(
              this.scene,
              'REGISTRAZIONE_BASSO',
              durata,
              this.directionalLight || undefined,
            ); // animo Saturno verso la posa bassa della registrazione
          }
        }

        this.attivaHoverMouse(); // riattivo l'hover del mouse sulle particelle
        this.startFixedFPSLoop(); // riavvio il loop di rendering
        resolve(); // risolvo la promise dopo il riuso della scena
        return; // esco dalla funzione
      }

      Promise.all([
        this.loadPlanetTexture(), // carico la texture del pianeta in parallelo
        this.asteroidiMaterialService.loadAllTextures(), // carico in parallelo tutte le texture dei materiali degli asteroidi
      ])
        .then(([planetTexture, _]) => {
          // entro qui quando entrambe le promesse di caricamento sono risolte
          const { scene, camera, renderer } = this.sceneService; // recupero scena, camera e renderer dal scene service

          this.scene = scene; // salvo il riferimento alla scena appena creata
          this.camera = camera; // salvo il riferimento alla camera appena creata
          this.renderer = renderer; // salvo il riferimento al renderer appena creato

          const container = document.getElementById('three-container'); // recupero il contenitore del canvas Three.js
          if (!container) {
            // controllo se il contenitore non esiste
            console.error('Contenitore non trovato: three-container'); // loggo l'errore di contenitore mancante
            return; // esco dal then mantenendo il comportamento del codice originale
          }

          renderer.setSize(window.innerWidth, window.innerHeight); // imposto la dimensione del renderer sulla viewport corrente
          container.appendChild(renderer.domElement); // aggiungo il canvas del renderer al contenitore DOM

          let lightIntensity = 0; // preparo l'intensita' iniziale della luce
          let lightZ = -13.1001; // preparo la posizione z iniziale della luce dietro al pianeta

          if (!usaAnimazioniWelcome) {
            // controllo se non devo usare le animazioni di ingresso della welcome
            lightIntensity = 2.8; // imposto subito la luce accesa
            const url = this.router.url; // leggo la rotta corrente dal router
            if (eRottaLogin(url))
              lightZ = 0.1001; // imposto la z della luce per la posa login laterale
            else if (eRottaWelcome(url))
              lightZ = 10.1001; // imposto la z della luce per la posa welcome alta
            else lightZ = 5.1001; // imposto la z della luce per la posa bassa o fallback
          }

          const directionalLight = new THREE.DirectionalLight(
            0xffffff,
            lightIntensity,
          ); // creo la luce direzionale principale
          directionalLight.position.set(-5.95, 0.051, lightZ); // imposto la posizione iniziale della luce
          scene.add(directionalLight); // aggiungo la luce alla scena
          this.directionalLight = directionalLight; // salvo il riferimento alla luce direzionale

          const geometry = new THREE.SphereGeometry(0.84, 82, 82); // creo la geometria sferica del pianeta
          const material = new THREE.MeshPhysicalMaterial({
            map: planetTexture, // applico la texture del pianeta caricata
            roughness: 2.5, // imposto la roughness del materiale
            emissive: new THREE.Color(0xddddaa), // imposto il colore emissivo del materiale
            emissiveIntensity: 0.00051, // imposto l'intensita' emissiva del materiale
            clearcoat: 0.0, // imposto il clearcoat iniziale a zero
            clearcoatRoughness: 0.27, // imposto la roughness del clearcoat
          });

          const planetMesh = new THREE.Mesh(geometry, material); // creo la mesh finale del pianeta con geometria e materiale
          planetMesh.position.y = 0.4; // imposto la posizione verticale iniziale del pianeta
          planetMesh.rotation.x = THREE.MathUtils.degToRad(7); // imposto la rotazione iniziale del pianeta

          scene.add(planetMesh); // aggiungo la mesh del pianeta alla scena
          this.planetMesh = planetMesh; // salvo il riferimento alla mesh del pianeta

          this.saturnoPosizioniService.applicaPoseAScena(scene, 'WELCOME_ALTO'); // applico sempre come base la posa WELCOME_ALTO

          const url = this.router.url; // leggo la rotta corrente dal router

          if (!usaAnimazioniWelcome && eSchedaCatalogo(url)) {
            // controllo se sono in scheda catalogo senza volere animazioni di ingresso
            this.ensureRingsAndParticlesIfMissing(scene); // ricreo anelli e particelle se mancanti
            this.animateService.setXNormale(); // porto la X nello stato normale
            this.animateService.setTitoloAltoGlobal(); // porto il titolo nella posizione alta
            this.saturnoPosizioniService.applicaPoseAScena(
              scene,
              'CATALOGO_NASCOSTO',
            ); // applico subito la posa catalogo nascosto
            this.animateService.fadeOutSaturnoESfondo(0); // porto subito Saturno e sfondo nello stato finale di fade out
            this.animateService.enablePageScroll(); // abilito lo scroll pagina
            this.loopHelper.resetFirstRender(); // resetto il flag del primo render
            this.saturnoStatoService.setPronto(); // segnalo che Saturno e' pronto
            this.spegniSaturno(); // spengo Saturno senza distruggere la scena
            this.animateService.pauseClearcoat(); // metto in pausa l'animazione del clearcoat
            this.catalogoGiaAnimato = true; // segno che il catalogo risulta gia' animato
            this.scenaInizializzata = true; // segno che la scena e' stata inizializzata
            resolve(); // risolvo la promise
            return; // esco dalla funzione
          }

          const isLoginRoute = eRottaLogin(url); // verifico se la rotta corrente e' login
          const isWelcomeRoute =
            usaAnimazioniWelcome && eRottaWelcome(url) && !isLoginRoute; // verifico se la rotta corrente e' welcome con animazioni attive e non login
          const isCatalogRoute = usaAnimazioniWelcome && eRottaCatalogo(url); // verifico se la rotta corrente e' catalogo con animazioni attive
          const isNotFoundRoute = eRottaNotFound(url); // verifico se la rotta corrente e' not found
          const ricaricaCatalogo =
            usaAnimazioniWelcome && this.isReloadCatalogo(); // verifico se sto ricaricando direttamente il catalogo

          if (eRottaLogin(url)) {
            // controllo se la rotta corrente e' login
            const durata = 0.9; // preparo la durata dell'animazione login
            if (this.skipLoginIntroOnce) {
              // controllo se devo saltare una volta l'intro login
              this.animateService.setXNormale(); // porto la X nello stato normale
              this.animateService.setTitoloAltoGlobal(); // porto il titolo subito in alto
              this.skipLoginIntroOnce = false; // consumo il flag di skip intro login
            } else {
              this.animateService.animateTitoloVersoAltoGlobal(); // animo il titolo verso l'alto
              this.animateService.setXNormale(); // porto la X nello stato normale
            }
            this.saturnoRouteAnimazioniService.animaVerso(
              scene,
              'LOGIN_LATERALE',
              durata,
              this.directionalLight || undefined,
            ); // animo Saturno verso la posa del login laterale
          }

          if (eRottaRegistrazione(url)) {
            // controllo se la rotta corrente e' registrazione
            if (this.skipRegistrazioneIntroOnce) {
              // controllo se devo saltare una volta l'intro registrazione
              this.animateService.setXNormale(); // porto la X nello stato normale
              this.animateService.setTitoloAltoGlobal(); // porto il titolo subito in alto
              this.skipRegistrazioneIntroOnce = false; // consumo il flag di skip intro registrazione
            } else {
              this.animateService.setXNormale(); // porto la X nello stato normale
              this.animateService.animateTitoloVersoAltoGlobal(); // animo il titolo verso l'alto
            }
            this.saturnoRouteAnimazioniService.animaVerso(
              scene,
              'REGISTRAZIONE_BASSO',
              0.9,
              this.directionalLight || undefined,
            ); // animo Saturno verso la posa bassa della registrazione
          }

          if (isNotFoundRoute) {
            // controllo se la rotta corrente e' not found
            this.saturnoPosizioniService.applicaPoseAScena(
              scene,
              'CATALOGO_NASCOSTO',
            ); // applico subito la posa catalogo nascosto
            this.animateService.setXNormale(); // porto la X nello stato normale
            this.animateService.setTitoloAltoGlobal(); // porto il titolo nella posizione alta
            this.animateService.enablePageScroll(); // abilito lo scroll pagina
            setTimeout(() => {
              // attendo un piccolo ritardo prima di avviare l'ingresso 404
              this.saturnoRouteAnimazioniService.animaIngresso404ConScritte(
                scene,
                1.05,
                this.directionalLight || undefined,
              ); // animo Saturno e le scritte della 404
            }, 300);
          }

          this.saturnoDischiService.creaDischi(scene); // creo tutti i dischi di Saturno nella scena

          const particleGroups: THREE.Group[] = []; // preparo l'array locale dei gruppi di particelle
          this.groupsConfig.forEach((config) => {
            // scorro tutte le configurazioni dei gruppi particellari
            const group = this.particleGroupService.createParticleGroup(config); // creo un gruppo di particelle con la configurazione corrente
            scene.add(group); // aggiungo il gruppo alla scena
            particleGroups.push(group); // salvo il gruppo nell'array locale
          });
          this.particleGroups = particleGroups; // salvo tutti i gruppi particellari creati nel riferimento del service

          if (eRottaContatti(url) || eRottaPiano(url)) {
            this.ensureRingsAndParticlesIfMissing(scene);
            this.animateService.setXNormale();
            this.animateService.setTitoloAltoGlobal();
            this.saturnoPosizioniService.applicaPoseAScena(
              scene,
              'LOGIN_LATERALE',
            );
            if (this.directionalLight) {
              this.directionalLight.intensity = 2.8;
              this.directionalLight.position.z = 0.1001;
            }
          }

          if (eRottaRicevute(url)) {
            this.ensureRingsAndParticlesIfMissing(scene);
            this.animateService.setXNormale();
            this.animateService.setTitoloAltoGlobal();
            this.saturnoPosizioniService.applicaPoseAScena(
              scene,
              'WELCOME_BASSO',
            );
            const t = 1.1;
            const baseY = window.innerWidth <= 868 ? -3.6 : -3.4;
            scene.position.x = 3.1 * t + 1.2 * Math.sin(Math.PI * t);
            scene.position.y = baseY * Math.pow(t, 2);
            if (this.directionalLight) {
              this.directionalLight.intensity = 2.8;
              this.directionalLight.position.z = 5.1001;
            }
          }

          const firstElement = document.querySelector(
            '[data-titolo-first]',
          ) as HTMLElement | null; // recupero il primo elemento del titolo dal DOM
          const xElement = document.querySelector(
            '[data-titolo-x]',
          ) as HTMLElement | null; // recupero l'elemento X del titolo dal DOM

          if (isWelcomeRoute) {
            // controllo se sono nella welcome con animazioni attive
            this.animateService.animateAll(
              firstElement,
              xElement,
              this.directionalLight,
              this.particleGroups,
            ); // avvio l'animazione completa della welcome
          } else if (isCatalogRoute) {
            // controllo se sono nel catalogo con animazioni attive
            if (ricaricaCatalogo) {
              // controllo se questo accesso al catalogo e' un reload diretto
              this.animateService.setXNormale(); // porto la X nello stato normale
              this.animateService.setTitoloAltoGlobal(); // porto il titolo nella posizione alta
              this.saturnoPosizioniService.applicaPoseAScena(
                scene,
                'CATALOGO_NASCOSTO',
              ); // applico subito la posa catalogo nascosto
              this.animateService.fadeOutSaturnoESfondo(0); // porto subito Saturno e sfondo nello stato finale di fade out
              this.animateService.enablePageScroll(); // abilito lo scroll pagina
              this.loopHelper.resetFirstRender(); // resetto il flag del primo render
              this.saturnoStatoService.setPronto(); // segnalo che Saturno e' pronto
              this.spegniSaturno(); // spengo Saturno senza distruggere la scena
              this.animateService.pauseClearcoat(); // metto in pausa il clearcoat
              this.catalogoGiaAnimato = true; // segno che il catalogo risulta gia' animato
            } else {
              this.animateService.setTitoloCentraleGlobal(); // porto il titolo al centro prima della transizione catalogo
              const durataCatalogo = 1.6; // preparo la durata dell'animazione verso il catalogo
              const anticipoMs = 500; // preparo l'anticipo del fade finale
              this.animateService.animateAll(
                firstElement,
                xElement,
                this.directionalLight,
                this.particleGroups,
                () => {
                  this.animateService.setXNormale(); // porto la X nello stato normale alla fine dell'animazione iniziale
                  this.animateService.animateTitoloVersoAltoGlobal(); // animo il titolo verso l'alto
                  setTimeout(
                    () => {
                      // preparo il fade out in anticipo rispetto alla fine della transizione catalogo
                      this.animateService.fadeOutSaturnoESfondo(1.2); // faccio partire il fade out di Saturno e sfondo
                      this.animateService.enablePageScroll(); // riabilito lo scroll pagina
                    },
                    durataCatalogo * 1000 - anticipoMs,
                  );
                  this.saturnoRouteAnimazioniService.animaVerso(
                    scene,
                    'CATALOGO_NASCOSTO',
                    durataCatalogo,
                    this.directionalLight || undefined,
                    () => {
                      this.spegniSaturno(); // spengo Saturno al termine della transizione
                      this.animateService.pauseClearcoat(); // metto in pausa il clearcoat
                      this.catalogoGiaAnimato = true; // segno che il catalogo ha gia' completato l'animazione
                    },
                  );
                },
              );
            }
          }

          this.attivaHoverMouse(); // attivo l'hover del mouse sulle particelle

          this.animateService.animateClearcoat(material); // avvio l'animazione del clearcoat del materiale del pianeta

          this.startFixedFPSLoop(); // avvio il loop di animazione dopo che la scena e' pronta

          this.scenaInizializzata = true; // segno che la scena e' stata inizializzata almeno una volta

          resolve(); // risolvo la promise al termine dell'inizializzazione
        })
        .catch((error) => {
          // entro qui se una delle promesse di caricamento fallisce
          console.error('Errore durante il caricamento delle texture:', error); // loggo l'errore di caricamento
          reject(error); // rigetto la promise di inizializzazione
        });
    });
  }

  /**
   * Restituisce la camera Three.js corrente.
   *
   * @returns THREE.Camera | null
   */
  public getCamera(): THREE.Camera | null {
    return this.camera; // restituisco il riferimento corrente alla camera
  }

  /**
   * Restituisce la scena Three.js corrente.
   *
   * @returns THREE.Scene | null
   */
  public getScene(): THREE.Scene | null {
    return this.scene; // restituisco il riferimento corrente alla scena
  }

  /**
   * Restituisce i gruppi di particelle correnti.
   *
   * @returns THREE.Group[]
   */
  public getParticleGroups(): THREE.Group[] {
    return this.particleGroups; // restituisco l'array corrente dei gruppi di particelle
  }

  /**
   * Restituisce la luce direzionale corrente.
   *
   * @returns THREE.DirectionalLight | null
   */
  public getDirectionalLight(): THREE.DirectionalLight | null {
    return this.directionalLight; // restituisco il riferimento corrente alla luce direzionale
  }

  /**
   * Attiva il listener del mouse tramite l'helper dedicato.
   *
   * @returns void
   */
  private attivaHoverMouse(): void {
    this.mouseHelper.attivaHoverMouse(); // delego l'attivazione dell'hover mouse all'helper dedicato
  }

  /**
   * Applica un flash di errore rosso alla luce, agli anelli e alla posizione della scena.
   *
   * @returns void
   */
  public flashErrorLight(): void {
    if (!this.scene || !this.directionalLight) return; // esco subito se scena o luce non esistono

    const scene = this.scene; // salvo un riferimento locale alla scena
    const light = this.directionalLight; // salvo un riferimento locale alla luce direzionale

    const originalColor = light.color.clone(); // salvo il colore originale della luce
    const originalX = scene.position.x; // salvo la posizione x originale della scena

    const durata = 400; // definisco la durata totale del flash in millisecondi
    const jitterOffsets = [-0.12, 0.18, -0.25, 0.3, -0.18, 0.12, -0.08, 0.06]; // preparo gli offset di jitter della scena
    const step = durata / jitterOffsets.length; // calcolo il passo temporale tra i jitter

    light.color.set(0xb42f14); // imposto la luce su un rosso di errore per tutta la durata del flash

    const disks = this.diskService.getDisks(); // recupero tutti i dischi attualmente registrati
    const originalDiskColors = disks.map(({ mesh }) => {
      // salvo il colore originale di ogni disco
      const mat = mesh.material as THREE.ShaderMaterial; // recupero il materiale shader del disco corrente
      return (mat.uniforms['uColor'].value as THREE.Color).clone(); // clono il colore originale del disco
    });
    disks.forEach(({ mesh }) => {
      // scorro tutti i dischi
      const mat = mesh.material as THREE.ShaderMaterial; // recupero il materiale shader del disco corrente
      (mat.uniforms['uColor'].value as THREE.Color).set(0xb41447); // imposto il colore rosso del flash sugli anelli
    });

    jitterOffsets.forEach((offset, index) => {
      // scorro tutti gli offset di jitter con il relativo indice
      setTimeout(() => {
        // preparo ciascun micro spostamento nel tempo
        if (!this.scene) return; // esco se nel frattempo la scena non esiste piu'
        this.scene.position.x = originalX + offset; // applico lo spostamento temporaneo della scena sull'asse x
      }, step * index);
    });

    setTimeout(() => {
      // preparo il ripristino finale allo scadere del flash
      if (this.scene) this.scene.position.x = originalX; // ripristino la posizione x originale della scena
      if (this.directionalLight)
        this.directionalLight.color.copy(originalColor); // ripristino il colore originale della luce
      this.diskService.getDisks().forEach(({ mesh }, i) => {
        // scorro di nuovo tutti i dischi con il loro indice
        const mat = mesh.material as THREE.ShaderMaterial; // recupero il materiale shader del disco corrente
        (mat.uniforms['uColor'].value as THREE.Color).copy(
          originalDiskColors[i],
        ); // ripristino il colore originale del disco
      });
    }, durata);
  }

  /**
   * Verifica se l'accesso corrente al catalogo corrisponde a un reload o a un ingresso diretto con storico catalogo.
   *
   * @returns boolean
   */
  private isReloadCatalogo(): boolean {
    try {
      const nav = performance.getEntriesByType('navigation') as any[]; // leggo le entry di navigazione dal Performance API
      const tipo = nav && nav[0] && nav[0].type ? String(nav[0].type) : ''; // ricavo il tipo di navigazione se disponibile
      const raw = (window.location.pathname || '').split('?')[0].split('#')[0]; // ripulisco il pathname da query e hash
      const pathIntero = raw.replace(/\/+$/, '') || '/'; // normalizzo il path rimuovendo gli slash finali
      const path = pathIntero.replace(/^\/(it|en)(?=\/|$)/, ''); // rimuovo il prefisso lingua dal path

      const eCatalogoHome =
        path === '/catalogo' ||
        path === '/catalogo/film' ||
        path === '/catalogo/serie' ||
        path === '/catalogo/film-serie' ||
        path === '/catalog' ||
        path === '/catalog/movies' ||
        path === '/catalog/series' ||
        path === '/catalog/movies-series' ||
        path === '/catalog/film' ||
        path === '/catalog/serie' ||
        path === '/catalog/film-serie'; // verifico se il path appartiene alle home principali del catalogo

      const ingressoDirettoConStoricoCatalogo =
        tipo !== 'reload' && // controllo che non sia formalmente un reload
        eCatalogoHome && // controllo che il path appartenga al catalogo home
        isAreaCatalogo(this.pathPrecedenteSessioneAllAvvio); // controllo che il path precedente salvato appartenesse all'area catalogo

      return (
        (tipo === 'reload' && eCatalogoHome) ||
        ingressoDirettoConStoricoCatalogo
      ); // restituisco true se e' reload catalogo o ingresso diretto con storico catalogo
    } catch {
      return false; // restituisco false se qualcosa va storto nel rilevamento
    }
  }

  /**
   * Verifica se la pagina corrente e' stata caricata tramite reload del browser.
   *
   * @returns boolean
   */
  private isPageReload(): boolean {
    try {
      const nav = performance.getEntriesByType('navigation') as any[]; // leggo le entry di navigazione dal Performance API
      const tipo = nav && nav[0] && nav[0].type ? String(nav[0].type) : ''; // ricavo il tipo di navigazione se disponibile
      return tipo === 'reload'; // verifico se il tipo di navigazione e' reload
    } catch {
      return false; // restituisco false se qualcosa va storto nel rilevamento
    }
  }

  /**
   * Ricrea anelli e particelle se risultano assenti nella scena corrente.
   *
   * @param scene Scena Three.js in cui verificare e ricreare gli elementi mancanti.
   * @returns void
   */
  private ensureRingsAndParticlesIfMissing(scene: THREE.Scene): void {
    if (this.diskService.getDisks().length === 0) {
      // controllo se non esistono dischi registrati
      this.saturnoDischiService.creaDischi(scene); // ricreo i dischi di Saturno nella scena
    }
    if (this.particleGroups.length === 0) {
      // controllo se non esistono gruppi di particelle
      const particleGroups: THREE.Group[] = []; // preparo l'array locale dei gruppi di particelle
      this.groupsConfig.forEach((config) => {
        // scorro tutte le configurazioni dei gruppi particellari
        const group = this.particleGroupService.createParticleGroup(config); // creo un gruppo di particelle con la configurazione corrente
        scene.add(group); // aggiungo il gruppo alla scena
        particleGroups.push(group); // salvo il gruppo nell'array locale
      });
      this.particleGroups = particleGroups; // aggiorno il riferimento del service ai gruppi ricreati
    }
  }

  /**
   * Legge il flag di transizione dalla 404 al catalogo dal session storage.
   *
   * @returns boolean
   */
  leggiFlagTransizione404Catalogo(): boolean {
    try {
      return sessionStorage.getItem('transizione_404_catalogo') === '1'; // restituisco true se il flag di sessione e' impostato a 1
    } catch {
      return false; // restituisco false se non riesco a leggere il session storage
    }
  }

  /**
   * Consuma il flag di transizione dalla 404 al catalogo rimuovendolo dal session storage.
   *
   * @returns void
   */
  consumaFlagTransizione404Catalogo(): void {
    try {
      sessionStorage.removeItem('transizione_404_catalogo'); // rimuovo il flag di sessione della transizione 404 -> catalogo
    } catch {}
  }

  /**
   * Riaccende Saturno ripristinando canvas, luce, loop, hover e clearcoat.
   *
   * @returns void
   */
  public riaccendiSaturno(): void {
    if (!this.scene || !this.renderer) return; // esco subito se scena o renderer non esistono

    if (this.directionalLight && this.directionalLight.intensity < 0.1) {
      // controllo se la luce esiste ed e' quasi spenta
      this.directionalLight.intensity = 2.8; // ripristino l'intensita' della luce a un valore visibile
    }

    const canvas = this.renderer.domElement; // recupero il canvas del renderer
    if (!canvas.parentElement) {
      // controllo se il canvas non e' attualmente montato nel DOM
      let overlay = document.getElementById('saturno-overlay-temp'); // provo a recuperare un overlay temporaneo esistente
      if (!overlay) {
        // controllo se l'overlay temporaneo non esiste ancora
        overlay = document.createElement('div'); // creo il nuovo overlay temporaneo
        overlay.id = 'saturno-overlay-temp'; // imposto l'id dell'overlay temporaneo
        overlay.style.cssText =
          'position:fixed;top:0;left:0;width:100vw;height:100vh;' +
          'z-index:0;pointer-events:none;overflow:hidden;'; // imposto gli stili inline dell'overlay temporaneo
        document.body.appendChild(overlay); // aggiungo l'overlay temporaneo al body
      }
      overlay.appendChild(canvas); // aggancio il canvas all'overlay temporaneo
      this.renderer.setSize(window.innerWidth, window.innerHeight); // aggiorno la dimensione del renderer alla viewport corrente
    }

    this.startFixedFPSLoop(); // riavvio il loop di rendering
    this.attivaHoverMouse(); // riattivo l'hover del mouse sulle particelle
    this.animateService.resumeClearcoat(); // riattivo l'animazione del clearcoat
  }
}
