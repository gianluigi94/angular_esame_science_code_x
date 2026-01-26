 import { Injectable } from '@angular/core';
 import { BehaviorSubject } from 'rxjs';

 export type TipoContenuto = 'film_serie' | 'film' | 'serie';

 @Injectable({ providedIn: 'root' })
 export class TipoContenutoService {
  chiaveStorage = 'tipo_contenuto_selezionato';
  tipoSelezionato$ = new BehaviorSubject<TipoContenuto>(this.leggiDaStorage());

   impostaTipo(tipo: TipoContenuto): void {
    localStorage.setItem(this.chiaveStorage, tipo);
     this.tipoSelezionato$.next(tipo);
   }

   leggiTipo(): TipoContenuto {
     return this.tipoSelezionato$.value;
   }

  leggiDaStorage(): TipoContenuto {
    const raw = String(localStorage.getItem(this.chiaveStorage) || '');
    if (raw === 'film' || raw === 'serie' || raw === 'film_serie') return raw;
    return 'film_serie';
  }
 }
