import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContattiRoutingModule } from './contatti-routing.module';
import { ContattiComponent } from './contatti.component';
import { ComponentiComuniModule } from '../componenti-comuni.module';
import { SaturnoModule } from '../saturno/saturno.module';
import { TranslateModule } from '@ngx-translate/core';
@NgModule({
  declarations: [ContattiComponent],
  imports: [CommonModule, TranslateModule, ContattiRoutingModule, ComponentiComuniModule, SaturnoModule ],
})
export class ContattiModule {}
