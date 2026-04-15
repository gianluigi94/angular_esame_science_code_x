import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PianoRoutingModule } from './piano-routing.module';
import { PianoComponent } from './piano.component';
import { TranslateModule } from '@ngx-translate/core';
import { SaturnoModule } from '../saturno/saturno.module';
import { ComponentiComuniModule } from '../componenti-comuni.module';

@NgModule({
  declarations: [PianoComponent],
  imports: [
    CommonModule,
    TranslateModule,
    PianoRoutingModule,
    SaturnoModule,
    ComponentiComuniModule,
  ],
})
export class PianoModule {}
