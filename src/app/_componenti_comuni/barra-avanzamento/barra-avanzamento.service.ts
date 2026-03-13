import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class BarraAvanzamentoService {
  percentualeAvanzamento = 0;
  percentualeBuffer = 0;
  durataTotaleMs = 0;
  posizioneCorrenteMs = 0;
  tempoCorrenteTesto = '00:00';
  durataTotaleTesto = '00:00';

  gestoreAggiornaTempo: any = null;
  gestoreAggiornaBuffer: any = null;

  private _rafId: number | null = null;
  private _ultimoTempoReale = 0;
  private _ultimoTimestamp = 0;
  private _durataSec = 0;
  _inPlay = false;

  collegaAggiornamentoBarra(
    player: any,
    ottieniElementoVideoReale: () => any,
  ): void {
    try {
      if (!player) return;

      this.scollegaAggiornamentoBarra(player);

      this.gestoreAggiornaTempo = () => {
        const corrente = this.secondiCorrentiSicuri(player);
        const durata = this.durataInSecondiSicura(player);
        this._inPlay = !player.paused();
        this.aggiornaBarraDaValori(corrente, durata);
      };

      this.gestoreAggiornaBuffer = () => {
        const durata = this.durataInSecondiSicura(player);
        this.aggiornaBufferDaElementi(ottieniElementoVideoReale(), durata);
      };

      player.on('timeupdate', this.gestoreAggiornaTempo);
      player.on('seeking', this.gestoreAggiornaTempo);
      player.on('loadedmetadata', this.gestoreAggiornaBuffer);
      player.on('durationchange', this.gestoreAggiornaBuffer);
      player.on('progress', this.gestoreAggiornaBuffer);
    } catch {}
  }

  scollegaAggiornamentoBarra(player: any): void {
    try {
      if (!player) return;

      if (this.gestoreAggiornaTempo) {
        player.off('timeupdate', this.gestoreAggiornaTempo);
        player.off('seeking', this.gestoreAggiornaTempo);
      }

      if (this.gestoreAggiornaBuffer) {
        player.off('loadedmetadata', this.gestoreAggiornaBuffer);
        player.off('durationchange', this.gestoreAggiornaBuffer);
        player.off('progress', this.gestoreAggiornaBuffer);
      }
    } catch {}

    this.gestoreAggiornaTempo = null;
    this.gestoreAggiornaBuffer = null;
  }

  resetBarraAvanzamento(): void {
    if (this._rafId !== null) cancelAnimationFrame(this._rafId);
    this._rafId = null;
    this._inPlay = false;
    this.percentualeAvanzamento = 0;
    this.percentualeBuffer = 0;
    this.durataTotaleMs = 0;
    this.posizioneCorrenteMs = 0;
    this.tempoCorrenteTesto = '00:00';
    this.durataTotaleTesto = '00:00';
  }

 aggiornaBarraDaValori(correnteSec: number, durataSec: number): void {
    if (!isFinite(durataSec) || durataSec <= 0) {
      this.percentualeAvanzamento = 0;
      this.posizioneCorrenteMs = 0;
      this.durataTotaleMs = 0;
      this.tempoCorrenteTesto = '00:00';
      this.durataTotaleTesto = '00:00';
      if (this._rafId !== null) cancelAnimationFrame(this._rafId);
      this._rafId = null;
      return;
    }

    this._ultimoTempoReale = correnteSec;
    this._ultimoTimestamp = performance.now();
    this._durataSec = durataSec;

    this.durataTotaleMs = Math.round(durataSec * 1000);
    this.durataTotaleTesto = this.formattaMinutiSecondi(durataSec);

    if (this._rafId === null) this._avviaRaf();
  }

  private _avviaRaf(): void {
    const tick = (now: number) => {
      const elapsed = (now - this._ultimoTimestamp) / 1000;
      const interpolato = this._inPlay
        ? Math.min(this._ultimoTempoReale + elapsed, this._durataSec)
        : this._ultimoTempoReale;

      const clamp = Math.max(0, Math.min(interpolato, this._durataSec));
      this.percentualeAvanzamento = (clamp / this._durataSec) * 100;
      this.posizioneCorrenteMs = Math.round(clamp * 1000);
      this.tempoCorrenteTesto = this.formattaMinutiSecondi(clamp);

      this._rafId = requestAnimationFrame(tick);
    };
    this._rafId = requestAnimationFrame(tick);
  }

  aggiornaBufferDaElementi(el: any, durataSec: number): void {
    try {
      if (!el || !isFinite(durataSec) || durataSec <= 0) {
        this.percentualeBuffer = 0;
        return;
      }

      let fineBuffer = 0;
      if (el.buffered && el.buffered.length > 0) {
        fineBuffer = el.buffered.end(el.buffered.length - 1);
      }

      const perc = Math.max(0, Math.min(100, (fineBuffer / durataSec) * 100));
      this.percentualeBuffer = perc;
    } catch {
      this.percentualeBuffer = 0;
    }
  }

  secondiCorrentiSicuri(player: any): number {
    try {
      return typeof player?.currentTime === 'function'
        ? Number(player.currentTime())
        : 0;
    } catch {
      return 0;
    }
  }

  durataInSecondiSicura(player: any): number {
    try {
      return typeof player?.duration === 'function'
        ? Number(player.duration())
        : 0;
    } catch {
      return 0;
    }
  }

  formattaMinutiSecondi(sec: number): string {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    const mm = m.toString().padStart(2, '0');
    const ss = r.toString().padStart(2, '0');
    return `${mm}:${ss}`;
  }

  saltaAConClick(evento: MouseEvent, player: any): void {
    try {
      if (!player) return;
      const target = evento.currentTarget as HTMLElement;
      if (!target) return;

      const rett = target.getBoundingClientRect();
      const x = Math.min(Math.max(evento.clientX - rett.left, 0), rett.width);
      const frazione = rett.width > 0 ? x / rett.width : 0;

      const durata = this.durataInSecondiSicura(player);
      if (!isFinite(durata) || durata <= 0) return;

      const nuoviSec = frazione * durata;

      try {
        player.currentTime(nuoviSec);
      } catch {}

      this.aggiornaBarraDaValori(nuoviSec, durata);
    } catch {}
  }
}
