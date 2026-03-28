// ─── categoria-spinner.helper.ts ─────────────────────────────────────────────
// State machine per la copertura (spinner) durante cambio lingua / tipo.
// Estratto da riga-categoria.component.ts: avviaCopertura, avviaAttesaImmaginiLingua,
// immagineStabilizzata, fineSePronto, azzeraTimer, assicuraCoperturaCompleta,
// fineCoperturaDopoMinimo.

import { ChangeDetectorRef, ElementRef, QueryList } from '@angular/core';

export class CategoriaSpinnerHelper {

  mostraSpinner              = false;
  motivoCopertura            = '';
  inAttesaImmagini           = false;
  attendoAggiornamentoLocandine = false;

  private idCiclo            = 0;
  private avvioSpinnerAt     = 0;
  private totaleAtteso       = 0;
  private conteggioCaricate  = 0;
  private readonly permanenzaMinimaMs = 350;
  private readonly fallbackMaxMs      = 2000;
  private timerFallback: any = 0;
  private timerNascondi: any = 0;

  constructor(
    private cdr:              ChangeDetectorRef,
    private getElementi:      () => QueryList<ElementRef>,
    private getLocandine:     () => any[],
  ) {}

  // ── Estratto da avviaCopertura() ──────────────────────────────────────────
  avviaCopertura(motivo: string, idForzato = 0): number {
    this.idCiclo            = idForzato || (this.idCiclo + 1);
    this.motivoCopertura    = motivo;
    this.azzeraTimer();
    this.inAttesaImmagini   = false;
    this.totaleAtteso       = 0;
    this.conteggioCaricate  = 0;
    this.mostraSpinner      = true;
    this.avvioSpinnerAt     = Date.now();
    try { this.cdr.detectChanges(); } catch {}
    requestAnimationFrame(() => {
      try { this.cdr.detectChanges(); } catch {}
      if (motivo === 'tipo') this.assicuraCoperturaCompleta(this.idCiclo, 0);
    });
    return this.idCiclo;
  }

  // ── Estratto da avviaAttesaImmaginiLingua() ───────────────────────────────
  avviaAttesaImmaginiLingua(id: number): void {
    if (id !== this.idCiclo)           return;
    if (!this.mostraSpinner)           return;
    if (this.attendoAggiornamentoLocandine) return;

    this.inAttesaImmagini  = true;
    this.totaleAtteso      = (this.getLocandine() || []).length;
    this.conteggioCaricate = 0;

    if (this.totaleAtteso === 0) { this.fineSePronto(true, id); return; }
    if (this.timerFallback) clearTimeout(this.timerFallback);
    this.timerFallback = setTimeout(() => this.fineSePronto(true, id), this.fallbackMaxMs);
  }

  // Estratto da immagineStabilizzata()
  immagineStabilizzata(): void {
    if (!this.inAttesaImmagini) return;
    this.conteggioCaricate += 1;
    this.fineSePronto(false, this.idCiclo);
  }

  // Estratto da fineSePronto()
  fineSePronto(forzatura: boolean, id: number): void {
    if (id !== this.idCiclo) return;
    const pronto = forzatura || this.conteggioCaricate >= this.totaleAtteso;
    if (!pronto) return;
    this.inAttesaImmagini = false;
    if (this.timerNascondi) clearTimeout(this.timerNascondi);
    const manca = Math.max(0, this.permanenzaMinimaMs - (Date.now() - (this.avvioSpinnerAt || 0)));
    this.timerNascondi = setTimeout(() => {
      if (id !== this.idCiclo) return;
      this.mostraSpinner    = false;
      this.motivoCopertura  = '';
      try { this.cdr.detectChanges(); } catch {}
    }, manca);
  }

  // Estratto da fineCoperturaDopoMinimo()
  fineCoperturaDopoMinimo(id: number): void {
    if (id !== this.idCiclo) return;
    if (this.timerNascondi) clearTimeout(this.timerNascondi);
    this.timerNascondi = setTimeout(() => {
      if (id !== this.idCiclo) return;
      this.mostraSpinner   = false;
      this.motivoCopertura = '';
      try { this.cdr.detectChanges(); } catch {}
    }, 100);
  }

  // Estratto da azzeraTimer()
  azzeraTimer(): void {
    if (this.timerFallback) { clearTimeout(this.timerFallback); this.timerFallback = 0; }
    if (this.timerNascondi) { clearTimeout(this.timerNascondi); this.timerNascondi = 0; }
  }

  // Estratto da assicuraCoperturaCompleta()
  assicuraCoperturaCompleta(id: number, tentativi: number): void {
    if (id !== this.idCiclo) return;
    if (!this.mostraSpinner)  return;

    const lista = this.getElementi()?.toArray() ?? [];
    if (!lista.length) {
      if (tentativi >= 10) return;
      requestAnimationFrame(() => this.assicuraCoperturaCompleta(id, tentativi + 1));
      return;
    }
    let ok = true;
    for (const ref of lista) {
      const cover = ref?.nativeElement?.querySelector('.carica_img');
      if (!cover?.classList?.contains('visibile')) { ok = false; break; }
    }
    if (ok || tentativi >= 10) return;
    try { this.cdr.detectChanges(); } catch {}
    requestAnimationFrame(() => this.assicuraCoperturaCompleta(id, tentativi + 1));
  }

  leggiIdCiclo(): number { return this.idCiclo; }

  destroy(): void { this.azzeraTimer(); }
}
