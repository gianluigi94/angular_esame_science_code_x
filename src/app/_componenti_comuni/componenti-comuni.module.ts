import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { SfondoComponent } from './sfondo/sfondo.component';
import { TitlesMainComponent } from './titles-main/titles-main.component';
import { FooterComponent } from './footer/footer.component';
import { MainIntroComponent } from '../_benvenuto/main-intro/main-intro.component';
import { HeaderComponent } from './header/header.component';
import { BottoneAudioComponent } from './bottone-audio/bottone-audio.component';
import { BottonePreferitiComponent } from './bottone-preferiti/bottone-preferiti.component';

import { ToastContainerComponent } from './toast-container/toast-container.component';
import { CaroselloNovitaComponent } from '../_catalogo/carosello-novita/carosello-novita.component';
import { SpinnerComponent } from './spinner/spinner.component';
import { PaginaCaricamentoComponent } from './pagina-caricamento/pagina-caricamento.component';

@NgModule({
  declarations: [
    SfondoComponent,
    TitlesMainComponent,
    FooterComponent,
    BottonePreferitiComponent,
    MainIntroComponent,
    HeaderComponent,
    BottoneAudioComponent,
    ToastContainerComponent,
    CaroselloNovitaComponent,
    SpinnerComponent,
    PaginaCaricamentoComponent,
  ],
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
  ],
  exports: [
    SfondoComponent,
    TitlesMainComponent,
    FooterComponent,
    MainIntroComponent,
    BottonePreferitiComponent,
    HeaderComponent,
    BottoneAudioComponent,
    ToastContainerComponent,
    CaroselloNovitaComponent,
    SpinnerComponent,
    PaginaCaricamentoComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA] // per poter usare il tag <video-js>
})
export class ComponentiComuniModule {}
