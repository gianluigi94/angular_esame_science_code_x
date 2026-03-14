
import { AfterViewInit, Component, OnDestroy, ViewEncapsulation, Input, OnChanges, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { SchedaProntaService } from '../scheda/scheda_service/scheda-pronta.service';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { BarraAvanzamentoService } from 'src/app/_componenti_comuni/barra-avanzamento/barra-avanzamento.service';
@Component({
  selector: 'app-player-video',
  templateUrl: './player-video.component.html',
  styleUrls: ['./player-video.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class PlayerVideoComponent implements AfterViewInit, OnDestroy, OnChanges {



  private doppioAvvioEseguito = false;
  private subs = new Subscription();
    @Input() sottotitoli: { en: string; it: string } | null = null;
@Input() infoEpisodio: { stagione: number; episodio: number } | null = null;
@Input() risorse: { auto: string; '1080': string; '720': string; '360': string } | null = {
  auto:   'https://d2kd3i5q9rl184.cloudfront.net/streaming/film/buchi_neri_e_altre_creature_dello_spazio/master.m3u8',
  '1080': 'https://d2kd3i5q9rl184.cloudfront.net/streaming/film/buchi_neri_e_altre_creature_dello_spazio/1080/with-audio.m3u8',
  '720':  'https://d2kd3i5q9rl184.cloudfront.net/streaming/film/buchi_neri_e_altre_creature_dello_spazio/720/with-audio.m3u8',
  '360':  'https://d2kd3i5q9rl184.cloudfront.net/streaming/film/buchi_neri_e_altre_creature_dello_spazio/360/with-audio.m3u8',
};
  URL_MASTER = '';
  URL_1080   = '';
  URL_720    = '';
  URL_360    = '';




  freezeCanvas: HTMLCanvasElement | null = null;
  freezeAttiva = false;
    private inactivityTimeout?: ReturnType<typeof setTimeout>;
  audioCtx: AudioContext | null = null;
  gainNode: GainNode | null = null;
  mediaSourceNode: MediaElementAudioSourceNode | null = null;
  avvioConsentito = false;
  playInterno = false;
  fallbackMutatoAttivo = false;
  private readonly FADE_PAUSA_MS = 280;
  private readonly FADE_PLAY_MS  = 320;
  private readonly WARMUP_DELAY_MS = 90;
  private pauseToken = 0;
  private originalPause: any;
  private originalPlay: any;
    private readonly START_BUFFER_S = 5;
  private readonly INTRO_NERO_MS = 1000;
  private readonly WARMUP_MUTO_MS = 1000;
  introNeroAttiva = false;
  introNeroTimeout: ReturnType<typeof setTimeout> | null = null;

// === AD BREAK ===
private intervallo_ad_s = 20;
private tempoVisioneAccumulato = 0;
private ultimoCurrentTime = -1;
adInCorso = false;
private tempoRitornoDopoAd = 0;
playerInPausa = true;
@ViewChild('barraAd', { read: ElementRef }) barraAdRef?: ElementRef;
private _vedePublicita: boolean | null = null;

videoLingua: string | null = localStorage.getItem('video_lingua');

  private player?: Player;
  currentLang: 'en' | 'it' =
  localStorage.getItem('lingua_utente') === 'italiano' ? 'it' : 'en';





private getLabel(label: string): string {
  const linguaCorrente =
    localStorage.getItem('lingua_utente') === 'italiano' ? 'it' : 'en';

  if (linguaCorrente === 'it') {
    return label === 'en' ? 'Inglese' : label === 'it' ? 'Italiano' : label;
  } else {
    return label === 'en' ? 'English' : label === 'it' ? 'Italian' : label;
  }
}

togglePlayPausa(): void {
  if (this.player?.paused?.()) {
    (this.player as any).play?.();
  } else {
    (this.player as any).pause?.();
  }
}

  ngOnChanges(changes: SimpleChanges): void {
    if ('risorse' in changes && this.risorse && this.player) {
      this.cambiaContenuto(this.risorse);
    }


  }

  private progressIndex = 0;

constructor(
  private schedaPronta: SchedaProntaService,
  private api: ApiService,
  public barraAvanzamentoService: BarraAvanzamentoService,
  private translate: TranslateService,
) {}

  ngAfterViewInit(): void {

  this.api.getIntervalloPublicita().pipe(take(1)).subscribe({
    next: (res) => {
      const v = Number(res?.data?.valore);
      if (v > 0) this.intervallo_ad_s = v / 1000;
    }
  });

  this.subs.add(
    this.schedaPronta.fadeEChiudi$.subscribe(() => {
        this.fadeGainTo(0, this.FADE_PAUSA_MS).then(() => {
          this.schedaPronta.richiediChiusuraPlayer();
        });
      })
    );

    this.subs.add(
      this.schedaPronta.fadeFilmPlayer$.subscribe((durataMs) => {
        this.fadeGainTo(0, durataMs);
      })
    );

videojs.addLanguage('it', {
  'Play':                this.translate.instant('ui.videojs.play'),
  'Pause':               this.translate.instant('ui.videojs.pause'),
  'Mute':                this.translate.instant('ui.videojs.mute'),
  'Unmute':              this.translate.instant('ui.videojs.unmute'),
  'Captions':            'Sottotitoli',
  'Subtitles':           'Sottotitoli',
  'Captions settings':   'Opzioni sottotitoli',
  'captions settings':   'Opzioni sottotitoli',
  'Caption settings':    'Opzioni sottotitoli',
  'Caption Settings':    'Opzioni sottotitoli',
  'Subtitle settings':   'Opzioni sottotitoli',
  'Subtitle Settings':   'Opzioni sottotitoli',
  'Subtitles settings':  'Opzioni sottotitoli',
  'Subtitles Settings':  'Opzioni sottotitoli',
  'Subtitle option':     'Opzioni sottotitoli',
  'Subtitle options':    'Opzioni sottotitoli',
  'Off':                 'Sottotitoli Off',
  'Audio Track':         this.translate.instant('ui.videojs.audio'),
  'Fullscreen':          this.translate.instant('ui.videojs.fullscreen'),
  'Non-Fullscreen':      this.translate.instant('ui.videojs.exitfullscreen'),
  'Exit Fullscreen':     this.translate.instant('ui.videojs.exitfullscreen'),
});

videojs.addLanguage('en', {
  'Play':                this.translate.instant('ui.videojs.play'),
  'Pause':               this.translate.instant('ui.videojs.pause'),
  'Mute':                this.translate.instant('ui.videojs.mute'),
  'Unmute':              this.translate.instant('ui.videojs.unmute'),
  'Captions':            'Subtitles',
  'Subtitles':           'Subtitles',
  'Captions settings':   'Subtitle options',
  'captions settings':   'Subtitle options',
  'Caption settings':    'Subtitle options',
  'Caption Settings':    'Subtitle options',
  'Subtitle settings':   'Subtitle options',
  'Subtitle Settings':   'Subtitle options',
  'Subtitles settings':  'Subtitle options',
  'Subtitles Settings':  'Subtitle options',
  'Subtitle option':     'Subtitle options',
  'Subtitle options':    'Subtitle options',
  'Off':                 'Subtitles Off',
  'Audio Track':         this.translate.instant('ui.videojs.audio'),
  'Fullscreen':          this.translate.instant('ui.videojs.fullscreen'),
  'Non-Fullscreen':      this.translate.instant('ui.videojs.exitfullscreen'),
  'Exit Fullscreen':     this.translate.instant('ui.videojs.exitfullscreen'),
});

this.player = videojs('vid1', {
  controls: true,
  preload: 'auto',
});

  (this.player as any).language?.(this.currentLang);
this.updateMenuLabels();



  this.player.ready(() => {
  this.creaMascheraAvvio();
  this.mostraMascheraAvvio();
  this.setupAudioGraph();
  this.setGain(0);
  try { (this.player as any).muted?.(true); } catch {}

  (this.player as any).on?.('volumechange', () => {
    if (!this.avvioConsentito) return;
    const isMuted = (this.player as any).muted?.();
    if (!isMuted) {
      Promise.resolve(this.audioCtx?.resume?.()).catch(() => {});
      if (!this.player?.paused?.()) {
        this.fadeGainTo(1, this.FADE_PLAY_MS);
      } else {
        this.setGain(1);
      }
    } else {
      this.setGain(0);
    }
  });

  const animationDone = new Promise<void>(r => setTimeout(r, 2200));
  const videoReady = new Promise<void>(r => {
    if ((this.player as any).readyState?.() >= 3) { r(); return; }
    (this.player as any).one?.('canplay', () => r());
  });

  Promise.all([animationDone, videoReady]).then(() => {
    const wrapper = ((this.player as any).el?.() as HTMLElement)
      ?.closest<HTMLElement>('.video-wrapper');
    if (wrapper) wrapper.style.opacity = '1';
    try {
      const el = (this.player as any).el?.() as HTMLElement;
      const req =
        el?.requestFullscreen?.() ??
        (el as any)?.webkitRequestFullscreen?.() ??
        (el as any)?.mozRequestFullScreen?.() ??
        (el as any)?.msRequestFullscreen?.();
      Promise.resolve(req).catch(() => {});
    } catch {}
  });



      this.originalPause = (this.player as any).pause.bind(this.player);
      this.originalPlay  = (this.player as any).play.bind(this.player);

      (this.player as any).pause = () => {
        if (this.playInterno) return this.originalPause();
        if (this.player?.paused?.()) return;
        const myToken = ++this.pauseToken;
        this.fadeGainTo(0, this.FADE_PAUSA_MS).finally(() => {
          if (myToken !== this.pauseToken) return;
          try { this.originalPause(); } catch { try { (this.player as any).pause(); } catch {} }
        });
      };

       (this.player as any).play = () => {
        this.pauseToken++;
        if (this.playInterno) return this.originalPlay();
        this.setGain(0);
        const p = this.originalPlay();
        if (this.avvioConsentito) this.armFadeInOnce();
        return p;
      };
    });

    setTimeout(() => {
  const playerEl = (this.player as any).el?.() as HTMLElement | null;
  if (!playerEl) return;

  const toggleDisplay = () => {
    const ct = playerEl.querySelector('.vjs-current-time') as HTMLElement | null;
    const rt = playerEl.querySelector('.vjs-remaining-time') as HTMLElement | null;
    if (!ct || !rt) return;
    if (rt.style.display !== 'none') {
      rt.style.display = 'none';
      ct.style.display = 'block';
    } else {
      rt.style.display = 'block';
      ct.style.display = 'none';
    }
  };

 playerEl.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  if (target.closest('.vjs-current-time') || target.closest('.vjs-remaining-time')) {
    toggleDisplay();
  }
});
}, 200);

   this.player.ready(() => {
    if (this.risorse) {
        this.cambiaContenuto(this.risorse);
      }

    (this.player as any).on?.('timeupdate', () => this.gestisciTimeUpdate());
    (this.player as any).on?.('ended', () => this.gestisciFineVideo());

      let controlBarShown = false;
this.player?.on('play', () => {
  this.playerInPausa = false;

  if (!controlBarShown) {
    controlBarShown = true;
    const controlBar = document.querySelector(
      '.vjs-control-bar'
    ) as HTMLElement | null;
    if (controlBar) {
      controlBar.classList.add('show-control-bar');
    }
  }

  // In play: rimuovi il cerchio completamente, riapparirà solo col mousemove
  const cerchio = document.querySelector('.vjs-cerchio-centrale') as HTMLElement | null;
  if (cerchio) {
    cerchio.classList.remove('fisso');
    cerchio.classList.remove('visibile');
  }
});

this.player?.on('pause', () => {
  this.playerInPausa = true;

  // In pausa: il cerchio resta sempre visibile
  const cerchio = document.querySelector('.vjs-cerchio-centrale') as HTMLElement | null;
  if (cerchio) {
    cerchio.classList.add('visibile');
    cerchio.classList.add('fisso');
  }
});

      const controlBar: any = (this.player as any)?.getChild?.('ControlBar');

      const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile && controlBar) {
const Button = videojs.getComponent('Button') as any;

class MobilePlayButton extends (Button as any) {
  constructor(player: any, options: any) {
    super(player, options);
    (this as any)['controlText']('Play');
    (this as any)['addClass']('vjs-mobile-play-button');
  }
  handleClick() {
    (this as any)['player_'].play();
  }
}
(videojs as any).registerComponent('MobilePlayButton', MobilePlayButton as any);

class MobilePauseButton extends (Button as any) {
  constructor(player: any, options: any) {
    super(player, options);
    (this as any)['controlText']('Pause');
    (this as any)['addClass']('vjs-mobile-pause-button');
  }
  handleClick() {
    (this as any)['player_'].pause();
  }
}
(videojs as any).registerComponent('MobilePauseButton', MobilePauseButton as any);

class MobileSkipForwardButton extends (Button as any) {
  constructor(player: any, options: any) {
    super(player, options);
    (this as any)['controlText']('Avanti');
    (this as any)['addClass']('vjs-mobile-skip-forward-button');
  }
  handleClick() {
    const p = (this as any)['player_'];
    const newTime = p.currentTime() + 10;
    p.currentTime(newTime);
  }
}
(videojs as any).registerComponent('MobileSkipForwardButton', MobileSkipForwardButton as any);

class MobileSkipBackwardButton extends (Button as any) {
  constructor(player: any, options: any) {
    super(player, options);
    (this as any)['controlText']('Indietro');
    (this as any)['addClass']('vjs-mobile-skip-backward-button');
  }
  handleClick() {
    const p = (this as any)['player_'];
    const newTime = Math.max(0, p.currentTime() - 10);
    p.currentTime(newTime);
  }
}
(videojs as any).registerComponent('MobileSkipBackwardButton', MobileSkipBackwardButton as any);




        const mobilePlayButton = new (MobilePlayButton as any)(this.player!, {});
        const mobilePauseButton = new (MobilePauseButton as any)(this.player!, {});

        controlBar!.addChild('MobileSkipBackwardButton', {}, this.progressIndex);
        controlBar!.addChild('MobileSkipForwardButton', {}, this.progressIndex + 1);

        if (this.player!.paused()) {
          controlBar!.addChild(mobilePlayButton, {}, this.progressIndex + 2);
        } else {
          controlBar!.addChild(mobilePauseButton, {}, this.progressIndex + 2);
        }

      this.player!.on('play', () => {
          if (controlBar!.children().includes(mobilePlayButton)) {
            controlBar!.removeChild(mobilePlayButton);
          }
          if (!controlBar!.children().includes(mobilePauseButton)) {
            controlBar!.addChild(mobilePauseButton, {}, this.progressIndex + 2);
          }
        });

        this.player!.on('pause', () => {
          if (controlBar!.children().includes(mobilePauseButton)) {
            controlBar!.removeChild(mobilePauseButton);
          }
          if (!controlBar!.children().includes(mobilePlayButton)) {
            controlBar!.addChild(mobilePlayButton, {}, this.progressIndex + 2);
          }
        });
      }

      this.progressIndex = controlBar
        ?.children?.()
        ?.findIndex((c: any) => c.name && c.name() === 'ProgressControl') ?? 0;

      const maybeHotkeys = (this.player as any).hotkeys;
      if (typeof maybeHotkeys === 'function') {
        maybeHotkeys({
          volumeStep: 0.1,
          seekStep: 5,
          enableModifiersForNumbers: false,
        });
      }


const MenuButton = videojs.getComponent('MenuButton') as any;
const MenuItem  = videojs.getComponent('MenuItem') as any;

      const self = this;
            const QualityMenuItem = class extends (MenuItem as any) {
        private tipo: 'auto'|'1080'|'720'|'360';
        private label: string;

  constructor(player: any, options: any) {
    super(player, options);
              this.tipo  = options.tipo;
          this.label = options.label;
    (this as any)['addClass']('vjs-quality-menu-item');
    (this as any)['updateLabel']();
  }

  async handleClick() {
    const p = (this as any)['player_'];
              const currentTime = p.currentTime();
          const isPaused = p.paused();
          const url =
          this.tipo === 'auto' ? self.URL_MASTER :
            this.tipo === '1080' ? self.URL_1080  :
            this.tipo === '720'  ? self.URL_720   :
            this.tipo === '360'  ? self.URL_360   : '';
          if (!url) return;
          await Promise.resolve(self.audioCtx?.resume?.()).catch(()=>{}); await self.fadeGainTo(0, self.FADE_PAUSA_MS);
    self.mostraFreezeFrame(p);
    p.src({ src: url, type: 'application/x-mpegURL' });

    const rimuoviFreeze = () => {
      self.nascondiFreezeFrame();
      p.off('loadeddata', rimuoviFreeze);
      p.off('error', rimuoviFreeze);
    };
    p.on('loadeddata', rimuoviFreeze);
    p.on('error', rimuoviFreeze);
   p.ready(() => {
  p.currentTime(currentTime);
  if (!isPaused) p.play();
  (self as any).aggiornaSottotitoli();
});

    const items =
      p.getChild('ControlBar')
        ?.getChild('QualityMenuButton')
        ?.menu?.children?.() || [];

    items.forEach((item: any) => item?.updateLabel?.());
  }

  updateLabel() {
    const p = (this as any)['player_'];
              const currentSrc = p.currentSource?.()?.src || '';
          const urlCorrente =
          this.tipo === 'auto' ? self.URL_MASTER :
            this.tipo === '1080' ? self.URL_1080  :
            this.tipo === '720'  ? self.URL_720   :
            this.tipo === '360'  ? self.URL_360   : '';
          const selected = !!urlCorrente && currentSrc.includes(urlCorrente);

    const el = (this as any)['el']() as HTMLElement;
    if (selected) {
      el.classList.add('vjs-selected');
    } else {
      el.classList.remove('vjs-selected');
    }
    el.innerHTML = this.label;
  }
};

const QualityMenuButton = class extends (MenuButton as any) {
  constructor(player: any, options: any) {
    super(player, options);
    (this as any)['addClass']('vjs-quality-menu-button');

    const el = (this as any)['el']?.();
    if (el) {
      el.classList.add('vjs-icon-placeholder');

      el.setAttribute('title', self.translate.instant('ui.videojs.quality'));

      const span = document.createElement('span');
      span.className = 'vjs-quality-label';
      el.appendChild(span);
    }
  }

  createItems() {
                            const currentLang = (this as any)['player_'].language?.() ?? 'en';
          const autoLabel = currentLang === 'it' ? 'Auto' : 'Auto';
          return [
            { label: autoLabel, tipo: 'auto' as const },
            { label: '1080p',   tipo: '1080' as const },
            { label: '720p',    tipo: '720'  as const },
            { label: '360p',    tipo: '360'  as const },
          ].map((q) => new (QualityMenuItem as any)((this as any)['player_'], q));
  }
};

(videojs as any).registerComponent('QualityMenuButton', QualityMenuButton as any);
      controlBar?.addChild('QualityMenuButton', {});

      const audioTracks = (this.player as any).audioTracks?.();
      audioTracks?.addEventListener?.('addtrack', () => {
        setTimeout(() => {
          const items = document.querySelectorAll(
            '.vjs-audio-button .vjs-menu-content .vjs-menu-item'
          );

          const player = this.player as Player;
          const tracks = (player as any).audioTracks?.();

                const switchAudio = async (lang: 'en' | 'it') => {
            const p: any = this.player as any;
            const stavaSuonando = !p.paused?.();

            await Promise.resolve(this.audioCtx?.resume?.()).catch(()=>{});
            await this.fadeGainTo(0, this.FADE_PAUSA_MS);

            this.playInterno = true;
            try { this.originalPause?.(); } catch { try { p.pause?.(); } catch {} }

            await this.impostaLinguaAudio(lang, true, true);

            const t = Number(p.currentTime?.() ?? 0);
            try { p.currentTime?.(t + 0.01); } catch {}

            const onReady = async () => {
              p.off?.('canplay', onReady);
              if (stavaSuonando) {
                try { await Promise.resolve(this.originalPlay?.()); } catch {}
                this.playInterno = false;
                await this.fadeGainTo(1, this.FADE_PLAY_MS);
              } else {
                this.playInterno = false;
              }
            };
            p.on?.('canplay', onReady);

            setTimeout(async () => {
              try { p.off?.('canplay', onReady); } catch {}
              if (stavaSuonando) {
                try { await Promise.resolve(this.originalPlay?.()); } catch {}
                this.playInterno = false;
                await this.fadeGainTo(1, this.FADE_PLAY_MS);
              } else {
                this.playInterno = false;
              }
            }, 600);
          };

          items.forEach((item) => {
            const text = item.textContent?.trim().toLowerCase();

            if (text?.includes('inglese') || text?.includes('english')) {
              item.textContent = this.getLabel('en');
              (item as HTMLElement).id = 'en_button';
              item.addEventListener('pointerdown', () => switchAudio('en'));
            }

            if (text?.includes('italiano') || text?.includes('italian')) {
              item.textContent = this.getLabel('it');
              (item as HTMLElement).id = 'it_button';
              item.addEventListener('pointerdown', () => switchAudio('it'));
            }
          });

          const savedLang = localStorage.getItem('video_lingua');
          if (savedLang) {
            for (let i = 0; i < tracks.length; i++) {
              const label = tracks[i].label.toLowerCase();
              if (
                (savedLang === 'italiano' || savedLang === 'italiano_provisorio') &&
                label.includes('italiano')
              ) {
                tracks[i].enabled = true;
              }
              if (
                (savedLang === 'inglese' || savedLang === 'inglese_provisorio') &&
                label.includes('inglese')
              ) {
                tracks[i].enabled = true;
              }
            }
          }
          if (!this.doppioAvvioEseguito) this.doppioAvvioSeRichiesto();
        });
      });
    });

    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const isQualityButton = target.closest('.vjs-quality-menu-button');
      const isAudioButton = target.closest('.vjs-audio-button');
      const isInsideMenu = target.closest('.vjs-menu');

      if (!isQualityButton && !isAudioButton && !isInsideMenu) {
        const openedMenus = document.querySelectorAll('.vjs-menu.vjs-lock-showing');
        openedMenus.forEach((menu) => {
          const menuParent = menu.closest('.vjs-menu-button');
          if (menuParent) {
            menuParent.classList.remove('vjs-menu-button-active');
            menu.classList.remove('vjs-lock-showing');
          }
        });
      }
    });

    const videoElement = document.getElementById('vid1');

  videoElement?.addEventListener('mousemove', () => {
  const controlBar = document.querySelector(
    '.vjs-control-bar.show-control-bar'
  ) as HTMLElement | null;
  if (controlBar) {
    controlBar.classList.remove('vjs-control-bar-transition');
  }

  const cerchio = document.querySelector('.vjs-cerchio-centrale') as HTMLElement | null;
  if (cerchio) cerchio.classList.add('visibile');

  clearTimeout(this.inactivityTimeout);
  this.inactivityTimeout = setTimeout(() => {
  const cb = document.querySelector(
    '.vjs-control-bar.show-control-bar'
  ) as HTMLElement | null;
  if (cb) {
    cb.classList.remove('show-control-bar');
    cb.classList.add('vjs-control-bar-transition');
  }
  if (cerchio && !cerchio.classList.contains('fisso')) {
    cerchio.classList.remove('visibile');
  }
}, 2000);
});

    videoElement?.addEventListener('touchstart', () => {
  const controlBar = document.querySelector(
    '.vjs-control-bar.show-control-bar'
  ) as HTMLElement | null;
  if (controlBar) {
    controlBar.classList.remove('vjs-control-bar-transition');
  }

  clearTimeout(this.inactivityTimeout);
  this.inactivityTimeout = setTimeout(() => {
    const cb = document.querySelector(
      '.vjs-control-bar.show-control-bar'
    ) as HTMLElement | null;
    if (cb) {
      cb.classList.remove('show-control-bar');
      cb.classList.add('vjs-control-bar-transition');
    }
  }, 2000);
});

    this.inactivityTimeout = setTimeout(() => {}, 2000);
  }

private utenteVedePublicita(): boolean {
  if (this._vedePublicita !== null) return this._vedePublicita;

  try {
    // L'auth è salvato come oggetto unico sotto la chiave 'auth'
    const authRaw = localStorage.getItem('auth') ?? sessionStorage.getItem('auth');
    console.log('[AD] authRaw:', authRaw);

    if (authRaw) {
      const auth = JSON.parse(authRaw);
      const abilita: number[] = auth?.abilita ?? [];
      console.log('[AD] abilita da auth:', abilita, '| tk:', auth?.tk ? auth.tk.substring(0, 20) + '...' : 'NESSUNO');
      this._vedePublicita = abilita.includes(3);
      console.log('[AD] utenteVedePublicita →', this._vedePublicita);
      return this._vedePublicita;
    }

    console.warn('[AD] nessun oggetto auth in storage');
    this._vedePublicita = false;
    return false;
  } catch (e) {
    console.error('[AD] errore:', e);
    this._vedePublicita = false;
    return false;
  }
}

private gestisciTimeUpdate(): void {
  if (this.adInCorso) return;
  if (!this.avvioConsentito) return;
  if (!this.utenteVedePublicita()) return;

  const ct = Number((this.player as any).currentTime?.() ?? 0);
  if (this.ultimoCurrentTime >= 0) {
    const delta = ct - this.ultimoCurrentTime;
    if (delta > 0 && delta < 2) {
      this.tempoVisioneAccumulato += delta;
    }
  }
  this.ultimoCurrentTime = ct;

  if (this.tempoVisioneAccumulato >= this.intervallo_ad_s) {
    this.tempoVisioneAccumulato = 0;
    this.avviaAdBreak();
  }
}
//
private adVideoEl: HTMLVideoElement | null = null;
private adTimeUpdateHandler: any = null;
private adLoadedMetadataHandler: any = null;

private async avviaAdBreak(): Promise<void> {
  if (this.adInCorso) return;
  this.adInCorso = true;

  // 1. Chiedi al backend quale pubblicità mandare (mentre il film è ancora in play)
  let idPubblicita = 1;
  try {
    const res = await this.api.getProssimaPublicita().pipe(take(1)).toPromise();
    idPubblicita = res?.data?.id_pubblicita ?? 1;
  } catch {}

  const lingua = localStorage.getItem('video_lingua') === 'italiano' ? 'it' : 'en';
  const urlAd = `https://d2kd3i5q9rl184.cloudfront.net/pubblicita/pub_${idPubblicita}_${lingua}.mp4`;

   // 2. Crea l'elemento video e imposta il src — ancora invisibile (z-index fuori dal DOM)
  this.adVideoEl = document.createElement('video');
  this.adVideoEl.style.cssText = `
    position: absolute; inset: 0; width: 100%; height: 100%;
    z-index: 100; background: #000; object-fit: contain;
    visibility: hidden;
  `;
  this.adVideoEl.playsInline = true;
  this.adVideoEl.volume = 1;
  this.adVideoEl.muted = false;
  this.adVideoEl.preload = 'auto';
  this.adVideoEl.src = urlAd;

  this.barraAvanzamentoService.resetBarraAvanzamento();

  this.adLoadedMetadataHandler = () => {
    const durata = Number(this.adVideoEl?.duration ?? 0);
    this.barraAvanzamentoService.aggiornaBarraDaValori(0, durata);
  };

  this.adTimeUpdateHandler = () => {
    const corrente = Number(this.adVideoEl?.currentTime ?? 0);
    const durata = Number(this.adVideoEl?.duration ?? 0);
    this.barraAvanzamentoService.aggiornaBarraDaValori(corrente, durata);
  };

  this.adVideoEl.addEventListener('loadedmetadata', this.adLoadedMetadataHandler);
  this.adVideoEl.addEventListener('timeupdate', this.adTimeUpdateHandler);

  const playerEl = (this.player as any).el?.() as HTMLElement;
  playerEl.appendChild(this.adVideoEl);

 // 3. Aspetta che il browser abbia abbastanza buffer (canplay) — film ancora in play
  let adCaricato = false;
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, 4000); // fallback max 4s
    this.adVideoEl!.addEventListener('canplay', () => {
      adCaricato = true;
      clearTimeout(timeout);
      resolve();
    }, { once: true });
    this.adVideoEl!.addEventListener('error', () => {
      clearTimeout(timeout);
      resolve();
    }, { once: true });
    this.adVideoEl!.load();
  });

  // 4. Se l'ad non è caricato (Brave, AdBlock...) abbandona senza toccare il film
  if (!adCaricato) {
    this.adVideoEl?.remove();
    this.adVideoEl = null;
    this.adInCorso = false;
    return;
  }

  // Solo ora pausa il film e mostra la pubblicità
  const playerElRoot = (this.player as any).el?.() as HTMLElement | null;
  playerElRoot?.classList.add('ad-in-corso');
  await this.fadeGainTo(0, this.FADE_PAUSA_MS);
  this.tempoRitornoDopoAd = Number((this.player as any).currentTime?.() ?? 0);
  this.playInterno = true;
  try { this.originalPause?.(); } catch {}
  this.playInterno = false;

  this.adVideoEl.style.visibility = 'visible';

  const adLabel = document.createElement('div');
adLabel.id = 'ad-label';
adLabel.textContent = this.translate.instant('ui.videojs.ad_label');
playerEl.appendChild(adLabel);

  if (this.barraAdRef?.nativeElement) {
    playerEl.appendChild(this.barraAdRef.nativeElement);
  }

  this.adVideoEl.addEventListener('ended', () => this.riprendiDopoAd());
  this.adVideoEl.addEventListener('error', () => this.riprendiDopoAd());

  this.adVideoEl.play().catch(() => this.riprendiDopoAd());
}

private gestisciFineVideo(): void {
  // ora gestito dall'evento 'ended' del adVideoEl
  // ma teniamo il metodo per sicurezza
  if (this.adInCorso) this.riprendiDopoAd();
}

private async riprendiDopoAd(): Promise<void> {
  if (this.adVideoEl) {
    if (this.adLoadedMetadataHandler) {
      this.adVideoEl.removeEventListener('loadedmetadata', this.adLoadedMetadataHandler);
    }
    if (this.adTimeUpdateHandler) {
      this.adVideoEl.removeEventListener('timeupdate', this.adTimeUpdateHandler);
    }

    this.adVideoEl.pause();
    this.adVideoEl.remove();
    this.adVideoEl = null;
  }

  this.adLoadedMetadataHandler = null;
  this.adTimeUpdateHandler = null;
  this.barraAvanzamentoService.resetBarraAvanzamento();

  document.getElementById('ad-label')?.remove();
  this.barraAdRef?.nativeElement?.remove();

 this.adInCorso = false;
  this.ultimoCurrentTime = -1;
  const playerElRoot = (this.player as any).el?.() as HTMLElement | null;
  playerElRoot?.classList.remove('ad-in-corso');

  try { (this.player as any).currentTime?.(this.tempoRitornoDopoAd); } catch {}
  this.playInterno = true;
  try { await Promise.resolve(this.originalPlay?.()); } catch {}
  this.playInterno = false;
  await this.fadeGainTo(1, this.FADE_PLAY_MS);
}

 ngOnDestroy(): void {
  this.subs.unsubscribe();

  if (this.adVideoEl && this.adLoadedMetadataHandler) {
    this.adVideoEl.removeEventListener('loadedmetadata', this.adLoadedMetadataHandler);
  }
  if (this.adVideoEl && this.adTimeUpdateHandler) {
    this.adVideoEl.removeEventListener('timeupdate', this.adTimeUpdateHandler);
  }

  this.barraAvanzamentoService.resetBarraAvanzamento();

  this.nascondiFreezeFrame();
  try { this.startupMaskEl?.remove(); } catch {}
  this.player?.dispose();
  try { this.audioCtx?.close(); } catch {}
  this.blobUrls.forEach(u => URL.revokeObjectURL(u));
  this.blobUrls = [];
}

private cambiaContenuto(r: { auto: string; '1080': string; '720': string; '360': string }): void {
  this.doppioAvvioEseguito = false;
  this.mostraMascheraAvvio();

  this.URL_MASTER = r.auto  || '';
  this.URL_1080   = r['1080'] || '';
  this.URL_720    = r['720']  || '';
  this.URL_360    = r['360']  || '';
  if (!this.player) return;
  (this.player as any).src({ src: this.URL_MASTER, type: 'application/x-mpegURL' });
  (this.player as any).load?.();
  this.aggiornaVociMenuQualita();
  this.aggiornaSottotitoli();
}

private blobUrls: string[] = [];

private async aggiornaSottotitoli(): Promise<void> {
  if (!this.player || !this.sottotitoli) return;
  try {
    this.blobUrls.forEach(u => URL.revokeObjectURL(u));
    this.blobUrls = [];

    const tracce = (this.player as any).remoteTextTracks?.();
    if (tracce) {
      const da_rimuovere: any[] = [];
      for (let i = 0; i < tracce.length; i++) da_rimuovere.push(tracce[i]);
      da_rimuovere.forEach(t => (this.player as any).removeRemoteTextTrack?.(t));
    }

    const [srcEn, srcIt] = await Promise.all([
      this.patchVtt(this.sottotitoli.en),
      this.patchVtt(this.sottotitoli.it),
    ]);

   const linguaCorrente =
  localStorage.getItem('lingua_utente') === 'italiano' ? 'it' : 'en';

(this.player as any).addRemoteTextTrack?.({
  kind: 'subtitles',
  src: srcEn,
  srclang: 'en',
  label: linguaCorrente === 'it' ? 'Inglese' : 'English'
}, false);

(this.player as any).addRemoteTextTrack?.({
  kind: 'subtitles',
  src: srcIt,
  srclang: 'it',
  label: linguaCorrente === 'it' ? 'Italiano' : 'Italian'
}, false);

setTimeout(() => this.updateMenuLabels(), 100);
  } catch {}
}

private async patchVtt(url: string): Promise<string> {
  try {
    const testo = await fetch(url).then(r => r.text());

    let patched = testo;
    if (this.infoEpisodio) {
      const { stagione, episodio } = this.infoEpisodio;
      const numWords = '(?:[1-5]|uno|due|tre|quattro|cinque|one|two|three|four|five)';

      // lavora solo sui primi 200 caratteri, lascia il resto intatto
      const testa = testo.substring(0, 200);
      const coda  = testo.substring(200);

      const testablePatchata = testa
        .replace(new RegExp(`(stagione|season)\\s+${numWords}`, 'gi'),  (_m, kw) => `${kw} ${stagione}`)
        .replace(new RegExp(`(episodio|episode)\\s+${numWords}`, 'gi'), (_m, kw) => `${kw} ${episodio}`);

      patched = testablePatchata + coda;
    }

    const blob = new Blob([patched], { type: 'text/vtt' });
    const blobUrl = URL.createObjectURL(blob);
    this.blobUrls.push(blobUrl);
    return blobUrl;
  } catch {
    return url;
  }
}

  private aggiornaVociMenuQualita(): void {
    try {
      const items =
        (this.player as any)?.getChild?.('ControlBar')
          ?.getChild?.('QualityMenuButton')
          ?.menu?.children?.() || [];
      items.forEach((it: any) => it.updateLabel?.());
    } catch {}
  }




private updateMenuLabels() {
  setTimeout(() => {
    const linguaCorrente =
      localStorage.getItem('lingua_utente') === 'italiano' ? 'it' : 'en';

    const audioItems = document.querySelectorAll(
      '.vjs-audio-button .vjs-menu-content .vjs-menu-item'
    );
    audioItems.forEach((item) => {
      const text = item.textContent?.trim().toLowerCase();

      if (text?.includes('inglese') || text?.includes('english')) {
        item.textContent = linguaCorrente === 'it' ? 'Inglese' : 'English';
      }
      if (text?.includes('italiano') || text?.includes('italian')) {
        item.textContent = linguaCorrente === 'it' ? 'Italiano' : 'Italian';
      }
    });

    const subtitleItems = document.querySelectorAll(
      '.vjs-subs-caps-button .vjs-menu-content .vjs-menu-item'
    );
    subtitleItems.forEach((item) => {
      const text = item.textContent?.trim().toLowerCase();

   if (
  text?.includes('caption settings') ||
  text?.includes('captions settings') ||
  text?.includes('subtitle setting') ||
  text?.includes('subtitle settings') ||
  text?.includes('subtitle option') ||
  text?.includes('subtitle options') ||
  text?.includes('subtitles setting') ||
  text?.includes('subtitles settings') ||
  text?.includes('opzioni sottotitoli')
) {
  item.textContent = linguaCorrente === 'it' ? 'Opzioni sottotitoli' : 'Subtitle options';
}

      if (
        text === 'off' ||
        text?.includes('caption off') ||
        text?.includes('subtitles off') ||
        text?.includes('sottotitoli off')
      ) {
        item.textContent = linguaCorrente === 'it' ? 'Sottotitoli Off' : 'Subtitles Off';
      }

      if (text?.includes('english') || text?.includes('inglese')) {
        item.textContent = linguaCorrente === 'it' ? 'Inglese' : 'English';
      }

      if (text?.includes('italian') || text?.includes('italiano')) {
        item.textContent = linguaCorrente === 'it' ? 'Italiano' : 'Italian';
      }
    });
  }, 100);
}
mostraFreezeFrame(p: any) {
  try {
    const playerEl = p?.el?.() as HTMLElement | null;
    const videoEl = playerEl?.querySelector('video.vjs-tech') as HTMLVideoElement | null;
    const trackEl = playerEl?.querySelector('.vjs-text-track-display') as HTMLElement | null;
    if (!playerEl || !videoEl || !trackEl) {
      console.warn('FreezeFrame: elementi mancanti', { playerEl, videoEl, trackEl });
      return;
    }

    if (!this.freezeCanvas) {
      this.freezeCanvas = document.createElement('canvas');
      this.freezeCanvas.className = 'vjs-player-freeze';
      this.freezeCanvas.style.pointerEvents = 'none';
    }

    const rootRect = playerEl.getBoundingClientRect();
    const regionRect = trackEl.getBoundingClientRect();
    console.log('FreezeFrame: rootRect', rootRect);
    console.log('FreezeFrame: regionRect', regionRect);

    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    this.freezeCanvas.width = Math.max(1, Math.floor(regionRect.width * dpr));
    this.freezeCanvas.height = Math.max(1, Math.floor(regionRect.height * dpr));

    const left = Math.max(0, Math.round(regionRect.left - rootRect.left));
    const top = Math.max(0, Math.round(regionRect.top - rootRect.top));
    this.freezeCanvas.style.position = 'absolute';
    this.freezeCanvas.style.left = left + 'px';
    this.freezeCanvas.style.top = top + 'px';
    this.freezeCanvas.style.width = Math.round(regionRect.width) + 'px';
    this.freezeCanvas.style.height = Math.round(regionRect.height) + 'px';

    const ctx = this.freezeCanvas.getContext('2d');
    if (!ctx) {
      console.error('FreezeFrame: impossibile ottenere context 2d');
      return;
    }

    ctx.drawImage(
      videoEl,
      0,
      0,
      this.freezeCanvas.width,
      this.freezeCanvas.height
    );
    console.log('FreezeFrame: disegnato frame');

    if (!this.freezeCanvas.isConnected) {
      playerEl.appendChild(this.freezeCanvas);
      console.log('FreezeFrame: canvas aggiunto al player');
    }
    this.freezeAttiva = true;
  } catch (err) {
    console.error('FreezeFrame: errore', err);
  }
}


nascondiFreezeFrame() {
  if (this.freezeCanvas?.isConnected) {
    this.freezeCanvas.remove();
    console.log('FreezeFrame: canvas rimosso');
  }
  this.freezeAttiva = false;
}

private abilitaAudioByLabel(labelCheck: 'italiano' | 'inglese'): boolean {
  try {
    if (!this.player || !(this.player as any).audioTracks) return false;
    const tracks = (this.player as any).audioTracks();
    let found = false;
    for (let i = 0; i < tracks.length; i++) tracks[i].enabled = false;
    for (let i = 0; i < tracks.length; i++) {
      const label = (tracks[i].label || '').toLowerCase();
      if (label.includes(labelCheck)) {
        tracks[i].enabled = true;
        found = true;
      }
    }
    return found;
  } catch {
    return false;
  }
}



  private setupAudioGraph(): void {
    try {
      const tech: any = (this.player as any)?.tech?.(true);
      const videoEl: HTMLVideoElement | undefined = tech?.el?.();
      if (!videoEl) return;
      const AC: any = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!this.audioCtx) this.audioCtx = new AC();
      if (!this.gainNode && this.audioCtx) this.gainNode = this.audioCtx.createGain();
      if (!this.mediaSourceNode && this.audioCtx && this.gainNode) {
        this.mediaSourceNode = this.audioCtx.createMediaElementSource(videoEl);
        this.mediaSourceNode.connect(this.gainNode).connect(this.audioCtx.destination);
      }
      this.setGain(0);
    } catch {}
  }
  private setGain(v: number): void {
    try { if (this.gainNode) this.gainNode.gain.value = v; } catch {}
  }
  private async fadeGainTo(dest: number, ms: number): Promise<void> {
    try {
      if (!this.audioCtx || !this.gainNode) return;
      const now = this.audioCtx.currentTime;
      const g = this.gainNode.gain;
      const start = g.value;
      g.cancelScheduledValues(now);
      g.setValueAtTime(start, now);
      g.linearRampToValueAtTime(dest, now + (ms / 1000));
      await this.sleep(ms);
      g.setValueAtTime(dest, this.audioCtx.currentTime);
    } catch {}
  }
  private armFadeInOnce(): void {
    try {
      let fired = false;
      const fire = () => {
        if (fired) return; fired = true;

        try { (this.player as any).muted?.(false); } catch {}
        try {
          const tech: any = (this.player as any).tech?.(true);
          const ve: HTMLVideoElement | undefined = tech?.el?.();
          if (ve) { ve.muted = false; if (ve.volume === 0) ve.volume = 1; }
        } catch {}
        Promise.resolve(this.audioCtx?.resume?.()).catch(()=>{});

                const doFade = () => {
          if (!this.player?.paused?.()) this.fadeGainTo(1, this.FADE_PLAY_MS);
          else this.setGain(1);
        };
        const t = Number((this.player as any).currentTime?.() ?? 0);
        if (t < 0.12) setTimeout(doFade, this.WARMUP_DELAY_MS); else doFade();
      };
      if (!this.player?.paused?.()) setTimeout(fire, 0);
      (this.player as any).one?.('playing', fire);
      (this.player as any).one?.('canplay', fire);
      (this.player as any).one?.('timeupdate', fire);
      setTimeout(() => { if (!fired && !this.player?.paused?.()) fire(); }, 700);
    } catch {}
  }


  private async doppioAvvioSeRichiesto(): Promise<void> {
    console.log('[doppio] INIZIO');
    this.doppioAvvioEseguito = true;
    try {
      if (!this.player) { console.log('[doppio] USCITA: no player'); return; }
          const root = (this.player as any).el?.() as HTMLElement | null;
               const fullscreenOk = await this.waitForFullscreen(root, 2500);
     if (!fullscreenOk) {
       await this.avviaFallbackMutato();
       return;
     }
      this.mostraMascheraAvvio();
      const fallbackTimer = setTimeout(() => this.nascondiMascheraAvvio(), 30000);

      this.setGain(0);
      try { (this.player as any).muted?.(true); } catch {}

      const tracks = await this.waitForAudioTracks(2000);
      console.log('[doppio] tracks trovate:', tracks?.length);
      if (!tracks || tracks.length === 0) { console.log('[doppio] USCITA: no tracks'); return; }

      const corretta = this.deduciLinguaCorretta();
      const opposta: 'en'|'it' = (corretta === 'it') ? 'en' : 'it';

      try { (this.player as any).currentTime?.(0); } catch {}
           await this.impostaLinguaAudio(opposta, false, false);
      await this.sleep(120);
      await new Promise<void>((resolve) => {
        let ok = false;
        const onTime = () => {
          const t = Number((this.player as any).currentTime?.() ?? 0);
          if (t >= 0.08) { ok = true; off(); }
        };
        const off = () => {
          (this.player as any).off?.('timeupdate', onTime);
          resolve();
        };
        (this.player as any).on?.('timeupdate', onTime);
        Promise.resolve((this.player as any).play?.()).catch(()=>{}).finally(async () => {
          await this.sleep(600);
          if (!ok) off();
        });
      });
      this.playInterno = true;
      try { this.originalPause?.(); } catch { try { (this.player as any).pause?.(); } catch {} }
      this.playInterno = false;

      await this.sleep(150);
      try { (this.player as any).currentTime?.(0); } catch {}
      await this.impostaLinguaAudio(corretta, false, false);
      console.log('[doppio] inizio waitBuffer');
      await this.waitBufferFromZero(this.START_BUFFER_S, 12000);
      console.log('[doppio] waitBuffer completato');

     // ── FASE 1: play mutato per 2 secondi, maschera ancora attiva ──
try { (this.player as any).currentTime?.(0); } catch {}
this.setGain(0);
try { (this.player as any).muted?.(true); } catch {}
try {
  const tech: any = (this.player as any).tech?.(true);
  const ve: HTMLVideoElement | undefined = tech?.el?.();
  if (ve) { ve.muted = true; }
} catch {}

this.playInterno = true;
console.log('[doppio] fase1: play mutato 2s');
try { await Promise.resolve(this.originalPlay?.()); } catch {}
this.playInterno = false;

await this.sleep(this.WARMUP_MUTO_MS);

// ── FASE 2: pausa, torna a 0 ──
this.playInterno = true;
try { this.originalPause?.(); } catch {}
this.playInterno = false;
await this.sleep(60);
try { (this.player as any).currentTime?.(0); } catch {}

// ── FASE 3: play reale con audio, smascheramento ──
try { (this.player as any).muted?.(false); } catch {}
try {
  const tech: any = (this.player as any).tech?.(true);
  const ve: HTMLVideoElement | undefined = tech?.el?.();
  if (ve) { ve.muted = false; if (ve.volume === 0) ve.volume = 1; }
} catch {}

this.setGain(0);
this.avvioConsentito = false;

const p: any = this.player;
this.agganciaNascondiSuPrimoFrame(p, fallbackTimer);

this.playInterno = true;
console.log('[doppio] fase3: originalPlay con audio');
try { await Promise.resolve(this.originalPlay?.()); } catch (e) { console.log('[doppio] originalPlay errore:', e); }
this.playInterno = false;
console.log('[doppio] dopo originalPlay, paused:', (this.player as any).paused?.());
await this.waitMinHeadroom(2.0, 5000);
this.avvioConsentito = true;
await this.fadeGainTo(1, this.FADE_PLAY_MS);
try { this.setGain(1); } catch {}
this.doppioAvvioEseguito = true;
this.mostraMessaggioDisclaimer();


    } catch {
      await this.avviaFallbackMutato();
    }
  }

  private async impostaLinguaAudio(lang: 'en'|'it', persist = true, smooth = false): Promise<void> {
    try {
      const player: any = this.player as any;
      const tr = player.audioTracks?.();
      if (!tr) return;
      const target = (lang === 'it') ? ['italiano','italian'] : ['inglese','english'];
      for (let i=0;i<tr.length;i++) tr[i].enabled = false;
      for (let i=0;i<tr.length;i++){
        const lbl = (tr[i].label || '').toLowerCase();
        if (target.some(t => lbl.includes(t))) tr[i].enabled = true;
      }
          if (smooth) {
      const t = Number((this.player as any).currentTime?.() ?? 0);
      try {
        (this.player as any).currentTime?.(Math.max(0, t + 0.5));
        await this.sleep(30);
        (this.player as any).currentTime?.(t);
      } catch {}
    }
    } catch {}
  }
  private deduciLinguaCorretta(): 'en'|'it' {
    const saved = localStorage.getItem('video_lingua');
    if (saved === 'italiano') return 'it';
    if (saved === 'inglese')  return 'en';
    try {
      const tr: any = (this.player as any).audioTracks?.();
      if (tr) {
        for (let i=0;i<tr.length;i++){
          const lbl = (tr[i].label || '').toLowerCase();
          if (tr[i].enabled && (lbl.includes('italiano') || lbl.includes('italian'))) return 'it';
          if (tr[i].enabled && (lbl.includes('inglese')  || lbl.includes('english'))) return 'en';
        }
      }
    } catch {}
    return this.currentLang;
  }
private async waitForAudioTracks(timeoutMs: number): Promise<any[] | null> {
    const p: any = this.player;
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const tr = p?.audioTracks?.();
        if (tr && tr.length > 0) return Array.from({ length: tr.length }, (_, i) => tr[i]);
      } catch {}
      await this.sleep(50);
    }
    try {
      const tr = p?.audioTracks?.();
      if (tr && tr.length > 0) return Array.from({ length: tr.length }, (_, i) => tr[i]);
    } catch {}
    return null;
  }
  private async waitBufferFromZero(targetS: number, timeoutMs: number): Promise<boolean> {
    const start = Date.now();
    try { (this.player as any).currentTime?.(0); } catch {}
    Promise.resolve((this.player as any).play?.()).catch(()=>{});
    while (Date.now() - start < timeoutMs) {
      const end = this.calcolaBufferedEndCompat();
      if (end >= targetS - 0.1) {
        this.playInterno = true; try { this.originalPause?.(); } catch {}
        this.playInterno = false; return true;
      }
      await this.sleep(50);
    }
    this.playInterno = true; try { this.originalPause?.(); } catch {}
    this.playInterno = false; return false;
  }
  private calcolaBufferedEndCompat(): number {
    try {
      const tech: any = (this.player as any).tech?.(true);
      const el = tech?.el?.();
      const tr: TimeRanges | undefined = (this.player as any)?.buffered?.() ?? el?.buffered;
      const ct = Number((this.player as any).currentTime?.() ?? 0);
      if (!tr || tr.length === 0) return ct;
      let end = Number(tr.end(tr.length - 1) ?? ct);
      for (let i=0;i<tr.length;i++){
        const s = Number(tr.start(i) ?? 0);
        const e = Number(tr.end(i) ?? ct);
        if (s <= ct && ct <= e) { end = e; break; }
      }
      return end;
    } catch { return Number((this.player as any).currentTime?.() ?? 0); }
  }
  private sleep(ms:number){ return new Promise<void>(r=>setTimeout(r,ms)); }


  private startupMaskEl: HTMLDivElement | null = null;

  private creaMascheraAvvio(): void {
    try {
      if (!this.player) return;
      const root = (this.player as any).el?.() as HTMLElement | null;
      if (!root) return;
      if (!this.startupMaskEl) {
         this.startupMaskEl = document.createElement('div');
 this.startupMaskEl.className = 'vjs-startup-mask vjs-startup-mask--hide';
        root.appendChild(this.startupMaskEl);
      }
    } catch {}
  }
    private mostraMascheraAvvio(): void {
    this.creaMascheraAvvio();
    try {
            const root = (this.player as any)?.el?.() as HTMLElement | null;
      if (root && this.startupMaskEl) { try { root.appendChild(this.startupMaskEl); } catch {} }
      this.startupMaskEl?.classList.remove('vjs-startup-mask--hide');
      void (this.startupMaskEl?.offsetWidth);
      this.setGain(0);
      try { (this.player as any)?.muted?.(true); } catch {}
    } catch {}
    setTimeout(() => {
      try { this.startupMaskEl?.classList.remove('vjs-startup-mask--hide'); } catch {}
    }, 0);
  }
  private nascondiMascheraAvvio(): void {
    if (!this.startupMaskEl) return;
    this.startupMaskEl.classList.add('vjs-startup-mask--hide');
    this.schedaPronta.impostaHeaderNascosto(false);
  }


  private agganciaNascondiSuPrimoFrame(p: any, fallbackTimer: any): void {
    const tech: any = p?.tech?.(true);
    const video: HTMLVideoElement | undefined = tech?.el?.();
    let done = false;
    const cleanup = () => {
      if (done) return; done = true;
      p.off?.('loadeddata', onLoadedPaint);
      p.off?.('playing', onLoadedPaint);
      p.off?.('timeupdate', onLoadedPaint);
    };
        const hideNow = () => {
      cleanup();
      this.waitMinHeadroom(2.0, 5000).finally(() => {
        this.nascondiMascheraAvvio();
        clearTimeout(fallbackTimer);
      });
    };
    const onLoadedPaint = () => {
      requestAnimationFrame(() => requestAnimationFrame(hideNow));
    };
    try {
      if (video && (video as any).requestVideoFrameCallback) {
        (video as any).requestVideoFrameCallback(() => hideNow());
      } else {
        p.on?.('loadeddata', onLoadedPaint);
        p.on?.('playing', onLoadedPaint);
        p.on?.('timeupdate', onLoadedPaint);
      }
      if (video && video.readyState >= 2) onLoadedPaint();
    } catch {
      p.on?.('loadeddata', onLoadedPaint);
    }
  }


private isInFullscreen(target: HTMLElement | null): boolean {
  const d = document as any;
  const fsEl: Element | null =
    document.fullscreenElement ||
    d.webkitFullscreenElement ||
    d.mozFullScreenElement ||
    d.msFullscreenElement || null;

  return !!(fsEl && target && (fsEl === target || target.contains(fsEl)));
}

private waitForFullscreen(target: HTMLElement | null, timeoutMs = 2500): Promise<boolean> {
  if (this.isInFullscreen(target)) return Promise.resolve(true);
  return new Promise((resolve) => {
    let done = false;
    const d = document as any;
    const onChange = () => {
      if (done) return;
      if (this.isInFullscreen(target)) {
        done = true;
        cleanup();
        resolve(true);
      }
    };
    const cleanup = () => {
      document.removeEventListener('fullscreenchange', onChange);
      d.removeEventListener?.('webkitfullscreenchange', onChange);
      d.removeEventListener?.('mozfullscreenchange', onChange);
      d.removeEventListener?.('MSFullscreenChange', onChange);
    };
    document.addEventListener('fullscreenchange', onChange);
    d.addEventListener?.('webkitfullscreenchange', onChange);
    d.addEventListener?.('mozfullscreenchange', onChange);
    d.addEventListener?.('MSFullscreenChange', onChange);

    setTimeout(() => {
      if (done) return;
      done = true;
      cleanup();
      resolve(false);
    }, timeoutMs);
  });
}

private async waitMinHeadroom(minHeadroomSec = 2.0, timeoutMs = 4000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    let ct = 0;
    try { ct = Number((this.player as any).currentTime?.() ?? 0); } catch {}
    const end = this.calcolaBufferedEndCompat();
    const headroom = end - ct;

    let readyOk = true;
    try {
      const tech: any = (this.player as any).tech?.(true);
      const ve: HTMLVideoElement | undefined = tech?.el?.();
      readyOk = !!ve && ve.readyState >= 3;
    } catch {}

    if (readyOk && headroom >= minHeadroomSec) return true;
    await this.sleep(50);
  }
  return false;
}


 private async avviaFallbackMutato(): Promise<void> {
  try {
    if (!this.player) return;
    this.avvioConsentito = false;
    this.setGain(0);
    try { (this.player as any).muted?.(true); } catch {}
    try {
      const tech: any = (this.player as any).tech?.(true);
      const ve: HTMLVideoElement | undefined = tech?.el?.();
      if (ve) ve.muted = true;
    } catch {}

    this.playInterno = true;
    try { await Promise.resolve(this.originalPlay?.()); } catch {}
    this.playInterno = false;

    const p: any = this.player;
    const fallbackTimer = setTimeout(() => this.nascondiMascheraAvvio(), 30000);
    this.agganciaNascondiSuPrimoFrame(p, fallbackTimer);

    // ← FIX: ora il video è avviato, l'utente può togliere il mute
    this.avvioConsentito = true;
    this.mostraMessaggioDisclaimer();
  } catch {}
}

private mostraMessaggioDisclaimer(ritardoMs = 4000): void {
  setTimeout(() => {
    try {
      const playerEl = (this.player as any).el?.() as HTMLElement | null;
      if (!playerEl) return;
      const msg = document.createElement('div');
      msg.className = 'vjs-startup-message';
      msg.textContent = this.translate.instant('ui.videojs.disclaimer');
      playerEl.appendChild(msg);
      setTimeout(() => msg.remove(), 9500); // rimuovi dopo l'animazione
    } catch {}
  }, ritardoMs);
}
}



