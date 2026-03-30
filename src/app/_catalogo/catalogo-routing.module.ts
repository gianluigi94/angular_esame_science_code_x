// Modulo di routing che definisce le rotte del Catalogo e collega matcher, path e componenti corretti.

import { NgModule } from '@angular/core';
import { CatalogoComponent } from './catalogo/catalogo.component';
import { SchedaComponent } from './scheda/scheda.component';
import { RouterModule, Routes, UrlSegment, UrlMatchResult } from '@angular/router';
import { CatalogoUscitaGuard } from 'src/app/_guard/catalogo-uscita.guard';

/**
 * Riconosce le rotte di dettaglio film con id numerico.
 *
 * @param segmenti Segmenti URL correnti da validare.
 * @returns UrlMatchResult | null Match valido con id oppure null.
 */
export function matcherFilmDettaglio(segmenti: UrlSegment[]): UrlMatchResult | null {
  if (
    segmenti.length === 2 &&
    /^(film|movies)$/.test(segmenti[0].path) &&
    /^\d+$/.test(segmenti[1].path)
  ) {
    return {
      consumed: segmenti,
      posParams: { id: segmenti[1] },
    }; // consumo i segmenti e salvo l'id come parametro di route
  }
  return null; // se i segmenti non corrispondono non faccio match
}

/**
 * Riconosce le rotte di dettaglio serie con id numerico e stagione opzionale.
 *
 * @param segmenti Segmenti URL correnti da validare.
 * @returns UrlMatchResult | null Match valido con id e stagione opzionale oppure null.
 */
export function matcherSerieDettaglio(segmenti: UrlSegment[]): UrlMatchResult | null {
  if (
    /^(serie|series)$/.test(segmenti[0]?.path) &&
    /^\d+$/.test(segmenti[1]?.path)
  ) {
    if (segmenti.length === 2) {
      return { consumed: segmenti, posParams: { id: segmenti[1] } }; // faccio match su una scheda serie senza stagione esplicita
    }
    if (
      segmenti.length === 4 &&
      /^(stagione|season)$/.test(segmenti[2]?.path) &&
      /^\d+$/.test(segmenti[3]?.path)
    ) {
      return {
        consumed: segmenti,
        posParams: { id: segmenti[1], stagione: segmenti[3] },
      }; // faccio match su una scheda serie con stagione esplicita
    }
  }
  return null; // se i segmenti non corrispondono non faccio match
}

const routes: Routes = [
  {
    path: '',
    component: CatalogoComponent,
    canDeactivate: [CatalogoUscitaGuard],
  },

  {
    path: 'film',
    component: CatalogoComponent,
    canDeactivate: [CatalogoUscitaGuard],
  },
  {
    path: 'serie',
    component: CatalogoComponent,
    canDeactivate: [CatalogoUscitaGuard],
  },
  {
    path: 'film-serie',
    component: CatalogoComponent,
    canDeactivate: [CatalogoUscitaGuard],
  },
  {
    path: 'movies',
    component: CatalogoComponent,
    canDeactivate: [CatalogoUscitaGuard],
  },
  {
    path: 'series',
    component: CatalogoComponent,
    canDeactivate: [CatalogoUscitaGuard],
  },
  {
    path: 'movies-series',
    component: CatalogoComponent,
    canDeactivate: [CatalogoUscitaGuard],
  },
  {
    matcher: matcherFilmDettaglio,
    component: SchedaComponent,
    canDeactivate: [CatalogoUscitaGuard],
  },
  {
    matcher: matcherSerieDettaglio,
    component: SchedaComponent,
    canDeactivate: [CatalogoUscitaGuard],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CatalogoRoutingModule {}
