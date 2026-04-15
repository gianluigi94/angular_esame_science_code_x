// Service che gestisce la logica del loader globale coordinando stato applicativo, Saturno e carosello.

import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { pulisciUrl, isAreaCatalogo } from '../_helpers_globali/helpers';
import { ErroreGlobaleService } from './errore-globale.service';
import { TraduzioniService } from './traduzioni.service';
import { StatoSessioneClientService } from './stato-sessione-client.service';
import { SaturnoStatoService } from './animazioni_saturno/saturno-stato.service';

@Injectable({ providedIn: 'root' })
export class AppLoaderService {
  forzaLoaderExtra = false; // espongo il flag che forza un tempo extra del loader
  loaderAvvioCatalogo = false; // espongo il flag che indica un avvio catalogo da gestire nel loader
  loaderDaMostrare = false; // espongo il flag pubblico che puo' indicare se il loader va mostrato

  private loaderVisibile = true; // tengo traccia se il loader e' ancora considerato visibile
  private extraLoaderTimer: any = null; // conservo il timer usato per forzare il loader extra
  private readonly EXTRA_LOADER_MS = 2600; // definisco la durata del loader extra forzato
  private devoCaricareTexturePrimaVolta: boolean; // tengo traccia se la texture di Saturno deve ancora essere caricata la prima volta
  private isFirefox: boolean; // tengo traccia se il browser corrente e' Firefox
  private pathPrecedenteSessioneAllAvvio = ''; // conservo il path precedente letto all'avvio

  caricamentoDisabilitato$ = new BehaviorSubject<boolean>(false); // espongo lo stato che disabilita globalmente il caricamento
  deveCaricareImmaginiCarosello$ = new BehaviorSubject<boolean>(false); // espongo lo stato che indica se il carosello deve ancora caricare immagini

  constructor(
    private erroreGlobale: ErroreGlobaleService,
    private traduzioni: TraduzioniService,
    private statoSessione: StatoSessioneClientService,
    private saturnoStato: SaturnoStatoService,
  ) {
    this.devoCaricareTexturePrimaVolta =
      localStorage.getItem('saturnoTextureLoaded') !== 'true'; // verifico se la texture di Saturno non risulta ancora caricata localmente
    this.isFirefox = /firefox/i.test(navigator.userAgent); // verifico se il browser corrente e' Firefox
  }

  /**
   * Memorizza il path precedente usato per valutare il loader in avvio catalogo.
   *
   * @param path Path precedente da salvare.
   * @returns void
   */
  impostaPathPrecedente(path: string): void {
    this.pathPrecedenteSessioneAllAvvio = path; // salvo il path precedente ricevuto
  }

  /**
   * Avvia la logica combinata del loader globale osservando tutti gli stati necessari.
   *
   * @param caroselloPronto$ Observable che segnala quando il carosello e' pronto.
   * @param schedaPronta Oggetto condiviso con il flag del loader globalmente nascosto.
   * @param onLoaderNascosto Callback eseguita quando il loader viene nascosto.
   * @returns void
   */
  avvia(
    caroselloPronto$: Observable<boolean>,
    schedaPronta: { loaderGlobalmenteNascosto: boolean },
    onLoaderNascosto: () => void,
  ): void {
    combineLatest([
      this.erroreGlobale.erroreFatale$, // osservo lo stato di eventuale errore fatale
      this.traduzioni.traduzioniInizialiCaricate$, // osservo lo stato di caricamento iniziale delle traduzioni
      this.statoSessione.sessioneVerificata$, // osservo lo stato di verifica della sessione client
      this.saturnoStato.saturnoPronto$, // osservo lo stato di prontezza di Saturno
      caroselloPronto$, // osservo lo stato di prontezza del carosello
      this.deveCaricareImmaginiCarosello$, // osservo se il carosello deve ancora caricare immagini
      this.caricamentoDisabilitato$, // osservo se il caricamento e' globalmente disabilitato
    ]).subscribe(
      ([
        erroreFatale,
        traduzioniPronte,
        sessioneVerificata,
        saturnoPronto,
        caroselloPronto,
        deveCaricare,
        caricamentoDisabilitato,
      ]) => {
        console.log(
          '[LOADER STATE]', // loggo l'inizio del dump di stato del loader
          '| disabilitato=',
          caricamentoDisabilitato, // loggo se il caricamento e' disabilitato
          '| forzaExtra=',
          this.forzaLoaderExtra, // loggo se e' attivo il loader extra forzato
          '| erroreFatale=',
          erroreFatale, // loggo se e' presente un errore fatale
          '| traduzioniPronte=',
          traduzioniPronte, // loggo lo stato delle traduzioni iniziali
          '| sessioneVerificata=',
          sessioneVerificata, // loggo lo stato della sessione
          '| saturnoPronto=',
          saturnoPronto, // loggo lo stato di Saturno
          '| deveCaricareCarosello=',
          deveCaricare, // loggo se il carosello deve ancora caricare immagini
          '| caroselloPronto=',
          caroselloPronto, // loggo se il carosello e' pronto
        );

        const deveMostrareLoader =
          !caricamentoDisabilitato &&
          (erroreFatale ||
            !traduzioniPronte ||
            !sessioneVerificata ||
            !saturnoPronto ||
            (deveCaricare && !caroselloPronto));

        if (deveMostrareLoader) {
          console.log('[LOADER BLOCCATO DA]',
            erroreFatale ? 'erroreFatale' : '',
            !traduzioniPronte ? 'traduzioniPronte=false' : '',
            !sessioneVerificata ? 'sessioneVerificata=false' : '',
            !saturnoPronto ? 'saturnoPronto=false' : '',
            (deveCaricare && !caroselloPronto) ? 'carosello non pronto' : '',
            caricamentoDisabilitato ? '(ma caricamento disabilitato)' : '',
          );
        }

        try {
          const nav = performance.getEntriesByType('navigation') as any[]; // leggo le entry di navigazione dal Performance API
          const tipo = nav && nav[0] && nav[0].type ? String(nav[0].type) : ''; // ricavo il tipo di navigazione corrente se disponibile
          const path = pulisciUrl(window.location.pathname || ''); // pulisco il pathname corrente
          const ingressoDiretto =
            tipo !== 'reload' &&
            isAreaCatalogo(path) &&
            isAreaCatalogo(this.pathPrecedenteSessioneAllAvvio); // verifico se sto entrando direttamente in area catalogo con storico catalogo
          this.loaderAvvioCatalogo =
            (tipo === 'reload' && isAreaCatalogo(path)) || ingressoDiretto; // aggiorno il flag che indica l'avvio catalogo
        } catch {
          this.loaderAvvioCatalogo = false; // ripristino il flag a false se qualcosa va storto nel rilevamento
        }

        if (caricamentoDisabilitato) {
          // controllo se il caricamento e' stato disabilitato
          this.forzaLoaderExtra = false; // disattivo l'eventuale loader extra forzato
          if (this.extraLoaderTimer) {
            clearTimeout(this.extraLoaderTimer);
            this.extraLoaderTimer = null;
          } // annullo l'eventuale timer extra attivo
        } else if (deveMostrareLoader) {
          // controllo se devo ancora mostrare il loader
          this.forzaLoaderExtra = false; // disattivo il loader extra forzato mentre il loader normale e' richiesto
          if (this.extraLoaderTimer) {
            clearTimeout(this.extraLoaderTimer);
            this.extraLoaderTimer = null;
          } // annullo l'eventuale timer extra attivo
        } else {
          // entro qui quando il loader normale non serve piu'
          if (
            this.devoCaricareTexturePrimaVolta &&
            this.isFirefox &&
            !this.forzaLoaderExtra
          ) {
            // controllo se devo forzare il loader extra alla prima texture su Firefox
            this.forzaLoaderExtra = true; // attivo il flag del loader extra forzato
            if (this.extraLoaderTimer) {
              clearTimeout(this.extraLoaderTimer);
              this.extraLoaderTimer = null;
            } // annullo un eventuale timer precedente prima di crearne uno nuovo
            this.extraLoaderTimer = setTimeout(() => {
              // preparo il timer che chiudera' il loader extra
              this.forzaLoaderExtra = false; // disattivo il flag del loader extra allo scadere del timer
              this.extraLoaderTimer = null; // azzero il riferimento al timer extra
              this.devoCaricareTexturePrimaVolta = false; // segno che il caricamento texture prima volta e' stato ormai gestito
              this.caricamentoDisabilitato$.next(
                this.caricamentoDisabilitato$.value,
              ); // riemetto il valore corrente per forzare una rivalutazione dello stato loader
            }, this.EXTRA_LOADER_MS);
          }
        }

        if (caricamentoDisabilitato) {
          // controllo se il caricamento e' disabilitato
          if (!schedaPronta.loaderGlobalmenteNascosto) {
            // verifico se il flag globale della scheda non e' ancora stato aggiornato
            schedaPronta.loaderGlobalmenteNascosto = true; // segno che il loader e' globalmente nascosto
            window.dispatchEvent(new CustomEvent('loader-hidden')); // emetto l'evento globale che segnala il loader nascosto
          }
          this.loaderVisibile = false; // segno internamente che il loader non e' piu' visibile
        }

        if (
          this.loaderVisibile &&
          !deveMostrareLoader &&
          !this.forzaLoaderExtra
        ) {
          // controllo se posso finalmente nascondere il loader
          this.loaderVisibile = false; // segno internamente che il loader non e' piu' visibile
          window.dispatchEvent(new CustomEvent('loader-hidden')); // emetto l'evento globale che segnala il loader nascosto
          schedaPronta.loaderGlobalmenteNascosto = true; // aggiorno il flag condiviso della scheda
          console.log('LOADER SPARITO alle ' + performance.now() + ' ms'); // loggo il momento in cui il loader scompare
          onLoaderNascosto(); // eseguo la callback di completamento quando il loader viene nascosto
        }
      },
    );
  }
}
