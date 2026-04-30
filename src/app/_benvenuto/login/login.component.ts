// Componente di login che gestisce form reattivo, validazioni, chiamata di autenticazione, ci sono riferimenti a toast di feedback e animazioni di ingresso/uscita (GSAP), con navigazione al catalogo in caso di successo.
import { Component, OnDestroy, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject, Observable, Observer, Subject, take, takeUntil } from 'rxjs';
import { Authservice } from './_login_service/auth.service';
import { Auth } from 'src/app/_type/auth.type';
import { IRispostaServer } from 'src/app/_interfacce/IRispostaServer.interface';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { UtilityService } from './_login_service/login_utility.service';
import { Router } from '@angular/router';
import { LoginAnimazioniService } from 'src/app/_servizi_globali/animazioni_saturno/gsap/login_animazioni.service';
import gsap from 'gsap';
import { SaturnoService } from 'src/app/_servizi_globali/animazioni_saturno/three/saturno.service';
import { ToastService } from 'src/app/_servizi_globali/toast.service';
import { TranslateService } from '@ngx-translate/core';
import { LoginUscitaService } from './_login_service/login_uscita.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnDestroy, AfterViewInit {
  @ViewChild('loginContenuto', { static: true })
  loginContenuto!: ElementRef<HTMLElement>;
  @ViewChild('formReset', { static: false })
  formReset?: ElementRef<HTMLElement>;

  stoControllando: boolean = false; // flag che mi dice se sto eseguendo il controllo di accesso in corso
  reactiveForm: FormGroup; // tengo il form reattivo che contiene i controlli e le validazioni
  auth: BehaviorSubject<Auth>; // l'evento dello stato di autenticazione per reagire ai cambiamenti
  formInviato: boolean = false; // flag per sapere se l'utente ha già provato a inviare il form
  mostraPassword: boolean = false; // flag per decidere se mostrare la password in chiaro o mascherata(mentre la scrive nell'input non nell'invio)
  private distruggi$ = new Subject<void>(); //  segnale che uso per chiudere le sottoscrizioni quando distruggo il componente

  saltaAnimazioneUscita: boolean = false;
  saltaAnimazioniIngresso: boolean = false;
  invioResetInCorso: boolean = false;
  resetForm: FormGroup;
  private onApriResetDaToast = () => this.apriFormReset();
  constructor(
    private fb: FormBuilder,
    private authService: Authservice,
    private api: ApiService,
    private router: Router,
    private loginAnimazioniService: LoginAnimazioniService,
    private toastService: ToastService,
    private saturnoService: SaturnoService,
    private translate: TranslateService,
    private loginUscitaService: LoginUscitaService,
  ) {
    const nav = this.router.getCurrentNavigation(); // recupero le informazioni sulla navigazione corrente per capire come sono arrivato su questa pagina
    this.saltaAnimazioniIngresso =
      nav?.trigger === 'imperative' && // controllo che la navigazione sia stata avviata in modo programmatico dal router (imperative) è un valore angular che significa che la navigazione è stata fatta via codice
      !!nav?.extras?.state?.['saltaAnimazioniLogin']; // verifico se nello state della navigazione e' presente il flag che mi chiede di saltare le animazioni di ingresso

    this.reactiveForm = this.fb.group({
      // costruisco il reactive form raggruppando i controlli e le loro regole di validazione
      utente: [
        // definisco il controllo per il campo utente
        '', // imposto il valore iniziale del campo utente come stringa vuota
        [
          // elenco le validazioni da applicare al campo utente
          Validators.required,
          Validators.email,
          Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/),
          Validators.minLength(5),
          Validators.maxLength(40),
        ],
      ],
      password: [
        // definisco il controllo per il campo password
        '', // imposto il valore iniziale della password come stringa vuota
        [
          // elenco le validazioni da applicare alla password
          Validators.required, // richiedo che la password sia obbligatoria
          Validators.minLength(6), // richiedo una lunghezza minima
          Validators.maxLength(20), // impongo una lunghezza massima
        ],
      ],
      restaCollegato: [false], // definisco il controllo del checkbox 'resta collegato' con valore iniziale falso
    });

    this.resetForm = this.fb.group({
      emailReset: ['', [Validators.required, Validators.email, Validators.minLength(5), Validators.maxLength(40)]],
    });
    this.auth = this.authService.leggiObsAuth();
  }

  /**
   * Metodo chiamato automaticamente da Angular dopo che il template è stato renderizzato
   * e gli elementi della pagina sono disponibili nel DOM.
   * - avvia l'animazione di ingresso del pannello login tramite LoginAnimazioniService
   * - anima il footer e il testo del footer con GSAP
   * - nasconde sottotitolo e indicatore di scorrimento tramite UtilityService
   *
   * @returns void
   */
  ngAfterViewInit(): void {
    sessionStorage.setItem('vengo_da_login', 'true');
    window.addEventListener('apri-reset-da-toast', this.onApriResetDaToast);
    if (this.saltaAnimazioniIngresso) {
      // nel caso ricarico salto le animazioni e faccio scomparire il sottotitolo
      UtilityService.nascondiSottotitoloEScrol();
      return;
    }

    // entro qui quando il template e i componenti sono disponibili nel DOM
    if (this.loginContenuto?.nativeElement) {
      // controllo di avere davvero l'elemento del pannello login
      this.loginAnimazioniService.animaIngresso(
        // avvio l'animazione di ingresso del pannello tramite il servizio
        this.loginContenuto.nativeElement, // passo l'elemento reale su cui applicare l'animazione
      );
    }

    const footer = document.querySelector('footer') as HTMLElement | null; // cerco il footer nel DOM per animarlo
    if (footer) {
      gsap.set(footer, {
        // imposto lo stato iniziale del footer prima dell'animazione
        scaleY: 0,
        transformOrigin: 'bottom center', // imposto il punto di trasformazione in basso al centro
        opacity: 0, // parto invisibile
      });

      gsap.to(footer, {
        // animo il footer fino allo stato visibile
        scaleY: 1,
        opacity: 1,
        duration: 0.3,
        delay: 0.6,
        ease: 'power2.out',
      });
    }

    const footerP = document.querySelector('#footer-p') as HTMLElement | null; // cerco nel DOM l'elemento del testo footer-p da animare
    if (footerP) {
      gsap.set(footerP, { opacity: 0 }); // imposto il testo completamente trasparente come stato iniziale

      gsap.to(footerP, {
        // animo il testo fino a renderlo visibile
        opacity: 1,
        duration: 0.9,
        delay: 1.15, // ritardo l'avvio così appare dopo l'animazione del contenitore del footer
        ease: 'power2.out',
      });
    }

    UtilityService.nascondiSottotitoloEScrol(); // spengo e nascondo sottotitolo e indicatore di scorrimento per questa pagina
  }
apriFormReset(): void {
    const login = this.loginContenuto.nativeElement.querySelector('.form-login') as HTMLElement;
    gsap.to(login, { top: '-100%', left: '100%', scale: 0.2, opacity: 0, duration: 0.8, ease: 'power2.in', onComplete: () => {
      gsap.set(login, { pointerEvents: 'none' });
    }});
    this.resetForm.reset();
    setTimeout(() => {
      const reset = this.loginContenuto.nativeElement.querySelector('.form-reset') as HTMLElement;
      if (!reset) return;
      gsap.set(reset, { display: 'flex', top: '-100%', left: '100%', scale: 0.2, opacity: 0, pointerEvents: 'auto' });
      gsap.to(reset, { top: 0, left: 0, scale: 1, opacity: 1, duration: 0.8, ease: 'power2.out' });
    }, 500);
  }

  chiudiFormReset(): void {
    const reset = this.loginContenuto.nativeElement.querySelector('.form-reset') as HTMLElement;
    gsap.to(reset, { top: '-100%', left: '100%', scale: 0.2, opacity: 0, duration: 0.8, ease: 'power2.in', onComplete: () => {
      gsap.set(reset, { display: 'none', pointerEvents: 'none' });
    }});
    setTimeout(() => {
      const login = this.loginContenuto.nativeElement.querySelector('.form-login') as HTMLElement;
      gsap.set(login, { pointerEvents: 'auto' });
      gsap.to(login, { top: 'auto', left: 'auto', scale: 1, opacity: 1, duration: 0.8, ease: 'power2.out', clearProps: 'top,left' });
    }, 500);
  }

  inviaReset(): void {
    if (this.resetForm.invalid) return;
    this.invioResetInCorso = true;
    const email = this.resetForm.controls['emailReset'].value;
    const lingua = this.translate.currentLang || 'it';
    this.api.richiediResetPassword(email, lingua).pipe(take(1)).subscribe({
      next: () => {
        this.invioResetInCorso = false;
        this.translate.get('ui.login.reset.email_inviata').pipe(take(1)).subscribe(t => this.toastService.successo(t));
        this.chiudiFormReset();
      },
      error: () => {
        this.invioResetInCorso = false;
        this.translate.get('ui.login.reset.email_inviata').pipe(take(1)).subscribe(t => this.toastService.successo(t));
        this.chiudiFormReset();
      },
    });
  }
  /**
   * Avvia (o salta) l'animazione di uscita del pannello login.
   * Tipicamente usato da un guard di routing che aspetta la fine dell'animazione
   * prima di cambiare pagina.
   * La logica effettiva è delegata a LoginUscitaService.
   *
   * @returns Promise<void> Promise risolta quando l'uscita è terminata (o è stata saltata).
   */
  animaUscita(): Promise<void> {
    // preparo un'uscita animata che il guard può aspettare prima di cambiare rotta
    return this.loginUscitaService.animaUscita(
      // delego la logica di uscita al servizio dedicato
      this.loginContenuto, // passo il riferimento all'elemento reale del pannello login
      this.saltaAnimazioneUscita, // passo il flag per decidere se saltare l'animazione (dopo login riuscito)
    );
  }

  /**
   * Gestisce l'invio del form di accesso.
   * - Imposta il flag formInviato per attivare la visualizzazione degli errori
   * - Se il form è invalido: marca tutti i campi come “toccati” per mostrare le validazioni
   * - Se il form è valido: legge utente/password/restaCollegato, attiva lo stato di caricamento
   *   e avvia la richiesta di login sottoscrivendosi con un gestore dedicato.
   *
   * @returns void
   */
  accedi(): void {
    // gestisco l'invio del form di accesso
    this.formInviato = true; // segno che ho provato a inviare il form così posso mostrare gli errori
    if (this.reactiveForm.invalid) {
      // controllo se il form non è valido
      this.reactiveForm.markAllAsTouched(); // marco tutti i campi come toccati per far comparire le validazioni
    } else {
      // entro qui solo se il form è valido
      const utente = this.reactiveForm.controls['utente'].value; // leggo il valore inserito nel campo utente
      const password = this.reactiveForm.controls['password'].value; // leggo il valore inserito nel campo password
      const restaCollegato = // preparo il valore del checkbox 'resta collegato'
        !!this.reactiveForm.controls['restaCollegato'].value; // trasformo il valore in booleano sicuro

      this.stoControllando = true; // attivo lo stato di caricamento mentre faccio la chiamata di login
      this.obsLogin(utente, password, restaCollegato).subscribe(
        // avvio la chiamata di login e mi sottoscrivo alla risposta
        this.osservoLogin(restaCollegato), // passo la scelta per decidere dove salvare il token
      );
    }
  }

  /**
   * Crea e restituisce il flusso della richiesta di login verso il backend.
   * Usa ApiService.login(...) e applica:
   * - take(1): prende solo la prima risposta utile
   * - takeUntil(distruggi$): interrompe la richiesta se il componente viene distrutto
   *
   * @param utente string Email/username da inviare al backend.
   * @param password string Password da inviare al backend.
   * @param restaCollegato boolean Se true richiede persistenza (es. sessione più lunga).
   *
   * @returns Observable<IRispostaServer> Flusso che emette la risposta del server.
   */
  private obsLogin(
    // costruisco l'observable che esegue la chiamata di login
    utente: string, // ricevo l'utente da inviare al backend
    password: string, // ricevo la password
    restaCollegato: boolean, // ricevo la scelta 'resta collegato'
  ): Observable<IRispostaServer> {
    // dichiaro che la chiamata restituisce una risposta del server nel formato previsto
    return this.api // uso il servizio API per fare la richiesta
      .login(utente, password, restaCollegato) // invio le credenziali e la preferenza di persistenza
      .pipe(take(1), takeUntil(this.distruggi$)); // prendo solo la prima risposta e mi fermo se il componente viene distrutto
  }

  /**
   * Prepara e restituisce un gestore della risposta della richiesta di login
   * (con gestione di successo, errore e completamento).
   *
   * - In caso di successo (next):
   *   - valida presenza di data e message
   *   - estrae tk, decodifica token, costruisce l'oggetto Auth
   *   - aggiorna lo stato globale (Authservice) e salva su localStorage
   *   - mostra toast di successo e chiude eventuali toast precedenti
   *   - imposta saltaAnimazioneUscita = true e naviga a /catalogo
   *   - se la risposta non è nel formato atteso: lampeggia luce di errore (SaturnoService)
   *
   * - In caso di errore (error):
   *   - ricava la chiave di errore dal backend, traduce e mostra un toast (caso speciale max accessi)
   *   - lampeggia luce di errore
   *   - resetta Auth a 'non autenticato'
   *   - disattiva lo stato di caricamento
   *
   * - In chiusura (complete):
   *   - disattiva lo stato di caricamento
   *
   * @returns Observer<any> Gestore pronto da passare a subscribe(...)
   */
  private osservoLogin(restaCollegato: boolean) {
    // preparo un osservatore  per gestire la risposta della chiamata di login
    const osservatore: Observer<any> = {
      // costruisco un observer con next, error e complete
      next: (rit: IRispostaServer) => {
        // gestisco il caso di risposta corretta dal server
        if (rit.data !== null && rit.message !== null) {
          // considero valido il login solo se ho dati e messaggio non nulli
          const tk: string = rit.data.tk; // estraggo il token dalla risposta
          const p = UtilityService.leggiToken(tk)?.data || {}; // decodifico il token per ricavare i dati utente, oppure uso un oggetto vuoto
          const auth: Auth = {
            tk: tk,
            nome: p.nome ?? null,
            idRuolo: p.id_ruolo ?? null,
            idStato: p.id_stato_utente ?? null,
            idUtente: p.id_contatto ?? null,
            abilita: Array.isArray(p.abilita) ? p.abilita : null,
            isoNazione: p.iso_nazione ?? null,
          };
          this.authService.settaObsAuth(auth); // aggiorno lo stato di autenticazione globale con i dati appena ottenuti
          this.authService.scriviAuthSuStorage(auth, restaCollegato); // local se collegato, altrimenti session

          const testo = this.translate.instant(
            'ui.menu_utente.collegati.riuscito',
          ); // preparo il testo del toast di successo traducendolo subito
          this.toastService.chiudi('login_errore'); // chiudo eventuali toast di errore login rimasti aperti
          this.toastService.chiudi('accesso_ok'); // chiudo un eventuale toast di successo precedente con la stessa chiave
          this.toastService.successoConSpinner(testo, 'accesso_ok'); // mostro un toast di successo con spinner usando la chiave dedicata

          this.saltaAnimazioneUscita = true; // imposto il flag per evitare l'animazione di uscita quando lascio la pagina dopo login riuscito

          setTimeout(() => {
            // rimando la navigazione al prossimo giro di esecuzione per non incastrarmi con aggiornamenti in corso
            this.router.navigateByUrl(this.pathCatalogoDopoLogin(), {
              state: { saltaAnimazioniLogin: true },
            }); // porto l'utente al catalogo dopo il login
          }, 0);
        } else {
          // entro qui se la risposta non contiene i dati attesi
          this.saturnoService.flashErrorLight(); // faccio lampeggiare la luce di errore nella scena di Saturno
        }
        this.stoControllando = false; // spengo lo stato di caricamento perché ho finito di gestire la risposta
      },
      error: (err) => {
        // gestisco il caso di errore della chiamata di login

        const chiave = UtilityService.chiaveToastErroreDaBackend(err);

        const messaggio = this.translate.instant(chiave);

        if (
          chiave === 'ui.toast.error.login.max_acces' ||
          chiave === 'ui.toast.error.login.in_attesa'
        ) {
          this.toastService.mostra(
            messaggio,
            'allarm',
            false,
            undefined,
            'login_errore',
          );
        } else if (chiave === 'ui.toast.erro.login.password_deprecata') {
          const testoNuovo = this.translate.instant('ui.toast.password_scaduta.testo');
          this.toastService.mostra(
            testoNuovo,
            'allarm',
            true,
            'apri_reset',
            'login_errore',
          );
        } else {
          this.toastService.mostra(
            messaggio,
            'error',
            false,
            undefined,
            'login_errore',
          );
        }

        this.saturnoService.flashErrorLight(); // faccio lampeggiare la luce di errore anche in caso di risposta fallita
       const auth: Auth = {
          tk: null,
          nome: null,
          idRuolo: null,
          idStato: null,
          idUtente: null,
          abilita: null,
          isoNazione: null,
        };
        this.authService.settaObsAuth(auth); // aggiorno lo stato globale impostandolo come non autenticato
        this.stoControllando = false; // spengo lo stato di caricamento perché ho finito la gestione dell'errore
      },

      complete: () => {
        // gestisco la fine del flusso observable anche se non arriva next o error
        this.stoControllando = false; // mi assicuro comunque di spegnere lo stato di caricamento
      },
    };
    return osservatore; // restituisco l'osservatore pronto da passare alla subscribe
  }

  /**
   * Metodo chiamato automaticamente da Angular quando il componente viene distrutto.
   * Serve a chiudere in modo pulito le sottoscrizioni: emette su distruggi$ così che
   * i flussi con takeUntil(distruggi$) terminino.
   *
   * @returns void
   */
  ngOnDestroy(): void {
    window.removeEventListener('apri-reset-da-toast', this.onApriResetDaToast);
    this.distruggi$.next();
  }

  /**
   * Costruisce dinamicamente l'URL di destinazione dopo il login.
   *
   * - Determina la lingua corrente leggendo prima dall'URL (es. /it o /en),
   *   altrimenti usa la lingua attuale del TranslateService.
   * - Costruisce il prefisso lingua (es. /it o /en) e il path base del catalogo
   *   (catalogo in IT, catalog in EN).
   * - Legge da localStorage il tipo di contenuto selezionato (film, serie, o entrambi)
   *   per indirizzare l'utente direttamente alla sezione corretta.
   * - Restituisce l'URL completo finale pronto per la navigazione.
   *
   * @returns string URL completo verso la sezione corretta del catalogo.
   */
  pathCatalogoDopoLogin(): string {
    const url = (this.router.url || '').split('?')[0].split('#')[0]; // prendo l'URL corrente e rimuovo eventuali query params e hash
    const m = url.match(/^\/(it|en)(?=\/|$)/); // cerco di estrarre il codice lingua (it o en) dall'inizio dell'URL
    const codice = m?.[1] // se ho trovato la lingua nell'URL uso quella
      ? m[1]
      : this.translate.currentLang === 'en' // altrimenti mi baso sulla lingua corrente del servizio di traduzione
        ? 'en'
        : 'it';

    const pref = '/' + codice; // costruisco il prefisso lingua da anteporre all'URL
    const base = codice === 'en' ? '/catalog' : '/catalogo'; // scelgo il path base del catalogo in base alla lingua

    const tipo =
      (localStorage.getItem('tipo_contenuto') as any) || 'film_serie'; // leggo da localStorage il tipo di contenuto scelto (fallback: film_serie)

    const sotto =
      tipo === 'film' // se l'utente ha selezionato solo film
        ? codice === 'en'
          ? '/movies'
          : '/film'
        : tipo === 'serie' // se ha selezionato solo serie
          ? codice === 'en'
            ? '/series'
            : '/serie'
          : codice === 'en' // altrimenti (film_serie) porto alla sezione combinata
            ? '/movies-series'
            : '/film-serie';

    return pref + base + sotto; // compongo e restituisco l'URL finale completo
  }
}
