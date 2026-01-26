// in questo servizio gestisco il codice principale della scena di saturno in three.js

import { Injectable } from '@angular/core';
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
//Serve per calcolare la posizione nello spazio
const vertexShader = /* glsl */ `
  varying vec3 vPosition;
  void main() {
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

//Serve per i colori degli anelli

// const fragmentShader = /* glsl */ `
//   uniform float uInnerRadius;
//   uniform float uOuterRadius;
//   uniform vec3 uColor;
//   uniform float uOpacity;
//   uniform bool uInvertGradient;
//   varying vec3 vPosition;

//   void main() {
//       float radius = length(vPosition.xy);
//       float intensity = uInvertGradient
//                         ? smoothstep(uInnerRadius, uOuterRadius, radius)
//                         : smoothstep(uOuterRadius, uInnerRadius, radius);
//       vec3 color = uColor;
//       gl_FragColor = vec4(color, intensity * uOpacity);
//   }
// `;


// const fragmentShader = /* glsl */ `
//   uniform float uInnerRadius;
//   uniform float uOuterRadius;
//   uniform vec3 uColor;
//   uniform float uOpacity;
//   varying vec3 vPosition;

//   void main() {
//       float radius = length(vPosition.xy);

//       // Calcola sfumatura solo nel bordo esterno
//       float edgeFade = smoothstep(uInnerRadius, uOuterRadius, radius);

//       // Se siamo dentro il raggio interno, niente pixel
//       if (radius < uInnerRadius || edgeFade <= 0.0) discard;

//       gl_FragColor = vec4(uColor, edgeFade * uOpacity);
//   }
// `;


//  const fragmentShader = /* glsl */ `
//   uniform float uInnerRadius;
// uniform float uOuterRadius;
// uniform vec3  uColor;
// uniform float uOpacity;
// uniform bool  uInvertGradient;
// varying vec3  vPosition;

// void main() {
//     float radius    = length(vPosition.xy);
//     // Il gradiente originale produce 1.0 nella fascia [uInnerRadius..uOuterRadius] (dipende dal verso) e 0.0 fuori
//     float intensity = uInvertGradient
//                       ? smoothstep(uInnerRadius, uOuterRadius, radius)
//                       : smoothstep(uOuterRadius, uInnerRadius, radius);

//     // Invertiamo l’intensità: diventa 0 dove prima era 1, e viceversa
//     float alpha = 1.0 - intensity;

//     // Colore e trasparenza
//     gl_FragColor = vec4(uColor, alpha * uOpacity);
// }`;


 const fragmentShader = /* glsl */ `
uniform float uInnerRadius;
uniform float uOuterRadius;
uniform vec3  uColor;
uniform float uOpacity;
varying vec3  vPosition;

void main() {
    float r = length(vPosition.xy);
    float m = 0.5 * (uInnerRadius + uOuterRadius);
    float a = smoothstep(uInnerRadius, m, r);
    float b = 1.0 - smoothstep(m, uOuterRadius, r);
    float alpha = a * b * uOpacity;
    gl_FragColor = vec4(uColor, alpha);
}


`;


@Injectable({ providedIn: 'root' })
export class SaturnoService {
  saturnoPronto$ = this.saturnoStatoService.saturnoPronto$;

  private scenaInizializzata: boolean = false;
  private firstRenderDone = false;

  // 🔹 NUOVO: serve per non rifare l'animazione di /catalogo ad ogni rientro
  private catalogoGiaAnimato: boolean = false;

  // Configurazioni per i gruppi di particelle (asteroidi)
  private groupsConfig = [

    {
      innerRadius: 1.34,
      outerRadius: 1.35,
      particleCount: 240,
      color: 0xcfcfcf,
      size: 0.115,
      rotationSpeed: 0.00315,
    },
    {
      innerRadius: 1.54,
      outerRadius: 1.65,
      particleCount: 276,
      color: 0x9f8873,
      size: 0.1,
      rotationSpeed: 0.0019,
    },
    {
      innerRadius: 1.8,
      outerRadius: 1.82,
      particleCount: 260,
      color: 0xc8cca5,
      size: 0.091,
      rotationSpeed: 0.00105,
    },
    {
      innerRadius: 1.97,
      outerRadius: 2.075,
      particleCount: 256,
      color: 0xffffff,
      size: 0.195,
      rotationSpeed: 0.00102,
    },
  ];

  /**
   * Riferimenti memorizzati per poterne fare l'update continuo.
   */
  private scene: THREE.Scene | null = null;
  private camera: THREE.Camera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;

  // Riferimenti per pianeta, particelle e quant’altro ci serve animare
  private planetMesh: THREE.Mesh | null = null;
  private particleGroups: THREE.Group[] = [];

  // Luce direzionale
  private directionalLight: THREE.DirectionalLight | null = null;

  // Strumenti di calcolo per il mouse
  private raycaster = new THREE.Raycaster(); //oggetto threejs che concentra l'attenzione sul mouse
  private mouse = new THREE.Vector2(9999, 9999); //mouse non attivo in partenza

  // Variabili per il loop a fps fissi visto che uso setInterval per aiutare a far continuare le animazioni anche quando l'utente è in background
  private animInterval: any; //tiene il riferimento al ciclo di animazione avviato
  private lastTime = 0; //memorizza l’orario dell’ultimo aggiornamento della scena, il tempo tra un frame e l’altro




  // Riferimento al listener del mouse per poterlo rimuovere
  private gestoreMouseMove: ((event: MouseEvent) => void) | null = null;


  // capire se è un dispositivo mobile
  private isMobileOrTablet(): boolean {
    const userAgent = navigator.userAgent.toLowerCase();
    return /android|iphone|ipad|ipod|blackberry|opera mini|iemobile|wpdesktop/.test(
      userAgent
    );
  }

  // se sono su un dispositivo mobile semplifico la scena con meno particelle
  //   ...group = copia tutte le proprietà del gruppo
  // particleCount: ... = cambia solo quella che mi interessa
  private reduceParticles(): void {
    this.groupsConfig = this.groupsConfig.map((group) => ({
      ...group,
      particleCount: Math.max(group.particleCount - 200, 30), // Evita che diventi negativo
    }));
  }

  // mi servono gli altri servizzi threeJs
  constructor(
  private sceneService: SceneService,
  private diskService: DiskService,
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
) {

  this.performanceService.isLowEndPC$.subscribe((isLowEnd) => {
    if (isLowEnd || this.isMobileOrTablet()) {
      this.reduceParticles();
    }
  });
}



// SaturnoService

private distruggiSaturno(): void {
  // Stop animazioni GSAP e spegni la luce direzionale
 this.animateService.resetAnimations?.();

  // Ferma il loop
  if (this.animInterval) {
    clearInterval(this.animInterval);
    this.animInterval = null;
  }

  // Rimuovi il listener del mouse
  if (this.gestoreMouseMove) {
    window.removeEventListener('mousemove', this.gestoreMouseMove);
    this.gestoreMouseMove = null;
  }

  // Rimuovi gli oggetti dalla scena
  if (this.scene) {
    if (this.planetMesh) {
      this.scene.remove(this.planetMesh);
    }

    this.particleGroups.forEach((group) => {
      this.scene!.remove(group);
    });

    if (this.directionalLight) {
      this.scene.remove(this.directionalLight);
    }

    this.diskService.getDisks().forEach(({ mesh }) => {
      this.scene!.remove(mesh);
    });
  }

   this.planetMesh = null;
  this.particleGroups = [];
  this.directionalLight = null;
  this.diskService.clearDisks();

  // Rimuovi il canvas dal DOM
  if (this.renderer) {
    const canvas = this.renderer.domElement;
    if (canvas.parentElement) {
      canvas.parentElement.removeChild(canvas);
    }
  }

  // Azzeriamo tutto così alla prossima volta ricostruiamo da zero
  this.scene = null;
  this.camera = null;
  this.renderer = null;

  this.firstRenderDone = false;
this.saturnoStatoService.reset();
this.catalogoGiaAnimato = false;

}


public spegniSaturno(): void {
  // Stoppa il loop ma NON distrugge la scena
  if (this.animInterval) {
    clearInterval(this.animInterval);
    this.animInterval = null;
  }

  // Rimuovi il listener del mouse
  if (this.gestoreMouseMove) {
    window.removeEventListener('mousemove', this.gestoreMouseMove);
    this.gestoreMouseMove = null;
  }


}


  /**
   * Avvia un loop a frequenza fissa (60 fps).
   */
  private startFixedFPSLoop(): void {
    this.lastTime = performance.now();

    // si evida di creare più setInterval se (per qualche motivo) viene richiamato più volte
    if (this.animInterval) {
      clearInterval(this.animInterval);
    }

    // 60 fps -> 1000 / 60 = 16.666... ms
    this.animInterval = setInterval(() => {
      const now = performance.now(); //tempo trascorso da quando il loop è stato eseguito
      const deltaTime = (now - this.lastTime) / 1000;  //calcola il tempo trascorso dal frame precedente, cambia da dispositivo
      this.lastTime = now; //agiornamento

      this.renderAndUpdate(deltaTime);
    }, 1000 / 60);
  }

  /**
   * Carica la texture del pianeta Saturno in una Promise.
   */
 // Carica la texture del pianeta Saturno in una Promise.
private loadPlanetTexture(): Promise<THREE.Texture> {
    const textureLoader = new THREE.TextureLoader();
    return new Promise((resolve, reject) => {
      // Verifica se la texture è già stata caricata in localStorage
      const textureCacheHit = localStorage.getItem('saturnoTextureLoaded');

      if (textureCacheHit) {
        console.log('NON PRIMA VOLTA: La texture di Saturno è stata caricata dalla cache.');
      } else {
        console.log('PRIMA VOLTA: Caricamento texture di Saturno per la prima volta.');
        // Impostiamo la flag per non ricaricare la texture nelle future visite, anche se il browser viene riaperto
        localStorage.setItem('saturnoTextureLoaded', 'true');
      }

      textureLoader.load(
        'assets/texture/saturno.webp',
        (texture) => resolve(texture),
        undefined,
        (error) => reject(error)
      );
    });
}


  /**
   * Esegue l'inizializzazione della scena di Saturno, caricando tutte le texture
   * (Saturno + Asteroidi) prima di mostrare qualsiasi cosa.
   */
private attendiCaroselloPronto(timeoutMs: number = 12000): Promise<void> {
  return new Promise((resolve) => {
    if (this.caricamentoCaroselloService.caroselloPronto$.value) return resolve();

    const sub = this.caricamentoCaroselloService.caroselloPronto$.subscribe((ok) => {
      if (!ok) return;
      try { sub.unsubscribe(); } catch {}
      resolve();
    });

    setTimeout(() => {
      try { sub.unsubscribe(); } catch {}
      resolve();
    }, timeoutMs);
  });
}

public initializeSaturn(usaAnimazioniWelcome: boolean = true): Promise<void> {


  return new Promise((resolve, reject) => {

if (this.scenaInizializzata && this.scene && this.camera && this.renderer) {

    const url = this.router.url;




if (url.startsWith('/catalogo') && this.catalogoGiaAnimato) {
  this.animateService.fadeOutSaturnoESfondo(0);
  this.animateService.enablePageScroll();
  this.spegniSaturno();
  this.animateService.pauseClearcoat();



  resolve();
  return;
}


  const container = document.getElementById('three-container');
  if (!container) {
    console.error('Contenitore non trovato: three-container');
    resolve();
    return;
  }

  if (this.renderer.domElement.parentElement !== container) {
    container.appendChild(this.renderer.domElement);
  }

  const durata = 0.85;
  const durataCatalogo = 1.6;

  if (url.startsWith('/benvenuto/login')) {
    // 🔹 titolo: da centrato → alto-sinistra + X arancione
    this.animateService.animateTitoloVersoAltoGlobal();
    this.animateService.setXNormale();

    this.saturnoRouteAnimazioniService.animaVerso(
      this.scene,
      'LOGIN_LATERALE',
      durata,
      this.directionalLight || undefined
    );

 } else if (url === '/benvenuto' || url.startsWith('/benvenuto/')) {
    // 🔹 Rientro nella pagina di benvenuto con scena già costruita:
    //    - titolo di nuovo centrale
    //    - X in versione GIF
    //    - sottotitolo + scritta scroll di nuovo visibili,
    //      così gli ScrollTrigger possono fare il "reverse" morbido
    this.animateService.setTitoloCentraleGlobal();
    this.animateService.setXGif();

  } else if (url.startsWith('/catalogo')) {

  const anticipoMs = 400;

  if (this.animateService.isTitoloInPosizioneAlta()) {
    const durataCatalogo = 1.6;

    this.attendiCaroselloPronto().finally(() => {

      this.toastService.chiudi('accesso_ok');

       setTimeout(() => {
  this.animateService.fadeOutSaturnoESfondo(1.25, () => {
    this.animateService.enablePageScroll();
  });
  this.animateService.enablePageScroll();
  this.animateService.fadeOutSaturnoESfondo(1.25);
 }, durataCatalogo * 1000 - anticipoMs);


      this.saturnoRouteAnimazioniService.animaVerso(
        this.scene!,
        'CATALOGO_NASCOSTO',
        durataCatalogo,
        this.directionalLight || undefined,
        () => {
          this.spegniSaturno();
          this.animateService.pauseClearcoat();
          this.catalogoGiaAnimato = true;
        }
      );
    });

  } else {
      this.animateService.setTitoloCentraleGlobal();

      const durataCatalogo = 1.6;

      this.attendiCaroselloPronto().finally(() => {

        setTimeout(() => {
          this.animateService.fadeOutSaturnoESfondo(1.25, () => {
            this.animateService.enablePageScroll();

            // SOLO ORA: coperture sparite -> ora parte il timer locandina
          });
        }, durataCatalogo * 1000 - anticipoMs);

        this.saturnoRouteAnimazioniService.animaVerso(
          this.scene!,
          'CATALOGO_NASCOSTO',
          durataCatalogo,
          this.directionalLight || undefined,
          () => {
            this.spegniSaturno();
            this.animateService.pauseClearcoat();

            this.animateService.setXNormale();
            this.animateService.animateTitoloVersoAltoGlobal();
            // niente fadeOutSaturnoESfondo qui: è già partito col setTimeout

            // 🔹 segno che il catalogo è già stato animato una volta
            this.catalogoGiaAnimato = true;
          }
        );
      });
    }
  }


  this.attivaHoverMouse();
  this.startFixedFPSLoop();

  resolve();
  return;
}







      // 👇 Da qui in poi è uguale a prima
      // Carica *in parallelo* la texture di Saturno e quelle degli asteroidi
      Promise.all([
        this.loadPlanetTexture(), // Texture di Saturno
        this.asteroidiMaterialService.loadAllTextures(), // Texture roccia/normal/ao
      ])
      .then(([planetTexture, _]) => {
  // si procede con tutto
  const { scene, camera, renderer } = this.sceneService;

  // Salvo i riferimenti nella classe
  this.scene = scene;
  this.camera = camera;
  this.renderer = renderer;

//   // ✅ Imposto la pose "WELCOME_ALTO" come stato iniziale standard
//   this.saturnoPosizioniService.applicaPoseAScena(scene, 'WELCOME_ALTO');

//   // Se sono su /login e NON sto usando le animazioni welcome,
// // metto subito Saturno nella posizione laterale di login
// const url = this.router.url;
// if (!usaAnimazioniWelcome && url.startsWith('/login')) {
//   this.saturnoPosizioniService.applicaPoseAScena(scene, 'LOGIN_LATERALE');
// }


  // Recupero il contenitore HTML
  const container = document.getElementById('three-container');
  if (!container) {
    console.error('Contenitore non trovato: three-container');
    return;
  }

  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  // Luce direzionale
  // ...



          // Luce direzionale
// - su WELCOME: parte spenta e dietro al pianeta (verrà animata da AnimateService)
// - su LOGIN (e altre pagine): subito accesa e in posizione finale, senza animazione
let lightIntensity = 0;
let lightZ = -13.1001;

if (!usaAnimazioniWelcome) {
  lightIntensity = 2.8;

  const url = this.router.url;
  if (url.startsWith('/benvenuto/login')) {
  lightZ = 0.1001;     // LOGIN_LATERALE
} else if (url === '/benvenuto' || url.startsWith('/benvenuto/')) {
  lightZ = 10.1001;    // WELCOME_ALTO
} else {
  lightZ = 5.1001;     // WELCOME_BASSO / fallback
}

}


const directionalLight = new THREE.DirectionalLight(0xffffff, lightIntensity);
directionalLight.position.set(-5.95, 0.051, lightZ);
scene.add(directionalLight);
this.directionalLight = directionalLight;




          // Creazione sfera (Saturno) con la texture caricata
          const geometry = new THREE.SphereGeometry(0.84, 82, 82);
          const material = new THREE.MeshPhysicalMaterial({
            map: planetTexture,
            roughness: 2.5,
            emissive: new THREE.Color(0xddddaa),
            emissiveIntensity: 0.00051,
            clearcoat: 0.0,
            clearcoatRoughness: 0.27,
          });

          const planetMesh = new THREE.Mesh(geometry, material);//geometria + materiale
          planetMesh.position.y = 0.4; //posizione saturno sull asse y

          planetMesh.rotation.x = THREE.MathUtils.degToRad(7); //rotazione saturno

          scene.add(planetMesh);
this.planetMesh = planetMesh;

// ✅ 1) Parto SEMPRE da WELCOME_ALTO come pose di base
this.saturnoPosizioniService.applicaPoseAScena(scene, 'WELCOME_ALTO');

const url = this.router.url;
const isLoginRoute = url.startsWith('/benvenuto/login');

const isWelcomeRoute =
  usaAnimazioniWelcome &&
  (url === '/benvenuto' || url.startsWith('/benvenuto/')) &&
  !isLoginRoute;

const isCatalogRoute =
  usaAnimazioniWelcome && url.startsWith('/catalogo');

const ricaricaCatalogo = usaAnimazioniWelcome && this.isReloadCatalogo();


if (url.startsWith('/benvenuto/login')) {
  const durata = 0.9;

  // 🔹 titolo: da centrato → alto-sinistra + X arancione
  this.animateService.animateTitoloVersoAltoGlobal();
  this.animateService.setXNormale();

  this.saturnoRouteAnimazioniService.animaVerso(
    scene,
    'LOGIN_LATERALE',
    durata,
    this.directionalLight || undefined
  );
}

// 👉 NIENTE animateAll qui: lo chiameremo DOPO aver creato i gruppi di particelle









          // Creazione dei dischi (anelli di Saturno)


          this.diskService.createDisk(
            scene,
            vertexShader,
            fragmentShader,
            1.170,
            1.305,
            0xfffFFF,
            0.18,
            true,
            true,
            0.01,
            0
          );
          this.diskService.createDisk(
            scene,
            vertexShader,
            fragmentShader,
            1.245,
            1.270,
            0xfffFFF,
            0.45,
            true,
            true,
            0.03,
            0
          );
          this.diskService.createDisk(
            scene,
            vertexShader,
            fragmentShader,
            1.270,
            1.490,
            0xfffee9,
            0.55,
            true,
            true,
            -0.01,
            0
          );
          //piccolo
          this.diskService.createDisk(
            scene,
            vertexShader,
            fragmentShader,
            1.340,
            1.390,
            0xfffee9,
            0.65,
            true,
            true,
            0.01,
            0
          );
          this.diskService.createDisk(
            scene,
            vertexShader,
            fragmentShader,
            1.540,
            1.740,
            0xffffff,
            0.05,
            true,
            true,
            -0.01,
            0
          );

          this.diskService.createDisk(
            scene,
            vertexShader,
            fragmentShader,
            1.570,
            1.970,
            0xfff4e9,
            0.25,
            true,
            true,
            0.01,
            0
          );
          //piccolo
          this.diskService.createDisk(
            scene,
            vertexShader,
            fragmentShader,
            1.715,
            1.799,
            0xfff4e9,
            0.25,
            true,
            true,
            0.03,
            0
          );
          this.diskService.createDisk(
            scene,
            vertexShader,
            fragmentShader,
            1.900,
            2.170,
            0xffffff,
            0.055,
            true,
            false,
            0.03,
            0
          );



          // Creazione dei gruppi di particelle (asteroidi) attorno a Saturno
          const particleGroups: THREE.Group[] = [];
          this.groupsConfig.forEach((config) => {
            const group = this.particleGroupService.createParticleGroup(config);
            scene.add(group);
            particleGroups.push(group);
          });
          this.particleGroups = particleGroups;

         // Avvia le animazioni di ingresso SOLO sulla welcome

// ✅ Ora che i gruppi di particelle ESISTONO, posso lanciare la timeline unica
const firstElement = document.querySelector('[data-titolo-first]') as HTMLElement | null;
const xElement = document.querySelector('[data-titolo-x]') as HTMLElement | null;

if (isWelcomeRoute) {
  // pagina di benvenuto: luce + accelerazione particelle + collisione titolo
  this.animateService.animateAll(
    firstElement,
    xElement,
    this.directionalLight,
    this.particleGroups
  );
} else if (isCatalogRoute) {

  /* ✅ CASO 1: reload su /catalogo -> stato finale subito (niente animazione) */
  if (ricaricaCatalogo) {

    // stato UI finale
    this.animateService.setXNormale();
    this.animateService.setTitoloAltoGlobal();

    // posa finale della scena (saturno "in basso")
    this.saturnoPosizioniService.applicaPoseAScena(scene, 'CATALOGO_NASCOSTO');

    // componenti finali gia' spariti (come dopo l'animazione)
    this.animateService.fadeOutSaturnoESfondo(0);
    this.animateService.enablePageScroll();

    // IMPORTANTISSIMO: il loader dipende da saturnoPronto$
    this.firstRenderDone = true;
this.saturnoStatoService.setPronto();


    // non distruggo la scena, ma spengo loop e effetti come nello stato finale
    this.spegniSaturno();
    this.animateService.pauseClearcoat();

    // segno che catalogo e' gia' "finito"
    this.catalogoGiaAnimato = true;

  } else {

    /* ✅ CASO 2: / -> (diorottamento) -> /catalogo (navigate) -> resta identico a prima */
    this.animateService.setTitoloCentraleGlobal();

    const durataCatalogo = 1.6;
    const anticipoMs = 500;

    this.animateService.animateAll(
      firstElement,
      xElement,
      this.directionalLight,
      this.particleGroups,
      () => {
        this.animateService.setXNormale();
        this.animateService.animateTitoloVersoAltoGlobal();

        setTimeout(() => {
          this.animateService.fadeOutSaturnoESfondo(1.2);
          this.animateService.enablePageScroll();
        }, durataCatalogo * 1000 - anticipoMs);

        this.saturnoRouteAnimazioniService.animaVerso(
          scene,
          'CATALOGO_NASCOSTO',
          durataCatalogo,
          this.directionalLight || undefined,
          () => {
            this.spegniSaturno();
            this.animateService.pauseClearcoat();
            this.catalogoGiaAnimato = true;
          }
        );
      }
    );
  }
}





             // Gestione mouse e raycaster per spostamento particelle (hover sempre attivo)
this.attivaHoverMouse();



                // animazione disco luminoso
          this.animateService.animateClearcoat(material);

                    // Avvio il loop di animazione dopo che la scena è pronta
       this.startFixedFPSLoop();

// NEW: segno che la scena è stata inizializzata una volta
this.scenaInizializzata = true;

// 👇 NUOVO: Saturno pronto per la prima volta


resolve();


        })
        .catch((error) => {
          console.error('Errore durante il caricamento delle texture:', error);
          reject(error);
        });
    });
  }


  /**
   * Esegue il rendering della scena e aggiorna gli oggetti (chiamato dal setInterval).
   */
 private renderAndUpdate(deltaTime: number): void {
  if (!this.scene || !this.camera || !this.renderer) { // controllo che tutto sia pronto
    return;
  }

  // Render della scena
  this.renderer.render(this.scene, this.camera);

  if (!this.firstRenderDone) {
  this.firstRenderDone = true;
  this.saturnoStatoService.setPronto();
}


  // Rotazione del pianeta
  if (this.planetMesh) {
    this.planetMesh.rotation.y += 0.004 * deltaTime * 60;
  }

  // Animazione dischi
  this.diskService.animateDisks(deltaTime);

  // Animazione particelle
  this.particleGroups.forEach((group) => {
    this.animateGroup(group, deltaTime);
    group.rotation.y += group.userData['rotationSpeed'] * deltaTime * 60;
  });
}


  //animazioni particelle di default+ sollevamento
  private animateGroup(group: THREE.Group, deltaTime: number): void {
    const offsets = group.userData['offsets']; //dati casuali di generazione particelle
    const originalPositions = group.userData[ // posizione iniziale delle particelle
      'originalPositions'
    ] as THREE.Vector3[];
    const time = performance.now() * 0.001; //presa tempo

    this.raycaster.setFromCamera(this.mouse, this.camera!); //Allinea il Raycaster in base alla posizione attuale del mouse e della camera, per poter fare confronti di distanza dal puntatore.

    // Soglie di ingresso/uscita per "hover"
    const approachInThreshold = 0.1; // oppure 0.08 se vuoi area piccola
const approachOutThreshold = 0.13;


    group.children.forEach((particle: THREE.Object3D, i: number) => { // loop per tutte le particelle di un gruppo
      const data = particle.userData; // stato particelle, riposo o in tensione mouse
      const off = offsets[i];
      const origPos = originalPositions[i];

      // Calcolo della distanza 2D sullo schermo con conversione
      const worldPos = new THREE.Vector3();
      particle.getWorldPosition(worldPos);
      const screenPos = worldPos.clone().project(this.camera!);

      const dy = screenPos.y - (this.mouse.y + (150 / window.innerHeight) * 2);

const dx = screenPos.x - this.mouse.x;
const distance2D = Math.sqrt(dx * dx + dy * dy);


      // Entrata e uscita dalla "hover zone"
      // if (data['state'] === 'idle' && distance2D < approachInThreshold) {
      //   data['state'] = 'hover';
      // }

      const now = performance.now();
    const lastLift = data['lastLift'] || 0;
    const cooldown = 1050; // 2 secondi in millisecondi

    if (data['state'] === 'idle' && distance2D < approachInThreshold) {
      if (now - lastLift > cooldown) {
        data['state'] = 'hover';
        data['lastLift'] = now;
      }
    }

      if (data['state'] === 'hover' && distance2D > approachOutThreshold) {
        data['state'] = 'idle';
      }

      // Fattore di "sollevamento" (hover)
      // const liftFactor = 3.5 / (worldPos.distanceTo(this.camera!.position) + 1.0);
      // AGGIUNGI questo blocco
const distance = worldPos.distanceTo(this.camera!.position);
const minDist   = 0.8;     // regola a piacere
const maxDist   = 3.0;     // regola a piacere
const liftMin   = 0.01;    // lift per le particelle vicine
const liftMax   = 0.08;    // lift per le particelle lontane

// trasformiamo la distanza in un valore compreso fra 0 e 1
let t = (distance - minDist) / (maxDist - minDist);
t = THREE.MathUtils.clamp(t, 0, 1);

// interpolazione lineare fra liftMin e liftMax
const dynamicLift = THREE.MathUtils.lerp(liftMin, liftMax, t);


      // Piccole oscillazioni
      const floatX = Math.sin(time * off.freqX + off.timeOffset) * off.ampX;
      const floatY = Math.sin(time * off.freqY + off.timeOffset) * off.ampY;
      const floatZ = Math.sin(time * off.freqZ + off.timeOffset) * off.ampZ;

      const finalX = origPos.x + floatX;

      // posizione finale con tutte le animazioni
      const finalY =
        (data['state'] === 'hover'
          ? THREE.MathUtils.lerp(
              particle.position.y,
              data['originalY'] + dynamicLift,
              0.1
            )
          : THREE.MathUtils.lerp(particle.position.y, data['originalY'], 0.1)) +
        floatY;

      const finalZ = origPos.z + floatZ;

      particle.position.set(finalX, finalY, finalZ);
    });
  }

public getCamera(): THREE.Camera | null {
  return this.camera;
}
public getScene(): THREE.Scene | null {
  return this.scene;
}

public getParticleGroups(): THREE.Group[] {
  return this.particleGroups;
}

public getDirectionalLight(): THREE.DirectionalLight | null {
  return this.directionalLight;
}


private attivaHoverMouse(): void {
  // Per sicurezza rimuovo l’eventuale listener precedente
  if (this.gestoreMouseMove) {
    window.removeEventListener('mousemove', this.gestoreMouseMove);
  }

  this.gestoreMouseMove = (event: MouseEvent) => {
    const correctedY = event.clientY + 150; // le particelle si spostano in alto di 150 px
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(correctedY / window.innerHeight) * 2 + 1;
  };

  window.addEventListener('mousemove', this.gestoreMouseMove);
}

// dentro SaturnoService
public flashErrorLight(): void {
  if (!this.scene || !this.directionalLight) {
    return;
  }

  const scene = this.scene;
  const light = this.directionalLight;

  const originalColor = light.color.clone();
  const originalX = scene.position.x;

  const durata = 400; // ms totali
  const jitterOffsets = [
    -0.12,
    0.18,
    -0.25,
    0.3,
    -0.18,
    0.12,
    -0.08,
    0.06,
  ];
  const step = durata / jitterOffsets.length;

  // luce rossa per tutta la durata
  light.color.set(0xb42f14);

  // scatti sull'asse X
  jitterOffsets.forEach((offset, index) => {
    setTimeout(() => {
      if (!this.scene) {
        return;
      }
      this.scene.position.x = originalX + offset;
    }, step * index);
  });

  // ripristino posizione e colore dopo i 400 ms
  setTimeout(() => {
    if (this.scene) {
      this.scene.position.x = originalX;
    }
    if (this.directionalLight) {
      this.directionalLight.color.copy(originalColor);
    }
  }, durata);
}

  private isReloadCatalogo(): boolean {
    try {
      const nav = performance.getEntriesByType('navigation') as any[];
      const tipo = nav && nav[0] && nav[0].type ? String(nav[0].type) : '';
      const path = (window.location.pathname || '').split('?')[0].split('#')[0];

     const eCatalogoHome =
       path === '/catalogo' ||
       path === '/catalogo/' ||
       path === '/catalogo/film' ||
       path === '/catalogo/serie' ||
       path === '/catalogo/film-serie';

     return (tipo === 'reload' && eCatalogoHome);
    } catch {
      return false;
    }
  }


}
