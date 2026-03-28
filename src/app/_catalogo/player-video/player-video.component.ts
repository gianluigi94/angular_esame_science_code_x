// ─── player-video.component.ts ───────────────────────────────────────────────
// Orchestratore puro: inizializza i helper, collega gli eventi, delega tutto.
// Zero logica di business — tutto è nei file in player_helpers / player_service /
// player_utility.

import {
  AfterViewInit, Component, OnDestroy, ViewEncapsulation,
  Input, OnChanges, SimpleChanges, ViewChild, ElementRef,
} from '@angular/core';
import videojs from 'video.js';
import 'videojs-hotkeys';
import { Subscription } from 'rxjs';
import { take }         from 'rxjs/operators';
import { TranslateService }         from '@ngx-translate/core';
import { SchedaProntaService }      from '../scheda/scheda_service/scheda-pronta.service';
import { ApiService }               from 'src/app/_servizi_globali/api.service';
import { BarraAvanzamentoService }  from 'src/app/_componenti_comuni/barra-avanzamento/barra-avanzamento.service';

import { PlayerStateContext }         from './player_utility/player-state.context';
import { PlayerAudioService }         from './player_service/player-audio.service';
import { PlayerStartupHelper }        from './player_helpers/player-startup.helper';
import { PlayerAdBreakHelper }        from './player_helpers/player-ad-break.helper';
import { PlayerQualityMenuHelper }    from './player_helpers/player-quality-menu.helper';
import { PlayerMobileControlsHelper } from './player_helpers/player-mobile-controls.helper';
import { PlayerSubtitlesHelper }      from './player_helpers/player-subtitles.helper';
import { PlayerUiHelper }             from './player_helpers/player-ui.helper';

@Component({
  selector:      'app-player-video',
  templateUrl:   './player-video.component.html',
  styleUrls:     ['./player-video.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers:     [PlayerAudioService],           // istanza per-componente
})
export class PlayerVideoComponent implements AfterViewInit, OnDestroy, OnChanges {

  // ── Input ─────────────────────────────────────────────────────────────────
  @Input() sottotitoli:  { en: string; it: string }                          | null = null;
  @Input() infoEpisodio: { stagione: number; episodio: number }               | null = null;
  @Input() risorse: { auto: string; '1080': string; '720': string; '360': string } | null = {
    auto:   'https://d2kd3i5q9rl184.cloudfront.net/streaming/film/buchi_neri_e_altre_creature_dello_spazio/master.m3u8',
    '1080': 'https://d2kd3i5q9rl184.cloudfront.net/streaming/film/buchi_neri_e_altre_creature_dello_spazio/1080/with-audio.m3u8',
    '720':  'https://d2kd3i5q9rl184.cloudfront.net/streaming/film/buchi_neri_e_altre_creature_dello_spazio/720/with-audio.m3u8',
    '360':  'https://d2kd3i5q9rl184.cloudfront.net/streaming/film/buchi_neri_e_altre_creature_dello_spazio/360/with-audio.m3u8',
  };

  @ViewChild('barraAd', { read: ElementRef }) barraAdRef?: ElementRef;

  // ── Binding per il template (delegati agli helper) ────────────────────────
  get adInCorso():    boolean { return this.ad.adInCorso; }
  get playerInPausa(): boolean { return this.ui.playerInPausa; }

  // barraAvanzamentoService: public perché usato nel template
  videoLingua: string | null = localStorage.getItem('video_lingua');

  // ── Stato interno ─────────────────────────────────────────────────────────
  private readonly ctx  = new PlayerStateContext();
  private readonly subs = new Subscription();
  private progressIndex = 0;

  private readonly ui:             PlayerUiHelper;
  private readonly startup:        PlayerStartupHelper;
  private readonly ad:             PlayerAdBreakHelper;
  private readonly quality:        PlayerQualityMenuHelper;
  private readonly mobileControls: PlayerMobileControlsHelper;
  private readonly subtitles:      PlayerSubtitlesHelper;

  constructor(
    private schedaPronta:           SchedaProntaService,
    public  barraAvanzamentoService: BarraAvanzamentoService,
    private api:                    ApiService,
    private translate:              TranslateService,
    private audio:                  PlayerAudioService,
  ) {
    // Ordine importante: ui e subtitles prima degli helper che li usano
    this.ui             = new PlayerUiHelper(translate);
    this.subtitles      = new PlayerSubtitlesHelper(this.ctx, this.ui);
    this.startup        = new PlayerStartupHelper(this.ctx, audio, schedaPronta, translate);
    this.ad             = new PlayerAdBreakHelper(
      this.ctx, audio, api, barraAvanzamentoService, translate,
      () => this.barraAdRef?.nativeElement,
    );
    this.quality        = new PlayerQualityMenuHelper(
      this.ctx, audio, translate,
      (p) => this.ui.mostraFreezeFrame(p),
      ()  => this.ui.nascondiFreezeFrame(),
      ()  => { this.subtitles.aggiornaSottotitoli(); },
    );
    this.mobileControls = new PlayerMobileControlsHelper();
  }

  // ── Template API ──────────────────────────────────────────────────────────
  togglePlayPausa(): void {
    const p = this.ctx.player;
    if (p?.paused?.()) p.play?.();
    else               (p as any).pause?.();
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnChanges(changes: SimpleChanges): void {
    if ('sottotitoli'  in changes) this.ctx.sottotitoli  = this.sottotitoli;
    if ('infoEpisodio' in changes) this.ctx.infoEpisodio = this.infoEpisodio;
    if ('risorse' in changes && this.risorse && this.ctx.player)
      this.cambiaContenuto(this.risorse);
  }

  ngAfterViewInit(): void {
    this.ctx.sottotitoli  = this.sottotitoli;
    this.ctx.infoEpisodio = this.infoEpisodio;

    // Intervallo pubblicità dal backend
    this.api.getIntervalloPublicita().pipe(take(1)).subscribe({
      next: (res) => { const v = Number(res?.data?.valore); if (v > 0) this.ad.intervallo_ad_s = v; },
    });

    // Fade out / chiusura player
    this.subs.add(this.schedaPronta.fadeEChiudi$.subscribe(() =>
      this.audio.fadeGainTo(0, this.audio.FADE_PAUSA_MS).then(() =>
        this.schedaPronta.richiediChiusuraPlayer()
      )
    ));
    this.subs.add(this.schedaPronta.fadeFilmPlayer$.subscribe((ms) =>
      this.audio.fadeGainTo(0, ms)
    ));

    this.registraLingueVideoJS();

    const player      = videojs('vid1', { controls: true, preload: 'auto' });
    this.ctx.player   = player;
    (player as any).language?.(this.ctx.currentLang);
    this.ui.updateMenuLabels();

    // ── Primo ready: audio graph, maschera, override play/pause ───────────
    player.ready(() => {
      this.startup.creaMascheraAvvio();
      this.startup.mostraMascheraAvvio();
      this.audio.setupAudioGraph(player);
      this.audio.setGain(0);
      try { (player as any).muted?.(true); } catch {}

      this.setupVolumeChangeHandler(player);
      this.setupFullscreenTransition(player);
      this.setupPlayPauseOverride(player);

      setTimeout(() => {
        const playerEl = (player as any).el?.() as HTMLElement | null;
        if (playerEl) this.ui.bindTimeToggle(playerEl);
      }, 200);
    });

    // ── Secondo ready: sorgente, eventi, menu ─────────────────────────────
    player.ready(() => {
      if (this.risorse) this.cambiaContenuto(this.risorse);

      (player as any).on?.('timeupdate', () => this.ad.gestisciTimeUpdate());
      (player as any).on?.('ended',      () => this.ad.gestisciFineVideo());

      this.setupPlayPauseUiEvents(player);

      const controlBar: any = (player as any)?.getChild?.('ControlBar');
      const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile && controlBar)
        this.mobileControls.registra(player, controlBar, this.progressIndex);

      this.progressIndex = controlBar?.children?.()
        ?.findIndex((c: any) => c.name && c.name() === 'ProgressControl') ?? 0;

      this.setupHotkeys(player);
      this.quality.registra(controlBar);
      this.setupAudioTrackHandler(player);
    });

    this.setupMenuCloseOnClick();

    const videoElement = document.getElementById('vid1');
    if (videoElement) this.ui.bindInactivity(videoElement as HTMLElement);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.ad.destroy();
    this.startup.destroyMask();
    this.ui.nascondiFreezeFrame();
    this.ctx.player?.dispose();
    this.audio.destroy();
    this.subtitles.destroy();
  }

  // ── Setup privati ─────────────────────────────────────────────────────────

  private cambiaContenuto(r: { auto: string; '1080': string; '720': string; '360': string }): void {
    this.ctx.doppioAvvioEseguito = false;
    this.startup.mostraMascheraAvvio();
    this.ctx.URL_MASTER = r.auto    || '';
    this.ctx.URL_1080   = r['1080'] || '';
    this.ctx.URL_720    = r['720']  || '';
    this.ctx.URL_360    = r['360']  || '';
    const p = this.ctx.player;
    if (!p) return;
    (p as any).src({ src: this.ctx.URL_MASTER, type: 'application/x-mpegURL' });
    (p as any).load?.();
    this.quality.aggiornaVociMenuQualita(p);
    this.subtitles.aggiornaSottotitoli();
  }

  private setupVolumeChangeHandler(player: any): void {
    (player as any).on?.('volumechange', () => {
      if (!this.ctx.avvioConsentito) return;
      const isMuted = (player as any).muted?.();
      if (!isMuted) {
        Promise.resolve(this.audio.audioCtx?.resume?.()).catch(() => {});
        if (!player.paused?.()) this.audio.fadeGainTo(1, this.audio.FADE_PLAY_MS);
        else                     this.audio.setGain(1);
      } else { this.audio.setGain(0); }
    });
  }

  private setupFullscreenTransition(player: any): void {
    const animationDone = new Promise<void>(r => setTimeout(r, 2200));
    const videoReady    = new Promise<void>(r => {
      if ((player as any).readyState?.() >= 3) { r(); return; }
      (player as any).one?.('canplay', () => r());
    });
    Promise.all([animationDone, videoReady]).then(() => {
      const wrapper = ((player as any).el?.() as HTMLElement)?.closest<HTMLElement>('.video-wrapper');
      if (wrapper) wrapper.style.opacity = '1';
      try {
        const el  = (player as any).el?.() as HTMLElement;
        const req = el?.requestFullscreen?.()            ??
                    (el as any)?.webkitRequestFullscreen?.() ??
                    (el as any)?.mozRequestFullScreen?.()    ??
                    (el as any)?.msRequestFullscreen?.();
        Promise.resolve(req).catch(() => {});
      } catch {}
    });
  }

  private setupPlayPauseOverride(player: any): void {
    this.ctx.originalPause = (player as any).pause.bind(player);
    this.ctx.originalPlay  = (player as any).play.bind(player);

    (player as any).pause = () => {
      if (this.ctx.playInterno) return this.ctx.originalPause();
      if (player.paused?.()) return;
      const myToken = ++this.ctx.pauseToken;
      this.audio.fadeGainTo(0, this.audio.FADE_PAUSA_MS).finally(() => {
        if (myToken !== this.ctx.pauseToken) return;
        try { this.ctx.originalPause(); } catch { try { (player as any).pause(); } catch {} }
      });
    };

    (player as any).play = () => {
      this.ctx.pauseToken++;
      if (this.ctx.playInterno) return this.ctx.originalPlay();
      this.audio.setGain(0);
      const p = this.ctx.originalPlay();
      if (this.ctx.avvioConsentito)
        this.audio.armFadeInOnce(player, () => !!player.paused?.());
      return p;
    };
  }

  private setupPlayPauseUiEvents(player: any): void {
    let controlBarShown = false;
    player.on('play', () => {
      this.ui.onPlay();
      if (!controlBarShown) {
        controlBarShown = true;
        const cb = document.querySelector('.vjs-control-bar') as HTMLElement | null;
        cb?.classList.add('show-control-bar');
      }
    });
    player.on('pause', () => this.ui.onPause());
  }

  private setupHotkeys(player: any): void {
    if (typeof (player as any).hotkeys !== 'function') return;
    (player as any).hotkeys({
      volumeStep: 0.1, seekStep: 5, enableModifiersForNumbers: false,
      playPauseKey:  (e: KeyboardEvent) => !this.ad.adInCorso && (e.which === 32 || e.which === 75),
      rewindKey:     (e: KeyboardEvent) => !this.ad.adInCorso && e.which === 37,
      forwardKey:    (e: KeyboardEvent) => !this.ad.adInCorso && e.which === 39,
      volumeUpKey:   (e: KeyboardEvent) => !this.ad.adInCorso && e.which === 38,
      volumeDownKey: (e: KeyboardEvent) => !this.ad.adInCorso && e.which === 40,
      muteKey:       (e: KeyboardEvent) => !this.ad.adInCorso && e.which === 77,
      fullscreenKey: (e: KeyboardEvent) => !this.ad.adInCorso && e.which === 70,
    });
  }

  private setupAudioTrackHandler(player: any): void {
    const audioTracks = (player as any).audioTracks?.();
    audioTracks?.addEventListener?.('addtrack', () => {
      setTimeout(() => {
        const items  = document.querySelectorAll('.vjs-audio-button .vjs-menu-content .vjs-menu-item');
        const tracks = (player as any).audioTracks?.();

        items.forEach((item) => {
          const text = item.textContent?.trim().toLowerCase();
          if (text?.includes('inglese') || text?.includes('english')) {
            item.textContent        = this.getLabel('en');
            (item as HTMLElement).id = 'en_button';
            item.addEventListener('pointerdown', () => this.startup.switchAudio('en'));
          }
          if (text?.includes('italiano') || text?.includes('italian')) {
            item.textContent        = this.getLabel('it');
            (item as HTMLElement).id = 'it_button';
            item.addEventListener('pointerdown', () => this.startup.switchAudio('it'));
          }
        });

        const savedLang = localStorage.getItem('video_lingua');
        if (savedLang) {
          for (let i = 0; i < tracks.length; i++) {
            const lbl = tracks[i].label.toLowerCase();
            if ((savedLang === 'italiano' || savedLang === 'italiano_provisorio') && lbl.includes('italiano'))
              tracks[i].enabled = true;
            if ((savedLang === 'inglese'  || savedLang === 'inglese_provisorio')  && lbl.includes('inglese'))
              tracks[i].enabled = true;
          }
        }

        if (!this.ctx.doppioAvvioEseguito) this.startup.doppioAvvioSeRichiesto();
      });
    });
  }

  private setupMenuCloseOnClick(): void {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.vjs-quality-menu-button') &&
          !target.closest('.vjs-audio-button') &&
          !target.closest('.vjs-menu')) {
        document.querySelectorAll('.vjs-menu.vjs-lock-showing').forEach((menu) => {
          const parent = menu.closest('.vjs-menu-button');
          if (parent) {
            parent.classList.remove('vjs-menu-button-active');
            menu.classList.remove('vjs-lock-showing');
          }
        });
      }
    });
  }

  private registraLingueVideoJS(): void {
    videojs.addLanguage('it', {
      'Play': this.translate.instant('ui.videojs.play'),
      'Pause': this.translate.instant('ui.videojs.pause'),
      'Mute': this.translate.instant('ui.videojs.mute'),
      'Unmute': this.translate.instant('ui.videojs.unmute'),
      'Captions': 'Sottotitoli', 'Subtitles': 'Sottotitoli',
      'Captions settings': 'Opzioni sottotitoli', 'captions settings': 'Opzioni sottotitoli',
      'Caption settings': 'Opzioni sottotitoli',  'Caption Settings': 'Opzioni sottotitoli',
      'Subtitle settings': 'Opzioni sottotitoli', 'Subtitle Settings': 'Opzioni sottotitoli',
      'Subtitles settings': 'Opzioni sottotitoli','Subtitles Settings': 'Opzioni sottotitoli',
      'Subtitle option': 'Opzioni sottotitoli',   'Subtitle options': 'Opzioni sottotitoli',
      'Off': 'Sottotitoli Off',
      'Audio Track': this.translate.instant('ui.videojs.audio'),
      'Fullscreen': this.translate.instant('ui.videojs.fullscreen'),
      'Non-Fullscreen': this.translate.instant('ui.videojs.exitfullscreen'),
      'Exit Fullscreen': this.translate.instant('ui.videojs.exitfullscreen'),
    });
    videojs.addLanguage('en', {
      'Play': this.translate.instant('ui.videojs.play'),
      'Pause': this.translate.instant('ui.videojs.pause'),
      'Mute': this.translate.instant('ui.videojs.mute'),
      'Unmute': this.translate.instant('ui.videojs.unmute'),
      'Captions': 'Subtitles', 'Subtitles': 'Subtitles',
      'Captions settings': 'Subtitle options', 'captions settings': 'Subtitle options',
      'Caption settings': 'Subtitle options',  'Caption Settings': 'Subtitle options',
      'Subtitle settings': 'Subtitle options', 'Subtitle Settings': 'Subtitle options',
      'Subtitles settings': 'Subtitle options','Subtitles Settings': 'Subtitle options',
      'Subtitle option': 'Subtitle options',   'Subtitle options': 'Subtitle options',
      'Off': 'Subtitles Off',
      'Audio Track': this.translate.instant('ui.videojs.audio'),
      'Fullscreen': this.translate.instant('ui.videojs.fullscreen'),
      'Non-Fullscreen': this.translate.instant('ui.videojs.exitfullscreen'),
      'Exit Fullscreen': this.translate.instant('ui.videojs.exitfullscreen'),
    });
  }

  private getLabel(label: string): string {
    const lang = localStorage.getItem('lingua_utente') === 'italiano' ? 'it' : 'en';
    if (lang === 'it') return label === 'en' ? 'Inglese' : label === 'it' ? 'Italiano' : label;
    return label === 'en' ? 'English' : label === 'it' ? 'Italian' : label;
  }
}
