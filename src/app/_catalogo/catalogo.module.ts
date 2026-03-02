import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CatalogoRoutingModule } from './catalogo-routing.module';
import { CatalogoComponent } from './catalogo/catalogo.component';
import { ComponentiComuniModule } from '../_componenti_comuni/componenti-comuni.module';
import { SaturnoModule } from '../_componenti_comuni/saturno/saturno.module';
import { RigaCategoriaComponent } from './app-riga-categoria/riga-categoria.component';
import { TranslateModule } from '@ngx-translate/core';
import { SchedaComponent } from './scheda/scheda.component';
@NgModule({
  declarations: [
    CatalogoComponent,
    RigaCategoriaComponent,
    SchedaComponent
  ],
  imports: [
    CommonModule,
    CatalogoRoutingModule,
    TranslateModule,
    ComponentiComuniModule, // utilizzo dei componenti comunti
    SaturnoModule, // utilizzo di saturno
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CatalogoModule {}
