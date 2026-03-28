// ─── header-auth.helper.ts ───────────────────────────────────────────────────
// Gestisce il flusso di logout: freeze UI, logout server, logout locale.
// Estratto da header.component.ts.

import { Router }                     from '@angular/router';
import { Authservice }                from 'src/app/_benvenuto/login/_login_service/auth.service';
import { ApiService }                 from 'src/app/_servizi_globali/api.service';
import { StatoSessioneClientService } from 'src/app/_servizi_globali/stato-sessione-client.service';
import { ErroreGlobaleService }       from 'src/app/_servizi_globali/errore-globale.service';

export class HeaderAuthHelper {

  logoutInCorso      = false;
  private shieldLogout: HTMLDivElement | null = null;

  constructor(
    private api:          ApiService,
    private authService:  Authservice,
    private statoSessione: StatoSessioneClientService,
    private erroreGlobale: ErroreGlobaleService,
    private onLogoutAvviato:    () => void,   // chiude menu, resetta UI nel componente
    private onMenuUtenteAperto: (v: boolean) => void,
  ) {}

  // ── Estratto da onClickScollegati() ───────────────────────────────────────
  onClickScollegati(): void {
    this.avviaFreezeLogout();
    this.logoutInCorso = true;
    this.api.logout().subscribe({
      next:  () => this.eseguiLogoutLocale(),
      error: () => this.eseguiLogoutLocale(),
    });
  }

  // ── Estratto da avviaFreezeLogout() ───────────────────────────────────────
  private avviaFreezeLogout(): void {
    if (this.logoutInCorso) return;
    this.logoutInCorso = true;
    this.onMenuUtenteAperto(true);
    this.onLogoutAvviato();

    const shield = document.createElement('div');
    shield.id = 'logout_shield';
    Object.assign(shield.style, {
      position: 'fixed', top: '0', left: '0',
      width: '100vw', height: '100vh',
      zIndex: '9999', background: 'transparent',
      pointerEvents: 'all', cursor: 'progress',
    });
    document.body.appendChild(shield);
    this.shieldLogout = shield;
  }

  // ── Estratto da eseguiLogoutLocale() ──────────────────────────────────────
  eseguiLogoutLocale(): void {
    this.erroreGlobale.resettaErroreFatale();
    this.authService.logout(false);
    if (!this.statoSessione.staRicaricando) {
      this.statoSessione.staRicaricando = true;
      setTimeout(() => window.location.reload(), 1000);
    }
  }

  destroy(): void {
    try { this.shieldLogout?.remove(); } catch {}
  }
}
