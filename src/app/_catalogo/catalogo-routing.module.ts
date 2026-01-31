// Modulo di routing che definisce le rotte del feature Catalogo e collega i path ai rispettivi componenti.

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CatalogoComponent } from './catalogo/catalogo.component';
import { EsperimentoComponent } from './esperimento/esperimento.component';

const routes: Routes = [
  {
    path: '',
    component: CatalogoComponent,
  },
   {
 path: 'esperimento',
 component: EsperimentoComponent,
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
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CatalogoRoutingModule {}
