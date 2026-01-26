// Classe di utility con metodi statici per decodificare JWT, calcolare hash SHA-512 (anche con sale per la password)e nascondere alcuni elementi UI (subtitle/scrol) tramite GSAP.
import { Injectable } from '@angular/core';
import { sha512 } from 'js-sha512';
import { jwtDecode } from 'jwt-decode';
import gsap from 'gsap';

@Injectable({ providedIn: 'root' }) // Registro il servizio nel root injector
export class UtilityService {

  /**
   * Decodifica un token JWT e restituisce il contenuto interno.
   * Se il token non è valido o la decodifica fallisce, restituisce null.
   *
   * @param token string Token JWT da decodificare.
   * @returns any Contenuto decodificato del token oppure null in caso di errore.
   */
  static leggiToken(token: string): any {
    try {
      // provo a decodificare il token...
      return jwtDecode(token); // restituisco il contenuto decodificato del token
    } catch (Error) {
      // intercetto eventuali errori di decodifica
      return null; // se non riesco a decodificare, restituisco null
    }
  }


    /**
   * Trasforma una password in un hash SHA-512 utilizzando un sale.
   * Il sale viene concatenato alla password prima del calcolo dell’hash.
   *
   * @param password string Password in chiaro.
   * @param sale string Sale da usare per rendere l’hash più sicuro.
   * @returns string Hash SHA-512 risultante.
   */
  static nascondiPassword(password: string, sale: string): string {
    const tmp: string = sale + password; // unisco sale e password
    const hash: string = sha512(tmp); // calcolo l'hash sha512 della stringa ottenuta
    return hash;
  }

   /**
   * Calcola un hash SHA-512 generico a partire da una stringa.
   *
   * @param str string Testo da convertire in hash.
   * @returns string Hash SHA-512 della stringa in ingresso.
   */
  static hash(str: string): string {
    const tmp = sha512(str); // calcolo l'hash della stringa in ingresso
    return tmp; // restituisco l'hash calcolato
  }


  /**
   * Traduce un errore restituito dal backend in una chiave testuale
   * utilizzabile dal sistema di toast del front-end.
   * Analizza il contenuto dell’errore per riconoscere casi specifici
   * (utente bannato, credenziali errate, tentativi massimi, password scaduta).
   *
   * @param err any Oggetto di errore restituito dal backend.
   * @returns string Chiave del messaggio da mostrare nel toast.
   */
  static chiaveToastErroreDaBackend(err: any): string {
    console.log('ERRORE LOGIN', err);

    let msg: any = ''; // preparo una variabile dove raccogliere il messaggio di errore estratto

    if (err?.error) {
      // controllo se esiste la proprietà error nella risposta
      if (typeof err.error === 'string') {
        // se l'errore è già una stringa
        msg = err.error; // uso direttamente quella stringa come messaggio
      } else if (typeof err.error?.message === 'string') {
        // se l'errore è un oggetto con un campo message testuale
        msg = err.error.message; // uso il campo message come messaggio
      }
    } else if (typeof err?.message === 'string') {
      // se non ho err.error ma ho un messaggio standard
      msg = err.message; // uso il messaggio standard dell'errore
    }

    if (typeof msg !== 'string') {
      // controllo che il messaggio sia davvero una stringa
      msg = String(msg ?? ''); // forzo la conversione a stringa per sicurezza
    }

    // Nei messaggi toast del front-end, i testi sono salvati nel database in base alla lingua
    if (msg.includes('UTENTE BANNATO')) {
      // riconosco il caso di utente bannato dal testo dell'errore
      return 'ui.toast.error.login.bannato';
    }

    if (msg.includes('PASSWORD (o nome utente) NON TROVATA SUL DATABASE')) {
      // riconosco il caso di credenziali non trovate
      return 'ui.toast.error.login.mancante';
    }

    if (msg.includes('LIMITE TENTATIVI DI ACCESSO TERMINATI')) {
      // riconosco il caso di troppi tentativi di accesso
      return 'ui.toast.error.login.max_acces';
    }

    if (msg.includes('PASSWORD SCADUTA')) {
      // riconosco il caso di password scaduta
      return 'ui.toast.erro.login.password_deprecata';
    }

    return 'ui.toast.error.login.mancante'; // restituisco una chiave generica come ripiego
  }


  /**
   * Nasconde il sottotitolo e l’indicatore di scorrimento dalla pagina.
   * Ferma eventuali animazioni in corso e imposta gli elementi come invisibili
   * usando GSAP.
   *
   * @returns void
   */
  static nascondiSottotitoloEScrol(): void {
    // preparo una funzione che nasconde elementi di interfaccia non desiderati in questa pagina
    const subtitle = document.querySelector('.subtitle') as HTMLElement | null; // cerco nel DOM il sottotitolo per poterlo nascondere
    const scrol = document.querySelector('.scrol') as HTMLElement | null; // cerco nel DOM l'indicatore di scorrimento per poterlo nascondere

    if (subtitle) {
      gsap.killTweensOf(subtitle); // fermo eventuali animazioni in corso sul sottotitolo per evitare conflitti
      gsap.set(subtitle, { opacity: 0, display: 'none' }); // lo rendo invisibile e lo tolgo dal flusso del layout
    }

    if (scrol) {
      // continuo solo se l'indicatore di scorrimento esiste
      gsap.killTweensOf(scrol); // fermo eventuali animazioni in corso sull'indicatore di scorrimento
      gsap.set(scrol, { opacity: 0 }); // lo rendo invisibile lasciando intatto il layout se serve
    }
  }
}
