import { Component, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { IRispostaServer } from 'src/app/_interfacce/IRispostaServer.interface';

type LocandinaCategoria = {
  id_categoria: number;
  img_locandina: string;
  lingua: string;
};

@Component({
  selector: 'app-esperimento',
  templateUrl: './esperimento.component.html',
  styleUrls: ['./esperimento.component.scss'],
})
export class EsperimentoComponent implements OnInit {
  locandine$: Observable<LocandinaCategoria[]> = of([]);
  errore = '';

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.locandine$ = this.api.getCategorieLocandine().pipe(
      map((rit: IRispostaServer) => (Array.isArray(rit.data) ? (rit.data as LocandinaCategoria[]) : [])),
      catchError((e) => {
        this.errore = 'Errore durante il caricamento locandine.';
        console.error(e);
        return of([]);
      }),
      shareReplay(1)
    );
  }

  tracciaLocandina(indice: number, x: LocandinaCategoria): string {
    return `${x.id_categoria}-${x.lingua}-${indice}`;
  }
}
