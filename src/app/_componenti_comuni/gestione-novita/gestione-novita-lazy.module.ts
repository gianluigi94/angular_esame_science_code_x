import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ComponentiComuniModule } from '../componenti-comuni.module';
import { GestioneNovitaComponent } from './gestione-novita.component';

@NgModule({
  declarations: [
    GestioneNovitaComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ComponentiComuniModule,
  ],
  exports: [
    GestioneNovitaComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class GestioneNovitaLazyModule {}

export { GestioneNovitaComponent };
