// Componente che funge da elemento principale del carosello novità, mantenendo lo stato centrale e delegando alle utility specializzate il comportamento di scorrimento, overlay, video, audio e reazioni a scroll, focus e cambio lingua.

import { Component, OnDestroy, OnInit, AfterViewInit, ViewChild, ElementRef, HostListener} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CaroselloAudioDebugUtility } from './carosello_utility/carosello-audio-debug.utility';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { CaroselloNovitaService } from './carosello_services/carosello-novita.service';
import { CaroselloHoverTrailerUtility } from './carosello_utility/carosello-hover-trailer.utility';
import { NovitaInfo } from 'src/app/_interfacce/Inovita-info.interface';
import { CaricamentoCaroselloService } from './carosello_services/caricamento-carosello.service';
import { Subscription } from 'rxjs';
import { StopVideoGlobaleService } from '../riga-categoria/categoria_services/stop-video-globale.service';
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
import { HoverLocandinaService } from '../riga-categoria/categoria_services/hover-locandina.service';
import { AudioGlobaleService } from 'src/app/_servizi_globali/audio-globale.service';
import { CaroselloStopUtility } from './carosello_utility/carosello-stop.utility';
import { CaroselloNavigazioneUtility } from './carosello_utility/carosello-navigazione.utility';
import { Router } from '@angular/router';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { BarraAvanzamentoService } from 'src/app/_componenti_comuni/barra-avanzamento/barra-avanzamento.service';
@Component({
  selector: 'app-carosello-novita',
  templateUrl: './carosello-novita.component.html',
  styleUrls: ['./carosello-novita.component.scss'],
})
export class CaroselloNovitaComponent
  implements OnInit, OnDestroy, AfterViewInit
{
 pausaPerHover = false; // flag che mi dice se il carosello e' momentaneamente in pausa a causa di un hover esterno
hoverLocandinaAttivo = false; // flag che mi dice se in questo momento c'e' una locandina esterna in hover attivo
audioBloccatoDaUtente = false; // flag che mi dice se l'utente ha scelto esplicitamente di bloccare l'audio
mostraImmagineHover = false; // flag che decide se devo mostrare l'immagine fissa legata all'hover invece del video
immagineHoverFissa =
  'assets/carosello_locandine/carosello_abbraccia_il_vento.webp'; // tengo l'URL dell'immagine hover fissa da mostrare come copertura
chiaveHoverImg = 0; // chiave numerica per forzare il refresh dell'immagine hover quando cambia
immagineHoverPronta = true; // flag che mi dice se l'immagine hover e' gia' pronta da mostrare
tokenHoverImg = 0; // uso un token incrementale per invalidare caricamenti vecchi dell'immagine hover

trailerHoverProvvisorio =
  'https://d2kd3i5q9rl184.cloudfront.net/mp4-trailer-it/trailer_ita_cavalli_contro_circuiti.mp4'; // tengo un URL provvisorio del trailer hover da usare come fallback o valore iniziale
MIN_MS_IMMAGINE_HOVER = 200; // imposto il tempo minimo in ms per cui l'immagine hover deve restare visibile prima del trailer
inizioImmagineHoverMs = 0; // salvo il timestamp di inizio visualizzazione dell'immagine hover
tokenHoverTrailer = 0; // uso un token incrementale per invalidare avvii vecchi del trailer hover
timerMostraTrailerHover: any = null; // tengo il riferimento al timer che ritarda la partenza del trailer hover
hoverTrailerInAttesa = false; // flag che mi dice se il trailer hover e' stato richiesto ma sta ancora aspettando di partire
stopDolceInCorso = false; // flag che mi dice se e' attualmente in corso uno stop dolce con fade di audio e video
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



  titoloOverlay = ''; // il titolo attualmente mostrato nell'overlay
  imgTitoloOverlay = ''; // l'immagine titolo attualmente mostrata nell'overlay
  sottotitoloOverlay = ''; // il sottotitolo attualmente mostrato nell'overlay
  titoloHoverFisso = 'cavalli contro circuiti';
  imgTitoloHoverFisso =
  'https://www.sciencecodex.net/assets/titoli_en/titolo_en_cavalli_contro_circuiti.webp'; // tengo l'URL dell'immagine titolo da mostrare durante l'hover fisso
sottotitoloHoverFisso = 'sottotitolo di prova'; // tengo il sottotitolo da mostrare durante l'hover fisso

descrizioneHoverFissa = ''; // tengo la descrizione semantica associata all'hover fisso per ricostruire gli asset corretti



titoloVisibile = true; // flag che mi dice se il titolo overlay deve essere visibile
sottotitoloVisibile = true; // flag che mi dice se il sottotitolo overlay deve essere visibile
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
  RITARDO_MOSTRA_PLAYER_MS = 350; // Definisco il ritardo prima di mostrare/avviare il player

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
  private servizioHoverLocandina: HoverLocandinaService,
  public barraAvanzamentoService: BarraAvanzamentoService,
  private audioGlobaleService: AudioGlobaleService,
  private stopVideoGlobale: StopVideoGlobaleService,
  private router: Router,
  private api: ApiService,
) {}


/**
 * Metodo eseguito all'inizializzazione del componente.
 * - Ripulisce subito eventuali stati hover rimasti aperti
 * - Avvia il caricamento dati iniziali del carosello
 * - Si sottoscrive allo stato audio globale per gestire mute, fade e riavvii
 * - Si sottoscrive all'hover delle locandine esterne per mostrare cover, overlay e trailer dedicati
 *
  * @link https://docs.videojs.com/
 *
 * @returns void
 */
ngOnInit(): void {
  try { this.servizioHoverLocandina.emettiUscita(); } catch {} // provo a forzare l'uscita da eventuali hover locandina rimasti attivi
  this.pausaPerHover = false; // resetto lo stato di pausa dovuto a hover esterno
  this.hoverLocandinaAttivo = false; // resetto il flag che indica hover locandina attivo
  this.mostraImmagineHover = false; // mi assicuro di non mostrare l'immagine hover all'avvio
  this.hoverTrailerInAttesa = false; // resetto il flag del trailer hover eventualmente in attesa
  this.caricaDati(); // avvio il caricamento dati iniziali del carosello

  this.subs.add(
    this.audioGlobaleService.statoAudio$.subscribe((consentito) => {
      // mi sottoscrivo allo stato audio globale per reagire quando l'utente attiva o disattiva l'audio
      const eraBloccatoDaUtente = !!this.audioBloccatoDaUtente; // mi salvo se prima l'audio era bloccato esplicitamente dall'utente

      this.audioBloccatoDaUtente = !consentito; // aggiorno il flag locale invertendo il valore di consenso ricevuto
      const audioAppenaRiattivato =
        eraBloccatoDaUtente && !this.audioBloccatoDaUtente; // capisco se l'utente ha appena riattivato l'audio rispetto allo stato precedente

      if (this.audioBloccatoDaUtente) {
        // entro qui se l'utente ha scelto esplicitamente di avere l'audio disattivato
        this.audioConsentito = false; // segno che l'audio non e' consentito in questo momento

        try {
          this.rimuoviAscoltoSbloccoAudio();
        } catch {} // provo a rimuovere eventuali listener di sblocco audio senza rompere il flusso

        try {
          this.inizializzaWebAudioSuVideoReale();
        } catch {} // provo ad assicurarmi che WebAudio sia collegato al video cosi' il fade funzioni davvero

        this.sfumaGuadagnoVerso(0, this.durataFadeAudioMs).finally(() => {
          // faccio prima un fade-out dell'audio e solo dopo applico il mute reale
          try {
            this.impostaMuteReale(true);
          } catch {} // provo a mettere in mute il video reale senza generare errori bloccanti
        });

        return; // mi fermo qui perche' quando l'audio e' bloccato dall'utente non devo fare altro in questa emissione
      }

      try {
        this.inizializzaWebAudioSuVideoReale();
      } catch {} // provo ad assicurarmi che il video reale sia collegato a WebAudio

      try {
        if (this.contestoAudio && this.contestoAudio.state === 'suspended') {
          this.contestoAudio.resume().catch(() => {});
        }
      } catch {} // se il contesto audio e' sospeso provo a riattivarlo

      if (audioAppenaRiattivato) {
        // entro qui se l'utente ha appena riattivato l'audio dal controllo globale
        const sonoInHover = !!this.pausaPerHover; // verifico se in questo momento il carosello e' in pausa per hover
        let trailerInCorso = false; // preparo un flag che dira' se c'e' gia' un trailer in riproduzione

        try {
          trailerInCorso =
            !!this.player &&
            typeof this.player.paused === 'function' &&
            !this.player.paused();
        } catch {} // provo a capire se il player sta riproducendo un trailer in questo momento

        if (sonoInHover || trailerInCorso) {
          // se sono in hover oppure c'e' gia' un trailer in corso faccio un riavvio pulito con audio
          try {
            this.sfumaGuadagnoVerso(0, 0);
          } catch {} // porto subito il guadagno a zero per evitare qualunque piccolo colpo audio

          try {
            this.fermaAvvioPendete();
          } catch {} // provo a bloccare qualunque avvio trailer pendente

          if (sonoInHover) {
            // entro qui se sono nel caso di hover trailer
            try {
              this.mostraVideo = false;
            } catch {} // nascondo il player video per evitare nero durante il riavvio

            try {
              this.mostraImmagineHover = true;
            } catch {} // mostro l'immagine hover come copertura durante la ripartenza

            try {
              this.inizioImmagineHoverMs = Date.now();
            } catch {} // salvo il momento in cui l'immagine hover torna visibile
          } else {
            // entro qui se sono nel caso di trailer normale del carosello
            try {
              this.mostraVideo = false;
            } catch {} // nascondo il player per forzare una ripartenza pulita senza cover hover
          }

          this.sfumaGuadagnoVerso(0, this.durataFadeAudioMs).finally(() => {
            // faccio uno stop dolce dell'audio prima di riavviare il trailer con audio
            try {
              this.player?.pause?.();
            } catch {} // provo a mettere in pausa il player corrente

            try {
              this.player?.currentTime?.(0);
            } catch {} // provo a riportare il trailer all'inizio

            try {
              this.impostaMuteReale(false);
            } catch {} // tolgo il mute reale subito prima della ripartenza

            this.audioConsentito = true; // segno che adesso l'audio e' consentito

            if (sonoInHover) {
              // se sono in hover riavvio la logica del trailer hover
              try {
                this.preparaTrailerHoverDopoImmaginePronta();
              } catch {} // provo a preparare la ripartenza del trailer hover
            } else {
              // altrimenti riavvio subito il trailer corrente del carosello
              try {
                this.avviaTrailerCorrenteDopo(0);
              } catch {} // provo a far ripartire immediatamente il trailer corrente
            }
          });

          return; // mi fermo qui perche' il fade-in verra' gestito direttamente dalla ripartenza del trailer
        }
      }

      try {
        this.impostaMuteReale(false);
      } catch {} // nel caso normale posso togliere subito il mute reale

      this.audioConsentito = true; // segno che l'audio ora e' consentito

      this.sfumaGuadagnoVerso(1, this.durataFadeAudioMs); // se c'e' gia' un trailer in corso faccio rientrare gradualmente l'audio
    }),
  );

  this.subs.add(
    this.servizioHoverLocandina
      .osserva()
      .subscribe(
        ({
          attivo,  urlSfondo,
          urlTrailer,
          descrizione,
          titolo,
          sottotitolo,
        }) => {
          // mi sottoscrivo agli eventi di hover sulle locandine esterne per gestire cover, overlay e trailer dedicati
          this.hoverLocandinaAttivo = !!attivo; // aggiorno il flag che indica se una locandina esterna e' attiva in hover
          const eraAttivo = this.mostraImmagineHover; // mi salvo se prima stavo gia' mostrando l'immagine hover
          this.mostraImmagineHover = attivo; // allineo la visibilita' dell'immagine hover allo stato attivo ricevuto

          if (attivo) {
            // entro qui quando una locandina esterna entra in hover
            if (urlTrailer) {
              this.trailerHoverProvvisorio = urlTrailer;
            } // se mi arriva un trailer hover valido lo salvo subito come trailer provvisorio corrente

            if (urlSfondo) {
              // se mi arriva anche uno sfondo hover dedicato preparo il preload dell'immagine
              if (!eraAttivo) this.immagineHoverPronta = false; // se prima non ero attivo segno che la nuova immagine non e' ancora pronta
              this.chiaveHoverImg += 1; // incremento la chiave cosi' posso forzare il refresh dell'immagine nel template

              const token = ++this.tokenHoverImg; // genero un token nuovo per invalidare eventuali caricamenti immagine precedenti
              const nuovaUrl = urlSfondo; // mi salvo l'URL della nuova immagine hover
              const img = new Image(); // creo un oggetto Image per fare preload manuale

              img.onload = () => {
                // entro qui quando l'immagine hover si carica correttamente
                if (token !== this.tokenHoverImg) return; // se il token non coincide piu' ignoro questo caricamento vecchio
                this.immagineHoverFissa = nuovaUrl; // salvo la nuova immagine hover come immagine corrente
                this.immagineHoverPronta = true; // segno che l'immagine e' pronta da mostrare
                this.inizioImmagineHoverMs = Date.now(); // salvo il momento esatto in cui l'immagine diventa pronta

                if (
                  this.pausaPerHover &&
                  this.mostraImmagineHover &&
                  this.immagineHoverPronta
                ) {
                  this.preparaTrailerHoverDopoImmaginePronta();
                } // se sono ancora in hover e l'immagine e' pronta provo a preparare il trailer hover
              };

              img.onerror = () => {
                // entro qui se il preload dell'immagine fallisce ma voglio comunque continuare con l'URL previsto
                if (token !== this.tokenHoverImg) return; // se il token non coincide piu' ignoro questo risultato vecchio

                this.immagineHoverFissa = nuovaUrl; // salvo comunque l'URL come immagine hover corrente
                this.immagineHoverPronta = true; // considero comunque l'immagine pronta per non bloccare il flusso
                this.inizioImmagineHoverMs = Date.now(); // salvo il momento in cui considero pronta la cover hover

                if (
                  this.pausaPerHover &&
                  this.mostraImmagineHover &&
                  this.immagineHoverPronta
                ) {
                  this.preparaTrailerHoverDopoImmaginePronta();
                } // se sono ancora in hover e tutto e' coerente provo comunque a preparare il trailer hover
              };

              img.src = nuovaUrl; // faccio partire il preload assegnando l'URL dell'immagine
            }

            this.pausaPerHover = true; // segno che da ora il carosello e' in pausa per hover esterno

            if (descrizione) this.descrizioneHoverFissa = descrizione; // se mi arriva la descrizione semantica la salvo per ricostruire gli asset hover corretti

            this.titoloHoverFisso = String(
              titolo || this.titoloHoverFisso || '',
            ); // aggiorno il titolo hover usando quello ricevuto oppure mantenendo quello gia' presente
            this.sottotitoloHoverFisso = String(sottotitolo || ''); // aggiorno il sottotitolo hover usando quello ricevuto oppure stringa vuota

            if (this.descrizioneHoverFissa) {
              this.imgTitoloHoverFisso =
                CaroselloDatiUtility.urlTitoloDaDescrizione(
                  this.descrizioneHoverFissa,
                  this.linguaCorrenteTitoli(),
                );
            } // se ho una descrizione hover ricostruisco l'immagine titolo corretta in base alla lingua corrente

            CaroselloOverlayUtility.impostaOverlay(
              this,
              this.titoloHoverFisso,
              this.imgTitoloHoverFisso,
              this.sottotitoloHoverFisso,
              true,
            ); // aggiorno subito l'overlay del carosello con i contenuti dell'hover

            this.fermaAutoscroll(); // fermo l'autoscroll del carosello mentre l'hover esterno e' attivo
            this.fermaAvvioPendete(); // blocco eventuali avvii trailer pendenti
            this.numeroSequenzaAvvio++; // incremento la sequenza per invalidare eventuali avvii vecchi gia' in corso

            if (this.alTop && this.mostraVideo) {
              // se sono al top e il video e' visibile preparo la sua scomparsa poco dopo
              setTimeout(() => {
                if (this.pausaPerHover) this.mostraVideo = false;
              }, 200); // nascondo davvero il video solo se nel frattempo sono ancora in hover
            }

            this.sfumaGuadagnoVerso(0, this.durataFadeAudioMs).finally(() => {
              // faccio uno stop dolce del trailer corrente prima di passare a cover e trailer hover
              try {
                this.player.pause();
              } catch {} // provo a mettere in pausa il player corrente

              try {
                if (this.player && typeof this.player.readyState === 'function' && this.player.readyState() >= 1) {
                  this.player.currentTime(0);
                }
              } catch {} // se il player e' pronto provo a riportare il trailer all'inizio

              if (this.mostraImmagineHover && this.immagineHoverPronta) {
                this.preparaTrailerHoverDopoImmaginePronta();
              } // se la cover hover e' pronta provo ad avviare la logica del trailer hover
            });
          } else {
            // entro qui quando l'hover sulla locandina esterna termina
            this.pausaPerHover = false; // tolgo lo stato di pausa per hover

            this.aggiornaOverlayPerIndiceCorrente(this.indiceCorrente, true); // ripristino l'overlay normale della slide corrente

            this.tokenHoverImg += 1; // invalido eventuali caricamenti immagine hover ancora pendenti

            this.tokenHoverTrailer += 1; // invalido eventuali avvii trailer hover ancora pendenti
            if (this.timerMostraTrailerHover)
              clearTimeout(this.timerMostraTrailerHover); // se esiste un timer del trailer hover lo cancello
            this.timerMostraTrailerHover = null; // azzero il riferimento al timer trailer hover
            this.mostraVideo = false; // nascondo il player video durante lo stop dolce di uscita hover
            this.stopDolceInCorso = true; // segno che e' in corso uno stop dolce

            this.sfumaGuadagnoVerso(0, this.durataFadeAudioMs).finally(() => {
              // faccio sempre uno stop dolce del trailer hover in uscita
              try {
                this.player.pause();
              } catch {} // provo a mettere in pausa il player corrente

              try {
                if (this.player && typeof this.player.readyState === 'function' && this.player.readyState() >= 1) {
                  this.player.currentTime(0);
                }
              } catch {} // se il player e' pronto provo a riportare il trailer all'inizio

              if (
                this.alTop &&
                !this.pausaPerScroll &&
                !this.pausaPerBlur &&
                !this.pausaPerHover
              ) {
                this.avviaTrailerCorrenteDopo(this.RITARDO_MOSTRA_PLAYER_MS);
              } // se sono ancora nelle condizioni normali faccio ripartire il trailer corrente del carosello

              if (!this.alTop && !this.pausaPerBlur && !this.pausaPerHover) {
                this.avviaAutoscroll();
              } // se non sono al top ma posso farlo riattivo l'autoscroll

              this.stopDolceInCorso = false; // segno che lo stop dolce e' terminato
            });
          }
        },
      ),
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
          this.durataFadeAudioMs,
        ).finally(() => {
          // Faccio fade-out audio e poi stoppo il player se il token e' ancora valido
          if (token !== this.idCambioLinguaVideo) return; // Esco se nel frattempo e' partito un altro cambio lingua
          try {
            this.player.pause();
          } catch {} // Provo a mettere in pausa senza rompere se il player non e' pronto
         try {
  if (this.player && typeof this.player.readyState === 'function' && this.player.readyState() >= 1) {
    this.player.currentTime(0);
  }
} catch {}
        });
      }),
    );

    this.subs.add(
      // Registro anche questa subscription per gestirne la cleanup
      this.cambioLinguaService.cambioLinguaApplicata$.subscribe(
        // Reagisco a lingua applicata con la nuova mappa contenuti
        ({ mappaNovita }) => {
          // Estraggo la mappa delle novita dal payload
          this.titoliAlt = this.descrizioni.map(
            // Ricostruisco i titoli alt in base alle descrizioni correnti
            (d) => mappaNovita[d]?.titolo || '', // Prendo il titolo dalla mappa o fallback a stringa vuota
          );
          this.imgTitolo = this.descrizioni.map(
            // Ricostruisco le immagini titolo in base alle descrizioni correnti
            (d) => mappaNovita[d]?.img_titolo || '', // Prendo l'immagine titolo dalla mappa o fallback a stringa vuota
          );
          this.sottotitoli = this.descrizioni.map(
            // Ricostruisco i sottotitoli in base alle descrizioni correnti
            (d) => mappaNovita[d]?.sottotitolo || '', // Prendo il sottotitolo dalla mappa o fallback a stringa vuota
          );

          this.mappaNovitaCorrente = mappaNovita; // Salvo la mappa corrente per overlay e lookup successivi
          this.trailers = this.descrizioni.map(
            (d) => mappaNovita[d]?.trailer || '',
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
        },
      ),
    );
    this.subs.add(
      this.stopVideoGlobale.osservaRichiesteStop$().subscribe(({ durataMs, done }) => {
        // mi sottoscrivo alle richieste globali di stop dolce complete che arrivano prima di una navigazione
        this.stopDolceImmediato(durataMs).finally(() => done()); // eseguo lo stop dolce completo con la durata richiesta e alla fine notifico che ho concluso
      }),
    );

    this.subs.add(
      this.stopVideoGlobale.osservaRichiesteFadeAudio$().subscribe(({ durataMs, done }) => {
        // mi sottoscrivo alle richieste che chiedono solo il fade-out dell'audio lasciando il video visibile fino al cambio pagina
        this.fermaAvvioPendete(); // blocco eventuali avvii trailer ancora pendenti per evitare ripartenze durante il fade audio
        this.sfumaGuadagnoVerso(0, durataMs).finally(() => done()); // porto gradualmente l'audio a zero con la durata richiesta e poi notifico che ho finito
      }),
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
 * Restituisce la lingua corrente da usare per titoli e asset del carosello.
 * - Prova a leggere la lingua attuale dal servizio di traduzione
 * - Se qualcosa va storto usa italiano come fallback
 *
 * @returns string Codice lingua corrente per i titoli.
 */
linguaCorrenteTitoli(): string {
  try {
    return this.translate.currentLang || 'it'; // restituisco la lingua corrente del servizio di traduzione oppure it come fallback
  } catch {
    return 'it'; // se la lettura fallisce restituisco it come valore sicuro di default
  }
}
  /**
 * Metodo eseguito alla distruzione del componente.
 * - Ferma avvii trailer e autoscroll pendenti
 * - Invalida token e timer legati all'hover
 * - Ripulisce gli stati hover ancora attivi
 * - Notifica l'uscita da eventuali hover locandina esterni
 *
 * @returns void
 */
ngOnDestroy(): void {
  this.fermaAvvioPendete(); // fermo eventuali avvii trailer ancora pendenti prima della distruzione del componente
  this.fermaAutoscroll(); // fermo l'autoscroll e pulisco il relativo timer
  this.tokenHoverTrailer += 1; // incremento il token del trailer hover per invalidare eventuali avvii vecchi ancora in corso
  this.tokenHoverImg += 1; // incremento il token dell'immagine hover per invalidare eventuali caricamenti vecchi ancora in corso
  if (this.timerMostraTrailerHover) clearTimeout(this.timerMostraTrailerHover); // se esiste un timer del trailer hover lo cancello subito
  this.timerMostraTrailerHover = null; // azzero il riferimento al timer del trailer hover
  this.pausaPerHover = false; // resetto lo stato di pausa dovuto all'hover
  this.hoverLocandinaAttivo = false; // resetto il flag che indica un hover locandina attivo
  this.mostraImmagineHover = false; // mi assicuro di non mostrare piu' l'immagine hover
  this.hoverTrailerInAttesa = false; // resetto il flag che indica un trailer hover ancora in attesa di partire
  try { this.servizioHoverLocandina.emettiUscita(); } catch {} // provo a notificare l'uscita da eventuali hover esterni ancora attivi
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
  this.barraAvanzamentoService.scollegaAggiornamentoBarra(this.player);
} catch {}

try {
  if (this.player) this.player.dispose();
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
    conTransizione: boolean, // Decido se applicare la transizione (fade/blackout/preload) oppure aggiornare subito
  ): void {
    // Espongo una funzione che calcola l'indice reale e delega l'impostazione dell'overlay
    CaroselloOverlayUtility.aggiornaOverlayPerIndiceCorrente(
      this,
      indiceCorrenteNuovo,
      conTransizione,
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
      azioneScorrimento,
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
  CaroselloPlayerUtility.inizializzaPlayerSePronto(this);

  if (this.player && this.playerInizializzato) {
    this.barraAvanzamentoService.collegaAggiornamentoBarra(
      this.player,
      () => this.ottieniElementoVideoReale(),
    );
  }
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
    timeoutMs: number,
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
 /**
 * Prepara l'avvio del trailer hover solo dopo che l'immagine hover risulta pronta.
 *
 * @returns void
 */
preparaTrailerHoverDopoImmaginePronta(): void {
  CaroselloHoverTrailerUtility.preparaTrailerHoverDopoImmaginePronta(this); // delego alla utility la logica che aspetta l'immagine hover pronta prima di avviare il trailer
}

/**
 * Intercetta e analizza il tipo di blocco audio rilevato nel contesto attuale.
 *
 * @returns void
 */
intercetta_tipo_blocco_audio(): void {
  CaroselloAudioDebugUtility.intercettaTipoBloccoAudio(this); // delego alla utility di debug la rilevazione del tipo di blocco audio presente
}

/**
 * Esegue uno stop dolce immediato del player con la durata richiesta.
 *
 * @param durataMs number Durata del fade e dello stop in millisecondi.
 * @returns Promise<void> Promise risolta quando lo stop dolce e' terminato.
 */
stopDolceImmediato(durataMs: number): Promise<void> {
  return CaroselloStopUtility.stopDolceImmediato(this, durataMs); // delego alla utility la logica completa di stop dolce immediato
}

/**
 * Avvia la navigazione verso la scheda relativa al contenuto attualmente corrente nel carosello.
 *
 * @returns Promise<void> Promise risolta quando la navigazione richiesta e' stata completata.
 */
vaiAllaSchedaCorrente(): Promise<void> {
  return CaroselloNavigazioneUtility.vaiAllaSchedaCorrente(this); // delego alla utility la navigazione verso la scheda del contenuto corrente
}
}
