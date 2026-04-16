import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RicevuteComponent } from './ricevute.component';

const routes: Routes = [{ path: '', component: RicevuteComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RicevuteRoutingModule {}
