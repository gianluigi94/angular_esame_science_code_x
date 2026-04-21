import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProfiloComponent } from './profilo.component';
import { ProfiloUscitaGuard } from 'src/app/_guard/profilo-uscita.guard';

const routes: Routes = [{ path: '', component: ProfiloComponent, canDeactivate: [ProfiloUscitaGuard] }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProfiloRoutingModule {}
