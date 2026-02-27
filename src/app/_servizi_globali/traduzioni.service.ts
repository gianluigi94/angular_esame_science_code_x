// services che gestisce con ngx-translate le trasuzioni inglese/italiano
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Observable, of, map, take, tap, shareReplay } from 'rxjs';
import { ApiService } from 'src/app/_servizi_globali/api.service';

@Injectable({ providedIn: 'root' }) // Registro il servizio nel root injector
export class TraduzioniService {
traduzioniCaricate: { [codiceLingua: string]: boolean } = {};
traduzioniInizialiCaricate$ = new BehaviorSubject<boolean>(false);
private richiesteInCorso: { [codiceLingua: string]: Observable<void> } = {};

  constructor(
    private api: ApiService,
    private translateService: TranslateService
  ) {} // Ricevo api e translateService per fare richieste e applicare traduzioni
/**
 * Assicura che le traduzioni per la lingua indicata siano disponibili in ngx-translate.
 *
 * Se la lingua è già stata caricata (cache), completa immediatamente senza chiamate API.
 * Altrimenti scarica le traduzioni dal backend, le registra in ngx-translate e aggiorna lo stato
 * `traduzioniInizialiCaricate$` alla prima lingua caricata con successo.
 *
 * @param codiceLingua Codice della lingua ( 'it', 'en') da caricare/assicurare.
 * @returns Observable che completa quando le traduzioni sono state caricate e registrate (o già presenti in cache).
 */
 assicuraTraduzioni$(codiceLingua: string): Observable<void> {
  if (this.traduzioniCaricate[codiceLingua]) {
    if (!this.traduzioniInizialiCaricate$.value)
      this.traduzioniInizialiCaricate$.next(true);
    return of(void 0);
  }

  if (this.richiesteInCorso[codiceLingua]) {
    return this.richiesteInCorso[codiceLingua];
  }

  const richiesta$ = this.api.getTraduzioniLingua(codiceLingua).pipe(
    take(1),
    tap((traduzioni) => {
      this.translateService.setTranslation(codiceLingua, traduzioni, true);
      this.traduzioniCaricate[codiceLingua] = true;
      delete this.richiesteInCorso[codiceLingua];
      if (!this.traduzioniInizialiCaricate$.value)
        this.traduzioniInizialiCaricate$.next(true);
    }),
    map(() => void 0),
    shareReplay(1)
  );

  this.richiesteInCorso[codiceLingua] = richiesta$;
  return richiesta$;
}

/**
 * Imposta la lingua corrente in ngx-translate.
 *
 * Presuppone che le traduzioni per 'codiceLingua' siano già state caricate ( tramite `assicuraTraduzioni$`).
 *
 * @param codiceLingua Codice della lingua da attivare ( 'it', 'en').
 * @returns void
 */
  usaLingua(codiceLingua: string): void {
    this.translateService.use(codiceLingua); // Dico a ngx-translate di usare quella lingua
  }


  /**
 * Verifica se le traduzioni di una certa lingua risultano già caricate in cache locale del service.
 *
 * @param codiceLingua Codice della lingua da verificare ( 'it', 'en').
 * @returns True se la lingua risulta già caricata, altrimenti false.
 */
  haTraduzioniInCache(codiceLingua: string): boolean {
    return !!this.traduzioniCaricate[codiceLingua]; // Ritorno true se in cache ho segnato quella lingua come caricata
  }
}
