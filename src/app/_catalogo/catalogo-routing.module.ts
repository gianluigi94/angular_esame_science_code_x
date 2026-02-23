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
  // /serie/:id oppure /series/:id con id solo cifre e niente extra
  if (
    segmenti.length === 2 &&
    /^(serie|series)$/.test(segmenti[0].path) &&
    /^\d+$/.test(segmenti[1].path)
  ) {
    return {
      consumed: segmenti,
      posParams: { id: segmenti[1] },
    };
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
  canDeactivate: [CatalogoUscitaGuard],  // <-- aggiungi
},
{
  matcher: matcherSerieDettaglio,
  component: SchedaComponent,
  canDeactivate: [CatalogoUscitaGuard],  // <-- aggiungi
},

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CatalogoRoutingModule {}
