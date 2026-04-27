// Service che gestisce i toast applicativi principali: 404 persistente, benvenuto ed errori fatali.

import { Injectable }          from '@angular/core';
import { take }                from 'rxjs/operators';
import { TranslateService }    from '@ngx-translate/core';
import { ToastService }        from './toast.service';
import { CambioLinguaService } from './cambio-lingua.service';
import { ErroreGlobaleService } from './errore-globale.service';
import { TraduzioniService }   from './traduzioni.service';
import { StatoSessioneClientService } from './stato-sessione-client.service';

@Injectable({ providedIn: 'root' })
export class AppToastService {

  readonly chiaveToast404 = 'toast_404_persistente'; // conservo la chiave fissa usata per il toast persistente della 404

  constructor(
    private translate:       TranslateService,
    private toastService:    ToastService,
    private cambioLingua:    CambioLinguaService,
    private erroreGlobale:   ErroreGlobaleService,
    private traduzioni:      TraduzioniService,
    private statoSessione:   StatoSessioneClientService,
  ) {}

  /**
   * Mostra il toast persistente della pagina 404 nella lingua corrente.
   *
   * @returns void
   */
  mostraToast404Persistente(): void {
    this.toastService.chiudi(this.chiaveToast404); // chiudo un eventuale vecchio toast 404 con la stessa chiave
    const codice = this.cambioLingua.leggiCodiceLingua(); // leggo il codice lingua corrente
    this.traduzioni.assicuraTraduzioni$(codice).pipe(take(1)).subscribe(() => { // mi assicuro che le traduzioni della lingua corrente siano caricate
      this.translate.get('ui.toast.non-trovato').pipe(take(1)).subscribe((testo) => { // recupero il testo tradotto del toast 404
        this.toastService.mostra(testo, 'error', true, undefined, this.chiaveToast404); // mostro il toast persistente di errore con la chiave dedicata
      });
    });
  }

  /**
   * Gestisce il toast di bentornato quando presente il relativo flag in localStorage.
   *
   * @returns void
   */
  gestisciToastBenvenuto(): void {
    if (localStorage.getItem('link_email') === '1') return;
    const haToast = localStorage.getItem('toast_benvenuto');
    if (haToast === null) return;

    const codice = this.cambioLingua.leggiCodiceLingua(); // leggo il codice lingua corrente
    const testo  = codice === 'it' // scelgo il testo del toast in base alla lingua corrente
      ? "\nBENTORNATO!\n\nLa tua precedente sessione è scaduta,\nripeti l'accesso e riprendi la visione dei tuoi contenuti preferiti\n\n" // preparo il testo italiano del bentornato
      : '\nWELCOME BACK!\n\nYour previous session has expired,\nplease sign in again to resume watching your favorite content\n\n'; // preparo il testo inglese del bentornato

    this.toastService.successo(testo, 'toast_benvenuto'); // mostro il toast di successo con la chiave dedicata
    localStorage.removeItem('toast_benvenuto'); // consumo il flag locale del toast di bentornato
  }

  /**
   * Gestisce i toast persistenti relativi agli errori fatali di server o sessione.
   *
   * @returns void
   */
  gestisciErroriFatali(): void {
    this.erroreGlobale.erroreFatale$.subscribe((isFatal) => { // mi sottoscrivo allo stato di errore fatale globale
      if (!isFatal) return; // esco se l'errore non e' fatale

      const tipo = this.erroreGlobale.tipoErrore$.value; // leggo il tipo corrente di errore fatale

      if (tipo === 'server') { // controllo se il tipo di errore fatale e' server
        if (
          this.statoSessione.staRicaricando || // verifico se l'app sta gia' ricaricando la sessione
          localStorage.getItem('toast_benvenuto') !== null // verifico se e' presente il flag del toast bentornato
        ) return; // esco per non mostrare il toast server in questi casi

        const codice = this.cambioLingua.leggiCodiceLingua(); // leggo il codice lingua corrente
        const msg    = this.erroreGlobale.messaggioErrore$.value; // leggo l'eventuale messaggio dettagliato dell'errore
        const base   = codice === 'it' ? 'Errore imprevisto del server' : 'Unexpected server error'; // preparo la parte base del messaggio in base alla lingua
        const suffix = codice === 'it'
          ? " Riprova piu tardi o contatta l'amministratore."
          : ' Please try again later or contact the administrator.'; // preparo il suffisso del messaggio in base alla lingua
        const testo  = msg ? `${base}: ${msg}.${suffix}` : `${base}.${suffix}`; // compongo il testo finale includendo il messaggio dettagliato se presente
        this.toastService.errorePersistente(testo); // mostro il toast persistente di errore server
        return; // esco dopo aver gestito il caso server
      }

      if (tipo === 'sessione') { // controllo se il tipo di errore fatale e' sessione
        const codice = this.erroreGlobale.codiceSessione$.value; // leggo il codice specifico dell'errore di sessione
        const chiave =
          codice === 'STANDARD'   ? 'ui.toast.sessione.scollegato'  : // scelgo la chiave traduzione per sessione scollegata standard
          codice === 'INATTIVITA' ? 'ui.toast.sessione.inattivita'  : // scelgo la chiave traduzione per sessione scaduta per inattivita'
          codice === 'COLLEGATO'  ? 'ui.toast.sessione.collegato'   : // scelgo la chiave traduzione per sessione collegato
                                    'ui.toast.sessione.generico'; // uso la chiave generica come fallback
        const testoSessione = this.translate.instant(chiave); // traduco subito il testo del toast sessione
        this.toastService.allarmPersistenteRipetiAccesso(testoSessione); // mostro il toast persistente che richiede di ripetere l'accesso
      }
    });
  }
}
