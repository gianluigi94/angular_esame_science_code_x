import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PianoComponent } from './piano.component';
import { PianoUscitaGuard } from 'src/app/_guard/piano-uscita.guard';

const routes: Routes = [
  {
    path: '',
    component: PianoComponent,
    canDeactivate: [PianoUscitaGuard],
  },
];
@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PianoRoutingModule {}
