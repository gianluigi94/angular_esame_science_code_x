// services dove centrallizzo la logica dei toast per le notifico (a stretto contatto con il componente dei toast)
import { Injectable } from '@angular/core';
import { Subject, ReplaySubject } from 'rxjs';
import { TipoToast } from '../_type/toast.type';
import { ToastMessage } from '../_type/toast-messaggio.type';

@Injectable({ providedIn: 'root' }) // Registro il servizio nel root injector
export class ToastService { // Creo il servizio che emette eventi toast per la UI
  private toastSubject = new ReplaySubject<ToastMessage>(1); // Tengo l'ultimo toast emesso così chi si iscrive dopo lo riceve comunque
  toast$ = this.toastSubject.asObservable(); // Espongo i toast come observable in sola lettura

  private chiudiSubject = new Subject<string>(); // Creo un evento per chiedere la chiusura di un toast specifico
  chiudi$ = this.chiudiSubject.asObservable(); // Espongo le richieste di chiusura come observable in sola lettura

  private chiudiTuttiSubject = new Subject<void>(); // Creo un evento per chiedere la chiusura di tutti i toast
  chiudiTutti$ = this.chiudiTuttiSubject.asObservable(); // Espongo la chiusura totale come observable in sola lettura

  /**
 * Emette un nuovo toast verso la UI tramite lo stream `toast$`.
 *
 * Centralizza la creazione del messaggio (testo, tipo, persistenza, azione opzionale, chiave e spinner)
 * in modo che il componente dei toast possa renderizzare e gestire il comportamento in modo uniforme.
 *
 * @param testo Testo da visualizzare nel toast.
 * @param tipo Tipologia del toast (default: 'info').
 * @param persistente Se true, il toast resta visibile finché non viene chiuso esplicitamente (default: false).
 * @param azione Azione opzionale associata al toast ( 'ripeti_accesso').
 * @param chiave Identificatore opzionale del toast, utile per chiuderlo in modo mirato.
 * @param mostraSpinner Se true, la UI mostra uno spinner nel toast (default: false).
 * @returns void
 */
  mostra(
    testo: string, // Ricevo il testo del toast
    tipo: TipoToast = 'info', // Ricevo il tipo del toast con default info
    persistente: boolean = false, // Ricevo se è persistente con default false
    azione?: 'ripeti_accesso', // Ricevo un'azione opzionale
    chiave?: string, // Ricevo una chiave opzionale
    mostraSpinner: boolean = false // Ricevo se mostrare lo spinner con default false
  ): void {
    this.toastSubject.next({ testo, tipo, persistente, azione, chiave, mostraSpinner }); // Emetto un nuovo toast con tutti i dati
  }

  /**
 * Richiede la chiusura di uno specifico toast identificato da chiave.
 *
 * La UI ascolta lo stream `chiudi$` e chiude il toast corrispondente.
 *
 * @param chiave Identificatore del toast da chiudere.
 * @returns void
 */
  chiudi(chiave: string): void {
    this.chiudiSubject.next(chiave); // Emetto la chiave del toast da chiudere
  }

  /**
 * Richiede la chiusura di tutti i toast attualmente mostrati.
 *
 * La UI ascolta lo stream `chiudiTutti$` e rimuove tutti i toast.
 *
 * @returns void
 */
  chiudiTutti(): void {
    this.chiudiTuttiSubject.next(); // Emetto l'evento di chiusura totale
  }

  /**
 * Scorciatoia per mostrare un toast di tipo 'error' non persistente.
 *
 * @param testo Testo da visualizzare.
 * @returns void
 */
  errore(testo: string): void {
    this.mostra(testo, 'error'); // Chiamo mostra con tipo error
  }

  /**
 * Scorciatoia per mostrare un toast di tipo 'success' non persistente.
 *
 * @param testo Testo da visualizzare.
 * @param chiave Identificatore opzionale del toast, utile per chiuderlo in modo mirato.
 * @returns void
 */
  successo(testo: string, chiave?: string): void {
    this.mostra(testo, 'success', false, undefined, chiave); // Mostro successo non persistente e imposto la chiave se presente
  }

  /**
 * Scorciatoia per mostrare un toast di tipo 'success' non persistente con spinner.
 *
 * Utile per successi legati a un'operazione che prosegue ancora (feedback + caricamento).
 *
 * @param testo Testo da visualizzare.
 * @param chiave Identificatore del toast (obbligatorio) per poterlo aggiornare/chiudere con precisione.
 * @returns void
 */
  successoConSpinner(testo: string, chiave: string): void {
    this.mostra(testo, 'success', false, undefined, chiave, true); // Mostro successo con spinner e chiave obbligatoria
  }

  /**
 * Scorciatoia per mostrare un toast di tipo 'allarm' non persistente.
 *
 * @param testo Testo da visualizzare.
 * @returns void
 */
  allarm(testo: string): void {
    this.mostra(testo, 'allarm'); // Chiamo mostra con tipo allarm
  }

  /**
 * Scorciatoia per mostrare un toast di tipo 'error' persistente.
 *
 * Il toast resta visibile finché la UI non lo chiude esplicitamente.
 *
 * @param testo Testo da visualizzare.
 * @returns void
 */
  errorePersistente(testo: string): void {
    this.mostra(testo, 'error', true); // Chiamo mostra con error e persistente true
  }

  /**
 * Scorciatoia per mostrare un toast di tipo 'allarm' persistente con azione 'ripeti_accesso'.
 *
 * La UI può usare l'azione per mostrare un pulsante/CTA che avvia nuovamente il login.
 *
 * @param testo Testo da visualizzare.
 * @returns void
 */
  allarmPersistenteRipetiAccesso(testo: string): void {
    this.mostra(testo, 'allarm', true, 'ripeti_accesso'); // Mostro un toast persistente che la UI può usare per far ripetere l'accesso
  }
}
