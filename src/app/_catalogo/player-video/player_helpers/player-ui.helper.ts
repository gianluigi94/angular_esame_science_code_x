// ─── player-ui.helper.ts ─────────────────────────────────────────────────────
// Gestisce tutto ciò che è puramente UI/DOM:
//   • freeze frame al cambio qualità
//   • cerchio centrale play/pausa
//   • scomparsa control bar per inattività
//   • toggle tempo corrente / rimanente
//   • aggiornamento etichette menu (audio + sottotitoli)
// Estratto da player-video.component.ts.

import { TranslateService } from '@ngx-translate/core';

export class PlayerUiHelper {

  // ── Stato pubblico letto dal componente per il template ───────────────────
  playerInPausa                             = true;

  // ── Stato freeze frame ────────────────────────────────────────────────────
  freezeCanvas: HTMLCanvasElement | null    = null;
  freezeAttiva                              = false;

  private inactivityTimeout?: ReturnType<typeof setTimeout>;

  constructor(private translate: TranslateService) {}

  // ── Freeze Frame ──────────────────────────────────────────────────────────
  // Estratto da mostraFreezeFrame()
  mostraFreezeFrame(p: any): void {
    try {
      const playerEl = p?.el?.()   as HTMLElement     | null;
      const videoEl  = playerEl?.querySelector('video.vjs-tech') as HTMLVideoElement | null;
      const trackEl  = playerEl?.querySelector('.vjs-text-track-display') as HTMLElement | null;
      if (!playerEl || !videoEl || !trackEl) return;

      if (!this.freezeCanvas) {
        this.freezeCanvas = document.createElement('canvas');
        this.freezeCanvas.className           = 'vjs-player-freeze';
        this.freezeCanvas.style.pointerEvents = 'none';
      }

      const rootRect   = playerEl.getBoundingClientRect();
      const regionRect = trackEl.getBoundingClientRect();
      const dpr        = Math.max(1, Math.floor(window.devicePixelRatio || 1));

      this.freezeCanvas.width  = Math.max(1, Math.floor(regionRect.width  * dpr));
      this.freezeCanvas.height = Math.max(1, Math.floor(regionRect.height * dpr));

      const left = Math.max(0, Math.round(regionRect.left - rootRect.left));
      const top  = Math.max(0, Math.round(regionRect.top  - rootRect.top));
      Object.assign(this.freezeCanvas.style, {
        position: 'absolute',
        left:     left + 'px',
        top:      top  + 'px',
        width:    Math.round(regionRect.width)  + 'px',
        height:   Math.round(regionRect.height) + 'px',
      });

      const ctx = this.freezeCanvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(videoEl, 0, 0, this.freezeCanvas.width, this.freezeCanvas.height);
      if (!this.freezeCanvas.isConnected) playerEl.appendChild(this.freezeCanvas);
      this.freezeAttiva = true;
    } catch {}
  }

  // Estratto da nascondiFreezeFrame()
  nascondiFreezeFrame(): void {
    if (this.freezeCanvas?.isConnected) this.freezeCanvas.remove();
    this.freezeAttiva = false;
  }

  // ── Cerchio centrale play / pausa ─────────────────────────────────────────
  // Estratto dai listener player.on('play') e player.on('pause')
  onPlay(): void {
    this.playerInPausa = false;
    const cerchio = document.querySelector('.vjs-cerchio-centrale') as HTMLElement | null;
    if (cerchio) {
      cerchio.classList.remove('fisso');
      cerchio.classList.remove('visibile');
    }
  }

  onPause(): void {
    const cerchio = document.querySelector('.vjs-cerchio-centrale') as HTMLElement | null;
    if (!cerchio) { this.playerInPausa = true; return; }

    if (cerchio.classList.contains('visibile') && !cerchio.classList.contains('fisso')) {
      cerchio.classList.remove('visibile');
      setTimeout(() => {
        this.playerInPausa = true;
        cerchio.classList.add('visibile');
        cerchio.classList.add('fisso');
      }, 320);
    } else {
      this.playerInPausa = true;
      cerchio.classList.add('visibile');
      cerchio.classList.add('fisso');
    }
  }

  // ── Inattività (control bar + cerchio) ────────────────────────────────────
  // Estratto dai listener mousemove / touchstart su videoElement
  bindInactivity(videoElement: HTMLElement): void {
    videoElement.addEventListener('mousemove',  () => this.onActivity(true));
    videoElement.addEventListener('touchstart', () => this.onActivity(false));
    this.inactivityTimeout = setTimeout(() => {}, 2000);
  }

  private onActivity(withCerchio: boolean): void {
    const cb = document.querySelector('.vjs-control-bar.show-control-bar') as HTMLElement | null;
    if (cb) cb.classList.remove('vjs-control-bar-transition');

    if (withCerchio) {
      const cerchio = document.querySelector('.vjs-cerchio-centrale') as HTMLElement | null;
      if (cerchio) cerchio.classList.add('visibile');
    }

    clearTimeout(this.inactivityTimeout);
    this.inactivityTimeout = setTimeout(() => {
      const cb2 = document.querySelector('.vjs-control-bar.show-control-bar') as HTMLElement | null;
      if (cb2) {
        cb2.classList.remove('show-control-bar');
        cb2.classList.add('vjs-control-bar-transition');
      }
      if (withCerchio) {
        const cerchio = document.querySelector('.vjs-cerchio-centrale') as HTMLElement | null;
        if (cerchio && !cerchio.classList.contains('fisso')) cerchio.classList.remove('visibile');
      }
    }, 2000);
  }

  // ── Toggle corrente / rimanente ───────────────────────────────────────────
  // Estratto dal setTimeout(..., 200) in ngAfterViewInit
  bindTimeToggle(playerEl: HTMLElement): void {
    const aggiornaTitle = (mostraTrascorso: boolean) => {
      const ct    = playerEl.querySelector('.vjs-current-time')   as HTMLElement | null;
      const rt    = playerEl.querySelector('.vjs-remaining-time') as HTMLElement | null;
      const title = mostraTrascorso
        ? this.translate.instant('ui.videojs.mostra_rimanente')
        : this.translate.instant('ui.videojs.mostra_trascorso');
      if (ct) ct.title = title;
      if (rt) rt.title = title;
    };

    const toggleDisplay = () => {
      const ct = playerEl.querySelector('.vjs-current-time')   as HTMLElement | null;
      const rt = playerEl.querySelector('.vjs-remaining-time') as HTMLElement | null;
      if (!ct || !rt) return;
      if (rt.style.display !== 'none') {
        rt.style.display = 'none'; ct.style.display = 'block'; aggiornaTitle(true);
      } else {
        rt.style.display = 'block'; ct.style.display = 'none'; aggiornaTitle(false);
      }
    };

    aggiornaTitle(false);
    playerEl.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.closest('.vjs-current-time') || target.closest('.vjs-remaining-time'))
        toggleDisplay();
    });
  }

  // ── Etichette menu audio + sottotitoli ────────────────────────────────────
  // Estratto da updateMenuLabels()
  updateMenuLabels(): void {
    setTimeout(() => {
      const lang = localStorage.getItem('lingua_utente') === 'italiano' ? 'it' : 'en';

      document.querySelectorAll('.vjs-audio-button .vjs-menu-content .vjs-menu-item')
        .forEach((item) => {
          const t = item.textContent?.trim().toLowerCase();
          if (t?.includes('inglese')  || t?.includes('english'))
            item.textContent = lang === 'it' ? 'Inglese'  : 'English';
          if (t?.includes('italiano') || t?.includes('italian'))
            item.textContent = lang === 'it' ? 'Italiano' : 'Italian';
        });

      document.querySelectorAll('.vjs-subs-caps-button .vjs-menu-content .vjs-menu-item')
        .forEach((item) => {
          const t = item.textContent?.trim().toLowerCase();
          if (
            t?.includes('caption settings') || t?.includes('captions settings')  ||
            t?.includes('subtitle setting') || t?.includes('subtitle settings')  ||
            t?.includes('subtitle option')  || t?.includes('subtitle options')   ||
            t?.includes('subtitles setting')|| t?.includes('subtitles settings') ||
            t?.includes('opzioni sottotitoli')
          ) { item.textContent = lang === 'it' ? 'Opzioni sottotitoli' : 'Subtitle options'; }

          if (t === 'off' || t?.includes('caption off') ||
              t?.includes('subtitles off') || t?.includes('sottotitoli off'))
            item.textContent = lang === 'it' ? 'Sottotitoli Off' : 'Subtitles Off';

          if (t?.includes('english') || t?.includes('inglese'))
            item.textContent = lang === 'it' ? 'Inglese'  : 'English';
          if (t?.includes('italian') || t?.includes('italiano'))
            item.textContent = lang === 'it' ? 'Italiano' : 'Italian';
        });
    }, 100);
  }
}
