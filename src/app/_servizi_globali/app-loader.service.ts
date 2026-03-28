// ─── app-loader.service.ts ───────────────────────────────────────────────────
// Gestisce la logica del loader globale: combineLatest, forzaExtra, Firefox.
// Estratto da app.component.ts.

import { Injectable }        from '@angular/core';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { pulisciUrl, isAreaCatalogo }     from '../_helpers_globali/helpers';
import { ErroreGlobaleService }     from './errore-globale.service';
import { TraduzioniService }        from './traduzioni.service';
import { StatoSessioneClientService } from './stato-sessione-client.service';
import { SaturnoStatoService }      from './animazioni_saturno/saturno-stato.service';

@Injectable({ providedIn: 'root' })
export class AppLoaderService {

  // Esposto al template
  forzaLoaderExtra   = false;
  loaderAvvioCatalogo = false;
  loaderDaMostrare   = false;

  private loaderVisibile              = true;
  private extraLoaderTimer: any       = null;
  private readonly EXTRA_LOADER_MS    = 2600;
  private devoCaricareTexturePrimaVolta: boolean;
  private isFirefox: boolean;
  private pathPrecedenteSessioneAllAvvio = '';

  caricamentoDisabilitato$        = new BehaviorSubject<boolean>(false);
  deveCaricareImmaginiCarosello$  = new BehaviorSubject<boolean>(false);

  constructor(
    private erroreGlobale:  ErroreGlobaleService,
    private traduzioni:     TraduzioniService,
    private statoSessione:  StatoSessioneClientService,
    private saturnoStato:   SaturnoStatoService,
  ) {
    this.devoCaricareTexturePrimaVolta = localStorage.getItem('saturnoTextureLoaded') !== 'true';
    this.isFirefox = /firefox/i.test(navigator.userAgent);
  }

  impostaPathPrecedente(path: string): void {
    this.pathPrecedenteSessioneAllAvvio = path;
  }

  // ── Estratto dal blocco combineLatest in ngOnInit() ───────────────────────
  avvia(
    caroselloPronto$: Observable<boolean>,
    schedaPronta: { loaderGlobalmenteNascosto: boolean },
    onLoaderNascosto: () => void,
  ): void {
    combineLatest([
      this.erroreGlobale.erroreFatale$,
      this.traduzioni.traduzioniInizialiCaricate$,
      this.statoSessione.sessioneVerificata$,
      this.saturnoStato.saturnoPronto$,
      caroselloPronto$,
      this.deveCaricareImmaginiCarosello$,
      this.caricamentoDisabilitato$,
    ]).subscribe(([
      erroreFatale, traduzioniPronte, sessioneVerificata,
      saturnoPronto, caroselloPronto, deveCaricare, caricamentoDisabilitato,
    ]) => {
      console.log(
        '[LOADER STATE]',
        '| disabilitato=', caricamentoDisabilitato,
        '| forzaExtra=',   this.forzaLoaderExtra,
        '| erroreFatale=', erroreFatale,
        '| traduzioniPronte=', traduzioniPronte,
        '| sessioneVerificata=', sessioneVerificata,
        '| saturnoPronto=', saturnoPronto,
        '| deveCaricareCarosello=', deveCaricare,
        '| caroselloPronto=', caroselloPronto,
      );

      const deveMostrareLoader =
        !caricamentoDisabilitato && (
          erroreFatale      ||
          !traduzioniPronte ||
          !sessioneVerificata ||
          !saturnoPronto    ||
          (deveCaricare && !caroselloPronto)
        );

      // Calcolo loaderAvvioCatalogo
      try {
        const nav  = performance.getEntriesByType('navigation') as any[];
        const tipo = nav && nav[0] && nav[0].type ? String(nav[0].type) : '';
        const path = pulisciUrl(window.location.pathname || '');
        const ingressoDiretto = tipo !== 'reload' && isAreaCatalogo(path) && isAreaCatalogo(this.pathPrecedenteSessioneAllAvvio);
        this.loaderAvvioCatalogo = (tipo === 'reload' && isAreaCatalogo(path)) || ingressoDiretto;
      } catch {
        this.loaderAvvioCatalogo = false;
      }

      if (caricamentoDisabilitato) {
        this.forzaLoaderExtra = false;
        if (this.extraLoaderTimer) { clearTimeout(this.extraLoaderTimer); this.extraLoaderTimer = null; }
      } else if (deveMostrareLoader) {
        this.forzaLoaderExtra = false;
        if (this.extraLoaderTimer) { clearTimeout(this.extraLoaderTimer); this.extraLoaderTimer = null; }
      } else {
        if (this.devoCaricareTexturePrimaVolta && this.isFirefox && !this.forzaLoaderExtra) {
          this.forzaLoaderExtra = true;
          if (this.extraLoaderTimer) { clearTimeout(this.extraLoaderTimer); this.extraLoaderTimer = null; }
          this.extraLoaderTimer = setTimeout(() => {
            this.forzaLoaderExtra = false;
            this.extraLoaderTimer = null;
            this.devoCaricareTexturePrimaVolta = false;
            this.caricamentoDisabilitato$.next(this.caricamentoDisabilitato$.value);
          }, this.EXTRA_LOADER_MS);
        }
      }

      if (caricamentoDisabilitato) {
        if (!schedaPronta.loaderGlobalmenteNascosto) {
          schedaPronta.loaderGlobalmenteNascosto = true;
          window.dispatchEvent(new CustomEvent('loader-hidden'));
        }
        this.loaderVisibile = false;
      }

      if (this.loaderVisibile && !deveMostrareLoader && !this.forzaLoaderExtra) {
        this.loaderVisibile = false;
        window.dispatchEvent(new CustomEvent('loader-hidden'));
        schedaPronta.loaderGlobalmenteNascosto = true;
        console.log('LOADER SPARITO alle ' + performance.now() + ' ms');
        onLoaderNascosto();
      }
    });
  }
}
