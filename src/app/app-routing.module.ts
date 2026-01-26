import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AvvioGuard } from './_guard/avvio.guard';

//dichiaro le rotte dell'app
const routes: Routes = [
    //se il path è vuoto vengo reindirizzato a benvenuto
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'benvenuto',
  },

  //se il path è benventuto entra in gioco un guard che controlla se posso andarci
  {
    path: 'benvenuto',
    canActivate: [AvvioGuard],
    loadChildren: () =>
      import('./_benvenuto/benvenuto.module').then((m) => m.BenvenutoModule), //scarico in lazy benvenuto
  },

  //se il path è catalogo entra in gioco un guard che controlla se posso andarci
  {
    path: 'catalogo',
    canActivate: [AvvioGuard],
    loadChildren: () =>
      import('./_catalogo/catalogo.module').then((m) => m.CatalogoModule), //scarico in lazy catalogo
  },
  {
    path: '**',
    redirectTo: 'benvenuto', //per ora no pagina errore
  },
];
// Attivo il router principale dell'app usando queste routes, la prima navigazione parte solo dopo che guard/resolver hanno finito
@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      initialNavigation: 'enabledBlocking',
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}

