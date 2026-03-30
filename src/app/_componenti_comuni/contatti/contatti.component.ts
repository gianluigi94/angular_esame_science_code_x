// Componente contatti che carica i dati personali, gestisce le animazioni di ingresso/uscita e mostra il form messaggi con logica di apertura, chiusura e navigazione.
import { UtilityService } from 'src/app/_benvenuto/login/_login_service/login_utility.service';
import { ContattiAnimazioniService } from 'src/app/_servizi_globali/animazioni_saturno/gsap/contatti_animazioni.service';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { IRispostaServer } from 'src/app/_interfacce/IRispostaServer.interface';
import { Component, AfterViewInit, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription, take } from 'rxjs';
import gsap from 'gsap';
import { Authservice } from 'src/app/_benvenuto/login/_login_service/auth.service';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-contatti',
  templateUrl: './contatti.component.html',
  styleUrls: ['./contatti.component.scss'],
})
export class ContattiComponent implements AfterViewInit, OnInit, OnDestroy {
  @ViewChild('contattiContenuto', { static: true })
  contattiContenuto!: ElementRef<HTMLElement>;

  subs = new Subscription(); // mi salvo le sottoscrizioni per poterle chiudere in destroy
  mail: string = ''; // tengo la mail ricevuta dal backend
  indirizzo: string = ''; // tengo l'indirizzo ricevuto dal backend
  viewReady = false; // segno quando la view e' pronta
  datiReady = false; // segno quando i dati remoti sono pronti
  sonoLoggato = false; // tengo lo stato login corrente
  mostraForm = false; // decido se mostrare il form contatti
  messaggioForm: FormGroup; // tengo il form reattivo del messaggio
  formInviatoMsg = false; // segno se ho tentato l'invio del form

  @ViewChild('formContenuto', { static: true })
  formContenuto!: ElementRef<HTMLElement>;

  constructor(
    private authService: Authservice,
    private contattiAnimazioni: ContattiAnimazioniService,
    private apiService: ApiService,
    private cambioLingua: CambioLinguaService,
    private router: Router,
    private fb: FormBuilder,
  ) {
    // validazioni del form
    this.messaggioForm = this.fb.group({
      nome: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(50),
        ],
      ],
      cognome: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(50),
        ],
      ],
      tipologia: ['', Validators.required],
      messaggio: [
        '',
        [
          Validators.required,
          Validators.minLength(10),
          Validators.maxLength(500),
        ],
      ],
    });
  }

  /**
   * Metodo eseguito all'inizializzazione del componente.
   *
   * Legge lo stato di autenticazione, carica i dati personali necessari
   * e si sottoscrive al cambio lingua per rieseguire l'animazione
   * dei contenuti quando serve.
   *
   * @returns void
   */
  ngOnInit(): void {
    this.sonoLoggato = !!this.authService.leggiObsAuth().value?.tk; // leggo subito se l'utente risulta autenticato

    this.apiService
      .getDatiPersonali()
      .pipe(
        take(1), // prendo solo la prima risposta utile e poi chiudo
      )
      .subscribe((rit: IRispostaServer) => {
        const dato = rit.data[0]; // recupero il primo record ritornato dal server
        this.mail = dato.mail; // salvo la mail ricevuta
        this.indirizzo = dato.indirizzo; // salvo l'indirizzo ricevuto
        this.datiReady = true; // segno che i dati richiesti sono pronti
        this.avviaAnimazioniSePronto(); // provo ad avviare le animazioni se anche la view e' pronta
      });

    this.subs.add(
      this.cambioLingua.cambioLinguaApplicata$.subscribe(() => {
        if (this.sonoLoggato) return; // non rilancio le animazioni se l'utente e' loggato
        const el = this.contattiContenuto?.nativeElement; // recupero il contenitore principale dei contatti
        if (!el) return; // esco se il contenitore non e' disponibile

        gsap.killTweensOf(el.querySelectorAll('h2, .contact-list .row')); // fermo eventuali tween ancora attivi sugli elementi animati
        gsap.set(el.querySelectorAll('h2, .contact-list .row'), {
          opacity: 0,
          x: 26,
        }); // riporto gli elementi allo stato iniziale per il nuovo ingresso

        requestAnimationFrame(() => this.contattiAnimazioni.ingresso(el)); // rilancio l'animazione di ingresso al frame successivo
      }),
    );
  }

  /**
   * Metodo eseguito dopo il rendering della vista del componente.
   *
   * Prepara lo stato iniziale grafico, salva alcuni flag di provenienza
   * in sessionStorage, prova ad avviare le animazioni e gestisce
   * l'animazione di ingresso del footer.
   *
   * @returns void
   */
  ngAfterViewInit(): void {
    sessionStorage.setItem('vengo_da_contatti', 'true'); // segno che sono passato dalla pagina contatti

    if (sessionStorage.getItem('pagina_registrazione')) {
      sessionStorage.setItem('vengo_da_registrazione', 'true'); // segno che arrivo dalla registrazione se il flag era presente
    }

    UtilityService.nascondiSottotitoloEScrol(); // nascondo sottotitolo e scroll secondo la logica globale

    if (this.contattiContenuto?.nativeElement) {
      this.contattiAnimazioni.preparaStatoIniziale(
        this.contattiContenuto.nativeElement,
        this.sonoLoggato,
      ); // preparo lo stato iniziale del blocco contatti
    }

    this.viewReady = true; // segno che la view e' pronta
    this.avviaAnimazioniSePronto(); // provo ad avviare le animazioni se anche i dati sono pronti

    const footer = document.querySelector('footer') as HTMLElement | null; // recupero il footer della pagina
    if (footer) {
      gsap.killTweensOf(footer); // fermo eventuali animazioni residue sul footer
      gsap.set(footer, {
        scaleY: 0,
        transformOrigin: 'bottom center',
        opacity: 0,
      }); // imposto lo stato iniziale del footer

      gsap.to(footer, {
        scaleY: 1,
        opacity: 1,
        duration: 0.3,
        delay: 0.25,
        ease: 'power2.out',
      }); // faccio entrare il footer con una breve animazione
    }

    const footerP = document.querySelector('#footer-p') as HTMLElement | null; // recupero il paragrafo interno del footer
    if (footerP) {
      gsap.killTweensOf(footerP); // fermo eventuali animazioni residue sul testo del footer
      gsap.set(footerP, { opacity: 0 }); // imposto il testo inizialmente invisibile
      gsap.to(footerP, {
        opacity: 1,
        duration: 0.6,
        delay: 0.55,
        ease: 'power2.out',
      }); // faccio entrare il testo del footer con fade
    }
  }

  /**
   * Metodo eseguito alla distruzione del componente.
   *
   * Chiude tutte le sottoscrizioni registrate dal componente.
   *
   * @returns void
   */
  ngOnDestroy(): void {
    this.subs.unsubscribe(); // chiudo tutte le sottoscrizioni attive
  }

  /**
   * Avvia le animazioni di ingresso solo quando vista e dati risultano pronti.
   *
   * L'animazione parte solo se il contenitore esiste e l'utente non e'
   * loggato.
   *
   * @returns void
   */
  avviaAnimazioniSePronto(): void {
    if (!this.viewReady || !this.datiReady) return; // esco finche' view e dati non sono entrambi pronti
    if (!this.contattiContenuto?.nativeElement) return; // esco se il contenitore non e' disponibile
    if (this.sonoLoggato) return; // esco se l'utente e' loggato

    requestAnimationFrame(() => {
      this.contattiAnimazioni.animaIngresso(
        this.contattiContenuto.nativeElement,
      ); // faccio partire l'animazione di ingresso al frame successivo
    });
  }

  /**
   * Apre il form contatti dopo l'uscita animata della schermata principale.
   *
   * Nasconde il contenuto contatti, mostra il form e ne prepara
   * l'animazione di ingresso.
   *
   * @returns void
   */
  apriForm(): void {
    this.contattiAnimazioni
      .uscita(this.contattiContenuto.nativeElement)
      .then(() => {
        gsap.set(this.contattiContenuto.nativeElement, { display: 'none' }); // nascondo il contenuto contatti dopo l'uscita
        this.mostraForm = true; // mostro il form
        gsap.set(this.formContenuto.nativeElement, {
          opacity: 1,
          x: 0,
          pointerEvents: 'auto',
        }); // rendo interattivo e visibile il contenitore del form

        this.contattiAnimazioni.prepara(this.formContenuto.nativeElement, {
          titleSelector: 'h2',
          rowSelector: '.campo-wrapper, .form-riga-doppia, .form-bottoni',
        }); // preparo lo stato iniziale animato del form

        requestAnimationFrame(() => {
          this.contattiAnimazioni.ingresso(this.formContenuto.nativeElement, {
            titleSelector: 'h2',
            rowSelector: '.campo-wrapper, .form-riga-doppia, .form-bottoni',
          }); // faccio entrare il form al frame successivo
        });
      });
  }

  /**
   * Chiude il form contatti e ripristina il contenuto principale.
   *
   * Esegue l'uscita animata del form, resetta stato e campi
   * e rilancia l'ingresso del contenuto contatti.
   *
   * @returns void
   */
  chiudiForm(): void {
    this.contattiAnimazioni
      .uscita(this.formContenuto.nativeElement, {
        titleSelector: 'h2',
        rowSelector: '.campo-wrapper, .form-riga-doppia, .form-bottoni',
      })
      .then(() => {
        this.formInviatoMsg = false; // azzero il flag di invio del form
        this.messaggioForm.reset(); // pulisco tutti i campi del form
        gsap.set(this.formContenuto.nativeElement, { pointerEvents: 'none' }); // disattivo le interazioni sul form
        this.mostraForm = false; // torno a nascondere il form

        gsap.set(this.contattiContenuto.nativeElement, {
          display: 'block',
          opacity: 1,
        }); // ripristino la visibilita' del contenuto contatti

        this.contattiAnimazioni.prepara(this.contattiContenuto.nativeElement); // preparo di nuovo il contenuto principale per l'ingresso

        requestAnimationFrame(() => {
          this.contattiAnimazioni.ingresso(
            this.contattiContenuto.nativeElement,
          ); // faccio rientrare il contenuto principale al frame successivo
        });
      });
  }

  /**
   * Gestisce l'invio del messaggio del form.
   *
   * Marca il form come inviato, interrompe il flusso se non valido
   * e al momento stampa i dati in console come placeholder.
   *
   * @returns void
   */
  inviaMessaggio(): void {
    this.formInviatoMsg = true; // segno che e' stato tentato l'invio del form
    if (this.messaggioForm.invalid) return; // esco se il form non e' valido
    console.log('Messaggio da inviare:', this.messaggioForm.value); // loggo il payload finche' non sara' collegato il backend
  }

  /**
   * Gestisce il ritorno alla schermata precedente.
   *
   * Se la provenienza e' dalla registrazione naviga alla home,
   * altrimenti usa la cronologia del browser.
   *
   * @returns void
   */
  tornaIndietro(): void {
    if (sessionStorage.getItem('vengo_da_registrazione')) {
      this.router.navigate(['/']); // torno alla home se arrivo dalla registrazione
      return;
    }

    window.history.back(); // torno alla pagina precedente nella cronologia
  }

  /**
   * Esegue l'animazione di uscita corretta in base alla schermata visibile.
   *
   * Se il form e' aperto anima l'uscita del form, altrimenti anima
   * l'uscita del contenuto contatti principale.
   *
   * @returns Promise<void> Promise risolta quando l'uscita e' terminata.
   */
  animaUscita(): Promise<void> {
    if (this.mostraForm && this.formContenuto?.nativeElement) {
      return this.contattiAnimazioni.uscita(this.formContenuto.nativeElement, {
        titleSelector: 'h2',
        rowSelector: '.campo-wrapper, .form-riga-doppia, .form-bottoni',
      }); // faccio uscire il form se in questo momento e' aperto
    }

    if (!this.contattiContenuto?.nativeElement) return Promise.resolve(); // risolvo subito se il contenuto non esiste

    return this.contattiAnimazioni.animaUscita(
      this.contattiContenuto.nativeElement,
    ); // faccio uscire il contenuto principale dei contatti
  }
}
