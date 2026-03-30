// Service che gestisce con ngx-translate le traduzioni italiano/inglese e centralizza cache, richieste e attivazione lingua.

import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Observable, of, map, take, tap, shareReplay } from 'rxjs';
import { ApiService } from 'src/app/_servizi_globali/api.service';

@Injectable({ providedIn: 'root' })
export class TraduzioniService {
  traduzioniCaricate: { [codiceLingua: string]: boolean } = {}; // tengo traccia delle lingue gia' caricate in cache
  traduzioniInizialiCaricate$ = new BehaviorSubject<boolean>(false); // espongo lo stato che indica se almeno una lingua iniziale e' stata caricata
  private richiesteInCorso: { [codiceLingua: string]: Observable<void> } = {}; // conservo le richieste gia' avviate per evitare doppie chiamate

  constructor(
    private api: ApiService,
    private translateService: TranslateService,
  ) {}

  /**
   * Assicura che le traduzioni della lingua richiesta siano disponibili in ngx-translate.
   *
   * @param codiceLingua Codice lingua da caricare o riusare.
   * @returns Observable<void>
   */
  assicuraTraduzioni$(codiceLingua: string): Observable<void> {
    if (this.traduzioniCaricate[codiceLingua]) { // controllo se questa lingua risulta gia' caricata
      if (!this.traduzioniInizialiCaricate$.value) // controllo se non ho ancora segnalato il primo caricamento iniziale
        this.traduzioniInizialiCaricate$.next(true); // segno che almeno una lingua iniziale e' disponibile
      return of(void 0); // ritorno subito un observable completato se la lingua e' gia' in cache
    }

    if (this.richiesteInCorso[codiceLingua]) { // controllo se esiste gia' una richiesta attiva per questa lingua
      return this.richiesteInCorso[codiceLingua]; // riuso la richiesta gia' in corso per evitare duplicati
    }

    const richiesta$ = this.api.getTraduzioniLingua(codiceLingua).pipe( // preparo la richiesta API per scaricare le traduzioni della lingua
      take(1), // prendo solo la prima risposta utile e poi chiudo
      tap((traduzioni) => { // eseguo gli effetti collaterali quando ricevo le traduzioni
        this.translateService.setTranslation(codiceLingua, traduzioni, true); // registro le traduzioni ricevute dentro ngx-translate
        this.traduzioniCaricate[codiceLingua] = true; // segno la lingua come caricata nella cache locale
        delete this.richiesteInCorso[codiceLingua]; // rimuovo il riferimento alla richiesta perche' ormai e' completata
        if (!this.traduzioniInizialiCaricate$.value) // controllo se non ho ancora segnalato il caricamento iniziale
          this.traduzioniInizialiCaricate$.next(true); // notifico che almeno una lingua iniziale e' stata caricata
      }),
      map(() => void 0), // trasformo il risultato in void per esporre solo il completamento
      shareReplay(1), // condivido e memorizzo l'ultima emissione per chi si iscrive alla stessa richiesta
    );

    this.richiesteInCorso[codiceLingua] = richiesta$; // salvo la richiesta in corso cosi' posso riusarla se arriva un'altra chiamata uguale
    return richiesta$; // ritorno l'observable della richiesta preparata
  }

  /**
   * Imposta la lingua corrente in ngx-translate.
   *
   * @param codiceLingua Codice lingua da attivare.
   * @returns void
   */
  usaLingua(codiceLingua: string): void {
    this.translateService.use(codiceLingua); // dico a ngx-translate di usare la lingua richiesta
  }

  /**
   * Verifica se le traduzioni della lingua richiesta sono gia' presenti in cache locale.
   *
   * @param codiceLingua Codice lingua da verificare.
   * @returns boolean
   */
  haTraduzioniInCache(codiceLingua: string): boolean {
    return !!this.traduzioniCaricate[codiceLingua]; // ritorno true se questa lingua risulta gia' caricata
  }
}
