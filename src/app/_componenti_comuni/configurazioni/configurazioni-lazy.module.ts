import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ComponentiComuniModule } from '../componenti-comuni.module';
import { ConfigurazioniComponent } from './configurazioni.component';

@NgModule({
  declarations: [
    ConfigurazioniComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ComponentiComuniModule,
  ],
  exports: [
    ConfigurazioniComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ConfigurazioniLazyModule {}

export { ConfigurazioniComponent };
