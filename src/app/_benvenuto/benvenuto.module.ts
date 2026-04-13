import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BenvenutoRoutingModule } from './benvenuto-routing.module';
import { WelcomeComponent } from './welcome/welcome.component';
import { LoginComponent } from './login/login.component';
import { ComponentiComuniModule } from '../_componenti_comuni/componenti-comuni.module';
import { SaturnoModule } from '../_componenti_comuni/saturno/saturno.module';
import { IscrizioneComponent } from './registrazione/iscrizione.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
@NgModule({
  declarations: [
    WelcomeComponent,
    ResetPasswordComponent,
    LoginComponent,
    IscrizioneComponent,
  ],
  imports: [
    CommonModule,
    BenvenutoRoutingModule,
    ComponentiComuniModule, //utilizzo dei componenti comuni
    SaturnoModule, //utilizzo di saturno
    ReactiveFormsModule,
    TranslateModule,
  ],
})
export class BenvenutoModule {}
