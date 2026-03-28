// ─── categoria-paginazione.helper.ts ─────────────────────────────────────────
// Stato e logica di paginazione del carosello.
// Estratto da riga-categoria.component.ts: indicePagina, paginaSuccessiva,
// paginaPrecedente, calcolaNumeroMassimoPagine, aggiornaTrasformazioneWrapper,
// impostaPaginaIniziale, registraClickScrollCategoria, tracciaLocandina.

export class CategoriaPaginazioneHelper {

  indicePagina          = 0;
  numeroMassimoPagine   = 0;
  trasformazioneWrapper = '';
  cicloTrackBy          = 0;

  // ── Estratto da calcolaNumeroMassimoPagine() ──────────────────────────────
  calcolaNumeroMassimoPagine(totalLocandine: number, locandineVisibili: number): void {
    this.numeroMassimoPagine = Math.max(
      Math.ceil(totalLocandine / locandineVisibili) - 1,
      0,
    );
  }

  // Estratto da aggiornaTrasformazioneWrapper()
  aggiornaTrasformazioneWrapper(): void {
    this.trasformazioneWrapper = `translateX(${-this.indicePagina * 100}%)`;
  }

  // Estratto da impostaPaginaIniziale()
  impostaPaginaIniziale(pagina: number): void {
    const clamped      = Math.max(0, Math.min(
      Number.isFinite(pagina) ? Math.floor(pagina) : 0,
      this.numeroMassimoPagine,
    ));
    this.indicePagina  = clamped;
    this.aggiornaTrasformazioneWrapper();
  }

  // Estratto da paginaSuccessiva()
  paginaSuccessiva(onScroll: () => void): void {
    if (this.indicePagina < this.numeroMassimoPagine) {
      this.indicePagina++;
      this.aggiornaTrasformazioneWrapper();
      onScroll();
    }
  }

  // Estratto da paginaPrecedente()
  paginaPrecedente(onScroll: () => void): void {
    if (this.indicePagina > 0) {
      this.indicePagina--;
      this.aggiornaTrasformazioneWrapper();
      onScroll();
    }
  }

  // Estratto da registraClickScrollCategoria()
  registraClickScrollCategoria(idCategoria: string, abilitaSalvataggio: boolean): void {
    if (!abilitaSalvataggio) return;
    try {
      const chiave   = 'storico_scroll_categorie';
      const raw      = sessionStorage.getItem(chiave);
      const storico  = raw ? JSON.parse(raw) : [];
      storico.push({ idCategoria: String(idCategoria || '').trim(), pagina: this.indicePagina });
      sessionStorage.setItem(chiave, JSON.stringify(storico));
    } catch {}
  }

  // Estratto da tracciaLocandina()
  tracciaLocandina(indice: number, loc: { src: string }, mostraSpinner: boolean, motivoCopertura: string): string {
    const base = String(loc?.src || '');
    if (mostraSpinner && motivoCopertura === 'tipo')
      return this.cicloTrackBy + '|' + indice + '|' + base;
    return base;
  }

  // Chiamato da avviaCopertura quando motivo === 'tipo'
  incrementaCicloTrackBy(): void {
    this.cicloTrackBy += 1;
  }

  resetPagina(): void {
    this.indicePagina = 0;
    this.aggiornaTrasformazioneWrapper();
  }
}
