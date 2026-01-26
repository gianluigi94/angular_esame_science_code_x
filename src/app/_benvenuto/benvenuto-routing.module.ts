// Modulo di routing di 'Benvenuto' che definisce le rotte per la schermata di welcome, applico guardie per le animazioni.

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WelcomeComponent } from './welcome/welcome.component';
import { LoginComponent } from './login/login.component';
import { LoginUscitaGuard } from '../_guard/login-uscita.guard';

const routes: Routes = [
  {
    //se il path è vuoto vengo reidirizzato al componente di bevenuto, /benvenuto
    path: '',
    component: WelcomeComponent,
  },
  {
    //se il path è /benvenuto/login entrano in gioco il componente di login e una guard che si accorge quando da da benvenuto/login ritorno a solo /benvenuto e mostra le animazioni al ritroso
    path: 'login',
    component: LoginComponent,
    canDeactivate: [LoginUscitaGuard],
  },
];

@NgModule({
   imports: [RouterModule.forChild(routes)], // registro queste rotte come rotte figlie del modulo, così posso collegarle al router dell'app
  exports: [RouterModule],
})
export class BenvenutoRoutingModule {}
