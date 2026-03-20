import { NgModule } from '@angular/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule, DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { NativeDateAdapter } from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { BenvenutoRoutingModule } from './benvenuto-routing.module';
import { WelcomeComponent } from './welcome/welcome.component';
import { LoginComponent } from './login/login.component';
import { ComponentiComuniModule } from '../_componenti_comuni/componenti-comuni.module';
import { SaturnoModule } from '../_componenti_comuni/saturno/saturno.module';
import { IscrizioneComponent } from './iscrizione/iscrizione.component';
class LocaleDateAdapter extends NativeDateAdapter {
  override getFirstDayOfWeek(): number {
    return 1;
  }
}
@NgModule({
  declarations: [
    WelcomeComponent,
    LoginComponent,
    IscrizioneComponent,
  ],
   imports: [
    MatDatepickerModule,
    MatNativeDateModule,
    CommonModule,
    BenvenutoRoutingModule,
    ComponentiComuniModule, //utilizzo dei componenti comuni
    SaturnoModule, //utilizzo di saturno
    ReactiveFormsModule,
    TranslateModule,
  ],

providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'it-IT' },
      {
      provide: DateAdapter,
      useClass: LocaleDateAdapter,
      deps: [MAT_DATE_LOCALE],
    },
  ],
})
export class BenvenutoModule {}
