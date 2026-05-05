import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { CambioLinguaService } from './cambio-lingua.service';

export interface StatoSelectNazioni {
  aperto: boolean;
  valore: string;
  filtro: string;
  indice: number;
}

@Injectable({ providedIn: 'root' })
export class SelectNazioniService {
  nazioni: any[] = [];
  caricamentoAvviato = false;

  constructor(
    public apiService: ApiService,
    public cambioLinguaService: CambioLinguaService,
  ) {}

  creaStato(valore: string = 'IT'): StatoSelectNazioni {
    return {
      aperto: false,
      valore,
      filtro: '',
      indice: -1,
    };
  }

  caricaNazioni(): void {
    if (this.caricamentoAvviato) return;

    this.caricamentoAvviato = true;

    this.apiService.getNazioni().subscribe({
      next: (rit) => {
        const lingua = this.cambioLinguaService.leggiCodiceLingua();

        this.nazioni = (rit.data ?? []).sort((a: any, b: any) =>
          (lingua === 'it' ? a.nazione_it : (a.nazione_en ?? '')).localeCompare(
            lingua === 'it' ? b.nazione_it : (b.nazione_en ?? ''),
            lingua,
          ),
        );
      },
      error: () => {
        this.nazioni = [];
        this.caricamentoAvviato = false;
      },
    });
  }

  nazioniFiltrate(stato: StatoSelectNazioni): any[] {
    if (!stato.filtro.trim()) return this.nazioni;

    const filtro = stato.filtro.toLowerCase();

    return this.nazioni.filter((n) =>
      (n.nazione_it ?? '').toLowerCase().startsWith(filtro) ||
      (n.nazione_en ?? '').toLowerCase().startsWith(filtro),
    );
  }

  label(stato: StatoSelectNazioni): string {
    if (!stato.valore) return '';

    const nazione = this.nazioni.find((n) => n.iso === stato.valore);

    if (!nazione) return '';

    return this.cambioLinguaService.leggiCodiceLingua() === 'it'
      ? nazione.nazione_it
      : nazione.nazione_en;
  }

  toggle(stato: StatoSelectNazioni, event: Event, statiDaChiudere: StatoSelectNazioni[] = [], classeInput: string = ''): void {
    event.stopPropagation();

    stato.aperto = !stato.aperto;

    if (stato.aperto) {
      statiDaChiudere.forEach((s) => {
        s.aperto = false;
        s.filtro = '';
        s.indice = -1;
      });

      stato.indice = -1;
      stato.filtro = stato.valore ? this.label(stato) : '';

      if (classeInput) {
        setTimeout(() => {
          const input = document.querySelector(classeInput) as HTMLInputElement | null;
          if (input) {
            input.focus();
            input.select();
          }
        }, 0);
      }
    }

    if (!stato.aperto) {
      stato.filtro = '';
      stato.indice = -1;
    }
  }

  aggiornaFiltro(stato: StatoSelectNazioni, event: Event): void {
    stato.filtro = (event.target as HTMLInputElement).value;
    stato.indice = -1;

    if (!stato.aperto) {
      stato.aperto = true;
    }
  }

  naviga(stato: StatoSelectNazioni, event: KeyboardEvent, seleziona: (valore: string) => void): void {
    if (!stato.aperto) return;

    const lista = this.nazioniFiltrate(stato);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      stato.filtro = (event.target as HTMLInputElement).value;
      stato.indice = Math.min(stato.indice + 1, lista.length - 1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      stato.filtro = (event.target as HTMLInputElement).value;
      stato.indice = Math.max(stato.indice - 1, -1);
      return;
    }

    if (event.key === 'Enter' && stato.indice >= 0) {
      event.preventDefault();
      seleziona(lista[stato.indice].iso);
      return;
    }

    if (event.key === 'Escape') {
      stato.aperto = false;
      stato.filtro = '';
      stato.indice = -1;
    }
  }

  blur(stato: StatoSelectNazioni, event: FocusEvent, seleziona: (valore: string) => void): void {
    const destinazione = event.relatedTarget as HTMLElement | null;

    if (destinazione?.closest('.select-dropdown-profilo')) return;

    const valore = (event.target as HTMLInputElement).value.trim().toLowerCase();

    if (!valore) return;

    const labelCorrente = this.label(stato).toLowerCase();

    if (stato.valore && labelCorrente === valore) return;

    const trovata = this.nazioni.find((n) =>
      (n.nazione_it ?? '').toLowerCase() === valore ||
      (n.nazione_en ?? '').toLowerCase() === valore,
    );

    if (trovata) {
      seleziona(trovata.iso);
    }
  }

  seleziona(stato: StatoSelectNazioni, valore: string): void {
    stato.valore = valore;
    stato.aperto = false;
    stato.filtro = '';
    stato.indice = -1;
  }

  chiudi(stato: StatoSelectNazioni): void {
    stato.aperto = false;
    stato.filtro = '';
    stato.indice = -1;
  }
}
