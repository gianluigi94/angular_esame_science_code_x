import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ApiService } from 'src/app/_servizi_globali/api.service';

export interface TipoIndirizzo {
  id_tipo_indirizzo: number;
  tipo: string;
}

export interface StatoSelectTipoIndirizzo {
  aperto: boolean;
  idTipoIndirizzo: number | null;
  tipo: string;
  indice: number;
}

@Injectable({ providedIn: 'root' })
export class SelectTipiIndirizziService {
  tipi: TipoIndirizzo[] = [];
  caricamentoAvviato = false;

  constructor(
    public apiService: ApiService,
    public translateService: TranslateService,
  ) {}

  creaStato(idTipoIndirizzo: number | null = null, tipo: string = ''): StatoSelectTipoIndirizzo {
    return {
      aperto: false,
      idTipoIndirizzo,
      tipo,
      indice: -1,
    };
  }

  caricaTipiIndirizzi(): void {
    if (this.caricamentoAvviato) return;

    this.caricamentoAvviato = true;

    this.apiService.getTipologieIndirizzi().subscribe({
      next: (rit) => {
        this.tipi = rit.data ?? [];
      },
      error: () => {
        this.tipi = [];
        this.caricamentoAvviato = false;
      },
    });
  }

  toggle(
    stato: StatoSelectTipoIndirizzo,
    event: Event,
    statiDaChiudere: StatoSelectTipoIndirizzo[] = [],
  ): void {
    event.stopPropagation();

    stato.aperto = !stato.aperto;

    if (stato.aperto) {
      statiDaChiudere.forEach((s) => {
        s.aperto = false;
        s.indice = -1;
      });

      stato.indice = this.indiceDaStato(stato);
    }

    if (!stato.aperto) {
      stato.indice = -1;
    }
  }

  naviga(
    stato: StatoSelectTipoIndirizzo,
    event: KeyboardEvent,
    seleziona: (tipo: TipoIndirizzo) => void,
  ): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();

      if (!stato.aperto) {
        stato.aperto = true;
      }

      stato.indice = Math.min(stato.indice + 1, this.tipi.length - 1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();

      if (!stato.aperto) {
        stato.aperto = true;
      }

      stato.indice = Math.max(stato.indice - 1, 0);
      return;
    }

    if (event.key === 'Enter' && stato.aperto && stato.indice >= 0) {
      event.preventDefault();
      seleziona(this.tipi[stato.indice]);
      return;
    }

    if (event.key === 'Escape') {
      this.chiudi(stato);
    }
  }

  seleziona(stato: StatoSelectTipoIndirizzo, tipo: TipoIndirizzo): void {
    stato.idTipoIndirizzo = tipo.id_tipo_indirizzo;
    stato.tipo = tipo.tipo;
    stato.aperto = false;
    stato.indice = -1;
  }

  chiudi(stato: StatoSelectTipoIndirizzo): void {
    stato.aperto = false;
    stato.indice = -1;
  }

  label(tipo: string): string {
    if (!tipo) {
      return this.translateService.instant('ui.profilo.indirizzi.form.tipo_placeholder');
    }

    return this.translateService.instant(`ui.profilo.indirizzi.tipo.${this.chiaveTipo(tipo)}`);
  }

  labelStato(stato: StatoSelectTipoIndirizzo): string {
    return this.label(stato.tipo);
  }

  chiaveTipo(tipo: string): string {
    return tipo.trim().toLowerCase().replace(/\s+/g, '_');
  }

  indiceDaStato(stato: StatoSelectTipoIndirizzo): number {
    const indice = this.tipi.findIndex((t) => t.id_tipo_indirizzo === stato.idTipoIndirizzo);
    return indice >= 0 ? indice : -1;
  }
}
