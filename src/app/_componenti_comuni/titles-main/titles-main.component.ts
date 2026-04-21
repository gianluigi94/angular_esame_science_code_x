//logica dell'elemento che funge da titolo/logo che fa riferimento anche alla scena 3D in cui spesso si relaziona

import { Component, ElementRef, AfterViewInit, ViewEncapsulation} from '@angular/core';
import { Router } from '@angular/router';
import { PerformanceService } from '../../_servizi_globali/performance.service';
import { AnimateService } from '../../_servizi_globali/animazioni_saturno/animate.service';
import * as THREE from 'three';
import { isMobileOrTablet } from 'src/app/_helpers_globali/helpers';
import { NotFoundCloseService } from './not-found-close.service';
import { Authservice } from 'src/app/_benvenuto/login/_login_service/auth.service';
import { StopVideoGlobaleService } from 'src/app/_catalogo/riga-categoria/categoria_services/stop-video-globale.service';
@Component({
  selector: 'app-titles-main',
  templateUrl: './titles-main.component.html',
  styleUrls: ['./titles-main.component.scss'],
  encapsulation: ViewEncapsulation.None, //permette al CSS del componente di "uscire" e influenzare anche elementi esterni
})
export class TitlesMainComponent implements AfterViewInit {
  private light: THREE.DirectionalLight | null = null; // mi tengo un riferimento alla luce direzionale da animare (inizio con null)
  private particleGroups: THREE.Group[] = []; // mi tengo una lista di gruppi di particelle da animare (inizio vuota)

constructor(
  private elementRef: ElementRef,
  private performanceService: PerformanceService,
  private animateService: AnimateService,
  private authService: Authservice,
  private router: Router,
  private notFoundClose: NotFoundCloseService,
  private stopVideoGlobale: StopVideoGlobaleService,
) {}

  public isLowPerf: boolean = false; // espongo un flag pubblico per sapere se devo usare modalità “low performance”

  /**
   * - recupera gli elementi DOM necessari alle animazioni
   * - determina se il dispositivo è a basse prestazioni o mobile
   * - avvia le animazioni del titolo e degli elementi collegati
   *
   * Le animazioni vengono avviate solo quando la view è stabile
   * per evitare problemi di sincronizzazione.
   */
  ngAfterViewInit(): void {
    // entro nell’hook che scatta quando la view è stata renderizzata e gli elementi DOM esistono
    const firstElement = this.elementRef.nativeElement.querySelector('[data-titolo-first]') as HTMLElement;

    this.performanceService.isLowEndPC$.subscribe((isLowEnd) => {
      // mi sottoscrivo allo stream che mi dice se il pc è di fascia bassa
      setTimeout(() => {
        // rimando al tick successivo per essere sicuro che la view sia stabile prima di animare
        this.isLowPerf = isLowEnd || isMobileOrTablet(); // imposto lowPerf se il device è low-end oppure se è mobile/tablet

        const xElement = this.elementRef.nativeElement.querySelector(
          '[data-titolo-x]'
        ) as HTMLElement; // recupero l’elemento con attributo data-titolo-x

        const url = this.router.url.split('?')[0].split('#')[0];
        const isWelcomeRoute =
          /^\/(it|en)\/(benvenuto|welcome)(\/|$)/.test(url) &&
          !/^\/(it|en)\/(benvenuto|welcome)\/(login|accedi)(\/|$)/.test(url);

        // fuori dalla welcome non avviare intro titolo
        if (!isWelcomeRoute) {
          return;
        }

        this.animateService.animateAll(
          // chiamo il servizio per avviare tutte le animazioni
          firstElement, // passo l'elemento principale da animare
          xElement, // passo l'elemento X/titolo da animare
          this.light, // passo la luce da animare se esiste
          this.particleGroups // passo i gruppi di particelle da animare
        );
      }, 0);
    });
  }

    /**
   * Verifica se la route corrente corrisponde alla pagina 404.
   *
   * Rimuove eventuali query string e fragment prima del controllo.
   *
   * @returns boolean True se la route corrente e' la pagina 404, false altrimenti.
   */
  get isNotFoundRoute(): boolean {
    const url = this.router.url.split('?')[0].split('#')[0]; // pulisco la route corrente da query string e fragment
    return /^\/(it|en)\/(non-trovato|not-found)(\/|$)/.test(url); // verifico se la route punta alla pagina 404
  }

  /**
   * Gestisce il click sul logo principale.
   *
   * Intercetta il click e decide se tornare indietro,
   * chiudere la 404 oppure navigare alla home
   * dopo un eventuale fade dell'audio video attivo.
   *
   * @param ev Evento del click da intercettare.
   * @returns Promise<void>
   */
  async onLogoClick(ev: MouseEvent): Promise<void> {
    ev.preventDefault(); // blocco il comportamento predefinito del click
    ev.stopPropagation(); // blocco la propagazione del click

    if (this.isContactRoute) { // controllo se mi trovo nella pagina contatti
      if (sessionStorage.getItem('vengo_da_registrazione')) { // controllo se arrivo dalla registrazione
        this.router.navigate(['/']); // torno alla home se provengo dalla registrazione
      } else {
        window.history.back(); // torno indietro nella cronologia del browser
      }
      return; // interrompo il flusso dopo la gestione della pagina contatti
    }

    if (this.isPianoRoute) {
      window.history.back();
      return;
    }

    if (this.isRicevuteRoute) {
      window.history.back();
      return;
    }

    if (this.isProfiloRoute) {
      window.history.back();
      return;
    }

    if (this.isNotFoundRoute) { // controllo se mi trovo nella pagina 404
      const auth = this.authService.leggiObsAuth().value; // leggo lo stato auth corrente
      const autenticato = auth && auth.tk !== null; // verifico se l'utente risulta autenticato
      this.notFoundClose.requestClose(!autenticato); // richiedo la chiusura della 404 passando se devo ricaricare
      return; // interrompo il flusso dopo la gestione della pagina 404
    }

    const videoAttivo = Array.from(document.querySelectorAll('video')) // raccolgo tutti gli elementi video presenti nella pagina
      .some(v => !v.paused && !v.ended && v.readyState > 2); // verifico se esiste almeno un video realmente attivo
    if (videoAttivo) { // controllo se ho trovato un video attivo
      await this.stopVideoGlobale.richiediSoloFadeAudio(350).catch(() => {}); // richiedo il fade del solo audio prima di navigare
    }
    this.router.navigate(['/']); // navigo alla home
  }

  /**
   * Verifica se la route corrente corrisponde alla pagina contatti.
   * é un getter
   * Rimuove eventuali query string e fragment prima del controllo.
   *
   * @returns boolean True se la route corrente e' la pagina contatti, false altrimenti.
   */
  get isContactRoute(): boolean {
    const url = this.router.url.split('?')[0].split('#')[0]; // pulisco la route corrente da query string e fragment
    return /^\/(it\/contatti|en\/contact)(\/|$)/.test(url); // verifico se la route punta alla pagina contatti
  }
get isPianoRoute(): boolean {
    const url = this.router.url.split('?')[0].split('#')[0];
    return /^\/(it\/piano|en\/plan)(\/|$)/.test(url);
  }

  get isRicevuteRoute(): boolean {
    const url = this.router.url.split('?')[0].split('#')[0];
    return /^\/(it\/ricevute|en\/receipts)(\/|$)/.test(url);
  }

  get isProfiloRoute(): boolean {
    const url = this.router.url.split('?')[0].split('#')[0];
    return /^\/(it\/profilo|en\/profile)(\/|$)/.test(url);
  }
  /**
   * Verifica se la route corrente corrisponde alla welcome.
   * è un getter
   * Rimuove eventuali query string e fragment prima del controllo
   * ed esclude esplicitamente la pagina login.
   *
   * @returns boolean True se la route corrente e' la welcome, false altrimenti.
   */
  get isWelcomeRoute(): boolean {
    const url = this.router.url.split('?')[0].split('#')[0]; // pulisco la route corrente da query string e fragment
    return (
      /^\/(it|en)\/(benvenuto|welcome)(\/|$)/.test(url) && // verifico se la route punta alla welcome
      !/^\/(it|en)\/(benvenuto|welcome)\/(login|accedi)(\/|$)/.test(url) // escludo il caso in cui la route sia la login
    );
  }
}
