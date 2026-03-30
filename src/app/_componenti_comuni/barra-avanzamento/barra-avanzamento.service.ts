// Servizio che aggiorna e controlla lo stato della barra di avanzamento del player.

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class BarraAvanzamentoService {
  percentualeAvanzamento = 0; //la percentuale di avanzamento corrente
  percentualeBuffer = 0; //la percentuale di buffer corrente
  durataTotaleMs = 0; //la durata totale in millisecondi
  posizioneCorrenteMs = 0; //la posizione corrente in millisecondi
  tempoCorrenteTesto = '00:00'; //il testo del tempo corrente
  durataTotaleTesto = '00:00'; //il testo della durata totale

  gestoreAggiornaTempo: any = null; //l'handler che aggiorna il tempo
  gestoreAggiornaBuffer: any = null; //l'handler che aggiorna il buffer

  private _rafId: number | null = null; //l'id del requestAnimationFrame attivo
  private _ultimoTempoReale = 0; // salvo l'ultimo tempo reale ricevuto dal player
  private _ultimoTimestamp = 0; // salvo l'ultimo timestamp usato per l'interpolazione
  private _durataSec = 0; //la durata totale corrente in secondi
  _inPlay = false; // segno se il player risulta in riproduzione

  /**
   * Collega gli handler che tengono aggiornata la barra di avanzamento.
   *
   * @param player Istanza del player da osservare.
   * @param ottieniElementoVideoReale Funzione che restituisce il vero elemento video.
   * @returns void
   */
  collegaAggiornamentoBarra(
    player: any,
    ottieniElementoVideoReale: () => any,
  ): void {
    try {
      if (!player) return; // esco se il player non esiste

      this.scollegaAggiornamentoBarra(player); // pulisco eventuali handler precedenti sul player

      this.gestoreAggiornaTempo = () => {
        const corrente = this.secondiCorrentiSicuri(player); // leggo il tempo corrente in modo sicuro
        const durata = this.durataInSecondiSicura(player); // leggo la durata in modo sicuro
        this._inPlay = !player.paused(); // aggiorno lo stato play in base al player
        this.aggiornaBarraDaValori(corrente, durata); // aggiorno la barra usando i valori correnti
      };

      this.gestoreAggiornaBuffer = () => {
        const durata = this.durataInSecondiSicura(player); // leggo la durata in modo sicuro
        this.aggiornaBufferDaElementi(ottieniElementoVideoReale(), durata); // aggiorno il buffer leggendo il video reale
      };

      player.on('timeupdate', this.gestoreAggiornaTempo); // collego l'aggiornamento tempo al timeupdate
      player.on('seeking', this.gestoreAggiornaTempo); // collego l'aggiornamento tempo anche al seeking
      player.on('loadedmetadata', this.gestoreAggiornaBuffer); // collego l'aggiornamento buffer ai metadata
      player.on('durationchange', this.gestoreAggiornaBuffer); // collego l'aggiornamento buffer ai cambi durata
      player.on('progress', this.gestoreAggiornaBuffer); // collego l'aggiornamento buffer al progresso caricamento
    } catch {}
  }

  /**
   * Scollega gli handler che aggiornano la barra dal player.
   *
   * @param player Istanza del player da cui rimuovere gli handler.
   * @returns void
   */
  scollegaAggiornamentoBarra(player: any): void {
    try {
      if (!player) return; // esco se il player non esiste

      if (this.gestoreAggiornaTempo) {
        player.off('timeupdate', this.gestoreAggiornaTempo); // rimuovo l'handler del timeupdate
        player.off('seeking', this.gestoreAggiornaTempo); // rimuovo l'handler del seeking
      }

      if (this.gestoreAggiornaBuffer) {
        player.off('loadedmetadata', this.gestoreAggiornaBuffer); // rimuovo l'handler dei metadata
        player.off('durationchange', this.gestoreAggiornaBuffer); // rimuovo l'handler del cambio durata
        player.off('progress', this.gestoreAggiornaBuffer); // rimuovo l'handler del progresso buffer
      }
    } catch {}

    this.gestoreAggiornaTempo = null; // pulisco il riferimento all'handler tempo
    this.gestoreAggiornaBuffer = null; // pulisco il riferimento all'handler buffer
  }

  /**
   * Reimposta completamente lo stato della barra di avanzamento.
   *
   * @returns void
   */
  resetBarraAvanzamento(): void {
    if (this._rafId !== null) cancelAnimationFrame(this._rafId); // fermo l'animazione frame-based se attiva
    this._rafId = null; // pulisco l'id del requestAnimationFrame
    this._inPlay = false; // segno che non sono piu' in play
    this.percentualeAvanzamento = 0; // azzero la percentuale di avanzamento
    this.percentualeBuffer = 0; // azzero la percentuale di buffer
    this.durataTotaleMs = 0; // azzero la durata totale
    this.posizioneCorrenteMs = 0; // azzero la posizione corrente
    this.tempoCorrenteTesto = '00:00'; // ripristino il testo del tempo corrente
    this.durataTotaleTesto = '00:00'; // ripristino il testo della durata totale
  }

  /**
   * Aggiorna lo stato della barra partendo da tempo corrente e durata.
   *
   * @param correnteSec Tempo corrente in secondi.
   * @param durataSec Durata totale in secondi.
   * @returns void
   */
  aggiornaBarraDaValori(correnteSec: number, durataSec: number): void {
    if (!isFinite(durataSec) || durataSec <= 0) {
      this.percentualeAvanzamento = 0; // azzero l'avanzamento se la durata non e' valida
      this.posizioneCorrenteMs = 0; // azzero la posizione corrente
      this.durataTotaleMs = 0; // azzero la durata totale
      this.tempoCorrenteTesto = '00:00'; // ripristino il testo del tempo corrente
      this.durataTotaleTesto = '00:00'; // ripristino il testo della durata totale
      if (this._rafId !== null) cancelAnimationFrame(this._rafId); // fermo l'animazione se attiva
      this._rafId = null; // pulisco l'id del frame
      return;
    }

    this._ultimoTempoReale = correnteSec; // salvo l'ultimo tempo reale ricevuto
    this._ultimoTimestamp = performance.now(); // salvo il timestamp corrente per l'interpolazione
    this._durataSec = durataSec; // salvo la durata corrente

    this.durataTotaleMs = Math.round(durataSec * 1000); // aggiorno la durata totale in millisecondi
    this.durataTotaleTesto = this.formattaMinutiSecondi(durataSec); // aggiorno il testo della durata totale

    if (this._rafId === null) this._avviaRaf(); // avvio il ciclo di animazione solo se non e' gia' partito
  }

  /**
   * Avvia il ciclo requestAnimationFrame che interpola l'avanzamento della barra.
   *
   * @returns void
   */
  private _avviaRaf(): void {
    const tick = (now: number) => {
      const elapsed = (now - this._ultimoTimestamp) / 1000; // calcolo i secondi trascorsi dall'ultimo aggiornamento reale
      const interpolato = this._inPlay
        ? Math.min(this._ultimoTempoReale + elapsed, this._durataSec)
        : this._ultimoTempoReale; // interpolo il tempo solo se il player e' in play

      const clamp = Math.max(0, Math.min(interpolato, this._durataSec)); // limito il tempo interpolato dentro il range valido
      this.percentualeAvanzamento = (clamp / this._durataSec) * 100; // aggiorno la percentuale di avanzamento
      this.posizioneCorrenteMs = Math.round(clamp * 1000); // aggiorno la posizione corrente in millisecondi
      this.tempoCorrenteTesto = this.formattaMinutiSecondi(clamp); // aggiorno il testo del tempo corrente

      this._rafId = requestAnimationFrame(tick); // riprogrammo il frame successivo
    };
    this._rafId = requestAnimationFrame(tick); // avvio il primo frame dell'animazione
  }

  /**
   * Aggiorna la percentuale di buffer leggendo il video reale.
   *
   * @param el Elemento video reale.
   * @param durataSec Durata totale in secondi.
   * @returns void
   */
  aggiornaBufferDaElementi(el: any, durataSec: number): void {
    try {
      if (!el || !isFinite(durataSec) || durataSec <= 0) {
        this.percentualeBuffer = 0; // azzero il buffer se il video o la durata non sono validi
        return;
      }

      let fineBuffer = 0; // parto assumendo che non ci sia buffer disponibile
      if (el.buffered && el.buffered.length > 0) {
        fineBuffer = el.buffered.end(el.buffered.length - 1); // leggo la fine dell'ultimo range buffered disponibile
      }

      const perc = Math.max(0, Math.min(100, (fineBuffer / durataSec) * 100)); // converto il buffer in percentuale clampata
      this.percentualeBuffer = perc; // aggiorno la percentuale di buffer
    } catch {
      this.percentualeBuffer = 0; // in errore azzero il buffer
    }
  }

  /**
   * Legge il tempo corrente dal player in modo sicuro.
   *
   * @param player Istanza del player.
   * @returns number Tempo corrente in secondi.
   */
  secondiCorrentiSicuri(player: any): number {
    try {
      return typeof player?.currentTime === 'function'
        ? Number(player.currentTime())
        : 0; // restituisco il currentTime se disponibile
    } catch {
      return 0; // in errore restituisco zero
    }
  }

  /**
   * Legge la durata dal player in modo sicuro.
   *
   * @param player Istanza del player.
   * @returns number Durata totale in secondi.
   */
  durataInSecondiSicura(player: any): number {
    try {
      return typeof player?.duration === 'function'
        ? Number(player.duration())
        : 0; // restituisco la duration se disponibile
    } catch {
      return 0; // in errore restituisco zero
    }
  }

  /**
   * Converte una durata in secondi nel formato mm:ss.
   *
   * @param sec Durata in secondi.
   * @returns string Durata formattata.
   */
  formattaMinutiSecondi(sec: number): string {
    const s = Math.max(0, Math.floor(sec)); // ricavo i secondi interi non negativi
    const m = Math.floor(s / 60); // ricavo i minuti interi
    const r = s % 60; // ricavo i secondi residui
    const mm = m.toString().padStart(2, '0'); // formatto i minuti a due cifre
    const ss = r.toString().padStart(2, '0'); // formatto i secondi a due cifre
    return `${mm}:${ss}`; // restituisco il testo finale formattato
  }

  /**
   * Salta a una nuova posizione del player in base al click sulla barra.
   *
   * @param evento Evento mouse ricevuto dal click sulla barra.
   * @param player Istanza del player da aggiornare.
   * @returns void
   */
  saltaAConClick(evento: MouseEvent, player: any): void {
    try {
      if (!player) return; // esco se il player non esiste
      const target = evento.currentTarget as HTMLElement; // recupero l'elemento cliccato
      if (!target) return; // esco se non ho un target valido

      const rett = target.getBoundingClientRect(); // leggo il rettangolo reale della barra
      const x = Math.min(Math.max(evento.clientX - rett.left, 0), rett.width); // ricavo la posizione X del click clampata dentro la barra
      const frazione = rett.width > 0 ? x / rett.width : 0; // converto il click in frazione della barra

      const durata = this.durataInSecondiSicura(player); // leggo la durata totale in modo sicuro
      if (!isFinite(durata) || durata <= 0) return; // esco se la durata non e' valida

      const nuoviSec = frazione * durata; // ricavo il nuovo tempo in secondi dal click

      try {
        player.currentTime(nuoviSec); // provo a spostare il player al nuovo tempo
      } catch {}

      this.aggiornaBarraDaValori(nuoviSec, durata); // aggiorno subito la barra al nuovo punto
    } catch {}
  }
}
