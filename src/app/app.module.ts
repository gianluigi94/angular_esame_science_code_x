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
import { PagamentoInterceptor } from './_interceptor/pagamento.interceptor';
@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    HttpClientModule, //per ngx-translate
    TranslateModule.forRoot(), //istanza principale di TranslateModule
    ComponentiComuniModule, //importo il modulo con elementi riutilizzabili
  ],
  // L'ho usato per registrare i miei HTTP Interceptors: così ogni chiamata fatta con HttpClient passa da qui, e posso aggiungere automaticamente il token di autenticazione e gestire gli errori in modo centralizzato.
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: PagamentoInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ErroreHttpInterceptor,
      multi: true,
    },
  ],

  bootstrap: [AppComponent],
})
export class AppModule {}
