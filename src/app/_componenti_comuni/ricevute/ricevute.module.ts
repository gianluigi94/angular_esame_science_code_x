import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RicevuteRoutingModule } from './ricevute-routing.module';
import { RicevuteComponent } from './ricevute.component';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  declarations: [RicevuteComponent],
  imports: [CommonModule, RicevuteRoutingModule, TranslateModule],
})
export class RicevuteModule {}
