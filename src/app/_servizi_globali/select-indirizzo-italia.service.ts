import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface StatoSelectComuneItalia {
  aperto: boolean;
  valore: string;
  filtro: string;
  indice: number;
  provinciaFlash: boolean;
}

export interface StatoSelectCapItalia {
  aperto: boolean;
  valore: string;
  filtro: string;
  indice: number;
  multiplo: boolean;
  opzioni: string[];
  capFlash: boolean;
}

@Injectable({ providedIn: 'root' })
export class SelectIndirizzoItaliaService {
  comuni: any[] = [];
  caricamentoAvviato = false;

  constructor(
    public apiService: ApiService,
  ) {}

  creaStatoComune(valore: string = ''): StatoSelectComuneItalia {
    return {
      aperto: false,
      valore,
      filtro: '',
      indice: -1,
      provinciaFlash: false,
    };
  }

  creaStatoCap(valore: string = ''): StatoSelectCapItalia {
    return {
      aperto: false,
      valore,
      filtro: '',
      indice: -1,
      multiplo: false,
      opzioni: [],
      capFlash: false,
    };
  }

  caricaComuni(): void {
    if (this.caricamentoAvviato) return;

    this.caricamentoAvviato = true;

    this.apiService.getComuni().subscribe({
      next: (rit) => {
        this.comuni = (rit.data ?? []).sort((a: any, b: any) =>
          (a.comune ?? '').localeCompare(b.comune ?? '', 'it'),
        );
      },
      error: () => {
        this.comuni = [];
        this.caricamentoAvviato = false;
      },
    });
  }

  comuniFiltrati(stato: StatoSelectComuneItalia): any[] {
    if (!stato.filtro.trim()) return [];

    const filtro = stato.filtro.toLowerCase();

    return this.comuni
      .filter((c) => (c.comune ?? '').toLowerCase().startsWith(filtro))
      .slice(0, 50);
  }

  toggleComune(
    stato: StatoSelectComuneItalia,
    event: Event,
    statiDaChiudere: StatoSelectComuneItalia[] = [],
    classeInput: string = '',
  ): void {
    event.stopPropagation();

    stato.aperto = !stato.aperto;

    if (stato.aperto) {
      statiDaChiudere.forEach((s) => {
        s.aperto = false;
        s.filtro = '';
        s.indice = -1;
      });

      stato.indice = -1;
      stato.filtro = stato.valore ?? '';

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

  aggiornaFiltroComune(stato: StatoSelectComuneItalia, event: Event): void {
    stato.filtro = (event.target as HTMLInputElement).value;
    stato.indice = -1;

    if (!stato.aperto) {
      stato.aperto = true;
    }
  }

  navigaComune(
    stato: StatoSelectComuneItalia,
    event: KeyboardEvent,
    seleziona: (valore: string) => void,
  ): void {
    if (!stato.aperto) return;

    const lista = this.comuniFiltrati(stato);

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
      seleziona(lista[stato.indice].comune);
      return;
    }

    if (event.key === 'Escape') {
      stato.aperto = false;
      stato.filtro = '';
      stato.indice = -1;
    }
  }

  blurComune(
    stato: StatoSelectComuneItalia,
    event: FocusEvent,
    seleziona: (valore: string) => void,
  ): void {
    const destinazione = event.relatedTarget as HTMLElement | null;

    if (destinazione?.closest('.select-dropdown-profilo')) return;

    const valore = (event.target as HTMLInputElement).value.trim().toLowerCase();

    if (!valore) return;

    if (stato.valore && stato.valore.toLowerCase() === valore) return;

    const trovato = this.comuni.find((c) => (c.comune ?? '').toLowerCase() === valore);

    if (trovato) {
      seleziona(trovato.comune);
    }
  }

  selezionaComune(
    statoComune: StatoSelectComuneItalia,
    statoCap: StatoSelectCapItalia,
    valore: string,
  ): any | null {
    statoComune.valore = valore;
    statoComune.aperto = false;
    statoComune.filtro = '';
    statoComune.indice = -1;

    const comune = this.comuni.find((c) => c.comune === valore);

    statoCap.valore = '';
    statoCap.filtro = '';
    statoCap.indice = -1;
    statoCap.aperto = false;
    statoCap.multiplo = false;
    statoCap.opzioni = [];
    statoCap.capFlash = false;

    statoComune.provinciaFlash = false;

    if (!comune) return null;

    if (comune.cap_inizio && comune.cap_fine && String(comune.cap_inizio) !== String(comune.cap_fine)) {
      const inizio = parseInt(String(comune.cap_inizio), 10);
      const fine = parseInt(String(comune.cap_fine), 10);

      if (!isNaN(inizio) && !isNaN(fine) && fine > inizio) {
        const opzioni: string[] = [];

        for (let n = inizio; n <= fine; n++) {
          opzioni.push(String(n).padStart(5, '0'));
        }

        statoCap.multiplo = true;
        statoCap.opzioni = opzioni;

        setTimeout(() => {
          statoComune.provinciaFlash = true;
        }, 10);

        setTimeout(() => {
          statoComune.provinciaFlash = false;
        }, 1510);

        setTimeout(() => {
          statoCap.capFlash = true;
        }, 30);

        setTimeout(() => {
          statoCap.capFlash = false;
        }, 1510);

        return comune;
      }
    }

    if (comune.cap) {
      statoCap.valore = String(comune.cap).padStart(5, '0');
    }

    setTimeout(() => {
      statoComune.provinciaFlash = true;
    }, 10);

    setTimeout(() => {
      statoComune.provinciaFlash = false;
    }, 1510);

    setTimeout(() => {
      statoCap.capFlash = true;
    }, 10);

    setTimeout(() => {
      statoCap.capFlash = false;
    }, 1510);

    return comune;
  }

  capFiltrati(stato: StatoSelectCapItalia): string[] {
    if (!stato.filtro.trim()) return stato.opzioni;

    return stato.opzioni.filter((c) => c.startsWith(stato.filtro));
  }

  toggleCap(stato: StatoSelectCapItalia, event: Event, classeInput: string = ''): void {
    event.stopPropagation();

    if (!stato.multiplo) return;

    stato.aperto = !stato.aperto;

    if (stato.aperto) {
      stato.indice = -1;
      stato.filtro = stato.valore ?? '';

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

  aggiornaFiltroCap(stato: StatoSelectCapItalia, event: Event): void {
    stato.filtro = (event.target as HTMLInputElement).value.replace(/[^0-9]/g, '');
    stato.indice = -1;

    if (!stato.aperto) {
      stato.aperto = true;
    }
  }

  navigaCap(
    stato: StatoSelectCapItalia,
    event: KeyboardEvent,
    seleziona: (valore: string) => void,
  ): void {
    if (!stato.aperto) return;

    const lista = this.capFiltrati(stato);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      stato.indice = Math.min(stato.indice + 1, lista.length - 1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      stato.indice = Math.max(stato.indice - 1, -1);
      return;
    }

    if (event.key === 'Enter' && stato.indice >= 0) {
      event.preventDefault();
      seleziona(lista[stato.indice]);
      return;
    }

    if (event.key === 'Escape') {
      stato.aperto = false;
      stato.filtro = '';
      stato.indice = -1;
    }
  }

  blurCap(
    stato: StatoSelectCapItalia,
    event: FocusEvent,
    seleziona: (valore: string) => void,
  ): void {
    const destinazione = event.relatedTarget as HTMLElement | null;

    if (destinazione?.closest('.select-dropdown-profilo')) return;

    const valore = (event.target as HTMLInputElement).value.trim();

    if (!valore || stato.valore === valore) return;

    const trovato = stato.opzioni.find((c) => c === valore);

    if (trovato) {
      seleziona(trovato);
    }
  }

  selezionaCap(stato: StatoSelectCapItalia, valore: string): void {
    stato.valore = valore;
    stato.aperto = false;
    stato.filtro = '';
    stato.indice = -1;
    stato.capFlash = false;

    setTimeout(() => {
      stato.capFlash = true;
    }, 10);

    setTimeout(() => {
      stato.capFlash = false;
    }, 1510);
  }

  chiudiComune(stato: StatoSelectComuneItalia): void {
    stato.aperto = false;
    stato.filtro = '';
    stato.indice = -1;
  }

  chiudiCap(stato: StatoSelectCapItalia): void {
    stato.aperto = false;
    stato.filtro = '';
    stato.indice = -1;
  }
}
