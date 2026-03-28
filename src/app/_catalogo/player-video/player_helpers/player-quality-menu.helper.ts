// ─── player-quality-menu.helper.ts ───────────────────────────────────────────
// Definisce e registra QualityMenuButton / QualityMenuItem sulla control bar.
// Estratto dalla sezione omonima di player-video.component.ts.

import videojs from 'video.js';
import { TranslateService }   from '@ngx-translate/core';
import { PlayerStateContext } from '../player_utility/player-state.context';
import { PlayerAudioService } from '../player_service/player-audio.service';

export class PlayerQualityMenuHelper {

  constructor(
    private ctx:        PlayerStateContext,
    private audio:      PlayerAudioService,
    private translate:  TranslateService,
    private onFreezeShow:           (p: any) => void,
    private onFreezeHide:           ()       => void,
    private onAggiornaSottotitoli:  ()       => void,
  ) {}

  // ── Estratto dalla registrazione QualityMenuButton in ngAfterViewInit ─────
  registra(controlBar: any): void {
    const MenuButton = videojs.getComponent('MenuButton') as any;
    const MenuItem   = videojs.getComponent('MenuItem')   as any;
    const self       = this;

    const QualityMenuItem = class extends (MenuItem as any) {
      private tipo:  'auto'|'1080'|'720'|'360';
      private label: string;

      constructor(player: any, options: any) {
        super(player, options);
        this.tipo  = options.tipo;
        this.label = options.label;
        (this as any)['addClass']('vjs-quality-menu-item');
        (this as any)['updateLabel']();
      }

      async handleClick() {
        const p           = (this as any)['player_'];
        const currentTime = p.currentTime();
        const isPaused    = p.paused();
        const url         = self.urlPerTipo(this.tipo);
        if (!url) return;

        await Promise.resolve(self.audio.audioCtx?.resume?.()).catch(() => {});
        await self.audio.fadeGainTo(0, self.audio.FADE_PAUSA_MS);
        self.onFreezeShow(p);
        p.src({ src: url, type: 'application/x-mpegURL' });

        const rimuoviFreeze = () => {
          self.onFreezeHide();
          p.off('loadeddata', rimuoviFreeze);
          p.off('error',      rimuoviFreeze);
        };
        p.on('loadeddata', rimuoviFreeze);
        p.on('error',      rimuoviFreeze);

        p.ready(() => {
          p.currentTime(currentTime);
          if (!isPaused) p.play();
          self.onAggiornaSottotitoli();
        });

        const items =
          p.getChild('ControlBar')?.getChild('QualityMenuButton')?.menu?.children?.() || [];
        items.forEach((item: any) => item?.updateLabel?.());
      }

      updateLabel() {
        const p          = (this as any)['player_'];
        const currentSrc = p.currentSource?.()?.src || '';
        const urlCorrente = self.urlPerTipo(this.tipo);
        const selected    = !!urlCorrente && currentSrc.includes(urlCorrente);
        const el          = (this as any)['el']() as HTMLElement;
        el.classList.toggle('vjs-selected', selected);
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
        return [
          { label: 'Auto',  tipo: 'auto' as const },
          { label: '1080p', tipo: '1080' as const },
          { label: '720p',  tipo: '720'  as const },
          { label: '360p',  tipo: '360'  as const },
        ].map(q => new (QualityMenuItem as any)((this as any)['player_'], q));
      }
    };

    (videojs as any).registerComponent('QualityMenuButton', QualityMenuButton as any);
    controlBar?.addChild('QualityMenuButton', {});
  }

  // ── Estratto da aggiornaVociMenuQualita() ─────────────────────────────────
  aggiornaVociMenuQualita(player: any): void {
    try {
      const items =
        player?.getChild?.('ControlBar')
          ?.getChild?.('QualityMenuButton')
          ?.menu?.children?.() || [];
      items.forEach((it: any) => it.updateLabel?.());
    } catch {}
  }

  private urlPerTipo(tipo: 'auto'|'1080'|'720'|'360'): string {
    switch (tipo) {
      case 'auto': return this.ctx.URL_MASTER;
      case '1080': return this.ctx.URL_1080;
      case '720':  return this.ctx.URL_720;
      case '360':  return this.ctx.URL_360;
    }
  }
}
