// Service che gestisce AudioContext, GainNode e tutta la logica di volume e fade del player.

import { Injectable } from '@angular/core';
import { sleep } from '../player_utility/player-buffer.utils';

@Injectable()
export class PlayerAudioService {
  audioCtx: AudioContext | null = null; // AudioContext usato dal player
  gainNode: GainNode | null = null; // GainNode usato per volume e fade
  mediaSourceNode: MediaElementAudioSourceNode | null = null; // sorgente Web Audio collegata al video reale

  readonly FADE_PAUSA_MS = 280; // durata del fade in pausa
  readonly FADE_PLAY_MS = 320; // durata del fade in play
  readonly WARMUP_DELAY_MS = 90; // piccolo ritardo di warmup prima del fade in iniziale

  /**
   * Inizializza il grafo Web Audio collegandolo al video reale del player.
   * - Recupera il tech e il vero elemento video
   * - Crea AudioContext e GainNode se non esistono ancora
   * - Crea la MediaElementSource una sola volta
   * - Collega sorgente, gain e destinazione finale
   * - Porta subito il gain a zero
   *
   * @param player Istanza del player da cui recuperare il video reale.
   * @returns void
   */
  setupAudioGraph(player: any): void {
    try {
      const tech: any = player?.tech?.(true); // recupero il tech corrente del player
      const videoEl: HTMLVideoElement | undefined = tech?.el?.(); // recupero il vero elemento video del tech
      if (!videoEl) return; // se non trovo il video reale esco subito
      const AC: any =
        (window as any).AudioContext || (window as any).webkitAudioContext; // recupero il costruttore AudioContext compatibile col browser
      if (!this.audioCtx) this.audioCtx = new AC(); // se il contesto audio non esiste lo creo
      if (!this.gainNode && this.audioCtx)
        this.gainNode = this.audioCtx.createGain(); // se il gain node non esiste lo creo
      if (!this.mediaSourceNode && this.audioCtx && this.gainNode) {
        this.mediaSourceNode = this.audioCtx.createMediaElementSource(videoEl); // creo la sorgente Web Audio collegata al video reale
        this.mediaSourceNode
          .connect(this.gainNode)
          .connect(this.audioCtx.destination); // collego sorgente, gain e uscita audio finale
      }
      this.setGain(0); // porto subito il gain a zero dopo il setup
    } catch {} // ignoro eventuali errori durante il setup del grafo audio
  }

  /**
   * Imposta immediatamente il valore del gain.
   *
   * @param v Valore di gain da applicare.
   * @returns void
   */
  setGain(v: number): void {
    try {
      if (this.gainNode) this.gainNode.gain.value = v;
    } catch {} // se il gain node esiste imposto direttamente il suo valore
  }

  /**
   * Esegue un fade del gain fino al valore richiesto.
   * - Verifica che AudioContext e GainNode siano disponibili
   * - Cancella eventuali automazioni precedenti
   * - Parte dal valore attuale del gain
   * - Applica un ramp lineare fino al valore finale
   * - Attende la durata prevista e riallinea il valore finale
   *
   * @param dest Valore finale del gain.
   * @param ms Durata del fade in millisecondi.
   * @returns Promise<void>
   */
  async fadeGainTo(dest: number, ms: number): Promise<void> {
    try {
      if (!this.audioCtx || !this.gainNode) return; // se non ho contesto audio o gain node esco subito
      const now = this.audioCtx.currentTime; // leggo il tempo corrente del contesto audio
      const g = this.gainNode.gain; // recupero l'AudioParam del gain
      g.cancelScheduledValues(now); // annullo eventuali automazioni gia' schedulate da ora in avanti
      g.setValueAtTime(g.value, now); // fisso come punto di partenza il valore attuale del gain
      g.linearRampToValueAtTime(dest, now + ms / 1000); // programmo il ramp lineare fino al valore finale richiesto
      await sleep(ms); // aspetto il tempo del fade
      g.setValueAtTime(dest, this.audioCtx.currentTime); // riallineo esplicitamente il gain al valore finale
    } catch {} // ignoro eventuali errori durante il fade
  }

  /**
   * Prepara un solo fade-in automatico al primo evento utile di avvio del player.
   * - Evita esecuzioni multiple tramite un flag interno
   * - Toglie il mute al player e al video reale
   * - Prova a riattivare l'AudioContext
   * - Decide se fare il fade subito o dopo un piccolo warmup
   * - Si aggancia a piu' eventi del player per scattare una sola volta
   * - Applica anche un timeout di fallback
   *
   * @param player Istanza del player su cui agganciare gli eventi.
   * @param isPaused Funzione che dice se il player e' in pausa.
   * @returns void
   */
  armFadeInOnce(player: any, isPaused: () => boolean): void {
    try {
      let fired = false; // flag che mi evita di far partire il fade piu' di una volta

      const fire = () => {
        if (fired) return; // se il fade e' gia' partito esco subito
        fired = true; // segno che il fade e' stato attivato

        try {
          player.muted?.(false);
        } catch {} // provo a togliere il mute dal player

        try {
          const tech: any = player.tech?.(true); // recupero il tech corrente del player
          const ve: HTMLVideoElement | undefined = tech?.el?.(); // recupero il vero elemento video del tech
          if (ve) {
            ve.muted = false; // tolgo il mute al video reale
            if (ve.volume === 0) ve.volume = 1; // se il volume reale e' a zero lo riporto a uno
          }
        } catch {}

        Promise.resolve(this.audioCtx?.resume?.()).catch(() => {}); // provo a riattivare il contesto audio

        const doFade = () => {
          if (!isPaused())
            this.fadeGainTo(1, this.FADE_PLAY_MS); // se il player non e' in pausa faccio il fade-in
          else this.setGain(1); // se invece e' in pausa porto subito il gain a uno
        };

        const t = Number(player.currentTime?.() ?? 0); // leggo il currentTime del player
        if (t < 0.12)
          setTimeout(doFade, this.WARMUP_DELAY_MS); // se sono ancora all'inizio aspetto un piccolo warmup prima del fade
        else doFade(); // altrimenti faccio partire subito la logica finale
      };

      if (!isPaused()) setTimeout(fire, 0); // se il player non e' in pausa provo a far scattare subito il controllo
      player.one?.('playing', fire); // aggancio il trigger una sola volta all'evento playing
      player.one?.('canplay', fire); // aggancio il trigger una sola volta all'evento canplay
      player.one?.('timeupdate', fire); // aggancio il trigger una sola volta all'evento timeupdate
      setTimeout(() => {
        if (!fired && !isPaused()) fire();
      }, 700); // preparo anche un fallback timeout nel caso nessun evento utile arrivi
    } catch {} // ignoro eventuali errori nella preparazione del fade-in una tantum
  }

  /**
   * Esegue la pulizia finale del service audio.
   *
   * @returns void
   */
  destroy(): void {
    try {
      this.audioCtx?.close();
    } catch {} // provo a chiudere l'AudioContext durante la pulizia finale
  }
}
