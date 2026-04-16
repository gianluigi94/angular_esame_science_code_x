import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RicevuteRoutingModule } from './ricevute-routing.module';
import { RicevuteComponent } from './ricevute.component';
import { TranslateModule } from '@ngx-translate/core';
import { SaturnoModule } from '../saturno/saturno.module';
import { ComponentiComuniModule } from '../componenti-comuni.module';
@NgModule({
  declarations: [RicevuteComponent],
  imports: [
    CommonModule,
    RicevuteRoutingModule,
    TranslateModule,
    SaturnoModule,
    ComponentiComuniModule,
  ],
})
export class RicevuteModule {}
