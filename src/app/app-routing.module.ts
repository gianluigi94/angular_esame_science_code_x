import { NgModule } from '@angular/core';
import { RouterModule, Routes, UrlSegment, UrlMatchResult } from '@angular/router';
import { AvvioGuard } from './_guard/avvio.guard';
import { RedirectVuotoComponent } from './redirect-vuoto.component';
import { NotFoundComponent } from './_componenti_comuni/not-found/not-found.component';

export function linguaMatcher(segmenti: UrlSegment[]): UrlMatchResult | null {
  if (segmenti.length > 0 && (segmenti[0].path === 'it' || segmenti[0].path === 'en')) {
    return {
      consumed: [segmenti[0]],
      posParams: { lingua: segmenti[0] },
    };
  }
  return null;
}
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

    path: 'it',
    children: [
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
    {
  path: 'non-trovato',
  loadChildren: () =>
    import('./_componenti_comuni/not-found/not-found.module').then(m => m.NotFoundModule),
},
{
  path: 'not-found',
  loadChildren: () =>
    import('./_componenti_comuni/not-found/not-found.module').then(m => m.NotFoundModule),
},
{
  path: 'contatti',
  loadChildren: () =>
    import('./_componenti_comuni/contatti/contatti.module').then(m => m.ContattiModule),
},
{
  path: 'contact',
  loadChildren: () =>
    import('./_componenti_comuni/contatti/contatti.module').then(m => m.ContattiModule),
},

      {
        path: '**',
        redirectTo: 'non-trovato',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'en',
    children: [
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
   {
  path: 'non-trovato',
  loadChildren: () =>
    import('./_componenti_comuni/not-found/not-found.module').then(m => m.NotFoundModule),
},
{
  path: 'not-found',
  loadChildren: () =>
    import('./_componenti_comuni/not-found/not-found.module').then(m => m.NotFoundModule),
},
{
  path: 'contatti',
  loadChildren: () =>
    import('./_componenti_comuni/contatti/contatti.module').then(m => m.ContattiModule),
},
{
  path: 'contact',
  loadChildren: () =>
    import('./_componenti_comuni/contatti/contatti.module').then(m => m.ContattiModule),
},

      {
        path: '**',
        redirectTo: 'not-found',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'it/non-trovato',
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

