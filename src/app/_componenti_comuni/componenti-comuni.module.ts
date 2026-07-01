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
  import { DatiPersonaliComponent } from './dati-personali/dati-personali.component';
  import { BarraAvanzamentoComponent } from './barra-avanzamento/barra-avanzamento.component';
  import { PianoCardComponent } from './piano-card/piano-card.component';
  import { ReactiveFormsModule, FormsModule } from '@angular/forms';
  import { BottoneAggiungiComponent } from './bottone-aggiungi/bottone-aggiungi.component';
  import { DragdropDirective } from '../_direttive/dragdrop.directive';
  import { RiordinaItemDirective } from '../_direttive/riordina-item.directive';

  @NgModule({
    declarations: [
      DragdropDirective,
      RiordinaItemDirective,
      BottoneAggiungiComponent,
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
      DatiPersonaliComponent,
      BarraAvanzamentoComponent,
      PianoCardComponent,
    ],
    imports: [
      CommonModule,
      ReactiveFormsModule,
      FormsModule,
      RouterModule,
      TranslateModule,
    ],
    exports: [
      DragdropDirective,
      RiordinaItemDirective,
      BottoneAggiungiComponent,
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
      DatiPersonaliComponent,
      PaginaCaricamentoComponent,
      BarraAvanzamentoComponent,
      PianoCardComponent,
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
  })
  export class ComponentiComuniModule {}
