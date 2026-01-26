// services che definisce lo stato della sessione e come si relaziona in base a quando termina
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' }) // Registro il servizio nel root injector così lo uso ovunque come singleton
export class StatoSessioneClientService { // Creo il servizio che mantiene lo stato della sessione nel client

  sessioneGiaConfermata = false; // Salvo se la sessione è già stata confermata almeno una volta
  staRicaricando = false; // Salvo se sto facendo un reload 'controllato'

  sessioneVerificata$ = new BehaviorSubject<boolean>(false); // Espongo se la sessione è verificata (parte da false)

  haTokenIniziale = false; // Salvo se all'avvio trovo già un token nel localStorage

  constructor() { // Eseguo questa logica quando il servizio viene creato
        const rawLocal = localStorage.getItem('auth');
    const rawSession = sessionStorage.getItem('auth');
    const raw = rawLocal ?? rawSession;

    if (raw) { // Controllo se esiste qualcosa salvato
      try { // Provo a parsare la stringa JSON
        const parsed = JSON.parse(raw); // Converto la stringa in oggetto
        this.haTokenIniziale = !!parsed?.tk; // Imposto true se nell'oggetto esiste un token tk
      } catch (e) { // Gestisco errori di JSON non valido
        console.warn('[StatoSessioneClientService] errore parse auth da localStorage', e);
        this.haTokenIniziale = false; // Metto false perché non posso fidarmi del contenuto
      }
    }
  }
/**
 * Segna la sessione come verificata, notificando lo stream 'sessioneVerificata$'.
 *
 * Da chiamare quando il server conferma che la sessione è valida.
 * Emette 'true' una sola volta (se non era già verificata) e logga un timestamp per debug prestazioni.
 *
 * @returns void
 */
  segnaSessioneVerificata(): void { // Creo un metodo per segnare che il server ha confermato la sessione
    if (!this.sessioneVerificata$.value) { // Evito di settare true più volte se è già verificata
      const now = performance.now(); // Prendo un timestamp per debug prestazioni
      console.log('RISPOSTA SERVER CONFERMA STATO SESSIONE alle ' + now + ' ms'); // Loggo quando arriva la conferma sessione
      this.sessioneVerificata$.next(true); // Aggiorno lo stato osservabile a true
    }
  }
/**
 * Reimposta lo stato client della sessione.
 *
 * Azzera i flag interni ('sessioneGiaConfermata', 'staRicaricando') e imposta il valore di
 * 'sessioneVerificata$' in base al parametro. Utile dopo logout, cambio sessione o reload controllato.
 *
 * @param consideraSessioneGiaVerificata Se true imposta subito 'sessioneVerificata$' a true (default: true).
 * @returns void
 */
  reset(consideraSessioneGiaVerificata: boolean = true): void { // Creo un metodo per resettare lo stato della sessione
    this.sessioneGiaConfermata = false; // Resetto il flag di sessione confermata
    this.staRicaricando = false; // Resetto il flag di reload
    this.sessioneVerificata$.next(consideraSessioneGiaVerificata); // Imposto sessioneVerificata al valore passato (default true)
  }
}
