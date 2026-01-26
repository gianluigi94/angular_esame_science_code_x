import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

import { AuthInterceptor } from './_interceptor/auth.interceptor';
import { TranslateModule } from '@ngx-translate/core';
import { ComponentiComuniModule } from './_componenti_comuni/componenti-comuni.module';
import { ErroreHttpInterceptor } from './_interceptor/errore-http.interceptor';
@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    HttpClientModule, //per ngx-translate
    TranslateModule.forRoot(), //istanza principale di TranslateModule
    ComponentiComuniModule,//importo il modulo con elementi riutilizzabili
  ],
   // L'ho usato per registrare i miei HTTP Interceptors: così ogni chiamata fatta con HttpClient passa da qui, e posso aggiungere automaticamente il token di autenticazione e gestire gli errori in modo centralizzato.
providers: [
  {
    provide: HTTP_INTERCEPTORS, // Dico ad Angular che sto aggiungendo un interceptor alla "lista" degli HTTP interceptors
    useClass: AuthInterceptor,  // Uso questa classe: qui inserisco la logica per aggiungere il token / header di auth alle richieste
    multi: true,                // Lo aggiungo insieme agli altri interceptor (non voglio sostituire quelli già registrati)
  },
  {
    provide: HTTP_INTERCEPTORS,      // Aggiungo un altro interceptor nella stessa lista di HTTP interceptors
    useClass: ErroreHttpInterceptor, // Uso questa classe: qui intercetto e gestisco gli errori HTTP (es. 401, 403, 500)
    multi: true,                     // Anche questo lo aggiungo alla lista, così resta attivo insieme agli altri
  },
],

  bootstrap: [AppComponent],
})
export class AppModule {}
