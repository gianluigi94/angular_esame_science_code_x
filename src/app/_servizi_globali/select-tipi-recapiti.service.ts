import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { TranslateService } from '@ngx-translate/core';

export interface TipoRecapito {
  id_tipo_recapito: number;
  tipo: string;
}

export interface StatoSelectTipoRecapito {
  aperto: boolean;
  id: number | null;
  tipo: string;
  indice: number;
}

@Injectable({ providedIn: 'root' })
export class SelectTipiRecapitiService {
  tipi: TipoRecapito[] = [];
  caricamentoAvviato = false;

  constructor(
    public apiService: ApiService,
    public translateService: TranslateService,
  ) {}

  creaStato(id: number | null = null, tipo: string = ''): StatoSelectTipoRecapito {
    return {
      aperto: false,
      id,
      tipo,
      indice: -1,
    };
  }

  caricaTipiRecapiti(): void {
    if (this.caricamentoAvviato) return;

    this.caricamentoAvviato = true;

    this.apiService.getTipiRecapiti().subscribe({
      next: (rit) => {
        this.tipi = rit.data ?? [];
      },
      error: () => {
        this.tipi = [];
        this.caricamentoAvviato = false;
      },
    });
  }

  label(tipo: string): string {
    if (!tipo) return '';
    return this.translateService.instant('ui.profilo.contatti.tipo.' + tipo);
  }

  labelStato(stato: StatoSelectTipoRecapito): string {
    return this.label(stato.tipo);
  }

  toggle(
    stato: StatoSelectTipoRecapito,
    event: Event,
    statiDaChiudere: StatoSelectTipoRecapito[] = [],
  ): void {
    event.stopPropagation();

    stato.aperto = !stato.aperto;

    if (stato.aperto) {
      statiDaChiudere.forEach((s) => {
        s.aperto = false;
        s.indice = -1;
      });

      stato.indice = -1;
    }

    if (!stato.aperto) {
      stato.indice = -1;
    }
  }

  naviga(
    stato: StatoSelectTipoRecapito,
    event: KeyboardEvent,
    seleziona: (tipo: TipoRecapito) => void,
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
      stato.indice = Math.max(stato.indice - 1, 0);
      return;
    }

    if (event.key === 'Enter' && stato.aperto && stato.indice >= 0) {
      event.preventDefault();
      seleziona(this.tipi[stato.indice]);
      return;
    }

    if (event.key === 'Escape') {
      stato.aperto = false;
      stato.indice = -1;
    }
  }

  seleziona(stato: StatoSelectTipoRecapito, tipo: TipoRecapito): void {
    stato.id = tipo.id_tipo_recapito;
    stato.tipo = tipo.tipo;
    stato.aperto = false;
    stato.indice = -1;
  }

  chiudi(stato: StatoSelectTipoRecapito): void {
    stato.aperto = false;
    stato.indice = -1;
  }
}
