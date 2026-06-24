import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { ComponentiComuniModule } from '../../_componenti_comuni/componenti-comuni.module';
import { FormAggiungiMediaComponent } from './form-aggiungi-media.component';

@NgModule({
  declarations: [
    FormAggiungiMediaComponent,
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
    FormAggiungiMediaComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class FormAggiungiMediaLazyModule {}

export { FormAggiungiMediaComponent };
