// Modulo di routing di 'Benvenuto' che definisce le rotte per la schermata di welcome, applico guardie per le animazioni.

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WelcomeComponent } from './welcome/welcome.component';
import { LoginComponent } from './login/login.component';
import { LoginUscitaGuard } from '../_guard/login-uscita.guard';
import { IscrizioneComponent } from './registrazione/iscrizione.component';
import { IscrizioneUscitaGuard } from '../_guard/iscrizione-uscita.guard';
import { IscrizioneAccessoGuard } from '../_guard/iscrizione-accesso.guard';
const routes: Routes = [
  {
    path: '',
    component: WelcomeComponent,
  },
  {
    path: 'login',
    component: LoginComponent,
    canDeactivate: [LoginUscitaGuard],
  },
    {
    path: 'accedi',
    component: LoginComponent,
    canDeactivate: [LoginUscitaGuard],
  },
  {
    path: 'registrazione',
    canActivate: [IscrizioneAccessoGuard],
    canDeactivate: [IscrizioneUscitaGuard],
    component: IscrizioneComponent,
  },
  {
    path: 'registration',
    canActivate: [IscrizioneAccessoGuard],
    canDeactivate: [IscrizioneUscitaGuard],
    component: IscrizioneComponent,
  },
];

@NgModule({
   imports: [RouterModule.forChild(routes)], // registro queste rotte come rotte figlie del modulo, così posso collegarle al router dell'app
  exports: [RouterModule],
})
export class BenvenutoRoutingModule {}
