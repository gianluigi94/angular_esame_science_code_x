import { Component, OnInit, Inject } from '@angular/core';
import { CambioLinguaService } from './_servizi_globali/cambio-lingua.service';
import { TraduzioniService } from './_servizi_globali/traduzioni.service';
import { ErroreGlobaleService } from './_servizi_globali/errore-globale.service';
import { ToastService } from './_servizi_globali/toast.service';
import { StatoSessioneClientService } from './_servizi_globali/stato-sessione-client.service';
import { TranslateService } from '@ngx-translate/core';
import { Router, NavigationEnd } from '@angular/router';
import { PerformanceService } from './_servizi_globali/performance.service';
import { filter, take } from 'rxjs/operators';
import { CaricamentoCaroselloService } from './_catalogo/carosello-novita/carosello_services/caricamento-carosello.service';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { DOCUMENT } from '@angular/common';
import { TitoloPaginaService } from './_servizi_globali/titolo-pagina.service';
import { SaturnoStatoService } from './_servizi_globali/animazioni_saturno/saturno-stato.service';
import {
  isFirefox,
  pulisciUrl,
  isCatalogoHome,
  isAreaCatalogo,
  impostaLangHtml,
} from './_helpers_globali/helpers';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  // Qui definisco tutte le variabili che uso per gestire loader, errori e caricamenti
  traduzioniPronte$ = this.traduzioniService.traduzioniInizialiCaricate$; // Tengo traccia se le traduzioni iniziali sono pronte
  erroreFatale$ = this.erroreGlobaleService.erroreFatale$; // Osservo se si è verificato un errore fatale globale
  sessioneVerificata$ = this.statoSessioneClient.sessioneVerificata$; // Controllo se la sessione utente è stata verificata
  saturnoPronto$ = this.saturnoStatoService.saturnoPronto$; // Verifico se l'animazione/stato di Saturno è pronto
  caroselloPronto$ = this.caricamentoCaroselloService.caroselloPronto$; // Controllo se il carosello ha finito di caricarsi
  forzaLoaderExtra = false; // Decido se forzare la visualizzazione extra del loader

  private extraLoaderTimer: any = null; // Uso un timer per gestire il loader extra
  private readonly EXTRA_LOADER_MS = 2600; // Definisco la durata del loader extra in millisecondi
  devoCaricareTexturePrimaVolta = false; // Indico se devo caricare le texture solo al primo avvio
  deveCaricareImmaginiCarosello = false; // Indico se devo caricare le immagini del carosello
  deveCaricareImmaginiCarosello$ = new BehaviorSubject<boolean>(false); // Espongo come stream se il carosello deve caricare immagini

  caricamentoDisabilitato = false; // Indico se il loader globale è disabilitato
  caricamentoDisabilitato$ = new BehaviorSubject<boolean>(false); // Espongo lo stato del loader disabilitato come observable
  ultimaUrl = ''; // Memorizzo l'ultima URL visitata

  private loaderVisibile = true; // Tengo traccia se il loader è attualmente visibile
  isFirefox = false; // Indico se il browser in uso è Firefox
  loaderAvvioCatalogo = false; // Indico se il loader è mostrato durante l'avvio del catalogo

  constructor(
    private cambioLinguaService: CambioLinguaService,
    private traduzioniService: TraduzioniService,
    private erroreGlobaleService: ErroreGlobaleService,
    private toastService: ToastService,
    private statoSessioneClient: StatoSessioneClientService,
    private translate: TranslateService,
    private saturnoStatoService: SaturnoStatoService,
    private router: Router,
    private caricamentoCaroselloService: CaricamentoCaroselloService,
    private titoloPaginaService: TitoloPaginaService,
    private performanceService: PerformanceService,
    @Inject(DOCUMENT) private documento: Document // Inietto il DOM Document di Angular per poter leggere/modificare il tag <html> (impostare la lingua)
  ) {}

  /**
   *  Eseguito una sola volta quando il componente root viene inizializzato.
   *
   * Responsabilità principali:
   * - Rileva alcune condizioni iniziali (browser, URL iniziale, stato texture in localStorage).
   * - Avvia servizi di app (titolo pagina, performance) e imposta la lingua sul tag <html>.
   * - Inizializza e aggiorna la logica di loader/caricamenti in base alla rotta corrente e ai cambi di navigazione.
   * - Gestisce toast di “bentornato” e la visualizzazione di errori fatali globali (server/sessione).
   * - Combina più stati asincroni (traduzioni, sessione, saturno, carosello, ecc.) per decidere quando nascondere il loader.
   *
   * @returns void
   */
  ngOnInit(): void {
    this.isFirefox = isFirefox(); // Mi salvo se sto girando su Firefox
    const urlIniziale = this.router.url || ''; // Mi salvo l'URL attuale (o stringa vuota se non c'è)
    this.devoCaricareTexturePrimaVolta = // Decido se devo caricare le texture al primo avvio
      localStorage.getItem('saturnoTextureLoaded') !== 'true'; // Controllo in localStorage se avevo già caricato le texture

    this.titoloPaginaService.avvia(); // Avvio il servizio che gestisce il titolo della pagina
    this.performanceService.performanceLevel$ // Leggo lo stream con il livello di performance calcolato
      .pipe(
        // Applico operatori per filtrare e prendere solo un valore
        filter((level) => level !== 'Calcolando...'), // Ignoro lo stato 'in calcolo'
        take(1) // Prendo solo il primo valore valido e poi chiudo la subscription
      )
      .subscribe((level) => {
        // Quando arriva il livello definitivo, lo uso qui
        console.log('[Performance] Classificazione GPU:', level); // Loggo in console la classificazione della GPU/performance
      }); // Chiudo la subscription

    impostaLangHtml(
      this.documento,
      this.cambioLinguaService.leggiCodiceLingua()
    ); // Imposto subito la lingua sul tag <html> leggendo la lingua salvata
    this.ultimaUrl = urlIniziale; // Salvo l'URL iniziale come ultima URL conosciuta
    this.cambioLinguaService.cambioLinguaApplicata$.subscribe(({ codice }) => {
      impostaLangHtml(this.documento, codice);
    });

    // Qui decido se mostrare il loader e se caricare il carosello in base all'URL, e mi aggancio ai cambi rotta per aggiornare tutto durante la navigazione
    this.caricamentoDisabilitato = urlIniziale.startsWith('/benvenuto/login'); // Disabilito il loader se parto dalla pagina di login
    this.caricamentoDisabilitato$.next(this.caricamentoDisabilitato); // Propago subito lo stato del loader disabilitato nello stream

    this.deveCaricareImmaginiCarosello = isCatalogoHome(urlIniziale);
    this.deveCaricareImmaginiCarosello$.next(
      // Propago nello stream la decisione sul caricamento del carosello
      this.deveCaricareImmaginiCarosello // Passo il valore booleano calcolato sopra
    ); // Chiudo la next
    if (this.deveCaricareImmaginiCarosello) this.caricamentoCaroselloService.resetta();

    this.router.events // Mi aggancio allo stream degli eventi del router (navigazioni)
      .pipe(filter((ev) => ev instanceof NavigationEnd)) // Considero solo gli eventi di fine navigazione
      .subscribe((ev: any) => {
        // Quando una navigazione è finita, aggiorno lo stato interno

        const url = // Ricavo l'URL finale della navigazione (preferisco dopo i redirect)
          ev && ev.urlAfterRedirects // Controllo se esiste urlAfterRedirects
            ? ev.urlAfterRedirects // Se c'è, uso quello perché è l'URL 'definitivo'
            : ev && ev.url // Altrimenti provo con ev.url e se non c'è nulla, metto stringa vuota
            ? ev.url
            : '';

        const precedente = this.ultimaUrl; // Mi salvo l'URL precedente prima di aggiornarlo
        this.ultimaUrl = url; // Aggiorno l'ultima URL con quella nuova

        if (url.startsWith('/benvenuto/login')) {
          // Se entro nella pagina di login
          this.toastService.chiudi('toast_benvenuto'); // Chiudo l'eventuale toast 'benvenuto' per non lasciarlo aperto
        }

        // Qui aggiorno le regole del loader e del carosello ad ogni navigazione, poi gestisco un toast di 'bentornato' e mi metto in ascolto degli errori fatali
        const disabilitaLoader = // Calcolo se devo disabilitare il loader in base alla rotta corrente e a quella precedente
          url.startsWith('/benvenuto/login') || // Disabilito il loader se sono nella pagina di login
            ((url.startsWith('/catalogo') || url.startsWith('/catalog')) &&
    precedente.startsWith('/benvenuto/login'));

        this.caricamentoDisabilitato = disabilitaLoader; // Salvo nello stato interno se il loader è disabilitato
        this.caricamentoDisabilitato$.next(disabilitaLoader); // Notifico nello stream che il loader è (o non è) disabilitato

        const deve = isCatalogoHome(url); // Capisco se sono esattamente nella home del catalogo

        this.deveCaricareImmaginiCarosello = deve; // Salvo se devo caricare le immagini del carosello
        this.deveCaricareImmaginiCarosello$.next(deve); // Notifico nello stream se devo caricare le immagini del carosello

        if (deve && !isAreaCatalogo(precedente)) {
          this.caricamentoCaroselloService.resetta();
        }
      });

    const haToastBenvenuto = localStorage.getItem('toast_benvenuto'); // Leggo da localStorage se devo mostrare il toast 'bentornato'

    if (haToastBenvenuto !== null) {
      // Se la chiave esiste, significa che devo mostrare il messaggio
      const chiave = 'toast_benvenuto'; // Mi preparo la chiave identificativa del toast
      const codiceLingua = this.cambioLinguaService.leggiCodiceLingua(); // Leggo la lingua corrente per scegliere il testo

      const testo = // Preparo il testo del toast in base alla lingua
        codiceLingua === 'it' // Controllo se la lingua è italiano (non prendo le traduzioni dal server perche potrebbero non essere prese in tempo)
          ? "\nBENTORNATO!\n\nLa tua precedente sessione è scaduta,\nripeti l'accesso e riprendi la visione dei tuoi contenuti preferiti\n\n"
          : '\nWELCOME BACK!\n\nYour previous session has expired,\nplease sign in again to resume watching your favorite content\n\n';

      this.toastService.successo(testo, chiave); // Mostro il toast di successo con testo e chiave
      localStorage.removeItem('toast_benvenuto'); // Cancello la chiave così il toast non si ripete al prossimo avvio
    }

    this.erroreGlobaleService.erroreFatale$.subscribe((isFatal) => {
      // Mi metto in ascolto degli errori fatali globali
      if (!isFatal) return; // Se non è fatale, esco subito e non faccio nulla

      const tipo = this.erroreGlobaleService.tipoErrore$.value; // Leggo il tipo di errore fatale per decidere cosa mostrare

      // Qui gestisco il caso di errore fatale lato server mostrando un messaggio persistente, evitando falsi allarmi durante reload o login
      if (tipo === 'server') {
        // Controllo se l'errore fatale è di tipo server

        if (
          // Verifico se devo ignorare temporaneamente l'errore
          this.statoSessioneClient.staRicaricando || // Ignoro l'errore se sto ricaricando la pagina per sessione scaduta
          localStorage.getItem('toast_benvenuto') !== null // Ignoro l'errore se sto per mostrare il toast di bentornato
        ) {
          return; // Esco senza mostrare nulla per evitare errori transitori
        }

        const msg = this.erroreGlobaleService.messaggioErrore$.value; // Leggo l'eventuale messaggio di errore specifico dal servizio
        const codiceLingua = this.cambioLinguaService.leggiCodiceLingua(); // Leggo la lingua corrente per localizzare il messaggio
        const base = // Preparo il testo base dell'errore in base alla lingua
          codiceLingua === 'it' // Controllo se la lingua è italiano
            ? 'Errore imprevisto del server' // Testo base in italiano
            : 'Unexpected server error'; // Testo base in inglese
        const suffix = // Preparo il suffisso con le istruzioni per l'utente
          codiceLingua === 'it' // Controllo se la lingua è italiano
            ? " Riprova piu tardi o contatta l'amministratore." // Suffisso in italiano
            : ' Please try again later or contact the administrator.'; // Suffisso in inglese
        const testo = msg ? `${base}: ${msg}.${suffix}` : `${base}.${suffix}`; // Compongo il messaggio finale includendo il dettaglio se presente
        this.toastService.errorePersistente(testo); // Mostro un toast di errore persistente con il messaggio costruito
        return;
      }

      // Qui gestisco gli errori di sessione con un toast tradotto e poi decido quando mostrare/nascondere il loader combinando vari stati (errori, traduzioni, sessione, saturno, carosello)
      if (tipo === 'sessione') {
        // Controllo se l'errore fatale è legato alla sessione
        const codice = this.erroreGlobaleService.codiceSessione$.value; // Leggo il codice che mi dice che tipo di problema di sessione è

        let chiave: string; // Mi preparo una chiave di traduzione da scegliere in base al codice

        if (codice === 'STANDARD') {
          // Controllo se la sessione è stata scollegata in modo standard
          chiave = 'ui.toast.sessione.scollegato'; // Scelgo la chiave traduzione
        } else if (codice === 'INATTIVITA') {
          // Controllo se la sessione è scaduta per inattività
          chiave = 'ui.toast.sessione.inattivita'; // Scelgo la chiave traduzione
        } else if (codice === 'COLLEGATO') {
          // Controllo se c'è un caso 'scaduto, ma da collegato'
          chiave = 'ui.toast.sessione.collegato'; // Scelgo la chiave traduzione
        } else {
          // Gestisco qualunque altro caso non previsto
          chiave = 'ui.toast.sessione.generico'; // Scelgo la chiave generica
        }

        const testoSessione = this.translate.instant(chiave); // Traduco subito la chiave in una stringa nella lingua corrente
        this.toastService.allarmPersistenteRipetiAccesso(testoSessione); // Mostro un toast persistente che chiede di ripetere l'accesso
      }
    });

    combineLatest([
      // Metto insieme più casi per decidere quando il loader può sparire
      this.erroreFatale$, // Osservo se c'è un errore fatale
      this.traduzioniPronte$, // Osservo se le traduzioni sono pronte
      this.sessioneVerificata$, // Osservo se la sessione è verificata
      this.saturnoPronto$, // Osservo se Saturno è pronto
      this.caroselloPronto$, // Osservo se il carosello è pronto
      this.deveCaricareImmaginiCarosello$, // Osservo se devo caricare le immagini del carosello
      this.caricamentoDisabilitato$, // Osservo se il loader è disabilitato
    ]).subscribe(
      // Mi iscrivo ai cambi di uno qualunque di questi stati
      ([
        erroreFatale, // Mi arriva lo stato di errore fatale
        traduzioniPronte, // Mi arriva se le traduzioni sono pronte
        sessioneVerificata, // Mi arriva se la sessione è verificata
        saturnoPronto, // Mi arriva se Saturno è pronto
        caroselloPronto, // Mi arriva se il carosello è pronto
        deveCaricare, // Mi arriva se devo caricare immagini carosello
        caricamentoDisabilitato, // Mi arriva se il loader è disabilitato
      ]) => {
        const deveMostrareLoader = // Calcolo se il loader deve rimanere visibile
          !caricamentoDisabilitato && // Mostro il loader solo se non è disabilitato
          (erroreFatale || // Mostro il loader se c'è un errore fatale
            !traduzioniPronte || // Mostro il loader se mancano le traduzioni
            !sessioneVerificata || // Mostro il loader se la sessione non è verificata
            !saturnoPronto || // Mostro il loader se Saturno non è pronto
            (deveCaricare && !caroselloPronto)); // Mostro il loader se devo caricare il carosello ma non è pronto

        try {
          // Provo a capire se sono in un reload del catalogo usando l'API performance
          const nav = performance.getEntriesByType('navigation') as any[]; // Leggo le info di navigazione del browser
          const tipo = nav && nav[0] && nav[0].type ? String(nav[0].type) : ''; // Ricavo il tipo di navigazione (es. reload) se disponibile
           const path = pulisciUrl(window.location.pathname || '');
 this.loaderAvvioCatalogo = tipo === 'reload' && isCatalogoHome(path);

        } catch {
          // Se l'API performance non è disponibile o fallisce
          this.loaderAvvioCatalogo = false; // Metto false per sicurezza
        }

        if (caricamentoDisabilitato) {
          // Se il loader è disabilitato
          this.forzaLoaderExtra = false; // Non devo forzare alcun loader extra
          if (this.extraLoaderTimer) {
            // Se avevo un timer attivo
            clearTimeout(this.extraLoaderTimer); // Lo annullo
            this.extraLoaderTimer = null; // E lo azzero
          }
        } else if (deveMostrareLoader) {
          // Se devo mostrare il loader normale
          this.forzaLoaderExtra = false; // Non devo forzare il loader extra
          if (this.extraLoaderTimer) {
            // Se avevo un timer extra attivo
            clearTimeout(this.extraLoaderTimer); // Lo annullo
            this.extraLoaderTimer = null; // E lo azzero
          }
        } else {
          // Se non devo mostrare il loader normale
          if (
            // Controllo se devo forzare un po' di loader extra su Firefox al primo caricamento texture
            this.devoCaricareTexturePrimaVolta && // Lo faccio solo se è la prima volta che carico le texture
            this.isFirefox && // Lo faccio solo su Firefox
            !this.forzaLoaderExtra // Lo faccio solo se non lo sto già forzando
          ) {
            this.forzaLoaderExtra = true; // Attivo il flag del loader extra

            if (this.extraLoaderTimer) {
              // Se esiste già un timer (per sicurezza)
              clearTimeout(this.extraLoaderTimer); // Lo annullo
              this.extraLoaderTimer = null; // E lo azzero
            }

            this.extraLoaderTimer = setTimeout(() => {
              // Programmo lo spegnimento del loader extra dopo un tempo fisso
              this.forzaLoaderExtra = false; // Spengo il flag del loader extra
              this.extraLoaderTimer = null; // Azzero il timer perché è finito

              this.devoCaricareTexturePrimaVolta = false; // Segno che ormai le texture 'prima volta' sono state gestite
            }, this.EXTRA_LOADER_MS); // Aspetto il numero di millisecondi
          }
        }

        if (caricamentoDisabilitato) {
          // Se il caricamento è disabilitato
          this.loaderVisibile = false; // Nascondo direttamente il loader
        }

        if (
          // Controllo se posso far sparire definitivamente il loader
          this.loaderVisibile && // solo se era ancora visibile
          !deveMostrareLoader && // solo se non serve più il loader normale
          !this.forzaLoaderExtra // solo se non sto forzando il loader extra
        ) {
          this.loaderVisibile = false; // Nascondo il loader
          const now = performance.now(); // Prendo il tempo corrente per loggare quando è sparito
          console.log('LOADER SPARITO alle ' + now + ' ms');
        }
      }
    );
  }
}
