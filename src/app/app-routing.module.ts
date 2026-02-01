import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AvvioGuard } from './_guard/avvio.guard';
import { RedirectVuotoComponent } from './redirect-vuoto.component';
//dichiaro le rotte dell'app
const routes: Routes = [
    //se il path è vuoto vengo reindirizzato a benvenuto
  {
    path: '',
    pathMatch: 'full',
    component: RedirectVuotoComponent,
  },
  // slug lingua in radice
  {
    path: ':lingua',
    children: [
      // /it o /en -> AvvioGuard decide se mandare a catalogo o welcome
      {
        path: '',
        pathMatch: 'full',
        canActivate: [AvvioGuard],
        component: RedirectVuotoComponent,
      },
      {
        path: 'benvenuto',
        canActivate: [AvvioGuard],
        loadChildren: () =>
          import('./_benvenuto/benvenuto.module').then((m) => m.BenvenutoModule),
      },
      {
        path: 'welcome',
        canActivate: [AvvioGuard],
        loadChildren: () =>
          import('./_benvenuto/benvenuto.module').then((m) => m.BenvenutoModule),
      },
      {
        path: 'catalogo',
        canActivate: [AvvioGuard],
        loadChildren: () =>
          import('./_catalogo/catalogo.module').then((m) => m.CatalogoModule),
      },
      {
        path: 'catalog',
        canActivate: [AvvioGuard],
        loadChildren: () =>
          import('./_catalogo/catalogo.module').then((m) => m.CatalogoModule),
      },
    ],
  },
  {
    path: '**',
        redirectTo: '',
    pathMatch: 'full',
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

