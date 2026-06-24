import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { ComponentiComuniModule } from '../componenti-comuni.module';
import { GestioneUtentiComponent } from './gestione-utenti.component';
import { GestioneUtenteProfiloComponent } from '../gestione-utente-profilo/gestione-utente-profilo.component';

@NgModule({
  declarations: [
    GestioneUtentiComponent,
    GestioneUtenteProfiloComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    ComponentiComuniModule,
  ],
  exports: [
    GestioneUtentiComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class GestioneUtentiLazyModule {}

export { GestioneUtentiComponent };
