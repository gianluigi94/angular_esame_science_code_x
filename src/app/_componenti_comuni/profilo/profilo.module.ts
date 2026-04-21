import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { ProfiloRoutingModule } from './profilo-routing.module';
import { ProfiloComponent } from './profilo.component';
import { TranslateModule } from '@ngx-translate/core';
import { SaturnoModule } from '../saturno/saturno.module';
import { ComponentiComuniModule } from '../componenti-comuni.module';

@NgModule({
  declarations: [ProfiloComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ProfiloRoutingModule,
    TranslateModule,
    SaturnoModule,
    ComponentiComuniModule,
  ],
})
export class ProfiloModule {}
