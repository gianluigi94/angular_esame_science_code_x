// Componente root che coordina avvio app, loader globali, lingua, titolo pagina, toast, sessione e reazioni alle navigazioni.

import { Component, OnInit, Inject, NgZone, ChangeDetectorRef } from '@angular/core';
import { CambioLinguaService } from './_servizi_globali/cambio-lingua.service';
import { CambioRicevuteAnimazioneService } from './_servizi_globali/cambio-ricevute-animazione.service';
import { TraduzioniService } from './_servizi_globali/traduzioni.service';
import { ErroreGlobaleService } from './_servizi_globali/errore-globale.service';
import { ToastService } from './_servizi_globali/toast.service';
import { StatoSessioneClientService } from './_servizi_globali/stato-sessione-client.service';
import { TranslateService } from '@ngx-translate/core';
import { Router, NavigationEnd } from '@angular/router';
import { PerformanceService } from './_servizi_globali/performance.service';
import { filter, take } from 'rxjs/operators';
import { CaricamentoCaroselloService } from './_catalogo/carosello-novita/carosello_services/caricamento-carosello.service';
import { AnimateService } from './_servizi_globali/animazioni_saturno/animate.service';
import { DOCUMENT } from '@angular/common';
import gsap from 'gsap';
import { traduciSegmentiUrl } from './_helpers_globali/helpers';
import { Authservice } from 'src/app/_benvenuto/login/_login_service/auth.service';
import { TitoloPaginaService } from './_servizi_globali/titolo-pagina.service';
import { SaturnoStatoService } from './_servizi_globali/animazioni_saturno/saturno-stato.service';
import { SchedaProntaService } from './_catalogo/scheda/scheda_service/scheda-pronta.service';
import { isFirefox, pulisciUrl, isCatalogoHome, isAreaCatalogo, leggiPathDaSessionStorage, salvaPathInSessionStorage, impostaLangHtml }from './_helpers_globali/helpers';
import { isRottaLogin, isRotta404, isRottaContatti, isRottaCatalogo, isRottaPiano, isRottaRicevute } from './_helpers_globali/app-routes.utils';
import { AppToastService } from './_servizi_globali/app-toast.service';
import { AppLoaderService } from './_servizi_globali/app-loader.service';
import { ApiService } from './_servizi_globali/api.service';
import { UtilityService } from './_benvenuto/login/_login_service/login_utility.service';
import { Auth } from './_type/auth.type';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  private pathPrecedenteSessioneAllAvvio = ''; // conservo il path precedente letto dalla sessione all'avvio

  traduzioniPronte$ = this.traduzioniService.traduzioniInizialiCaricate$; // espongo lo stream che indica quando le traduzioni iniziali sono pronte
  erroreFatale$ = this.erroreGlobaleService.erroreFatale$; // espongo lo stream dell'errore fatale globale
  sessioneVerificata$ = this.statoSessioneClient.sessioneVerificata$; // espongo lo stream che indica quando la sessione client e' stata verificata
  saturnoPronto$ = this.saturnoStatoService.saturnoPronto$; // espongo lo stream che indica quando Saturno e' pronto
  caroselloPronto$ = this.caricamentoCaroselloService.caroselloPronto$; // espongo lo stream che indica quando il carosello e' pronto
  schedaPronta$ = this.schedaProntaService.schedaPronta$; // espongo lo stream che indica quando la scheda e' pronta

  //lista getter
  get forzaLoaderExtra(): boolean {
    return this.appLoader.forzaLoaderExtra;
  } // delego al service loader il flag del loader extra
  get loaderAvvioCatalogo(): boolean {
    return this.appLoader.loaderAvvioCatalogo;
  } // delego al service loader il flag del loader avvio catalogo
  get loaderDaMostrare(): boolean {
    return this.appLoader.loaderDaMostrare;
  } // delego al service loader il flag finale del loader da mostrare
  get caricamentoDisabilitato$() {
    return this.appLoader.caricamentoDisabilitato$;
  } // delego al service loader lo stream che disabilita il caricamento
  get caricamentoDisabilitato(): boolean {
    return this.appLoader.caricamentoDisabilitato$.value;
  } // leggo dal service loader il valore corrente del flag di disabilitazione
  get deveCaricareImmaginiCarosello$() {
    return this.appLoader.deveCaricareImmaginiCarosello$;
  } // delego al service loader lo stream che indica se devo caricare le immagini del carosello
  get deveCaricareImmaginiCarosello(): boolean {
    return this.appLoader.deveCaricareImmaginiCarosello$.value;
  } // leggo dal service loader il valore corrente del flag immagini carosello

  sonoIn404 = false;
  nascondiSfondoIn404 = false;
  ultimaUrl = '';
  isFirefox = false;
  chiaveToast404 = this.appToast.chiaveToast404;
  pannelloPianoVisibile = false;
  pianoSelezionatoApp: 'base' | 'pro' | null = null;
  prezzoPianoBase = '';
  prezzoPianoPermium = '';
  confermaPianoInCorso = false;
  spinnerRicevuteVisibile = false;
  private appLoader: AppLoaderService;
 private onApriPannelloPiano = () => {
    this.pannelloPianoVisibile = true;
    const auth = this.authService.leggiObsAuth().value;
    const idRuolo = auth?.idRuolo;
    const iso = auth?.isoNazione ?? 'IT';
    this.pianoSelezionatoApp = idRuolo === 2 ? 'base' : idRuolo === 3 ? 'pro' : null;
    this.apiService.getPrezziNazione(iso).subscribe({
      next: (rit) => {
        const d = rit.data;
        if (!d || !d.tasso || parseFloat(d.tasso) <= 0) {
          this.prezzoPianoBase = '5€'; this.prezzoPianoPermium = '10€';
        } else {
          const tasso = parseFloat(d.tasso);
          const aliquota = d.aliquota ? parseFloat(d.aliquota) / 100 : 0;
          const simbolo = d.valuta_simbolo ?? '€';
          const prezzoBase    = d.prezzo_base_mensile    ? parseFloat(d.prezzo_base_mensile)    : 5;
          const prezzoPremium = d.prezzo_premium_mensile ? parseFloat(d.prezzo_premium_mensile) : 10;
          this.prezzoPianoBase    = `${(prezzoBase    * tasso * (1 + aliquota)).toFixed(2)}${simbolo}`;
          this.prezzoPianoPermium = `${(prezzoPremium * tasso * (1 + aliquota)).toFixed(2)}${simbolo}`;
        }
      },
      error: () => { this.prezzoPianoBase = '5€'; this.prezzoPianoPermium = '10€'; },
    });
    requestAnimationFrame(() => {
      import('gsap').then(({ default: gsap }) => {
        const card = document.querySelector('app-piano-card');
        if (!card) return;
        gsap.set(card, { opacity: 0, scaleX: 0, transformOrigin: 'center center' });
        const bottoni = document.querySelector('.piano-bottoni') as HTMLElement | null;
        if (bottoni) gsap.set(bottoni, { opacity: 0 });
        setTimeout(() => {
          gsap.to(card, { opacity: 1, scaleX: 1, duration: 0.9, ease: 'power2.out' });
          if (bottoni) gsap.to(bottoni, { opacity: 1, duration: 0.6, delay: 0.5, ease: 'power2.out' });
        }, 500);
      });
    });
  };

  constructor(
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private cambioLinguaService: CambioLinguaService,
    private traduzioniService: TraduzioniService,
    private erroreGlobaleService: ErroreGlobaleService,
    private toastService: ToastService,
    private animateService: AnimateService,
    private statoSessioneClient: StatoSessioneClientService,
    private translate: TranslateService,
    private saturnoStatoService: SaturnoStatoService,
    private router: Router,
    private schedaProntaService: SchedaProntaService,
    private caricamentoCaroselloService: CaricamentoCaroselloService,
    private titoloPaginaService: TitoloPaginaService,
    private performanceService: PerformanceService,
    private authService: Authservice,
    private appToast: AppToastService,
    private apiService: ApiService,
    private cambioRicevuteAnimazione: CambioRicevuteAnimazioneService,
    @Inject(DOCUMENT) private documento: Document,
  ) {
    this.appLoader = new AppLoaderService( // costruisco manualmente il service loader usando le dipendenze necessarie
      erroreGlobaleService, // passo il service degli errori globali
      traduzioniService, // passo il service delle traduzioni
      statoSessioneClient, // passo il service dello stato sessione client
      saturnoStatoService, // passo il service dello stato di Saturno
    );
  }

  /**
   * Inizializza il componente root e aggancia tutte le logiche globali di bootstrap e navigazione.
   *
   * @returns void
   */
  ngOnInit(): void {
    this.ngZone.runOutsideAngular(() => {
      gsap.ticker.lagSmoothing(0);
    }); // disattivo il lag smoothing di gsap fuori da Angular

    this.isFirefox = isFirefox(); // rilevo se sto girando su Firefox
    const urlIniziale = this.router.url || ''; // leggo l'URL iniziale corrente

    if (isRottaContatti(urlIniziale) && this.isLoggato())
      // controllo se parto gia' nella pagina contatti da loggato
      window.dispatchEvent(new CustomEvent('apri-dati-personali')); // apro subito i dati personali
    if (!isRottaContatti(urlIniziale))
      // controllo se non parto nella pagina contatti
      window.dispatchEvent(new CustomEvent('chiudi-dati-personali')); // chiudo subito i dati personali

    this.pathPrecedenteSessioneAllAvvio = leggiPathDaSessionStorage(); // leggo dalla sessione il path precedente salvato
    this.appLoader.impostaPathPrecedente(this.pathPrecedenteSessioneAllAvvio); // passo al loader il path precedente iniziale

    this.sonoIn404 = isRotta404(urlIniziale); // aggiorno lo stato iniziale della pagina 404
    this.aggiornaVisibilitaSfondo404(); // aggiorno la visibilita' dello sfondo nella 404
    this.gestisciFadeInSfondo404(); // gestisco l'eventuale fade dello sfondo nella 404
    setTimeout(() => salvaPathInSessionStorage(urlIniziale), 0); // salvo l'URL iniziale in sessione al tick successivo

    if (isRotta404(urlIniziale)) this.appToast.mostraToast404Persistente(); // mostro il toast persistente se parto in 404

    window.addEventListener('apri-pannello-piano', this.onApriPannelloPiano);



    window.addEventListener('loader-hidden', () => {
      if (!isRottaPiano(this.router.url)) return;
      const auth = this.authService.leggiObsAuth().value;
      const idRuolo = auth?.idRuolo;
      const iso = auth?.isoNazione ?? 'IT';
      this.pianoSelezionatoApp = idRuolo === 2 ? 'base' : idRuolo === 3 ? 'pro' : null;
      this.apiService.getPrezziNazione(iso).subscribe({
        next: (rit) => {
          const d = rit.data;
          if (!d || !d.tasso || parseFloat(d.tasso) <= 0) {
            this.prezzoPianoBase = '5€'; this.prezzoPianoPermium = '10€';
          } else {
            const tasso = parseFloat(d.tasso);
            const aliquota = d.aliquota ? parseFloat(d.aliquota) / 100 : 0;
            const simbolo = d.valuta_simbolo ?? '€';
            const prezzoBase    = d.prezzo_base_mensile    ? parseFloat(d.prezzo_base_mensile)    : 5;
          const prezzoPremium = d.prezzo_premium_mensile ? parseFloat(d.prezzo_premium_mensile) : 10;
          this.prezzoPianoBase    = `${(prezzoBase    * tasso * (1 + aliquota)).toFixed(2)}${simbolo}`;
          this.prezzoPianoPermium = `${(prezzoPremium * tasso * (1 + aliquota)).toFixed(2)}${simbolo}`;
          }
        },
        error: () => { this.prezzoPianoBase = '5€'; this.prezzoPianoPermium = '10€'; },
      });
      this.pannelloPianoVisibile = true;
      this.cdr.detectChanges();
      requestAnimationFrame(() => {
        import('gsap').then(({ default: gsap }) => {
          const card = document.querySelector('app-piano-card');
          if (!card) return;
          gsap.set(card, { opacity: 0, scaleX: 0, transformOrigin: 'center center' });
          const bottoni = document.querySelector('.piano-bottoni') as HTMLElement | null;
          if (bottoni) gsap.set(bottoni, { opacity: 0 });
          setTimeout(() => {
            gsap.to(card, { opacity: 1, scaleX: 1, duration: 0.9, ease: 'power2.out' });
            if (bottoni) gsap.to(bottoni, { opacity: 1, duration: 0.6, delay: 0.5, ease: 'power2.out' });
          }, 500);
        });
      });
    });
    window.addEventListener('chiudi-pannello-piano', () => {
      import('gsap').then(({ default: gsap }) => {
        const card = document.querySelector('app-piano-card');
        const bottoni = document.querySelector('.piano-bottoni') as HTMLElement | null;
        if (!card) { this.pannelloPianoVisibile = false; return; }
        if (bottoni) gsap.to(bottoni, { opacity: 0, duration: 0.2, ease: 'power2.in' });
        gsap.to(card, {
          opacity: 0,
          scaleX: 0,
          duration: 0.4,
          ease: 'power2.in',
          transformOrigin: 'center center',
          onComplete: () => { this.pannelloPianoVisibile = false; }
        });
      });
    });
    this.titoloPaginaService.avvia();

    const params = new URLSearchParams(window.location.search);
    const verifica = params.get('verifica');
   const codiceV = this.cambioLinguaService.leggiCodiceLingua();
    if (verifica === 'ok') {
      const testo = codiceV === 'it'
        ? "L'email è stata verificata CORRETTAMENTE.\nOra puoi accedere alla piattaforma."
        : "Your email has been verified SUCCESSFULLY.\nYou can now access the platform.";
      this.toastService.successo(testo);
    } else if (verifica === 'scaduto' || verifica === 'errore') {
      const testo = codiceV === 'it'
        ? 'Qualcosa è andato storto durante la verifica della tua email, probabilmente è passato troppo tempo. Riprova più tardi e se il problema persiste manda un messaggio in assistenza.'
        : 'Something went wrong during your email verification, the link may have expired. Please try again later and if the problem persists contact our support team.';
      this.toastService.errore(testo);
    }
    if (verifica) {
      window.history.replaceState({}, '', window.location.pathname);
    }

    const resetParam = params.get('reset');
    const rid = params.get('rid');
    if (resetParam === 'scaduto') {
      const testo = codiceV === 'it'
        ? 'Il link per il reset della password è scaduto. Richiedine uno nuovo.'
        : 'The password reset link has expired. Please request a new one.';
      this.toastService.errore(testo);
    }
    if (resetParam === 'ok') {
      sessionStorage.setItem('reset_pw_pending', '1');
    }
    if (resetParam) {
      window.history.replaceState({}, '', window.location.pathname);
    }

    this.performanceService.performanceLevel$
      .pipe(
        filter((l) => l !== 'Calcolando...'),
        take(1),
      ) // ignoro lo stato iniziale e prendo il primo valore valido
      .subscribe((level) =>
        console.log('[Performance] Classificazione GPU:', level),
      ); // scrivo in console la classificazione GPU

    impostaLangHtml(
      this.documento,
      this.cambioLinguaService.leggiCodiceLingua(),
    ); // imposto l'attributo lang dell'html in base alla lingua corrente
    this.ultimaUrl = urlIniziale; // salvo l'URL iniziale come ultima URL nota
    this.correggiPrefissoLingua(urlIniziale); // correggo subito il prefisso lingua se necessario

    this.cambioLinguaService.cambioLinguaApplicata$.subscribe(({ codice }) => {
      // reagisco quando la lingua viene applicata davvero
      impostaLangHtml(this.documento, codice); // aggiorno il lang dell'html con il nuovo codice lingua
      if (this.sonoIn404) this.appToast.mostraToast404Persistente(); // se sono in 404 ripresento il toast persistente nella nuova lingua
    });

    const disabilita = isRottaLogin(urlIniziale) || isRotta404(urlIniziale); // calcolo se il loader iniziale deve essere disabilitato // disabilito il loader su login o 404 iniziali
    this.appLoader.caricamentoDisabilitato$.next(disabilita); // aggiorno lo stato iniziale del loader disabilitato

    const deveCaricare = isCatalogoHome(urlIniziale); // controllo se parto nella home catalogo
    this.appLoader.deveCaricareImmaginiCarosello$.next(deveCaricare); // aggiorno il flag che dice se devo caricare le immagini del carosello
    if (deveCaricare) this.caricamentoCaroselloService.resetta(); // resetto il carosello se parto nella home catalogo

    this.router.events // mi metto in ascolto degli eventi del router
      .pipe(filter((ev) => ev instanceof NavigationEnd)) // tengo solo gli eventi di fine navigazione
      .subscribe((ev: any) => {
        // reagisco a ogni navigazione completata
        const url = ev?.urlAfterRedirects || ev?.url || ''; // ricavo l'URL migliore disponibile dall'evento
        this.correggiPrefissoLingua(url); // correggo prefisso lingua e segmenti se necessario

        if (!isRottaContatti(url))
          // controllo se la nuova rotta non e' contatti
          window.dispatchEvent(new CustomEvent('chiudi-dati-personali')); // chiudo i dati personali
        if (isRottaContatti(url) && this.isLoggato())
          // controllo se la nuova rotta e' contatti da utente loggato
          window.dispatchEvent(new CustomEvent('apri-dati-personali')); // apro i dati personali

        if (!isRottaPiano(url)) this.pannelloPianoVisibile = false;
        this.sonoIn404 = isRotta404(url);
        const precedente = this.ultimaUrl; // salvo l'URL precedente prima di aggiornarlo
        this.ultimaUrl = url; // aggiorno l'ultima URL con quella nuova
        salvaPathInSessionStorage(url); // salvo la nuova URL nella sessione
        this.aggiornaVisibilitaSfondo404(); // aggiorno la visibilita' dello sfondo per la 404
        this.gestisciFadeInSfondo404(); // gestisco l'eventuale fade dello sfondo per la 404

        if (isRottaLogin(url)) this.toastService.chiudi('toast_benvenuto'); // chiudo il toast benvenuto se entro nel login
        if (isRotta404(url)) {
          this.erroreGlobaleService.resettaErroreFatale();
          this.appToast.mostraToast404Persistente();
        } // resetto errore fatale e mostro toast 404 se entro in pagina 404
        if (!isRotta404(url)) this.toastService.chiudi(this.chiaveToast404); // chiudo il toast 404 se esco dalla 404

        const vengoDaContatti = (() => {
          // ricavo in modo sicuro se arrivo dal flusso contatti
          try {
            return sessionStorage.getItem('vengo_da_contatti') === 'true';
          } catch {
            return false;
          } // leggo il flag da sessionStorage con fallback sicuro
        })();
        const eroInContatti = isRottaContatti(precedente); // controllo se la rotta precedente era contatti

        const vengoDaPiano = (() => {
          try {
            return sessionStorage.getItem('vengo_da_piano') === 'true';
          } catch {
            return false;
          }
        })();
        const eroInPiano = isRottaPiano(precedente);

        const vengoDaRicevute = (() => {
          try {
            return sessionStorage.getItem('vengo_da_ricevute') === 'true';
          } catch {
            return false;
          }
        })();
        const eroInRicevute = isRottaRicevute(precedente);

        const disabilitaLoader =
          isRottaLogin(url) ||
          isRotta404(url) ||
          (isRottaCatalogo(url) &&
            (isRottaLogin(precedente) ||
              isRotta404(precedente) ||
              (vengoDaContatti && eroInContatti) ||
              (vengoDaPiano && eroInPiano) ||
              (vengoDaRicevute && eroInRicevute))) ||
          (eroInContatti && isRotta404(precedente));

        this.appLoader.caricamentoDisabilitato$.next(disabilitaLoader); // aggiorno il flag del loader disabilitato

        const deve = isCatalogoHome(url); // controllo se la nuova rotta e' la home catalogo
        this.appLoader.deveCaricareImmaginiCarosello$.next(deve); // aggiorno il flag immagini carosello
        if (deve && !isAreaCatalogo(precedente))
          this.caricamentoCaroselloService.resetta(); // resetto il carosello se entro nella home catalogo da fuori area catalogo
      });

    this.cambioRicevuteAnimazione.spinnerVisibile$.subscribe((v) => {
      this.spinnerRicevuteVisibile = v;
    });

    this.appToast.gestisciToastBenvenuto(); // avvio la logica globale del toast benvenuto
    this.appToast.gestisciErroriFatali(); // avvio la logica globale dei toast di errore fatale
    this.appLoader.avvia(
      // avvio la logica generale del loader applicativo
      this.caricamentoCaroselloService.caroselloPronto$, // passo lo stream del carosello pronto
      this.schedaProntaService, // passo il service che gestisce la scheda pronta
      () => {}, // passo una callback vuota finale
    );
  }

  /**
   * Mostra il toast persistente associato alla pagina 404.
   *
   * @returns void
   */
  mostraToast404Persistente(): void {
    this.appToast.mostraToast404Persistente(); // delego al service toast applicativo la visualizzazione del toast 404
  }

  /**
   * Aggiorna il flag che decide se nascondere lo sfondo nella pagina 404.
   *
   * @returns void
   */
  aggiornaVisibilitaSfondo404(): void {
    const raw = leggiPathDaSessionStorage(); // leggo il path salvato in sessione
    const path = raw.replace(/^\/+/, ''); // normalizzo il path rimuovendo gli slash iniziali
    const vieneDaCatalogo =
      path.startsWith('it/catalogo') || path.startsWith('en/catalog'); // controllo se il path precedente appartiene al catalogo
    this.nascondiSfondoIn404 = this.sonoIn404 && vieneDaCatalogo; // aggiorno il flag finale di nascondimento sfondo nella 404
  }

  /**
   * Esegue il fade-in del solo sfondo nella 404 quando richiesto.
   *
   * @returns void
   */
  gestisciFadeInSfondo404(): void {
    if (this.nascondiSfondoIn404) {
      // controllo se devo davvero mostrare il fade-in dello sfondo
      this.animateService.fadeInSoloSfondo(1.85); // avvio il fade-in del solo sfondo con la durata prevista
    }
  }

  /**
   * Corregge prefisso lingua e segmenti URL non coerenti con la lingua salvata.
   *
   * @param url URL da verificare e correggere.
   * @returns void
   */
  private correggiPrefissoLingua(url: string): void {
    const match = url.match(/^\/(it|en)(\/|$)/); // verifico se l'URL inizia con un prefisso lingua supportato
    if (!match) return; // esco subito se non trovo un prefisso lingua

    const langNelUrl = match[1]; // ricavo la lingua presente nell'URL
    const langSalvata = this.cambioLinguaService.leggiCodiceLingua(); // ricavo la lingua attualmente salvata nel service
    let urlCorretto = url; // preparo una copia modificabile dell'URL

    if (langNelUrl !== langSalvata)
      // controllo se la lingua dell'URL non coincide con quella salvata
      urlCorretto = urlCorretto.replace(/^\/(it|en)/, '/' + langSalvata); // sostituisco il prefisso lingua con quello corretto

    urlCorretto = traduciSegmentiUrl(urlCorretto, langSalvata as 'it' | 'en'); // traduco anche gli eventuali segmenti interni dell'URL
    if (urlCorretto === url) return; // esco se dopo la correzione l'URL e' rimasto identico

    this.router.navigateByUrl(urlCorretto, { replaceUrl: true }); // navigo all'URL corretto sostituendo la history entry corrente
  }

  /**
   * Indica se l'utente risulta autenticato leggendo il token corrente.
   *
   * @returns boolean
   */
  private isLoggato(): boolean {
    return !!this.authService.leggiObsAuth().value?.tk; // ritorno true se nello stato auth e' presente un token
  }

  get pianoCorrente(): 'base' | 'pro' | null {
    const id = this.authService.leggiObsAuth().value?.idRuolo;
    return id === 2 ? 'base' : id === 3 ? 'pro' : null;
  }

  onIndietroPiano(): void {
    window.history.back();
  }

  onConfermaPiano(): void {
    if (!this.pianoSelezionatoApp) return;
    this.confermaPianoInCorso = true;
    this.apiService.cambiaPiano(this.pianoSelezionatoApp).subscribe({
      next: (rit: any) => {
        const nuovoTk = rit.tk ?? rit.data?.tk;
        if (!nuovoTk) { this.confermaPianoInCorso = false; return; }
        const p = UtilityService.leggiToken(nuovoTk)?.data || {};
        const authCorrente = this.authService.leggiObsAuth().value;
        const restaCollegato = !!localStorage.getItem('auth');
        const nuovaAuth: Auth = {
          ...authCorrente,
          tk: nuovoTk,
          idRuolo: p.id_ruolo ?? authCorrente.idRuolo,
          abilita: Array.isArray(p.abilita) ? p.abilita : authCorrente.abilita,
        };
        this.authService.settaObsAuth(nuovaAuth);
        this.authService.scriviAuthSuStorage(nuovaAuth, restaCollegato);
        this.confermaPianoInCorso = false;
        this.translate.get('ui.piano.toast.successo').pipe(take(1)).subscribe(t => this.toastService.successo(t));
        window.history.back();
      },
      error: () => { this.confermaPianoInCorso = false; },
    });
  }

}
