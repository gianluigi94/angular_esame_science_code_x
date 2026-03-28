// ─── app-toast.service.ts ────────────────────────────────────────────────────
// Gestisce i toast dell'app: 404 persistente, benvenuto, errori fatali.
// Estratto da app.component.ts.

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

  readonly chiaveToast404 = 'toast_404_persistente';

  constructor(
    private translate:       TranslateService,
    private toastService:    ToastService,
    private cambioLingua:    CambioLinguaService,
    private erroreGlobale:   ErroreGlobaleService,
    private traduzioni:      TraduzioniService,
    private statoSessione:   StatoSessioneClientService,
  ) {}

  // ── Estratto da mostraToast404Persistente() ───────────────────────────────
  mostraToast404Persistente(): void {
    this.toastService.chiudi(this.chiaveToast404);
    const codice = this.cambioLingua.leggiCodiceLingua();
    this.traduzioni.assicuraTraduzioni$(codice).pipe(take(1)).subscribe(() => {
      this.translate.get('ui.toast.non-trovato').pipe(take(1)).subscribe((testo) => {
        this.toastService.mostra(testo, 'error', true, undefined, this.chiaveToast404);
      });
    });
  }

  // ── Estratto dal blocco toast benvenuto in ngOnInit() ─────────────────────
  gestisciToastBenvenuto(): void {
    const haToast = localStorage.getItem('toast_benvenuto');
    if (haToast === null) return;

    const codice = this.cambioLingua.leggiCodiceLingua();
    const testo  = codice === 'it'
      ? "\nBENTORNATO!\n\nLa tua precedente sessione è scaduta,\nripeti l'accesso e riprendi la visione dei tuoi contenuti preferiti\n\n"
      : '\nWELCOME BACK!\n\nYour previous session has expired,\nplease sign in again to resume watching your favorite content\n\n';

    this.toastService.successo(testo, 'toast_benvenuto');
    localStorage.removeItem('toast_benvenuto');
  }

  // ── Estratto dal blocco errori fatali in ngOnInit() ───────────────────────
  gestisciErroriFatali(): void {
    this.erroreGlobale.erroreFatale$.subscribe((isFatal) => {
      if (!isFatal) return;

      const tipo = this.erroreGlobale.tipoErrore$.value;

      if (tipo === 'server') {
        if (
          this.statoSessione.staRicaricando ||
          localStorage.getItem('toast_benvenuto') !== null
        ) return;

        const codice = this.cambioLingua.leggiCodiceLingua();
        const msg    = this.erroreGlobale.messaggioErrore$.value;
        const base   = codice === 'it' ? 'Errore imprevisto del server' : 'Unexpected server error';
        const suffix = codice === 'it'
          ? " Riprova piu tardi o contatta l'amministratore."
          : ' Please try again later or contact the administrator.';
        const testo  = msg ? `${base}: ${msg}.${suffix}` : `${base}.${suffix}`;
        this.toastService.errorePersistente(testo);
        return;
      }

      if (tipo === 'sessione') {
        const codice = this.erroreGlobale.codiceSessione$.value;
        const chiave =
          codice === 'STANDARD'   ? 'ui.toast.sessione.scollegato'  :
          codice === 'INATTIVITA' ? 'ui.toast.sessione.inattivita'  :
          codice === 'COLLEGATO'  ? 'ui.toast.sessione.collegato'   :
                                    'ui.toast.sessione.generico';
        const testoSessione = this.translate.instant(chiave);
        this.toastService.allarmPersistenteRipetiAccesso(testoSessione);
      }
    });
  }
}
