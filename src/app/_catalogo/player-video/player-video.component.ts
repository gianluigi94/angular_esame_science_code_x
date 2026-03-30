// Componente orchestratore del player che inizializza i vari helper, collega gli eventi e delega tutta la logica specifica a service, helper e utility dedicati.

import { AfterViewInit, Component, OnDestroy, ViewEncapsulation, Input, OnChanges, SimpleChanges, ViewChild, ElementRef} from '@angular/core';
import videojs from 'video.js';
import 'videojs-hotkeys';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { SchedaProntaService } from '../scheda/scheda_service/scheda-pronta.service';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { BarraAvanzamentoService } from 'src/app/_componenti_comuni/barra-avanzamento/barra-avanzamento.service';

import { PlayerStateContext } from './player_utility/player-state.context';
import { PlayerAudioService } from './player_service/player-audio.service';
import { PlayerStartupHelper } from './player_helpers/player-startup.helper';
import { PlayerAdBreakHelper } from './player_helpers/player-ad-break.helper';
import { PlayerQualityMenuHelper } from './player_helpers/player-quality-menu.helper';
import { PlayerMobileControlsHelper } from './player_helpers/player-mobile-controls.helper';
import { PlayerSubtitlesHelper } from './player_helpers/player-subtitles.helper';
import { PlayerUiHelper } from './player_helpers/player-ui.helper';

@Component({
  selector: 'app-player-video',
  templateUrl: './player-video.component.html',
  styleUrls: ['./player-video.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [PlayerAudioService],
})
export class PlayerVideoComponent
  implements AfterViewInit, OnDestroy, OnChanges
{
  @Input() sottotitoli: { en: string; it: string } | null = null; // sottotitoli correnti in inglese e italiano
  @Input() infoEpisodio: { stagione: number; episodio: number } | null = null; // info correnti di stagione ed episodio
  @Input() risorse: {
    auto: string;
    '1080': string;
    '720': string;
    '360': string;
  } | null = {
    auto: 'https://d2kd3i5q9rl184.cloudfront.net/streaming/film/buchi_neri_e_altre_creature_dello_spazio/master.m3u8',
    '1080':
      'https://d2kd3i5q9rl184.cloudfront.net/streaming/film/buchi_neri_e_altre_creature_dello_spazio/1080/with-audio.m3u8',
    '720':
      'https://d2kd3i5q9rl184.cloudfront.net/streaming/film/buchi_neri_e_altre_creature_dello_spazio/720/with-audio.m3u8',
    '360':
      'https://d2kd3i5q9rl184.cloudfront.net/streaming/film/buchi_neri_e_altre_creature_dello_spazio/360/with-audio.m3u8',
  }; // risorse HLS correnti per auto e qualita' fisse

  @ViewChild('barraAd', { read: ElementRef }) barraAdRef?: ElementRef; // riferimento DOM alla barra dell'ad break

  /**
   * Espone al template lo stato dell'ad break corrente.
   *
   * @returns boolean True se l'ad break e' in corso, false altrimenti.
   */
  get adInCorso(): boolean {
    return this.ad.adInCorso; // delego all'helper pubblicita' lo stato ad in corso
  }

  /**
   * Espone al template lo stato pausa del player.
   *
   * @returns boolean True se il player e' in pausa, false altrimenti.
   */
  get playerInPausa(): boolean {
    return this.ui.playerInPausa; // delego all'helper UI lo stato pausa usato nel template
  }

  videoLingua: string | null = localStorage.getItem('video_lingua'); // lingua video salvata localmente

  private readonly ctx = new PlayerStateContext(); // contesto condiviso passato per riferimento ai vari helper
  private readonly subs = new Subscription(); // raccolta delle subscription da chiudere in destroy
  private progressIndex = 0; // indice della progress bar nella control bar

  private readonly ui: PlayerUiHelper; // helper UI e DOM del player
  private readonly startup: PlayerStartupHelper; // helper della sequenza di avvio
  private readonly ad: PlayerAdBreakHelper; // helper della logica ad break
  private readonly quality: PlayerQualityMenuHelper; // helper del menu qualita'
  private readonly mobileControls: PlayerMobileControlsHelper; // helper dei controlli mobile
  private readonly subtitles: PlayerSubtitlesHelper; // helper dei sottotitoli

  constructor(
    private schedaPronta: SchedaProntaService,
    public barraAvanzamentoService: BarraAvanzamentoService,
    private api: ApiService,
    private translate: TranslateService,
    private audio: PlayerAudioService,
  ) {
    this.ui = new PlayerUiHelper(translate); // inizializzo per primo l'helper UI
    this.subtitles = new PlayerSubtitlesHelper(this.ctx, this.ui); // inizializzo l'helper sottotitoli che usa contesto e UI
    this.startup = new PlayerStartupHelper(
      this.ctx,
      audio,
      schedaPronta,
      translate,
    ); // inizializzo l'helper della sequenza di avvio
    this.ad = new PlayerAdBreakHelper(
      this.ctx,
      audio,
      api,
      barraAvanzamentoService,
      translate,
      () => this.barraAdRef?.nativeElement,
    ); // inizializzo l'helper ad break passando anche il getter dell'elemento barra ad
    this.quality = new PlayerQualityMenuHelper(
      this.ctx,
      audio,
      translate,
      (p) => this.ui.mostraFreezeFrame(p),
      () => this.ui.nascondiFreezeFrame(),
      () => {
        this.subtitles.aggiornaSottotitoli();
      },
    ); // inizializzo l'helper qualita' collegandolo al freeze frame e all'aggiornamento sottotitoli
    this.mobileControls = new PlayerMobileControlsHelper(); // inizializzo l'helper dei controlli mobile
  }

  /**
   * Alterna play e pausa del player.
   *
   * @returns void
   */
  togglePlayPausa(): void {
    const p = this.ctx.player; // recupero il player dal contesto condiviso
    if (p?.paused?.())
      p.play?.(); // se il player e' in pausa provo ad avviare la play
    else (p as any).pause?.(); // altrimenti provo a metterlo in pausa
  }

  /**
   * Reagisce ai cambi degli input del componente.
   * - Aggiorna il contesto condiviso per sottotitoli e info episodio
   * - Se cambiano le risorse e il player esiste gia', cambia il contenuto corrente
   *
   * @param changes Oggetto Angular con i cambi rilevati sugli input.
   * @returns void
   */
  ngOnChanges(changes: SimpleChanges): void {
    if ('sottotitoli' in changes) this.ctx.sottotitoli = this.sottotitoli; // aggiorno nel contesto i sottotitoli correnti
    if ('infoEpisodio' in changes) this.ctx.infoEpisodio = this.infoEpisodio; // aggiorno nel contesto le info episodio correnti
    if ('risorse' in changes && this.risorse && this.ctx.player)
      this.cambiaContenuto(this.risorse); // se cambiano le risorse e ho gia' il player applico subito il cambio contenuto
  }

  /**
   * Metodo eseguito dopo l'inizializzazione della vista.
   * - Aggiorna il contesto iniziale con sottotitoli e info episodio
   * - Recupera l'intervallo pubblicita' dal backend
   * - Collega fade e chiusure richieste dai service esterni
   * - Registra le lingue Video.js
   * - Inizializza il player e collega i vari setup e helper
   * - Collega la gestione inattivita' sul video
   *
   * @returns void
   */
  ngAfterViewInit(): void {
    this.ctx.sottotitoli = this.sottotitoli; // copio nel contesto i sottotitoli iniziali
    this.ctx.infoEpisodio = this.infoEpisodio; // copio nel contesto le info episodio iniziali

    this.api
      .getIntervalloPublicita()
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          const v = Number(res?.data?.valore); // provo a leggere il valore numerico dell'intervallo pubblicita'
          if (v > 0) this.ad.intervallo_ad_s = v; // se il valore e' valido aggiorno l'intervallo dell'ad break
        },
      }); // recupero dal backend l'intervallo pubblicita'

    this.subs.add(
      this.schedaPronta.fadeEChiudi$.subscribe(() =>
        this.audio
          .fadeGainTo(0, this.audio.FADE_PAUSA_MS)
          .then(() => this.schedaPronta.richiediChiusuraPlayer()),
      ),
    ); // mi sottoscrivo alla richiesta di fade out e chiusura player

    this.subs.add(
      this.schedaPronta.fadeFilmPlayer$.subscribe((ms) =>
        this.audio.fadeGainTo(0, ms),
      ),
    ); // mi sottoscrivo alla richiesta di fade out audio con durata custom

    this.registraLingueVideoJS(); // registro in Video.js le traduzioni necessarie

    const player = videojs('vid1', { controls: true, preload: 'auto' }); // creo l'istanza Video.js sul video con id vid1
    this.ctx.player = player; // salvo il player nel contesto condiviso
    (player as any).language?.(this.ctx.currentLang); // imposto la lingua iniziale del player
    this.ui.updateMenuLabels(); // aggiorno subito le label dei menu UI

    player.ready(() => {
      // entro qui al primo ready del player
      this.startup.creaMascheraAvvio(); // creo la maschera di avvio
      this.startup.mostraMascheraAvvio(); // mostro la maschera di avvio
      this.audio.setupAudioGraph(player); // inizializzo il grafo audio Web Audio
      this.audio.setGain(0); // porto il gain a zero all'inizio
      try {
        (player as any).muted?.(true);
      } catch {} // provo a mettere subito il player in muto

      this.setupVolumeChangeHandler(player); // collego la gestione dei cambi volume
      this.setupFullscreenTransition(player); // collego la transizione verso il fullscreen
      this.setupPlayPauseOverride(player); // override della play e della pause con la logica custom

      setTimeout(() => {
        const playerEl = (player as any).el?.() as HTMLElement | null; // recupero il root DOM del player
        if (playerEl) this.ui.bindTimeToggle(playerEl); // collego il toggle tempo trascorso/rimanente
      }, 200); // aspetto un attimo prima di cercare gli elementi tempo nel DOM
    });

    player.ready(() => {
      // entro qui al secondo ready del player
      if (this.risorse) this.cambiaContenuto(this.risorse); // se ho risorse iniziali carico subito il contenuto

      (player as any).on?.('timeupdate', () => this.ad.gestisciTimeUpdate()); // collego il timeupdate alla logica ad break
      (player as any).on?.('ended', () => this.ad.gestisciFineVideo()); // collego la fine video alla logica ad break

      this.setupPlayPauseUiEvents(player); // collego gli eventi play/pause per la UI

      const controlBar: any = (player as any)?.getChild?.('ControlBar'); // recupero la control bar del player
      const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(
        navigator.userAgent,
      ); // rilevo in modo semplice se sono su dispositivo mobile
      if (isMobile && controlBar)
        this.mobileControls.registra(player, controlBar, this.progressIndex); // se sono su mobile registro i controlli mobile custom

      this.progressIndex =
        controlBar
          ?.children?.()
          ?.findIndex((c: any) => c.name && c.name() === 'ProgressControl') ??
        0; // salvo l'indice della progress bar nella control bar

      this.setupHotkeys(player); // collego gli hotkeys del player
      this.quality.registra(controlBar); // registro il menu qualita' nella control bar
      this.setupAudioTrackHandler(player); // collego la gestione delle audio tracks
    });

    this.setupMenuCloseOnClick(); // collego la chiusura dei menu cliccando fuori

    const videoElement = document.getElementById('vid1'); // recupero l'elemento DOM del video
    if (videoElement) this.ui.bindInactivity(videoElement as HTMLElement); // collego la gestione dell'inattivita' alla UI del player
  }

  /**
   * Metodo eseguito alla distruzione del componente.
   * - Chiude tutte le subscription
   * - Pulisce ad break, maschera e freeze frame
   * - Dispone il player
   * - Chiude il service audio
   * - Pulisce i blob URL dei sottotitoli
   *
   * @returns void
   */
  ngOnDestroy(): void {
    this.subs.unsubscribe(); // chiudo tutte le subscription raccolte
    this.ad.destroy(); // eseguo la pulizia finale dell'helper ad break
    this.startup.destroyMask(); // rimuovo la maschera di avvio dal DOM
    this.ui.nascondiFreezeFrame(); // nascondo l'eventuale freeze frame ancora presente
    this.ctx.player?.dispose(); // dispongo l'istanza Video.js
    this.audio.destroy(); // chiudo e pulisco il service audio
    this.subtitles.destroy(); // rilascio i blob URL dei sottotitoli
  }

  /**
   * Cambia il contenuto corrente del player.
   * - Resetta il flag del doppio avvio
   * - Mostra la maschera di avvio
   * - Aggiorna nel contesto le URL delle varie qualita'
   * - Cambia la sorgente del player e forza il load
   * - Aggiorna menu qualita' e sottotitoli
   *
   * @param r Oggetto con le URL delle risorse da usare.
   * @returns void
   */
  private cambiaContenuto(r: {
    auto: string;
    '1080': string;
    '720': string;
    '360': string;
  }): void {
    this.ctx.doppioAvvioEseguito = false; // resetto il flag del doppio avvio per il nuovo contenuto
    this.startup.mostraMascheraAvvio(); // mostro di nuovo la maschera di avvio
    this.ctx.URL_MASTER = r.auto || ''; // aggiorno nel contesto la URL master
    this.ctx.URL_1080 = r['1080'] || ''; // aggiorno nel contesto la URL 1080
    this.ctx.URL_720 = r['720'] || ''; // aggiorno nel contesto la URL 720
    this.ctx.URL_360 = r['360'] || ''; // aggiorno nel contesto la URL 360
    const p = this.ctx.player; // recupero il player corrente
    if (!p) return; // se il player non esiste esco subito
    (p as any).src({ src: this.ctx.URL_MASTER, type: 'application/x-mpegURL' }); // imposto al player la nuova sorgente master HLS
    (p as any).load?.(); // provo a forzare il load della nuova sorgente
    this.quality.aggiornaVociMenuQualita(p); // aggiorno le voci del menu qualita'
    this.subtitles.aggiornaSottotitoli(); // aggiorno le tracce dei sottotitoli
  }

  /**
   * Collega la gestione dei cambi volume del player.
   * - Ignora i cambi se l'avvio non e' ancora consentito
   * - Se il player non e' mutato riattiva il contesto audio e rientra col gain
   * - Se il player e' mutato porta il gain a zero
   *
   * @param player Istanza del player.
   * @returns void
   */
  private setupVolumeChangeHandler(player: any): void {
    (player as any).on?.('volumechange', () => {
      if (!this.ctx.avvioConsentito) return; // se l'avvio non e' consentito ignoro il cambio volume
      const isMuted = (player as any).muted?.(); // leggo lo stato mute corrente del player
      if (!isMuted) {
        Promise.resolve(this.audio.audioCtx?.resume?.()).catch(() => {}); // provo a riattivare il contesto audio
        if (!player.paused?.())
          this.audio.fadeGainTo(1, this.audio.FADE_PLAY_MS); // se il player sta andando faccio rientrare il gain con fade
        else this.audio.setGain(1); // se il player e' in pausa porto direttamente il gain a uno
      } else {
        this.audio.setGain(0); // se il player e' mutato porto il gain a zero
      }
    });
  }

  /**
   * Collega la transizione iniziale verso il fullscreen.
   * - Attende sia l'animazione sia un minimo stato ready del video
   * - Rende visibile il wrapper
   * - Prova poi a richiedere il fullscreen usando anche le varianti compatibili
   *
   * @param player Istanza del player.
   * @returns void
   */
  private setupFullscreenTransition(player: any): void {
    const animationDone = new Promise<void>((r) => setTimeout(r, 2200)); // preparo l'attesa dell'animazione iniziale
    const videoReady = new Promise<void>((r) => {
      if ((player as any).readyState?.() >= 3) {
        r();
        return;
      } // se il player e' gia' abbastanza pronto risolvo subito
      (player as any).one?.('canplay', () => r()); // altrimenti aspetto il primo canplay
    });

    Promise.all([animationDone, videoReady]).then(() => {
      const wrapper = (
        (player as any).el?.() as HTMLElement
      )?.closest<HTMLElement>('.video-wrapper'); // recupero il wrapper del video
      if (wrapper) wrapper.style.opacity = '1'; // rendo visibile il wrapper quando la fase iniziale e' pronta
      try {
        const el = (player as any).el?.() as HTMLElement; // recupero il root del player
        const req =
          el?.requestFullscreen?.() ??
          (el as any)?.webkitRequestFullscreen?.() ??
          (el as any)?.mozRequestFullScreen?.() ??
          (el as any)?.msRequestFullscreen?.(); // costruisco la richiesta fullscreen compatibile
        Promise.resolve(req).catch(() => {}); // provo a eseguire la richiesta fullscreen
      } catch {}
    });
  }

  /**
   * Override della play e della pause del player.
   * - Salva i riferimenti originali
   * - Sostituisce pause con una versione che fa prima fade out audio
   * - Sostituisce play con una versione che arma il fade in automatico
   * - Usa token e flag interni per distinguere le chiamate controllate
   *
   * @param player Istanza del player.
   * @returns void
   */
  private setupPlayPauseOverride(player: any): void {
    this.ctx.originalPause = (player as any).pause.bind(player); // salvo il riferimento originale della pause
    this.ctx.originalPlay = (player as any).play.bind(player); // salvo il riferimento originale della play

    (player as any).pause = () => {
      if (this.ctx.playInterno) return this.ctx.originalPause(); // se la pausa e' interna uso direttamente quella originale
      if (player.paused?.()) return; // se il player e' gia' in pausa non faccio nulla
      const myToken = ++this.ctx.pauseToken; // incremento e salvo il token pausa corrente
      this.audio.fadeGainTo(0, this.audio.FADE_PAUSA_MS).finally(() => {
        if (myToken !== this.ctx.pauseToken) return; // se il token nel frattempo e' cambiato ignoro questa chiusura
        try {
          this.ctx.originalPause();
        } catch {
          try {
            (player as any).pause();
          } catch {}
        } // provo a chiamare la pausa originale con fallback ulteriore
      });
    };

    (player as any).play = () => {
      this.ctx.pauseToken++; // invalido eventuali pause pendenti incrementando il token
      if (this.ctx.playInterno) return this.ctx.originalPlay(); // se la play e' interna uso direttamente quella originale
      this.audio.setGain(0); // porto il gain a zero prima della nuova play
      const p = this.ctx.originalPlay(); // faccio partire la play originale e ne conservo il risultato
      if (this.ctx.avvioConsentito)
        this.audio.armFadeInOnce(player, () => !!player.paused?.()); // se l'avvio e' consentito preparo il fade in automatico
      return p; // restituisco il risultato della play originale
    };
  }

  /**
   * Collega gli eventi play e pause alla UI del player.
   * - Aggiorna lo stato del cerchio centrale
   * - Mostra la control bar al primo play
   *
   * @param player Istanza del player.
   * @returns void
   */
  private setupPlayPauseUiEvents(player: any): void {
    let controlBarShown = false; // flag che mi dice se ho gia' mostrato la control bar almeno una volta

    player.on('play', () => {
      this.ui.onPlay(); // aggiorno la UI quando il player entra in play
      if (!controlBarShown) {
        controlBarShown = true; // segno che la control bar e' stata mostrata la prima volta
        const cb = document.querySelector(
          '.vjs-control-bar',
        ) as HTMLElement | null; // recupero la control bar nel DOM
        cb?.classList.add('show-control-bar'); // aggiungo la classe che la rende visibile
      }
    });

    player.on('pause', () => this.ui.onPause()); // aggiorno la UI quando il player entra in pausa
  }

  /**
   * Collega gli hotkeys del player.
   * - Verifica che il plugin hotkeys sia disponibile
   * - Registra i tasti principali di play, seek, volume, mute e fullscreen
   * - Blocca tutti gli hotkeys mentre un ad break e' in corso
   *
   * @param player Istanza del player.
   * @returns void
   */
  private setupHotkeys(player: any): void {
    if (typeof (player as any).hotkeys !== 'function') return; // se il plugin hotkeys non e' disponibile esco subito

    (player as any).hotkeys({
      volumeStep: 0.1,
      seekStep: 5,
      enableModifiersForNumbers: false,
      playPauseKey: (e: KeyboardEvent) =>
        !this.ad.adInCorso && (e.which === 32 || e.which === 75),
      rewindKey: (e: KeyboardEvent) => !this.ad.adInCorso && e.which === 37,
      forwardKey: (e: KeyboardEvent) => !this.ad.adInCorso && e.which === 39,
      volumeUpKey: (e: KeyboardEvent) => !this.ad.adInCorso && e.which === 38,
      volumeDownKey: (e: KeyboardEvent) => !this.ad.adInCorso && e.which === 40,
      muteKey: (e: KeyboardEvent) => !this.ad.adInCorso && e.which === 77,
      fullscreenKey: (e: KeyboardEvent) => !this.ad.adInCorso && e.which === 70,
    }); // registro la configurazione hotkeys del player
  }

  /**
   * Collega la gestione delle audio tracks del player.
   * - Reagisce all'arrivo delle tracce audio
   * - Localizza le voci del menu audio e assegna gli id dei pulsanti
   * - Collega lo switch audio sui pulsanti corrispondenti
   * - Riapplica l'eventuale lingua salvata in localStorage
   * - Avvia il doppio avvio se non ancora eseguito
   *
   * @param player Istanza del player.
   * @returns void
   */
  private setupAudioTrackHandler(player: any): void {
    const audioTracks = (player as any).audioTracks?.(); // recupero l'oggetto audioTracks del player
    audioTracks?.addEventListener?.('addtrack', () => {
      setTimeout(() => {
        const items = document.querySelectorAll(
          '.vjs-audio-button .vjs-menu-content .vjs-menu-item',
        ); // recupero le voci del menu audio nel DOM
        const tracks = (player as any).audioTracks?.(); // recupero di nuovo le tracce audio del player

        items.forEach((item) => {
          const text = item.textContent?.trim().toLowerCase(); // leggo e normalizzo il testo della voce corrente
          if (text?.includes('inglese') || text?.includes('english')) {
            item.textContent = this.getLabel('en'); // aggiorno la label inglese nella lingua utente
            (item as HTMLElement).id = 'en_button'; // assegno l'id al bottone inglese
            item.addEventListener('pointerdown', () =>
              this.startup.switchAudio('en'),
            ); // collego lo switch audio verso inglese
          }
          if (text?.includes('italiano') || text?.includes('italian')) {
            item.textContent = this.getLabel('it'); // aggiorno la label italiana nella lingua utente
            (item as HTMLElement).id = 'it_button'; // assegno l'id al bottone italiano
            item.addEventListener('pointerdown', () =>
              this.startup.switchAudio('it'),
            ); // collego lo switch audio verso italiano
          }
        });

        const savedLang = localStorage.getItem('video_lingua'); // leggo l'eventuale lingua video salvata
        if (savedLang) {
          for (let i = 0; i < tracks.length; i++) {
            const lbl = tracks[i].label.toLowerCase(); // normalizzo il label della traccia corrente
            if (
              (savedLang === 'italiano' ||
                savedLang === 'italiano_provisorio') &&
              lbl.includes('italiano')
            )
              tracks[i].enabled = true; // se la lingua salvata e' italiana riabilito la traccia italiana
            if (
              (savedLang === 'inglese' || savedLang === 'inglese_provisorio') &&
              lbl.includes('inglese')
            )
              tracks[i].enabled = true; // se la lingua salvata e' inglese riabilito la traccia inglese
          }
        }

        if (!this.ctx.doppioAvvioEseguito)
          this.startup.doppioAvvioSeRichiesto(); // se il doppio avvio non e' ancora stato eseguito lo faccio partire ora
      });
    });
  }

  /**
   * Collega la chiusura dei menu del player cliccando fuori.
   * - Intercetta i click sul documento
   * - Se il click non e' su pulsanti o menu rilevanti
   * - Chiude i menu attivi rimuovendo le classi di stato
   *
   * @returns void
   */
  private setupMenuCloseOnClick(): void {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement; // recupero il target del click
      if (
        !target.closest('.vjs-quality-menu-button') &&
        !target.closest('.vjs-audio-button') &&
        !target.closest('.vjs-menu')
      ) {
        document
          .querySelectorAll('.vjs-menu.vjs-lock-showing')
          .forEach((menu) => {
            const parent = menu.closest('.vjs-menu-button'); // recupero il pulsante genitore del menu aperto
            if (parent) {
              parent.classList.remove('vjs-menu-button-active'); // tolgo lo stato attivo al pulsante menu
              menu.classList.remove('vjs-lock-showing'); // tolgo al menu la classe che lo mantiene aperto
            }
          });
      }
    });
  }

  /**
   * Registra in Video.js le traduzioni custom per italiano e inglese.
   *
   * @returns void
   */
  private registraLingueVideoJS(): void {
    videojs.addLanguage('it', {
      Play: this.translate.instant('ui.videojs.play'),
      Pause: this.translate.instant('ui.videojs.pause'),
      Mute: this.translate.instant('ui.videojs.mute'),
      Unmute: this.translate.instant('ui.videojs.unmute'),
      Captions: 'Sottotitoli',
      Subtitles: 'Sottotitoli',
      'Captions settings': 'Opzioni sottotitoli',
      'captions settings': 'Opzioni sottotitoli',
      'Caption settings': 'Opzioni sottotitoli',
      'Caption Settings': 'Opzioni sottotitoli',
      'Subtitle settings': 'Opzioni sottotitoli',
      'Subtitle Settings': 'Opzioni sottotitoli',
      'Subtitles settings': 'Opzioni sottotitoli',
      'Subtitles Settings': 'Opzioni sottotitoli',
      'Subtitle option': 'Opzioni sottotitoli',
      'Subtitle options': 'Opzioni sottotitoli',
      Off: 'Sottotitoli Off',
      'Audio Track': this.translate.instant('ui.videojs.audio'),
      Fullscreen: this.translate.instant('ui.videojs.fullscreen'),
      'Non-Fullscreen': this.translate.instant('ui.videojs.exitfullscreen'),
      'Exit Fullscreen': this.translate.instant('ui.videojs.exitfullscreen'),
    }); // registro il dizionario italiano di Video.js

    videojs.addLanguage('en', {
      Play: this.translate.instant('ui.videojs.play'),
      Pause: this.translate.instant('ui.videojs.pause'),
      Mute: this.translate.instant('ui.videojs.mute'),
      Unmute: this.translate.instant('ui.videojs.unmute'),
      Captions: 'Subtitles',
      Subtitles: 'Subtitles',
      'Captions settings': 'Subtitle options',
      'captions settings': 'Subtitle options',
      'Caption settings': 'Subtitle options',
      'Caption Settings': 'Subtitle options',
      'Subtitle settings': 'Subtitle options',
      'Subtitle Settings': 'Subtitle options',
      'Subtitles settings': 'Subtitle options',
      'Subtitles Settings': 'Subtitle options',
      'Subtitle option': 'Subtitle options',
      'Subtitle options': 'Subtitle options',
      Off: 'Subtitles Off',
      'Audio Track': this.translate.instant('ui.videojs.audio'),
      Fullscreen: this.translate.instant('ui.videojs.fullscreen'),
      'Non-Fullscreen': this.translate.instant('ui.videojs.exitfullscreen'),
      'Exit Fullscreen': this.translate.instant('ui.videojs.exitfullscreen'),
    }); // registro il dizionario inglese di Video.js
  }

  /**
   * Restituisce la label localizzata per una voce audio.
   *
   * @param label Codice label da convertire.
   * @returns string Label localizzata da mostrare nel menu audio.
   */
  private getLabel(label: string): string {
    const lang =
      localStorage.getItem('lingua_utente') === 'italiano' ? 'it' : 'en'; // leggo la lingua utente corrente
    if (lang === 'it')
      return label === 'en' ? 'Inglese' : label === 'it' ? 'Italiano' : label; // se l'utente e' in italiano restituisco la label localizzata italiana
    return label === 'en' ? 'English' : label === 'it' ? 'Italian' : label; // altrimenti restituisco la label localizzata inglese
  }
}
