// ─── player-ad-break.helper.ts ───────────────────────────────────────────────
// Tutta la logica ad break: rilevamento utente, accumulo visione, avvio/ripresa.
// Estratto da player-video.component.ts: utenteVedePublicita, gestisciTimeUpdate,
// avviaAdBreak, gestisciFineVideo, riprendiDopoAd.

import { take }              from 'rxjs/operators';
import { TranslateService }  from '@ngx-translate/core';
import { ApiService }        from 'src/app/_servizi_globali/api.service';
import { BarraAvanzamentoService } from 'src/app/_componenti_comuni/barra-avanzamento/barra-avanzamento.service';
import { PlayerStateContext } from '../player_utility/player-state.context';
import { PlayerAudioService } from '../player_service/player-audio.service';

export class PlayerAdBreakHelper {

  adInCorso                              = false;
  intervallo_ad_s                        = 20;

  private tempoVisioneAccumulato         = 0;
  private ultimoCurrentTime              = -1;
  private tempoRitornoDopoAd             = 0;
  private _vedePublicita: boolean | null = null;

  private adVideoEl:             HTMLVideoElement | null = null;
  private adTimeUpdateHandler:   any = null;
  private adLoadedMetadataHandler: any = null;

  constructor(
    private ctx:                  PlayerStateContext,
    private audio:                PlayerAudioService,
    private api:                  ApiService,
    private barraAvanzamentoService: BarraAvanzamentoService,
    private translate:            TranslateService,
    private getBarraAdEl:         () => HTMLElement | undefined,
  ) {}

  // ── Estratto da utenteVedePublicita() ─────────────────────────────────────
  utenteVedePublicita(): boolean {
    if (this._vedePublicita !== null) return this._vedePublicita;
    try {
      const authRaw = localStorage.getItem('auth') ?? sessionStorage.getItem('auth');
      if (authRaw) {
        const auth             = JSON.parse(authRaw);
        const abilita: number[] = auth?.abilita ?? [];
        this._vedePublicita    = abilita.includes(3);
        return this._vedePublicita;
      }
      this._vedePublicita = false;
      return false;
    } catch {
      this._vedePublicita = false;
      return false;
    }
  }

  // ── Estratto da gestisciTimeUpdate() ──────────────────────────────────────
  gestisciTimeUpdate(): void {
    if (this.adInCorso)                  return;
    if (!this.ctx.avvioConsentito)       return;
    if (!this.utenteVedePublicita())     return;

    const ct = Number(this.ctx.player?.currentTime?.() ?? 0);
    if (this.ultimoCurrentTime >= 0) {
      const delta = ct - this.ultimoCurrentTime;
      if (delta > 0 && delta < 2) this.tempoVisioneAccumulato += delta;
    }
    this.ultimoCurrentTime = ct;

    if (this.tempoVisioneAccumulato >= this.intervallo_ad_s) {
      this.tempoVisioneAccumulato = 0;
      this.avviaAdBreak();
    }
  }

  // ── Estratto da avviaAdBreak() ────────────────────────────────────────────
  async avviaAdBreak(): Promise<void> {
    if (this.adInCorso) return;
    this.adInCorso = true;

    let idPubblicita = 1;
    try {
      const res    = await this.api.getProssimaPublicita().pipe(take(1)).toPromise();
      idPubblicita = res?.data?.id_pubblicita ?? 1;
    } catch {}

    const lingua = localStorage.getItem('video_lingua') === 'italiano' ? 'it' : 'en';
    const urlAd  = `https://d2kd3i5q9rl184.cloudfront.net/pubblicita/pub_${idPubblicita}_${lingua}.mp4`;

    this.adVideoEl            = document.createElement('video');
    this.adVideoEl.style.cssText = `
      position: absolute; inset: 0; width: 100%; height: 100%;
      z-index: 100; background: #000; object-fit: contain; visibility: hidden;
    `;
    this.adVideoEl.playsInline = true;
    this.adVideoEl.volume      = 1;
    this.adVideoEl.muted       = false;
    this.adVideoEl.preload     = 'auto';
    this.adVideoEl.src         = urlAd;

    this.barraAvanzamentoService.resetBarraAvanzamento();
    this.adLoadedMetadataHandler = () =>
      this.barraAvanzamentoService.aggiornaBarraDaValori(0, Number(this.adVideoEl?.duration ?? 0));
    this.adTimeUpdateHandler = () =>
      this.barraAvanzamentoService.aggiornaBarraDaValori(
        Number(this.adVideoEl?.currentTime ?? 0),
        Number(this.adVideoEl?.duration    ?? 0),
      );

    this.adVideoEl.addEventListener('loadedmetadata', this.adLoadedMetadataHandler);
    this.adVideoEl.addEventListener('timeupdate',     this.adTimeUpdateHandler);

    const playerEl = this.ctx.player?.el?.() as HTMLElement;
    playerEl.appendChild(this.adVideoEl);

    // Aspetta buffer prima di interrompere il film
    let adCaricato = false;
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 4000);
      this.adVideoEl!.addEventListener('canplay', () => {
        adCaricato = true; clearTimeout(timeout); resolve();
      }, { once: true });
      this.adVideoEl!.addEventListener('error', () => {
        clearTimeout(timeout); resolve();
      }, { once: true });
      this.adVideoEl!.load();
    });

    if (!adCaricato) {
      this.adVideoEl?.remove(); this.adVideoEl = null; this.adInCorso = false; return;
    }

    // Solo ora stoppa il film
    const playerElRoot = this.ctx.player?.el?.() as HTMLElement | null;
    playerElRoot?.classList.add('ad-in-corso');
    await this.audio.fadeGainTo(0, this.audio.FADE_PAUSA_MS);
    this.tempoRitornoDopoAd  = Number(this.ctx.player?.currentTime?.() ?? 0);
    this.ctx.playInterno     = true;
    try { this.ctx.originalPause?.(); } catch {}
    this.ctx.playInterno     = false;

    this.adVideoEl.style.visibility = 'visible';

    const adLabel       = document.createElement('div');
    adLabel.id          = 'ad-label';
    adLabel.textContent = this.translate.instant('ui.videojs.ad_label');
    playerEl.appendChild(adLabel);

    const barraEl = this.getBarraAdEl();
    if (barraEl) playerEl.appendChild(barraEl);

    this.adVideoEl.addEventListener('ended', () => this.riprendiDopoAd());
    this.adVideoEl.addEventListener('error', () => this.riprendiDopoAd());
    this.adVideoEl.play().catch(() => this.riprendiDopoAd());
  }

  // ── Estratto da gestisciFineVideo() ───────────────────────────────────────
  gestisciFineVideo(): void {
    if (this.adInCorso) this.riprendiDopoAd();
  }

  // ── Estratto da riprendiDopoAd() ──────────────────────────────────────────
  async riprendiDopoAd(): Promise<void> {
    if (this.adVideoEl) {
      if (this.adLoadedMetadataHandler)
        this.adVideoEl.removeEventListener('loadedmetadata', this.adLoadedMetadataHandler);
      if (this.adTimeUpdateHandler)
        this.adVideoEl.removeEventListener('timeupdate', this.adTimeUpdateHandler);
      this.adVideoEl.pause();
      this.adVideoEl.remove();
      this.adVideoEl = null;
    }
    this.adLoadedMetadataHandler = null;
    this.adTimeUpdateHandler     = null;
    this.barraAvanzamentoService.resetBarraAvanzamento();
    document.getElementById('ad-label')?.remove();
    this.getBarraAdEl()?.remove();

    this.adInCorso         = false;
    this.ultimoCurrentTime = -1;
    const playerElRoot = this.ctx.player?.el?.() as HTMLElement | null;
    playerElRoot?.classList.remove('ad-in-corso');

    try { this.ctx.player?.currentTime?.(this.tempoRitornoDopoAd); } catch {}
    this.ctx.playInterno = true;
    try { await Promise.resolve(this.ctx.originalPlay?.()); } catch {}
    this.ctx.playInterno = false;
    await this.audio.fadeGainTo(1, this.audio.FADE_PLAY_MS);
  }

  destroy(): void {
    if (this.adVideoEl) {
      if (this.adLoadedMetadataHandler)
        this.adVideoEl.removeEventListener('loadedmetadata', this.adLoadedMetadataHandler);
      if (this.adTimeUpdateHandler)
        this.adVideoEl.removeEventListener('timeupdate', this.adTimeUpdateHandler);
    }
    this.barraAvanzamentoService.resetBarraAvanzamento();
  }
}
