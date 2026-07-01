import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ComponentiComuniModule } from '../componenti-comuni.module';
import { GestionePubblicitaComponent } from './gestione-pubblicita.component';

@NgModule({
  declarations: [
    GestionePubblicitaComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ComponentiComuniModule,
  ],
  exports: [
    GestionePubblicitaComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class GestionePubblicitaLazyModule {}

export { GestionePubblicitaComponent };
