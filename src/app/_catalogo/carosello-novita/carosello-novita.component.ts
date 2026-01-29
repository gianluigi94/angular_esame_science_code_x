// Componente che funge da elemento principale del carosello novità, mantenendo lo stato centrale e delegando alle utility specializzate il comportamento di scorrimento, overlay, video, audio e reazioni a scroll, focus e cambio lingua.

import { Component, OnDestroy, OnInit, AfterViewInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { CaroselloNovitaService } from './carosello_services/carosello-novita.service';
import { NovitaInfo } from 'src/app/_interfacce/Inovita-info.interface';
import { CaricamentoCaroselloService } from './carosello_services/caricamento-carosello.service';
import { Subscription } from 'rxjs';
import { CaroselloScrollUtility } from './carosello_utility/carosello-scroll.utility';
import { CaroselloDatiUtility } from './carosello_utility/carosello-dati.utility';
import { CaroselloOverlayUtility } from './carosello_utility/carosello-overlay.utility';
import { CaroselloTopUtility } from './carosello_utility/carosello-top.utility';
import { CaroselloFocusUtility } from './carosello_utility/carosello-focus.utility';
import { CaroselloGettersUtility } from './carosello_utility/carosello-getters.utility';
import { CaroselloVideoUtility } from './carosello_utility/carosello-video.utility';
import { CaroselloAudioUtility } from './carosello_utility/carosello-audio.utility';
import { CaroselloPlayerUtility } from './carosello_utility/carosello-player.utility';
import { CaroselloScrollStateUtility } from './carosello_utility/carosello-scroll-state.utility';
import { CaroselloCopertureUtility } from './carosello_utility/carosello-coperture.utility';
import { HoverLocandinaService } from '../app-riga-categoria/categoria_services/hover-locandina.service';

@Component({
  selector: 'app-carosello-novita',
  templateUrl: './carosello-novita.component.html',
  styleUrls: ['./carosello-novita.component.scss'],
})
export class CaroselloNovitaComponent implements OnInit, OnDestroy, AfterViewInit {

  pausaPerHover = false;
     mostraImmagineHover = false;
   immagineHoverFissa = 'assets/carosello_locandine/carosello_abbraccia_il_vento.webp';
   chiaveHoverImg = 0;
    immagineHoverPronta = true;
 tokenHoverImg = 0;

  trailerHoverProvvisorio = 'https://d2kd3i5q9rl184.cloudfront.net/mp4-trailer-it/trailer_ita_cavalli_contro_circuiti.mp4';
 MIN_MS_IMMAGINE_HOVER = 400;
 inizioImmagineHoverMs = 0;
 tokenHoverTrailer = 0;
 timerMostraTrailerHover: any = null;
 hoverTrailerInAttesa = false;
  stopDolceInCorso = false;
  alTop = true; // Tengo traccia se sono 'in cima' alla pagina (stato iniziale: sì)
  pausaPerScroll = false; // Segno se devo mettere in pausa per via dello scroll (inizialmente no)
  SCROLL_THRESHOLD = 10; // Imposto la soglia (in px) entro cui considero la pagina 'in cima'
  timerAutoscroll: any = null; // Mi tengo il riferimento al timer dell'autoscroll (per poterlo fermare/reset)
  INTERVALLO_AUTOSCROLL_MS = 6200; // Definisco ogni quanti ms far scattare l'autoscroll
  pausaPerBlur = false; // Segno se sono in pausa perché la finestra ha perso il focus (blur)
  immagini: string[] = []; // Memorizzo la lista delle immagini di sfondo del carosello
  descrizioni: string[] = []; // Memorizzo le descrizioni associate alle slide
  titoliAlt: string[] = []; // Memorizzo i titoli (testo alternativo / titolo) per ogni slide
  chiaveStorageIndice = 'carosello_novita_ultima_slide_reale'; // Definisco la chiave di localStorage per salvare/riprendere l'indice reale
  imgTitolo: string[] = []; // Memorizzo le immagini dei titoli (se presenti) per ogni slide
  sottotitoli: string[] = []; // Memorizzo i sottotitoli per ogni slide
  indiciSfondiCritici: number[] = []; // Tengo la lista degli indici sfondo 'critici' che devono essere pronti subito

titoloOverlay = ''; // Tengo il titolo attualmente mostrato nell'overlay
imgTitoloOverlay = ''; // Tengo l'immagine titolo attualmente mostrata nell'overlay
sottotitoloOverlay = ''; // Tengo il sottotitolo attualmente mostrato nell'overlay
titoloHoverFisso = 'cavalli contro circuiti';
imgTitoloHoverFisso = 'https://www.sciencecodex.net/assets/titoli_en/titolo_en_cavalli_contro_circuiti.webp';
sottotitoloHoverFisso = 'sottotitolo di prova';

descrizioneHoverFissa = ''; // es: "film.cavalli_contro_circuiti"

linguaCorrenteTitoli(): string {
  try { return this.translate.currentLang || 'it'; } catch { return 'it'; }
}

titoloVisibile = true;
sottotitoloVisibile = true;
  durataFadeTitoliMs = 200; // Imposto la durata del fade dei titoli
  pausaNeroTitoliMs = 50; // Imposto la pausa di 'nero' tra fade out e nuovo contenuto

  private timerFadeTitolo: any = null; // Tengo il timer del fade del titolo per poterlo annullare se serve
  private timerImpostaTitolo: any = null; // Tengo il timer che imposta il nuovo titolo dopo l'attesa
  private idCambioTitoli = 0; // Uso un contatore/token per invalidare cambi titoli precedenti
  private inBlackoutTitoli = false; // Segno se i titoli sono in blackout (fase 'nero'/transizione)
  private titoloPronto = false; // Segno se il titolo è pronto da mostrare (es. immagine caricata)

  indiceCorrente = 1; // Tengo l'indice corrente della slide
  transizioneAttiva = true; // Decido se la transizione CSS è attiva
  stileTrasformazione = 'translateX(-100%)'; // Imposto la trasformazione iniziale per posizionare la slide
  scorrimentoInCorso = false; // Segno se uno scorrimento/transizione è attualmente in corso

  durataTransizioneMs = 500; // Imposto la durata (ms) della transizione tra slide
  riproduttore: ElementRef | null = null; // Tengo il riferimento al player DOM se disponibile
  playerInizializzato = false; // Segno se il player è già stato inizializzato

  @ViewChild('riproduttore') // Collego il ViewChild al template reference 'riproduttore' per ottenere l'ElementRef
  set riproduttoreViewChild(ref: ElementRef | null) {
    // Intercetto quando Angular assegna/aggiorna il riferimento al ViewChild
    this.riproduttore = ref; // Salvo il riferimento dell'elemento player nella proprietà di classe
    this.inizializzaPlayerSePronto(); // Provo a inizializzare il player appena ho tutto pronto
  }

  player: any; // Mantengo l'istanza del player video (video.js o simile)
  mostraVideo = false; // Decido se mostrare o nascondere il video (inizialmente nascosto)

  durataFadeAudioMs = 350; // Imposto la durata del fade audio in millisecondi
  durataFadeVisivoMs = 250; // Imposto la durata del fade visivo in millisecondi
  RITARDO_MOSTRA_PLAYER_MS = 1250; // Definisco il ritardo prima di mostrare/avviare il player

  timerMostra: any = null; // Mi tengo il timer che ritarda la comparsa/avvio del video
  numeroSequenzaAvvio = 0; // Uso un contatore per invalidare avvii vecchi quando cambia lo stato

  tentativiTrailer = 0; // Conto quanti tentativi ho fatto per avviare il trailer corrente
  MAX_TENTATIVI_TRAILER = 2; // Imposto il massimo numero di retry concessi per un trailer

  contestoAudio: any = null; // Tengo il riferimento all'AudioContext del Web Audio API
  nodoSorgente: any = null; // Tengo il nodo sorgente (MediaElementSource) collegato al video
  nodoGuadagno: any = null; // Tengo il nodo GainNode per gestire volume e fade
  elementoVideoReale: any = null; // Salvo il riferimento al vero elemento <video> dentro il player
  audioConsentito = false; // Segno se l'audio e' consentito (policy autoplay / interazione utente)

  sbloccoAudioAttivo = false; // Segno se ho gia' attivato la logica di sblocco audio su interazione
  sbloccaAudioBinding: any = null; // Mi salvo la funzione handler per rimuovere l'event listener dopo l'uso

  sfondiCaricati: Record<number, boolean> = {}; // Traccio quali sfondi (per indice) risultano caricati
  contaSfondiCaricati = 0; // Conto quanti sfondi sono stati caricati (utile per progress o log)
  logSfondiFatto = false; // Evito di loggare piu' volte l'evento 'sfondi pronti'
  logTitoliFatto = false; // Evito di loggare piu' volte l'evento 'titoli pronti'

  segnalatiTitoliPronti = false; // Segno se ho gia' notificato al servizio che i titoli sono pronti

  mappaNovitaCorrente: Record<string, NovitaInfo> = {}; // Tengo la mappa delle novita attualmente in uso (per lingua corrente)
  trailers: string[] = []; // Memorizzo gli URL dei trailer associati alle slide

  private subs = new Subscription(); // Colleziono le subscription RxJS per poterle disiscrivere in destroy

  private idCambioLinguaVideo = 0; // Uso un token incrementale per distinguere i cambi lingua video
  private promessaStopCambioLingua: Promise<void> | null = null; // Mi salvo la promise dello stop/fade legata al cambio lingua

  constructor(
    private caroselloNovitaService: CaroselloNovitaService,
    private cambioLinguaService: CambioLinguaService,
    private translate: TranslateService,
    private caricamentoCaroselloService: CaricamentoCaroselloService,
    private servizioHoverLocandina: HoverLocandinaService
  ) {}

/**
 * Metodo eseguito all'inizializzazione del componente.
 *
 * Avvia il caricamento dei dati del carosello e registra le sottoscrizioni
 * agli eventi di cambio lingua per aggiornare testi, overlay e trailer.
 *
 * @link https://docs.videojs.com/
 * @returns void
 */
  ngOnInit(): void {
    this.caricaDati(); // Avvio il caricamento dati iniziali

     this.subs.add(
  this.servizioHoverLocandina.osserva().subscribe(({ attivo, urlSfondo, urlTrailer, descrizione }) => {
 const eraAttivo = this.mostraImmagineHover;
 this.mostraImmagineHover = attivo;

 if (attivo) {
  if (urlTrailer) {
  this.trailerHoverProvvisorio = urlTrailer; // trailer hover corretto (lingua + slug)
}
  if (urlSfondo) {
    if (!eraAttivo) this.immagineHoverPronta = false;
 this.chiaveHoverImg += 1;

 const token = ++this.tokenHoverImg;
 const nuovaUrl = urlSfondo;
 const img = new Image();
 img.onload = () => {
 if (token !== this.tokenHoverImg) return;
 this.immagineHoverFissa = nuovaUrl;
 this.immagineHoverPronta = true;
 this.inizioImmagineHoverMs = Date.now();
  console.log('[HOVER] immagine pronta', { token, nuovaUrl, player: !!this.player, pausaPerHover: this.pausaPerHover });
 if (this.pausaPerHover && this.mostraImmagineHover && this.immagineHoverPronta) {
 this.preparaTrailerHoverDopoImmaginePronta();
 }
 };
 img.onerror = () => {
 if (token !== this.tokenHoverImg) return;

 this.immagineHoverFissa = nuovaUrl;
 this.immagineHoverPronta = true;
 this.inizioImmagineHoverMs = Date.now();
  console.log('[HOVER] immagine errore ma ok', { token, nuovaUrl, player: !!this.player, pausaPerHover: this.pausaPerHover });
 if (this.pausaPerHover && this.mostraImmagineHover && this.immagineHoverPronta) {
 this.preparaTrailerHoverDopoImmaginePronta();
 }
 };
 img.src = nuovaUrl;
 }
     this.pausaPerHover = true;

// ricostruisco l'immagine titolo in base a lingua + descrizione hover
// (serve che HoverLocandinaService mi passi anche 'descrizione')
if (descrizione) this.descrizioneHoverFissa = descrizione;

if (this.descrizioneHoverFissa) {
  this.imgTitoloHoverFisso = CaroselloDatiUtility.urlTitoloDaDescrizione(
    this.descrizioneHoverFissa,
    this.linguaCorrenteTitoli()
  );
}

CaroselloOverlayUtility.impostaOverlay(
  this,
  this.titoloHoverFisso,
  this.imgTitoloHoverFisso,
  this.sottotitoloHoverFisso,
  true
);

this.fermaAutoscroll();
          this.fermaAvvioPendete();   // blocco avvii trailer pendenti
          this.numeroSequenzaAvvio++; // invalido eventuali avvii in corso

           // se sono al top e il video e' visibile: lo nascondo 200ms dopo
 if (this.alTop && this.mostraVideo) {
 setTimeout(() => {
 // se nel frattempo sono ancora in hover, allora nascondo davvero
 if (this.pausaPerHover) this.mostraVideo = false;
 }, 200);
 }

          this.sfumaGuadagnoVerso(0, this.durataFadeAudioMs).finally(() => {
            try { this.player.pause(); } catch {}
            try { this.player.currentTime(0); } catch {}
             if (this.mostraImmagineHover && this.immagineHoverPronta) {
 this.preparaTrailerHoverDopoImmaginePronta();
 }
          });
         } else {
                     this.pausaPerHover = false;

 this.aggiornaOverlayPerIndiceCorrente(this.indiceCorrente, true);

 this.tokenHoverImg += 1;

  this.tokenHoverTrailer += 1;
 if (this.timerMostraTrailerHover) clearTimeout(this.timerMostraTrailerHover);
 this.timerMostraTrailerHover = null;
 this.mostraVideo = false;
          this.stopDolceInCorso = true;
          // uscita da hover: SEMPRE stop dolce del trailer hover (anche se non sono al top)
 this.sfumaGuadagnoVerso(0, this.durataFadeAudioMs).finally(() => {
 try { this.player.pause(); } catch {}
 try { this.player.currentTime(0); } catch {}

 // tolgo overlay e riparto con la logica normale (solo se posso)
 if (this.alTop && !this.pausaPerScroll && !this.pausaPerBlur && !this.pausaPerHover) {
 this.avviaTrailerCorrenteDopo(this.RITARDO_MOSTRA_PLAYER_MS);
 }
 if (!this.alTop && !this.pausaPerBlur && !this.pausaPerHover) {
 this.avviaAutoscroll();
 }
 this.stopDolceInCorso = false;
 });
         }
       })
     );
    this.subs.add(
      // Registro questa subscription per poterla disiscrivere in destroy
      this.cambioLinguaService.cambioLinguaAvviato$.subscribe(() => {
        // Reagisco all'avvio del cambio lingua
        this.idCambioTitoli++; // Invalido le transizioni titoli precedenti incrementando il token
        if (this.timerFadeTitolo) clearTimeout(this.timerFadeTitolo); // Cancello il timer del fade titolo se attivo
        if (this.timerImpostaTitolo) clearTimeout(this.timerImpostaTitolo); // Cancello il timer di impostazione titolo se attivo

        this.inBlackoutTitoli = false; // Evito il blackout: mantengo visibile l'immagine/titolo precedente

        const token = ++this.idCambioLinguaVideo; // Creo un token per questo specifico cambio lingua video
        this.mostraVideo = false; // Nascondo il video durante il cambio lingua
        this.fermaAvvioPendete(); // Interrompo eventuali avvii pendenti del trailer

        this.promessaStopCambioLingua = this.sfumaGuadagnoVerso(
          0,
          this.durataFadeAudioMs
        ).finally(() => {
          // Faccio fade-out audio e poi stoppo il player se il token e' ancora valido
          if (token !== this.idCambioLinguaVideo) return; // Esco se nel frattempo e' partito un altro cambio lingua
          try {
            this.player.pause();
          } catch {} // Provo a mettere in pausa senza rompere se il player non e' pronto
          try {
            this.player.currentTime(0);
          } catch {} // Provo a resettare il tempo del video senza rompere in caso di errore
        });
      })
    );

    this.subs.add(
      // Registro anche questa subscription per gestirne la cleanup
      this.cambioLinguaService.cambioLinguaApplicata$.subscribe(
        // Reagisco a lingua applicata con la nuova mappa contenuti
        ({ mappaNovita }) => {
          // Estraggo la mappa delle novita dal payload
          this.titoliAlt = this.descrizioni.map(
            // Ricostruisco i titoli alt in base alle descrizioni correnti
            (d) => mappaNovita[d]?.titolo || '' // Prendo il titolo dalla mappa o fallback a stringa vuota
          );
          this.imgTitolo = this.descrizioni.map(
            // Ricostruisco le immagini titolo in base alle descrizioni correnti
            (d) => mappaNovita[d]?.img_titolo || '' // Prendo l'immagine titolo dalla mappa o fallback a stringa vuota
          );
          this.sottotitoli = this.descrizioni.map(
            // Ricostruisco i sottotitoli in base alle descrizioni correnti
            (d) => mappaNovita[d]?.sottotitolo || '' // Prendo il sottotitolo dalla mappa o fallback a stringa vuota
          );

          this.mappaNovitaCorrente = mappaNovita; // Salvo la mappa corrente per overlay e lookup successivi
          this.trailers = this.descrizioni.map(
            (d) => mappaNovita[d]?.trailer || ''
          ); // Ricostruisco la lista trailer per le slide

          this.aggiornaOverlayPerIndiceCorrente(this.indiceCorrente, true); // Aggiorno l'overlay della slide corrente con transizione

          const token = this.idCambioLinguaVideo; // Memorizzo il token corrente per verificare coerenza dopo il fade-out
          const stop = this.promessaStopCambioLingua; // Recupero la promise di stop/fade avviata nella fase 'avviato'
          this.promessaStopCambioLingua = null; // Azzero la reference per evitare riusi non voluti

          (stop ?? Promise.resolve()).finally(() => {
            // Aspetto che lo stop sia finito (o continuo subito se non c'era)
            if (token !== this.idCambioLinguaVideo) return; // Non riparto se il token e' cambiato nel frattempo
            this.avviaTrailerCorrenteDopo(this.RITARDO_MOSTRA_PLAYER_MS); // Riavvio il trailer dopo il ritardo previsto
          });
        }
      )
    );
  }

  /**
 * Metodo eseguito dopo il rendering della vista del componente.
 *
 * Tenta l'inizializzazione del player video quando gli elementi DOM
 * necessari dovrebbero essere disponibili.
 *
 * @returns void
 */
  ngAfterViewInit(): void {
    this.inizializzaPlayerSePronto(); // Provo a inizializzare il player ora che la view dovrebbe essere pronta
  }

  /**
 * Metodo eseguito alla distruzione del componente.
 *
 * Interrompe timer e autoscroll, rimuove eventuali listener per lo sblocco audio,
 * disconnette WebAudio, distrugge il player e chiude tutte le subscription.
 *
 * @returns void
 */
  ngOnDestroy(): void {
    this.fermaAvvioPendete(); // Fermo eventuali avvii trailer pendenti (timer/sequence)
    this.fermaAutoscroll(); // Fermo l'autoscroll e resetto il relativo timer

    try {
      // Provo a rimuovere l'ascolto per lo sblocco audio senza rischiare errori
      this.rimuoviAscoltoSbloccoAudio(); // Tolgo l'event listener di click usato per sbloccare l'audio
    } catch {}

    try {
      // Provo a disconnettere il nodo sorgente del Web Audio in modo sicuro
      if (this.nodoSorgente) this.nodoSorgente.disconnect(); // Disconnetto la sorgente dal grafo audio se esiste
    } catch {}
    try {
      // Provo a disconnettere il nodo di guadagno del Web Audio in modo sicuro
      if (this.nodoGuadagno) this.nodoGuadagno.disconnect(); // Disconnetto il GainNode dal grafo audio se esiste
    } catch {}
    try {
      // Provo a chiudere l'AudioContext se e' ancora aperto
      if (this.contestoAudio && this.contestoAudio.state !== 'closed')
        this.contestoAudio.close(); // Chiudo l'AudioContext per rilasciare risorse
    } catch {}

    try {
      // Provo a distruggere il player video senza far fallire la teardown
      if (this.player) this.player.dispose(); // Smonto il player
    } catch {}

    this.subs.unsubscribe(); // Disiscrivo tutte le subscription RxJS registrate
  }

/**
 * Carica e prepara i dati del carosello (immagini, descrizioni, titoli, trailer, overlay).
 *
 * La logica completa e' delegata alla utility dedicata.
 *
 * @returns void
 */
  caricaDati(): void {
    // Carico e preparo i dati del carosello
    CaroselloDatiUtility.caricaDati(this); // delego tutta la logica di caricamento dati alla utility passando il componente come contesto
  }

  @HostListener('window:blur', []) // Mi aggancio all'evento blur della finestra (perdita focus)
/**
 * Gestisce la perdita di focus della finestra.
 *
 * La logica completa (pause, gestione player e stati) e' delegata alla utility dedicata.
 *
 * @returns void
 */
  gestisciBlurFinestra(): void {
    // Gestisco cosa succede quando la finestra perde il focus
    CaroselloFocusUtility.gestisciBlurFinestra(this); // delego la logica blur/focus alla utility passando il componente come contesto
  }

  @HostListener('window:focus', []) // Mi aggancio all'evento focus della finestra (ritorno focus)
/**
 * Gestisce il ritorno di focus della finestra.
 *
 * La logica completa (ripresa, gestione player e stati) e' delegata alla utility dedicata.
 *
 * @returns void
 */
  gestisciFocusFinestra(): void {
    CaroselloFocusUtility.gestisciFocusFinestra(this); // delego la logica blur/focus alla utility passando il componente come contesto
  }

  @HostListener('window:scroll', []) // Mi aggancio all'evento scroll della finestra
/**
 * Gestisce lo scroll della finestra per aggiornare lo stato 'alTop' e le pause correlate.
 *
 * La logica completa (soglia, avvio/stop autoscroll e stati) e' delegata alla utility dedicata.
 *
 * @returns void
 */
  gestisciScroll(): void {
    CaroselloTopUtility.gestisciScroll(this); // delego la logica top/non-top alla utility passando il componente come contesto
  }

  /**
 * Porta il carosello alla slide successiva.
 *
 * @param daAutoscroll Indica se l'avanzamento e' stato avviato dall'autoscroll.
 * @returns void
 */
  vaiAvanti(daAutoscroll: boolean = false): void {
    CaroselloScrollUtility.vaiAvanti(this, daAutoscroll); // delego tutta la logica di avanzamento all'utility passando il componente come contesto
  }

/**
 * Porta il carosello alla slide precedente.
 *
 * @returns void
 */
  vaiIndietro(): void {
    CaroselloScrollUtility.vaiIndietro(this); // delego tutta la logica di arretramento all'utility passando il componente come contesto
  }

/**
 * Seleziona una slide specifica partendo da un indice 0-based.
 *
 * @param indiceZeroBased Indice 0-based della slide reale da selezionare.
 * @returns void
 */
  selezionaIndice(indiceZeroBased: number): void {
    // Seleziono una slide specifica partendo da un indice 0-based
    CaroselloScrollUtility.selezionaIndice(this, indiceZeroBased); // delego tutta la logica di selezione all'utility passando il componente come contesto
  }

/**
 * Aggiorna la trasformazione CSS del carosello in base all'indice corrente.
 *
 * @param conAnimazione Se true mantiene attiva la transizione CSS, altrimenti la disattiva.
 * @returns void
 */
  aggiornaTrasformazione(conAnimazione: boolean): void {
    // Aggiorno la trasformazione CSS del carosello con o senza animazione
    this.transizioneAttiva = conAnimazione; // Attivo o disattivo la transizione CSS
    this.stileTrasformazione = `translateX(-${this.indiceCorrente * 100}%)`; // Calcolo la translateX in base all'indice corrente
  }

/**
 * Ferma eventuali avvii trailer pianificati e invalida la sequenza corrente.
 *
 * @returns void
 */
  fermaAvvioPendete(): void {
    // Cancello eventuali avvii trailer schedulati e invalido la sequenza
    CaroselloVideoUtility.fermaAvvioPendete(this); // delego la gestione dei timer/token trailer alla utility passando il componente come contesto
  }

/**
 * Prova ad avviare il trailer iniziale quando le condizioni sono soddisfatte.
 *
 * @returns void
 */
  provaAvvioInizialeTrailer(): void {
    // Provo ad avviare il trailer iniziale se tutte le condizioni sono soddisfatte
    CaroselloVideoUtility.provaAvvioInizialeTrailer(this); // delego l'avvio iniziale trailer alla utility passando il componente come contesto
  }

/**
 * Calcola l'indice reale 0-based della slide corrente ignorando eventuali cloni.
 *
 * @returns Indice reale 0-based della slide corrente.
 */
  private getIndiceRealeZeroBased(): number {
    return CaroselloGettersUtility.getIndiceRealeZeroBased(this); // delego il calcolo dell'indice reale alla utility passando il componente come contesto
  }

  /**
 * Restituisce il titolo della slide precedente rispetto a quella corrente.
 *
 * @returns Titolo della slide precedente.
 */
  getPrevTitolo(): string {
    return CaroselloGettersUtility.getPrevTitolo(this); // delego il calcolo del titolo precedente alla utility passando il componente come contesto
  }

/**
 * Restituisce il titolo della slide successiva rispetto a quella corrente.
 *
 * @returns Titolo della slide successiva.
 */
  getNextTitolo(): string {
    // Recupero il titolo della slide successiva (rispetto alla corrente)
    return CaroselloGettersUtility.getNextTitolo(this); // delego il calcolo del titolo successivo alla utility passando il componente come contesto
  }

/**
 * Restituisce il titolo della slide corrente.
 *
 * @returns Titolo della slide corrente.
 */
  getTitoloCorrente(): string {
    return CaroselloGettersUtility.getTitoloCorrente(this); // delego il calcolo del titolo corrente alla utility passando il componente come contesto
  }

  /**
 * Restituisce l'immagine titolo della slide corrente.
 *
 * @returns URL dell'immagine titolo della slide corrente.
 */
  getImgTitoloCorrente(): string {
    return CaroselloGettersUtility.getImgTitoloCorrente(this); // delego il calcolo dell'immagine titolo corrente alla utility passando il componente come contesto
  }

  /**
 * Restituisce il sottotitolo della slide corrente.
 *
 * @returns Sottotitolo della slide corrente.
 */
  getSottotitoloCorrente(): string {
    return CaroselloGettersUtility.getSottotitoloCorrente(this); // delego il calcolo del sottotitolo corrente alla utility passando il componente come contesto
  }

  /**
 * Aggiorna i contenuti dell'overlay in base a un indice del carosello (1-based).
 *
 * @param indiceCorrenteNuovo Indice 1-based del carosello.
 * @param conTransizione Se true applica transizione (fade/blackout/preload), altrimenti aggiorna subito.
 * @returns void
 */
  aggiornaOverlayPerIndiceCorrente(
    indiceCorrenteNuovo: number, // Ricevo l'indice del carosello nel formato interno 1-based
    conTransizione: boolean // Decido se applicare la transizione (fade/blackout/preload) oppure aggiornare subito
  ): void {
    // Espongo una funzione che calcola l'indice reale e delega l'impostazione dell'overlay
    CaroselloOverlayUtility.aggiornaOverlayPerIndiceCorrente(
      this,
      indiceCorrenteNuovo,
      conTransizione
    ); // delego tutta la logica overlay alla utility passando il componente come contesto
  }

  /**
 * Notifica che l'immagine titolo corrente e' stata caricata ed e' pronta.
 *
 * @returns void
 */
  segnalaTitoloCaricato(): void {
    CaroselloDatiUtility.segnalaTitoloCaricato(this); // delego la gestione della readiness titolo alla utility passando il componente come contesto
  }

/**
 * Notifica che uno sfondo del carosello e' stato caricato.
 *
 * @param indice Indice dello sfondo caricato.
 * @returns void
 */
  segnalaSfondoCaricato(indice: number): void {
    // Notifico che lo sfondo a un certo indice e' stato caricato
    CaroselloDatiUtility.segnalaSfondoCaricato(this, indice); // delego la gestione della readiness sfondi alla utility passando il componente come contesto
  }

/**
 * Avvia un cambio slide assicurando fade-out audio e stop video prima dell'azione di scorrimento.
 *
 * @param azioneScorrimento Funzione che esegue lo scorrimento effettivo (avanti/indietro/selezione).
 * @returns void
 */
  avviaCambioSlideConFade(azioneScorrimento: () => void): void {
    // Avvio un cambio slide assicurandomi di fare fade-out audio e stop video
    CaroselloScrollStateUtility.avviaCambioSlideConFade(
      this,
      azioneScorrimento
    ); // delego fade+stop e cambio slide alla utility passando il componente come contesto
  }

/**
 * Pianifica l'avvio del trailer della slide corrente dopo un ritardo.
 *
 * @param ms Ritardo in millisecondi prima dell'avvio del trailer.
 * @returns void
 */
  avviaTrailerCorrenteDopo(ms: number): void {
    // Pianifico l'avvio del trailer della slide corrente dopo un certo ritardo
    CaroselloVideoUtility.avviaTrailerCorrenteDopo(this, ms); // delego l'orchestrazione trailer/player alla utility passando il componente come contesto
  }

/**
 * Collega la gestione dell'evento di fine trailer del player.
 *
 * @returns void
 */
  collegaFineTrailer(): void {
    CaroselloPlayerUtility.collegaFineTrailer(this); // delego la gestione evento ended alla utility passando il componente come contesto
  }

/**
 * Riavvia il trailer corrente dopo un cambio lingua, gestendo stop e ripartenza.
 *
 * @returns void
 */
  riavviaTrailerCorrenteDopoCambioLingua(): void {
    CaroselloVideoUtility.riavviaTrailerCorrenteDopoCambioLingua(this); // delego la logica di riavvio trailer post-lingua alla utility passando il componente come contesto
  }

/**
 * Prova ad avviare la riproduzione con audio se le policy del browser lo consentono.
 *
 * @returns void
 */
  tentaAutoplayConAudio(): void {
    CaroselloVideoUtility.tentaAutoplayConAudio(this); // delego la strategia autoplay audio alla utility passando il componente come contesto
  }

  /**
 * Avvia la riproduzione in muto e, se richiesto, prepara lo sblocco audio su interazione utente.
 *
 * @param consentiSblocco Se true prepara la logica di sblocco audio su interazione.
 * @returns void
 */
  avviaMutatoConOpzioneSblocco(consentiSblocco: boolean): void {
    CaroselloAudioUtility.avviaMutatoConOpzioneSblocco(this, consentiSblocco); // delego la strategia mutata + sblocco alla utility passando il componente come contesto
  }

/**
 * Prepara un listener per tentare lo sblocco dell'audio alla prima interazione utente utile.
 *
 * @returns void
 */
  preparaSbloccoAudioSuInterazione(): void {
    CaroselloAudioUtility.preparaSbloccoAudioSuInterazione(this); // delego la preparazione sblocco audio alla utility passando il componente come contesto
  }

/**
 * Rimuove eventuali listener registrati per lo sblocco audio su interazione.
 *
 * @returns void
 */
  rimuoviAscoltoSbloccoAudio(): void {
    CaroselloAudioUtility.rimuoviAscoltoSbloccoAudio(this); // delego la rimozione listener sblocco audio alla utility passando il componente come contesto
  }

/**
 * Inizializza la catena WebAudio sul video reale del player per controllare il volume via GainNode.
 *
 * @returns void
 */
  inizializzaWebAudioSuVideoReale(): void {
    CaroselloAudioUtility.inizializzaWebAudioSuVideoReale(this); // delego l'inizializzazione WebAudio alla utility passando il componente come contesto
  }

/**
 * Restituisce l'elemento video reale contenuto nel player.
 *
 * @returns Elemento video reale (o null/undefined a seconda dello stato del player).
 */
  ottieniElementoVideoReale(): any {
    return CaroselloAudioUtility.ottieniElementoVideoRealePubblico(this); // delego la ricerca del video reale alla utility passando il componente come contesto
  }

  /**
 * Collega l'elemento video reale al WebAudio (MediaElementSource + GainNode).
 *
 * @param elVideo Elemento video reale da collegare.
 * @returns void
 */
  collegaWebAudioAlVideo(elVideo: any): void {
    CaroselloAudioUtility.collegaWebAudioAlVideoPubblico(this, elVideo); // delego il collegamento WebAudio al video alla utility passando il componente come contesto
  }

/**
 * Verifica se il player ha sostituito il tag video e, se necessario, ricollega WebAudio.
 *
 * @returns void
 */
  verificaRicollegamentoVideo(): void {
    CaroselloAudioUtility.verificaRicollegamentoVideo(this); // delego la verifica/ricollegamento WebAudio alla utility passando il componente come contesto
  }

/**
 * Sfuma il guadagno WebAudio verso un valore target.
 *
 * @param target Valore target del guadagno.
 * @param durataMs Durata della sfumatura in millisecondi.
 * @returns Promise risolta al termine della sfumatura.
 */
  sfumaGuadagnoVerso(target: number, durataMs: number): Promise<void> {
    return CaroselloAudioUtility.sfumaGuadagnoVerso(this, target, durataMs); // delego la sfumatura audio alla utility passando il componente come contesto
  }

 /**
 * Applica attributi necessari direttamente sul tag video reale del player.
 *
 * @returns void
 */
  applicaAttributiVideoReale(): void {
    CaroselloAudioUtility.applicaAttributiVideoReale(this); // delego l'applicazione attributi al video reale alla utility passando il componente come contesto
  }

/**
 * Imposta il mute sul video reale del player.
 *
 * @param mute Se true abilita il mute, altrimenti lo disabilita.
 * @returns void
 */
  impostaMuteReale(mute: boolean): void {
    // Imposto il mute sul tag video
    CaroselloAudioUtility.impostaMuteReale(this, mute); // delego l'impostazione del mute reale alla utility
  }

/**
 * Avanza alla slide successiva quando il trailer termina, senza riavviare l'autoscroll.
 *
 * @returns void
 */
  vaiAvantiDaFineTrailer(): void {
    // Avanzo alla slide successiva quando il trailer termina (senza riavviare autoscroll)
    CaroselloScrollStateUtility.vaiAvantiDaFineTrailer(this); // delego la logica di avanzamento da fine trailer alla utility
  }

/**
 * Inizializza il player video quando il riferimento DOM e le condizioni necessarie sono disponibili.
 *
 * @returns void
 */
  inizializzaPlayerSePronto(): void {
    // Inizializzo video.js quando il ViewChild del riproduttore e' disponibile
    CaroselloPlayerUtility.inizializzaPlayerSePronto(this); // delego l'inizializzazione del player alla utility
  }

/**
 * Verifica se sono ancora presenti coperture/overlay visibili sopra la pagina.
 *
 * @returns true se esistono ancora coperture visibili, false altrimenti.
 */
  private copertureAncoraVisibili(): boolean {
    return CaroselloCopertureUtility.copertureAncoraVisibili(); // delego il controllo coperture alla utility
  }

/**
 * Attende che le coperture non siano piu' visibili oppure che scada un timeout.
 *
 * @param timeoutMs Tempo massimo di attesa in millisecondi.
 * @returns Promise risolta quando le coperture spariscono o al timeout.
 */
  private attendiCopertureNonVisibili(timeoutMs: number = 8000): Promise<void> {
    return CaroselloCopertureUtility.attendiCopertureNonVisibili(timeoutMs); // delego l'attesa coperture alla utility
  }

  /**
 * Avvia o ripianifica l'autoscroll quando le condizioni lo consentono.
 *
 * @returns void
 */
  private avviaAutoscroll(): void {
    CaroselloScrollStateUtility.avviaAutoscroll(this); // delego la gestione autoscroll alla utility passando il componente come contesto
  }

 /**
 * Ferma e pulisce il timer dell'autoscroll.
 *
 * @returns void
 */
  private fermaAutoscroll(): void {
    CaroselloScrollStateUtility.fermaAutoscroll(this); // delego lo stop autoscroll alla utility passando il componente come contesto
  }

/**
 * Legge da localStorage l'indice reale 0-based dell'ultima slide vista.
 *
 * @returns Indice reale 0-based salvato, oppure null se non presente/valido.
 */
  leggiIndiceRealeDaStorage(): number | null {
    return CaroselloScrollStateUtility.leggiIndiceRealeDaStorage(this); // delego la lettura storage alla utility passando il componente come contesto
  }

/**
 * Salva in localStorage l'indice reale 0-based della slide corrente.
 *
 * @param indiceReale Indice reale 0-based da salvare.
 * @returns void
 */
  salvaIndiceRealeInStorage(indiceReale: number): void {
    CaroselloScrollStateUtility.salvaIndiceRealeInStorage(this, indiceReale); // delego la scrittura storage alla utility passando il componente come contesto
  }

  /**
 * Attende un singolo evento del player con timeout.
 *
 * @param evento Nome dell'evento del player da attendere.
 * @param timeoutMs Tempo massimo di attesa in millisecondi.
 * @returns Promise che risolve a true se l'evento arriva entro il timeout, false altrimenti.
 */
  private attendiEventoPlayer(
    evento: string,
    timeoutMs: number
  ): Promise<boolean> {
    return CaroselloPlayerUtility.attendiEventoPlayer(this, evento, timeoutMs); // delego l'attesa evento player alla utility passando il componente come contesto
  }


/**
 * Pianifica un controllo per gestire stallo/waiting/error e tentare un recupero soft.
 *
 * @param token Token della sequenza corrente per invalidare controlli obsoleti.
 * @returns void
 */
  private pianificaControlloStallo(token: number): void {
    CaroselloPlayerUtility.pianificaControlloStallo(this, token); // delego la gestione stallo/riprova alla utility passando il componente come contesto
  }

/**
 * Riprova ad avviare il trailer corrente in caso di stallo/errore, rispettando token e limiti.
 *
 * @param token Token della sequenza corrente per invalidare retry obsoleti.
 * @returns void
 */
  private riprovaTrailerCorrente(token: number): void {
    CaroselloVideoUtility.riprovaTrailerCorrente(this, token); // delego la logica di retry trailer alla utility passando il componente come contesto
  }


 preparaTrailerHoverDopoImmaginePronta(): void {


  const token = ++this.tokenHoverTrailer;
 console.log('[HOVER] preparaTrailerHover START', {
 token,
 player: !!this.player,
 immagineHoverPronta: this.immagineHoverPronta,
 mostraImmagineHover: this.mostraImmagineHover,
 pausaPerHover: this.pausaPerHover
 });

 if (this.timerMostraTrailerHover) clearTimeout(this.timerMostraTrailerHover);
 this.timerMostraTrailerHover = null;

  if (!this.player) {
 this.hoverTrailerInAttesa = true;
 console.log('[HOVER] player non pronto, metto in attesa', { token });
 return;
 }


 this.hoverTrailerInAttesa = false;



 if (!this.pausaPerHover || !this.mostraImmagineHover || !this.immagineHoverPronta) {
 console.log('[HOVER] condizioni non valide, stop', { token });
 return;
 }


 const onCanPlay = () => {
 if (token !== this.tokenHoverTrailer) return;
  console.log('[HOVER] canplay', { token });
 const passati = Date.now() - this.inizioImmagineHoverMs;
 const restante = Math.max(0, this.MIN_MS_IMMAGINE_HOVER - passati);

 this.timerMostraTrailerHover = setTimeout(() => {
 if (token !== this.tokenHoverTrailer) return;
 if (!this.mostraImmagineHover || !this.immagineHoverPronta) return;
console.log('[HOVER] show+play', { token });
  // 1) mostro e faccio partire il trailer SUBITO (cosi sotto la cover c'e' gia' il video)
 this.mostraVideo = true;
this.verificaRicollegamentoVideo();

// IMPORTANTISSIMO: preparo WebAudio e provo a "resumare" il contesto PRIMA del play,
// altrimenti il video parte ma il gain resta a 0 (se era stato fade-out) e senti sempre silenzio.
this.inizializzaWebAudioSuVideoReale();

try {
  if (this.contestoAudio && this.contestoAudio.state === 'suspended') {
    this.contestoAudio.resume().catch(() => {});
  }
} catch {}

try {
  if (this.nodoGuadagno && this.contestoAudio) {
    const t0 = this.contestoAudio.currentTime;
    this.nodoGuadagno.gain.cancelScheduledValues(t0);
    this.nodoGuadagno.gain.setValueAtTime(0, t0);
  }
} catch {}

this.impostaMuteReale(false); // PROVO SEMPRE con audio durante hover
try { this.player.currentTime(0); } catch {}

const preparaSbloccoHover = () => {
  const onClick = () => {
    window.removeEventListener('click', onClick, true);
    if (token !== this.tokenHoverTrailer) return;
    if (!this.pausaPerHover || !this.mostraVideo) return;

    this.audioConsentito = true;

    try {
      if (this.contestoAudio && this.contestoAudio.state === 'suspended') {
        this.contestoAudio.resume().catch(() => {});
      }
    } catch {}

    this.impostaMuteReale(false);
    this.sfumaGuadagnoVerso(1, this.durataFadeAudioMs);
  };

  window.addEventListener('click', onClick, { once: true, passive: true, capture: true });
};

try {
  const p = this.player.play();

  if (p && typeof p.then === 'function') {
    p.then(() => {
      // Se davvero sta suonando non mutato, segno audioConsentito e faccio fade-in
      try {
        const el = this.ottieniElementoVideoReale();
        if (el && !el.muted) this.audioConsentito = true;
      } catch {}

      this.sfumaGuadagnoVerso(1, this.durataFadeAudioMs);
    }).catch(() => {
      console.log('[HOVER] play con audio bloccato, fallback mutato', { token });
      this.impostaMuteReale(true);
      try { this.player.play(); } catch {}
      this.sfumaGuadagnoVerso(0, this.durataFadeAudioMs);

      // Se l'audio e' bloccato, parto mutato e preparo lo sblocco con click (SENZA restart)
      preparaSbloccoHover();
    });
  } else {
    // Caso senza Promise: assumo partenza e faccio fade-in
    this.audioConsentito = true;
    this.sfumaGuadagnoVerso(1, this.durataFadeAudioMs);
  }
} catch {
  console.log('[HOVER] eccezione play, fallback mutato', { token });
  this.impostaMuteReale(true);
  try { this.player.play(); } catch {}
  this.sfumaGuadagnoVerso(0, this.durataFadeAudioMs);

  preparaSbloccoHover();
}

 // 2) avvio il fade-out della cover nel frame successivo (evita di intravedere il carosello)
requestAnimationFrame(() => {
if (token !== this.tokenHoverTrailer) return;


setTimeout(() => {
if (token !== this.tokenHoverTrailer) return;
this.mostraImmagineHover = false;
console.log('[HOVER] hide cover', { token });
}, 200);
});
}, restante);
 };

 const avviaNuovoSrc = () => {
 if (token !== this.tokenHoverTrailer) return;

 try { this.player.off('canplay'); } catch {}
 try { this.player.one('canplay', onCanPlay); } catch {}

 try {
 console.log('[HOVER] set src/load', { token, url: this.trailerHoverProvvisorio });
this.verificaRicollegamentoVideo();
this.applicaAttributiVideoReale(); // mette crossorigin="anonymous" sul <video> reale


this.player.src({ src: this.trailerHoverProvvisorio, type: 'video/mp4' });
this.player.load?.();


// importantissimo: dopo src/load Video.js puo' rimpiazzare il <video>, quindi riallineo
this.verificaRicollegamentoVideo();
this.applicaAttributiVideoReale();
 } catch {
 console.log('[HOVER] src/load falliti', { token });
 return;
 }

 // Se canplay e' gia' passato (cache), non aspetto l'evento
 try {
 const rs = typeof this.player.readyState === 'function' ? this.player.readyState() : 0;
 console.log('[HOVER] readyState', { token, rs });
 if (rs >= 3) setTimeout(() => onCanPlay(), 0);
 } catch {}
 };

 // Fade-out GARANTITO prima di cambiare trailer (ripristina la transizione audio)
 console.log('[HOVER] fade-out prima di cambiare src', { token });
 this.sfumaGuadagnoVerso(0, this.durataFadeAudioMs).finally(() => {
 if (token !== this.tokenHoverTrailer) return;
 try { this.player.pause(); } catch {}
 try { this.player.currentTime(0); } catch {}
 avviaNuovoSrc();
 });



 }
}
