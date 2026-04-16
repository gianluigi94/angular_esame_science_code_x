// Modulo che definisce le rotte principali dell'app, i redirect iniziali e la gestione dei percorsi con lingua in radice.

import { NgModule } from '@angular/core';
import { RouterModule, Routes,  UrlSegment, UrlMatchResult} from '@angular/router';
import { AvvioGuard } from './_guard/avvio.guard';
import { RedirectVuotoComponent } from './_redirect/redirect-vuoto.component';
import { RedirectNonTrovatoComponent } from './_redirect/redirect-non-trovato.component';
import { LinguaGuard } from './_guard/lingua.guard';

/**
 * Verifica se il primo segmento URL rappresenta una lingua supportata e costruisce il match relativo.
 *
 * @param segmenti Segmenti URL ricevuti dal router.
 * @returns UrlMatchResult | null
 */
export function linguaMatcher(segmenti: UrlSegment[]): UrlMatchResult | null {
  if (
    // controllo se ho almeno un segmento e se il primo e' una lingua supportata
    segmenti.length > 0 && // verifico che esista almeno un segmento
    (segmenti[0].path === 'it' || segmenti[0].path === 'en') // verifico che il primo segmento sia it oppure en
  ) {
    return {
      // ritorno il risultato del match con il segmento lingua consumato
      consumed: [segmenti[0]], // segno che consumo il primo segmento
      posParams: { lingua: segmenti[0] }, // espongo il segmento trovato come parametro lingua
    };
  }
  return null; // ritorno null se il path non inizia con una lingua supportata
}

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: RedirectVuotoComponent,
  },
  {
    path: 'it',
    canActivate: [LinguaGuard], // verifico la coerenza della lingua tramite guard
    children: [
      // definisco tutte le sotto-rotte italiane
      {
        path: '',
        pathMatch: 'full',
        canActivate: [AvvioGuard], // eseguo la guard di avvio prima del redirect
        component: RedirectVuotoComponent, // uso il componente di redirect iniziale
      },
      {
        path: 'benvenuto',
        canActivate: [AvvioGuard], // proteggo l'accesso con la guard di avvio
        loadChildren: () =>
          // carico il modulo benvenuto in lazy loading
          import('./_benvenuto/benvenuto.module').then(
            (m) => m.BenvenutoModule, // ritorno il modulo Benvenuto
          ),
      },
      {
        path: 'welcome',
        canActivate: [AvvioGuard], // proteggo l'accesso con la guard di avvio
        loadChildren: () =>
          // carico il modulo benvenuto in lazy loading
          import('./_benvenuto/benvenuto.module').then(
            (m) => m.BenvenutoModule, // ritorno il modulo Benvenuto
          ),
      },
      {
        path: 'catalogo',
        canActivate: [AvvioGuard], // proteggo l'accesso con la guard di avvio
        loadChildren: () =>
          // carico il modulo catalogo in lazy loading
          import('./_catalogo/catalogo.module').then((m) => m.CatalogoModule), // ritorno il modulo Catalogo
      },
      {
        path: 'catalog',
        canActivate: [AvvioGuard], // proteggo l'accesso con la guard di avvio
        loadChildren: () =>
          // carico il modulo catalogo in lazy loading
          import('./_catalogo/catalogo.module').then((m) => m.CatalogoModule), // ritorno il modulo Catalogo
      },
      {
        path: 'non-trovato', // definisco il path italiano della pagina non trovata
        loadChildren: () =>
          // carico il modulo not found in lazy loading
          import('./_componenti_comuni/not-found/not-found.module').then(
            (m) => m.NotFoundModule, // ritorno il modulo NotFound
          ),
      },
      {
        path: 'not-found',
        loadChildren: () =>
          // carico il modulo not found in lazy loading
          import('./_componenti_comuni/not-found/not-found.module').then(
            (m) => m.NotFoundModule, // ritorno il modulo NotFound
          ),
      },
      {
        path: 'contatti',
        loadChildren: () =>
          // carico il modulo contatti in lazy loading
          import('./_componenti_comuni/contatti/contatti.module').then(
            (m) => m.ContattiModule, // ritorno il modulo Contatti
          ),
      },
      {
        path: 'contact',
        loadChildren: () =>
          // carico il modulo contatti in lazy loading
          import('./_componenti_comuni/contatti/contatti.module').then(
            (m) => m.ContattiModule, // ritorno il modulo Contatti
          ),
      },
      {
        path: 'piano', // definisco il path italiano della pagina piano
        loadChildren: () =>
          // carico il modulo piano in lazy loading
          import('./_componenti_comuni/piano/piano.module').then(
            (m) => m.PianoModule, // ritorno il modulo Piano
          ),
      },
     {
        path: 'plan',
        loadChildren: () =>
          import('./_componenti_comuni/piano/piano.module').then(
            (m) => m.PianoModule,
          ),
      },
      {
        path: 'ricevute',
        loadChildren: () =>
          import('./_componenti_comuni/ricevute/ricevute.module').then(
            (m) => m.RicevuteModule,
          ),
      },
      {
        path: 'receipts',
        loadChildren: () =>
          import('./_componenti_comuni/ricevute/ricevute.module').then(
            (m) => m.RicevuteModule,
          ),
      },
      {
        path: '**',
        component: RedirectNonTrovatoComponent,
      },
    ],
  },
  {
    path: 'en', // definisco la radice inglese
    canActivate: [LinguaGuard], // verifico la coerenza della lingua tramite guard
    children: [
      // definisco tutte le sotto-rotte inglesi
      {
        path: '',
        pathMatch: 'full', // richiedo corrispondenza completa
        canActivate: [AvvioGuard], // eseguo la guard di avvio prima del redirect
        component: RedirectVuotoComponent, // uso il componente di redirect iniziale
      },
      {
        path: 'benvenuto',
        canActivate: [AvvioGuard], // proteggo l'accesso con la guard di avvio
        loadChildren: () =>
          // carico il modulo benvenuto in lazy loading
          import('./_benvenuto/benvenuto.module').then(
            (m) => m.BenvenutoModule, // ritorno il modulo Benvenuto
          ),
      },
      {
        path: 'welcome',
        canActivate: [AvvioGuard], // proteggo l'accesso con la guard di avvio
        loadChildren: () =>
          // carico il modulo benvenuto in lazy loading
          import('./_benvenuto/benvenuto.module').then(
            (m) => m.BenvenutoModule, // ritorno il modulo Benvenuto
          ),
      },
      {
        path: 'catalogo',
        canActivate: [AvvioGuard], // proteggo l'accesso con la guard di avvio
        loadChildren: () =>
          // carico il modulo catalogo in lazy loading
          import('./_catalogo/catalogo.module').then((m) => m.CatalogoModule), // ritorno il modulo Catalogo
      },
      {
        path: 'catalog',
        canActivate: [AvvioGuard], // proteggo l'accesso con la guard di avvio
        loadChildren: () =>
          // carico il modulo catalogo in lazy loading
          import('./_catalogo/catalogo.module').then((m) => m.CatalogoModule), // ritorno il modulo Catalogo
      },
      {
        path: 'non-trovato', // definisco anche il path italiano della pagina non trovata sotto /en
        loadChildren: () =>
          // carico il modulo not found in lazy loading
          import('./_componenti_comuni/not-found/not-found.module').then(
            (m) => m.NotFoundModule, // ritorno il modulo NotFound
          ),
      },
      {
        path: 'not-found', // definisco il path inglese della pagina non trovata
        loadChildren: () =>
          // carico il modulo not found in lazy loading
          import('./_componenti_comuni/not-found/not-found.module').then(
            (m) => m.NotFoundModule, // ritorno il modulo NotFound
          ),
      },
      {
        path: 'contatti', // definisco anche il path italiano della pagina contatti sotto /en
        loadChildren: () =>
          // carico il modulo contatti in lazy loading
          import('./_componenti_comuni/contatti/contatti.module').then(
            (m) => m.ContattiModule, // ritorno il modulo Contatti
          ),
      },
      {
        path: 'contact', // definisco il path inglese della pagina contatti
        loadChildren: () =>
          // carico il modulo contatti in lazy loading
          import('./_componenti_comuni/contatti/contatti.module').then(
            (m) => m.ContattiModule, // ritorno il modulo Contatti
          ),
      },
      {
        path: 'piano', // definisco anche il path italiano della pagina piano sotto /en
        loadChildren: () =>
          // carico il modulo piano in lazy loading
          import('./_componenti_comuni/piano/piano.module').then(
            (m) => m.PianoModule, // ritorno il modulo Piano
          ),
      },
      {
        path: 'plan',
        loadChildren: () =>
          import('./_componenti_comuni/piano/piano.module').then(
            (m) => m.PianoModule,
          ),
      },
      {
        path: 'ricevute',
        loadChildren: () =>
          import('./_componenti_comuni/ricevute/ricevute.module').then(
            (m) => m.RicevuteModule,
          ),
      },
      {
        path: 'receipts',
        loadChildren: () =>
          import('./_componenti_comuni/ricevute/ricevute.module').then(
            (m) => m.RicevuteModule,
          ),
      },
      {
        path: '**',
        component: RedirectNonTrovatoComponent,
      },
    ],
  },
  {
    path: '**', // intercetto tutte le rotte root non riconosciute
    component: RedirectNonTrovatoComponent, // reindirizzo alla gestione not found
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      // inizializzo il router principale dell'app con queste rotte
      initialNavigation: 'enabledBlocking', // faccio partire la prima navigazione solo dopo guard e resolver
    }),
  ],
  exports: [RouterModule], // espongo RouterModule al resto dell'app
})
export class AppRoutingModule {}
