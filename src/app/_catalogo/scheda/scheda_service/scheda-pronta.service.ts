// Servizio che espone lo stato di prontezza della scheda, del player e dei segnali UI collegati.

import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SchedaProntaService {
  private _pronta$ = new BehaviorSubject<boolean>(true); // tengo lo stato di prontezza della scheda
  schedaPronta$ = this._pronta$.asObservable(); // espongo lo stream della prontezza scheda
  loaderGlobalmenteNascosto = false; // segno se il loader globale e' gia' stato nascosto

  private _labelTorna$ = new BehaviorSubject<string>(''); // tengo la label del pulsante torna
  labelTorna$ = this._labelTorna$.asObservable(); // espongo lo stream della label torna

  /**
   * Aggiorna la label del pulsante torna.
   *
   * @param label Testo da mostrare come label.
   * @returns void
   */
  impostaLabelTorna(label: string): void {
    this._labelTorna$.next(label); // pubblico la nuova label torna
  }

  /**
   * Reimposta la scheda come non pronta.
   *
   * @returns void
   */
  reset(): void {
    this._pronta$.next(false); // segno che la scheda non e' pronta
  }

  /**
   * Segna la scheda come pronta.
   *
   * @returns void
   */
  segnaPronte(): void {
    this._pronta$.next(true); // segno che la scheda e' pronta
  }

  private _playerAperto$ = new BehaviorSubject<boolean>(false); // tengo lo stato di apertura del player
  playerAperto$ = this._playerAperto$.asObservable(); // espongo lo stream dello stato player

  /**
   * Aggiorna lo stato di apertura del player.
   *
   * @param v Valore booleano da applicare.
   * @returns void
   */
  impostaPlayerAperto(v: boolean): void {
    this._playerAperto$.next(v); // pubblico il nuovo stato del player
  }

  private _urlScheda$ = new BehaviorSubject<string>(''); // tengo l'URL corrente della scheda
  urlScheda$ = this._urlScheda$.asObservable(); // espongo lo stream dell'URL scheda

  /**
   * Aggiorna l'URL corrente della scheda.
   *
   * @param url URL da pubblicare.
   * @returns void
   */
  impostaUrlScheda(url: string): void {
    this._urlScheda$.next(url); // pubblico il nuovo URL della scheda
  }

  private _chiudiPlayer$ = new Subject<void>(); // tengo il segnale di chiusura player
  chiudiPlayer$ = this._chiudiPlayer$.asObservable(); // espongo lo stream di chiusura player

  /**
   * Emette una richiesta di chiusura del player.
   *
   * @returns void
   */
  richiediChiusuraPlayer(): void {
    this._chiudiPlayer$.next(); // invio il segnale di chiusura player
  }

  private _fadeEChiudi$ = new Subject<void>(); // tengo il segnale di fade e chiusura
  fadeEChiudi$ = this._fadeEChiudi$.asObservable(); // espongo lo stream di fade e chiusura

  /**
   * Emette una richiesta di fade e chiusura del player.
   *
   * @returns void
   */
  richiediFadeEChiudi(): void {
    this._fadeEChiudi$.next(); // invio il segnale di fade e chiusura
  }

  private _fadeFilmPlayer$ = new Subject<number>(); // tengo il segnale di fade del player film
  fadeFilmPlayer$ = this._fadeFilmPlayer$.asObservable(); // espongo lo stream del fade player film

  /**
   * Emette una richiesta di fade per il player film.
   *
   * @param durataMs Durata del fade in millisecondi.
   * @returns void
   */
  richiediFadeFilmPlayer(durataMs: number): void {
    this._fadeFilmPlayer$.next(durataMs); // invio la durata richiesta per il fade del player film
  }

  private _headerNascosto$ = new BehaviorSubject<boolean>(false); // tengo lo stato visibile dell'header
  headerNascosto$ = this._headerNascosto$.asObservable(); // espongo lo stream dello stato header

  /**
   * Aggiorna lo stato nascosto dell'header.
   *
   * @param v Valore booleano da applicare.
   * @returns void
   */
  impostaHeaderNascosto(v: boolean): void {
    this._headerNascosto$.next(v); // pubblico il nuovo stato dell'header
  }
}
