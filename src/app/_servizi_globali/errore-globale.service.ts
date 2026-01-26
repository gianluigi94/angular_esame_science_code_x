import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { TipoErrore } from '../_type/errore.type';

@Injectable({  providedIn: 'root' }) // Dico ad Angular che questa classe è un servizio iniettabile
export class ErroreGlobaleService { // Creo il servizio che centralizza la gestione degli errori
  erroreFatale$ = new BehaviorSubject<boolean>(false); // Tengo lo stato 'errore fatale' e parto da false

  messaggioErrore$ = new BehaviorSubject<string | null>(null); // Tengo l'eventuale messaggio di errore server

  tipoErrore$ = new BehaviorSubject<TipoErrore>(null); // Tengo il tipo errore corrente (server/sessione/null)

  codiceSessione$ = new BehaviorSubject<string | null>(null); // Tengo il codice della sessione

 /**
 * Segnala un errore fatale di tipo 'server' (es. errore backend 500, rete, risposta non valida).
 *
 * Imposta e blocca lo stato di errore fatale solo se non è già attivo:
 * - salva un messaggio opzionale in 'messaggioErrore$'
 * - imposta il tipo in 'tipoErrore$' a 'server'
 * - attiva 'erroreFatale$' a true
 *
 * @param msg Messaggio opzionale dell'errore (può essere null).
 * @returns void
 */
segnalaErroreServer(msg: string | null = null): void {
    if (!this.erroreFatale$.value) { // Evito di sovrascrivere se un errore fatale è già attivo
      this.messaggioErrore$.next(msg); // Salvo il messaggio opzionale dell'errore server
      this.tipoErrore$.next('server'); // Imposto il tipo errore a server
      this.erroreFatale$.next(true); // Attivo lo stato di errore fatale
    }
  }

 /**
 * Segnala un errore fatale di tipo 'sessione' (es. 401/403) con un codice specifico.
 *
 * Imposta e blocca lo stato di errore fatale solo se non è già attivo:
 * - salva il codice in 'codiceSessione$'
 * - imposta il tipo in 'tipoErrore$' a 'sessione'
 * - attiva 'erroreFatale$' a true
 *
 * @param codice Codice che identifica il significato dell'errore di sessione (es. 'STANDARD', 'INATTIVITA', 'COLLEGATO').
 * @returns void
 */
segnalaErroreSessione(codice: string): void {
    if (!this.erroreFatale$.value) { // Evito di sovrascrivere se un errore fatale è già attivo
      this.codiceSessione$.next(codice); // Salvo il codice che identifica il motivo della sessione
      this.tipoErrore$.next('sessione'); // Imposto il tipo errore a sessione
      this.erroreFatale$.next(true); // Attivo lo stato di errore fatale
    }
  }

  /**
 * Resetta lo stato di errore fatale, riportando il servizio a una condizione 'pulita'.
 *
 * - imposta 'erroreFatale$' a false
 * - azzera 'messaggioErrore$', 'tipoErrore$' e 'codiceSessione$'
 *
 * @returns void
 */
resettaErroreFatale(): void {
    this.erroreFatale$.next(false); // Spengo lo stato di errore fatale
    this.messaggioErrore$.next(null); // Cancello il messaggio di errore
    this.tipoErrore$.next(null); // Resetto il tipo errore
    this.codiceSessione$.next(null); // Resetto il codice sessione
  }
}
