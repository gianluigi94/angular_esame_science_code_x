// Helper che gestisce il flusso completo di logout dell'header.

import { Router }                     from '@angular/router';
import { Authservice }                from 'src/app/_benvenuto/login/_login_service/auth.service';
import { ApiService }                 from 'src/app/_servizi_globali/api.service';
import { StatoSessioneClientService } from 'src/app/_servizi_globali/stato-sessione-client.service';
import { ErroreGlobaleService }       from 'src/app/_servizi_globali/errore-globale.service';

/** Helper che gestisce il flusso completo di logout dell'header. */
export class HeaderAuthHelper {

  logoutInCorso = false; // tengo traccia se il logout e' gia' partito
  private shieldLogout: HTMLDivElement | null = null; // conservo l'overlay che blocca la UI

  /**
   * Inizializza le dipendenze necessarie al logout remoto e locale.
   * @param api Service API usato per notificare il logout al backend.
   * @param authService Service autenticazione usato per pulire la sessione locale.
   * @param statoSessione Service che traccia lo stato di ricaricamento della sessione.
   * @param erroreGlobale Service usato per resettare eventuali errori fatali globali.
   * @param onLogoutAvviato Callback per chiudere menu e resettare la UI del componente.
   * @param onMenuUtenteAperto Callback per forzare lo stato del menu utente.
   * @returns Non restituisce nulla.
   */
  constructor(
    private api: ApiService,
    private authService: Authservice,
    private statoSessione: StatoSessioneClientService,
    private erroreGlobale: ErroreGlobaleService,
    private onLogoutAvviato: () => void,
    private onMenuUtenteAperto: (v: boolean) => void,
  ) {}

  /**
   * Avvia il logout utente congelando subito la UI e chiamando il backend.
   * In caso di successo o errore server completa comunque il logout locale.
   * @returns Non restituisce nulla.
   */
  onClickScollegati(): void {
    this.avviaFreezeLogout();
    this.logoutInCorso = true;
    this.api.logout().subscribe({
      next: () => this.eseguiLogoutLocale(),
      error: () => this.eseguiLogoutLocale(),
    });
  }

  /**
   * Blocca l'interfaccia durante il logout creando uno shield full-screen.
   * Aggiorna anche lo stato UI dell'header prima di procedere.
   * @returns Non restituisce nulla.
   */
  private avviaFreezeLogout(): void {
    if (this.logoutInCorso) return;

    this.logoutInCorso = true;
    this.onMenuUtenteAperto(true);
    this.onLogoutAvviato();

    const shield = document.createElement('div');
    shield.id = 'logout_shield';

    Object.assign(shield.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      zIndex: '9999',
      background: 'transparent',
      pointerEvents: 'all',
      cursor: 'progress',
    });

    document.body.appendChild(shield);
    this.shieldLogout = shield;
  }

  /**
   * Completa il logout lato client, resetta gli errori e forza il reload pagina.
   * Il reload parte una sola volta per evitare richiami doppi.
   * @returns Non restituisce nulla.
   */
  eseguiLogoutLocale(): void {
    this.erroreGlobale.resettaErroreFatale();
    this.authService.logout(false);

    if (!this.statoSessione.staRicaricando) {
      this.statoSessione.staRicaricando = true;
      setTimeout(() => window.location.reload(), 1000);
    }
  }

  /**
   * Rimuove in sicurezza lo shield di logout quando l'helper viene distrutto.
   * @returns Non restituisce nulla.
   */
  destroy(): void {
    try {
      this.shieldLogout?.remove();
    } catch {}
  }
}
