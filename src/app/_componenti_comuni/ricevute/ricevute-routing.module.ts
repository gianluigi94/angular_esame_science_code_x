import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RicevuteComponent } from './ricevute.component';
import { RicevuteUscitaGuard } from 'src/app/_guard/ricevute-uscita.guard';

const routes: Routes = [{ path: '', component: RicevuteComponent, canDeactivate: [RicevuteUscitaGuard] }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RicevuteRoutingModule {}
