// Modulo di routing che definisce le rotte del feature Catalogo e collega i path ai rispettivi componenti.

import { NgModule } from '@angular/core';
import { CatalogoComponent } from './catalogo/catalogo.component';
import { SchedaComponent } from './scheda/scheda.component';
import { RouterModule, Routes, UrlSegment, UrlMatchResult } from '@angular/router';
import { CatalogoUscitaGuard } from 'src/app/_guard/catalogo-uscita.guard';
export function matcherFilmDettaglio(segmenti: UrlSegment[]): UrlMatchResult | null {
  // /film/:id oppure /movies/:id con id solo cifre e niente extra
  if (
    segmenti.length === 2 &&
    /^(film|movies)$/.test(segmenti[0].path) &&
    /^\d+$/.test(segmenti[1].path)
  ) {
    return {
      consumed: segmenti,
      posParams: { id: segmenti[1] },
    };
  }
  return null;
}

export function matcherSerieDettaglio(segmenti: UrlSegment[]): UrlMatchResult | null {
  if (
    /^(serie|series)$/.test(segmenti[0]?.path) &&
    /^\d+$/.test(segmenti[1]?.path)
  ) {
    // /serie/13
    if (segmenti.length === 2) {
      return { consumed: segmenti, posParams: { id: segmenti[1] } };
    }
    // /serie/13/stagione/2 oppure /series/13/season/2
    if (
      segmenti.length === 4 &&
      /^(stagione|season)$/.test(segmenti[2]?.path) &&
      /^\d+$/.test(segmenti[3]?.path)
    ) {
      return {
        consumed: segmenti,
        posParams: { id: segmenti[1], stagione: segmenti[3] },
      };
    }
  }
  return null;
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
