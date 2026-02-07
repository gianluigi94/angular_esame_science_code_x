// Modulo di routing che definisce le rotte del feature Catalogo e collega i path ai rispettivi componenti.

import { NgModule } from '@angular/core';
import { CatalogoComponent } from './catalogo/catalogo.component';
import { SchedaComponent } from './scheda/scheda.component';
import { RouterModule, Routes, CanActivateFn, Router, UrlTree } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    component: CatalogoComponent,
  },

  {
    path: 'film',
    component: CatalogoComponent,
  },
  {

    path: 'serie',
    component: CatalogoComponent,
  },
    {
    path: 'film-serie',
    component: CatalogoComponent,
   },
     {
    path: 'movies',
    component: CatalogoComponent,
  },
  {
    path: 'series',
    component: CatalogoComponent,
  },
  {
    path: 'movies-series',
    component: CatalogoComponent,
  },
    { path: 'film/:id', component: SchedaComponent },
  { path: 'serie/:id', component: SchedaComponent },

  // SCHEDA (EN)
  { path: 'movies/:id', component: SchedaComponent },
  { path: 'series/:id', component: SchedaComponent },


];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CatalogoRoutingModule {}
