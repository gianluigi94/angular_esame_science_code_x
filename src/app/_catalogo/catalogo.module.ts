import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { CatalogoRoutingModule } from './catalogo-routing.module';
import { CatalogoComponent } from './catalogo/catalogo.component';
import { ComponentiComuniModule } from '../_componenti_comuni/componenti-comuni.module';
import { SaturnoModule } from '../_componenti_comuni/saturno/saturno.module';
import { RigaCategoriaComponent } from './app-riga-categoria/riga-categoria.component';
import { EsperimentoComponent } from './esperimento/esperimento.component';
import { TranslateModule } from '@ngx-translate/core';
@NgModule({
  declarations: [
    CatalogoComponent,
    EsperimentoComponent,
    RigaCategoriaComponent,
  ],
  imports: [
    CommonModule,
    CatalogoRoutingModule,
    TranslateModule,
    ComponentiComuniModule, // utilizzo dei componenti comunti
    SaturnoModule, // utilizzo di saturno
  ],
})
export class CatalogoModule {}
