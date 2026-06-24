import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { ComponentiComuniModule } from '../componenti-comuni.module';
import { RiordinaEpisodiComponent } from './riordina-episodi.component';

@NgModule({
  declarations: [
    RiordinaEpisodiComponent,
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
    RiordinaEpisodiComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class RiordinaEpisodiLazyModule {}

export { RiordinaEpisodiComponent };
