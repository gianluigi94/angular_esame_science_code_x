import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ContattiComponent } from './contatti.component';
import { ContattiUscitaGuard } from 'src/app/_guard/contatti-uscita.guard';
const routes: Routes = [
    {
    path: '',
    component: ContattiComponent,
    canDeactivate: [ContattiUscitaGuard],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ContattiRoutingModule {}
