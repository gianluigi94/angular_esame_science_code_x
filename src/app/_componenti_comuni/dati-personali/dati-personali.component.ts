// Componente dati personali che gestisce apertura, chiusura, caricamento dati, animazioni e form messaggi dell'area profilo visibile solo quando l'utente e' autenticato.
import { Component, OnDestroy, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription, take } from 'rxjs';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import gsap from 'gsap';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { IRispostaServer } from 'src/app/_interfacce/IRispostaServer.interface';
import { Authservice } from 'src/app/_benvenuto/login/_login_service/auth.service';
import { ContattiAnimazioniService } from 'src/app/_servizi_globali/animazioni_saturno/gsap/contatti_animazioni.service';

@Component({
  selector: 'app-dati-personali',
  templateUrl: './dati-personali.component.html',
  styleUrls: ['./dati-personali.component.scss'],
})
export class DatiPersonaliComponent implements OnInit, AfterViewInit, OnDestroy {
  visibile = false; // tengo lo stato di visibilita' del pannello dati personali
  mostraForm = false; // decido se mostrare il form al posto del contenuto principale
  messaggioForm: FormGroup; // tengo il form reattivo del messaggio
  formInviatoMsg = false; // segno se ho gia' tentato l'invio del form

  mail: string = ''; // tengo la mail ricevuta dal backend
  indirizzo: string = ''; // tengo l'indirizzo ricevuto dal backend

  @ViewChild('datiPersonaliContenuto', { static: false })
  datiPersonaliContenuto?: ElementRef<HTMLElement>;

  @ViewChild('formContenuto', { static: false })
  formContenuto?: ElementRef<HTMLElement>;

  sub = new Subscription(); // mi salvo le sottoscrizioni per chiuderle in destroy
  viewReady = false; // segno quando il DOM necessario e' pronto
  datiReady = false; // segno quando i dati personali sono stati caricati

  onApri = () => {
    if (!this.isLoggato()) return; // esco se l'utente non e' autenticato
    if (this.visibile) return; // esco se il pannello e' gia' visibile

    this.visibile = true; // rendo visibile il pannello
    this.viewReady = false; // resetto lo stato di view pronta
    this.datiReady = false; // resetto lo stato di dati pronti

    requestAnimationFrame(() => {
      if (this.datiPersonaliContenuto?.nativeElement) {
        this.contattiAnimazioni.prepara(this.datiPersonaliContenuto.nativeElement); // preparo il contenuto appena il DOM esiste
        this.viewReady = true; // segno che la view e' pronta
        this.avviaAnimazioniSePronto(); // provo ad avviare le animazioni se anche i dati sono pronti
      }
    });

    this.caricaDati(); // avvio il caricamento dei dati personali
  };

  constructor(
    private authService: Authservice,
    private apiService: ApiService,
    private contattiAnimazioni: ContattiAnimazioniService,
    private cambioLingua: CambioLinguaService,
    private fb: FormBuilder,
  ) {
    // validazioni form
    this.messaggioForm = this.fb.group({
      nome:      ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50), Validators.pattern(/^[A-Za-zÀ-ÿ\s'-]+$/)]],
      cognome:   ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50), Validators.pattern(/^[A-Za-zÀ-ÿ\s'-]+$/)]],
      tipologia: ['', Validators.required],
      messaggio: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
    });
  }

  /**
   * Metodo eseguito all'inizializzazione del componente.
   *
   * Registra i listener globali di apertura e chiusura, osserva
   * lo stato di autenticazione e reagisce al cambio lingua
   * rieseguendo le animazioni quando il pannello e' visibile.
   *
   * @returns void
   */
  ngOnInit(): void {
    window.addEventListener('apri-dati-personali', this.onApri); // mi aggancio all'evento globale di apertura
    window.addEventListener('chiudi-dati-personali', this.onChiudi); // mi aggancio all'evento globale di chiusura

    this.sub.add(
      this.authService.leggiObsAuth().subscribe(() => {
        if (this.visibile && !this.isLoggato()) this.visibile = false; // nascondo il pannello se era visibile e l'utente non e' piu' loggato
      })
    );

    this.sub.add(
      this.cambioLingua.cambioLinguaApplicata$.subscribe(() => {
        if (!this.visibile) return; // esco se il pannello non e' visibile

        const el = this.datiPersonaliContenuto?.nativeElement; // recupero il contenitore principale
        if (!el) return; // esco se il contenitore non esiste

        gsap.killTweensOf(el.querySelectorAll('h2, .contact-list .row')); // fermo eventuali tween ancora attivi
        gsap.set(el.querySelectorAll('h2, .contact-list .row'), { opacity: 0, x: 26 }); // riporto gli elementi allo stato iniziale
        requestAnimationFrame(() => this.contattiAnimazioni.ingresso(el)); // rilancio l'animazione di ingresso
      })
    );
  }

  /**
   * Metodo eseguito alla distruzione del componente.
   *
   * Rimuove i listener globali e chiude tutte le sottoscrizioni.
   *
   * @returns void
   */
  ngOnDestroy(): void {
    window.removeEventListener('apri-dati-personali', this.onApri); // rimuovo il listener globale di apertura
    window.removeEventListener('chiudi-dati-personali', this.onChiudi); // rimuovo il listener globale di chiusura
    this.sub.unsubscribe(); // chiudo tutte le sottoscrizioni registrate
  }

  /**
   * Verifica se l'utente corrente risulta autenticato.
   *
   * @returns boolean True se esiste un token valido nello stato auth, false altrimenti.
   */
  isLoggato(): boolean {
    return !!this.authService.leggiObsAuth().value?.tk; // controllo se nello stato auth e' presente un token
  }

  /**
   * Carica i dati personali dal backend.
   *
   * Salva mail e indirizzo ricevuti e aggiorna lo stato
   * di readiness dei dati.
   *
   * @returns void
   */
  caricaDati(): void {
    this.apiService.getDatiPersonali()
      .pipe(take(1))
      .subscribe((rit: IRispostaServer) => {
        const dato = rit?.data?.[0]; // recupero il primo record della risposta
        this.mail = dato?.mail || ''; // salvo la mail o fallback vuoto
        this.indirizzo = dato?.indirizzo || ''; // salvo l'indirizzo o fallback vuoto
        this.datiReady = true; // segno che i dati sono pronti
        this.avviaAnimazioniSePronto(); // provo ad avviare le animazioni se anche la view e' pronta
      });
  }

  /**
   * Metodo eseguito dopo il rendering della vista del componente.
   *
   * Se il pannello risulta gia' visibile prepara subito
   * il contenuto e prova ad avviare le animazioni.
   *
   * @returns void
   */
  ngAfterViewInit(): void {
    if (this.visibile && this.datiPersonaliContenuto?.nativeElement) {
      this.contattiAnimazioni.prepara(this.datiPersonaliContenuto.nativeElement); // preparo il contenuto se la view nasce gia' visibile
      this.viewReady = true; // segno che la view e' pronta
      this.avviaAnimazioniSePronto(); // provo ad avviare le animazioni se anche i dati sono pronti
    }
  }

  /**
   * Avvia le animazioni di ingresso solo quando tutte le condizioni sono soddisfatte.
   *
   * Richiede che il pannello sia visibile, che view e dati siano pronti
   * e che il contenitore principale esista.
   *
   * @returns void
   */
  avviaAnimazioniSePronto(): void {
    if (!this.visibile) return; // esco se il pannello non e' visibile
    if (!this.viewReady || !this.datiReady) return; // esco finche' view e dati non sono pronti
    if (!this.datiPersonaliContenuto?.nativeElement) return; // esco se il contenitore non esiste

    requestAnimationFrame(() => {
      this.contattiAnimazioni.ingresso(this.datiPersonaliContenuto!.nativeElement); // faccio partire l'animazione di ingresso
    });
  }

  /**
   * Apre il form dopo l'uscita animata del contenuto principale.
   *
   * Nasconde il blocco dati personali, mostra il form
   * e ne avvia l'animazione di ingresso.
   *
   * @returns void
   */
  apriForm(): void {
    if (!this.datiPersonaliContenuto?.nativeElement) return; // esco se il contenuto principale non esiste

    this.contattiAnimazioni.uscita(this.datiPersonaliContenuto.nativeElement).then(() => {
      gsap.set(this.datiPersonaliContenuto!.nativeElement, { display: 'none' }); // nascondo il contenuto principale dopo l'uscita
      this.mostraForm = true; // mostro il form

      requestAnimationFrame(() => {
        if (!this.formContenuto?.nativeElement) return; // esco se il contenitore del form non esiste

        gsap.set(this.formContenuto.nativeElement, { opacity: 1, x: 0, pointerEvents: 'auto' }); // rendo il form visibile e interattivo
        this.contattiAnimazioni.prepara(this.formContenuto.nativeElement, {
          titleSelector: 'h2',
          rowSelector: '.campo-wrapper, .form-riga-doppia, .form-bottoni',
        }); // preparo lo stato iniziale animato del form

        requestAnimationFrame(() => {
          this.contattiAnimazioni.ingresso(this.formContenuto!.nativeElement, {
            titleSelector: 'h2',
            rowSelector: '.campo-wrapper, .form-riga-doppia, .form-bottoni',
          }); // faccio entrare il form
        });
      });
    });
  }

  /**
   * Chiude il form e ripristina il contenuto principale.
   *
   * Esegue l'uscita animata del form, resetta stato e campi
   * e rilancia l'ingresso del contenuto dati personali.
   *
   * @returns void
   */
  chiudiForm(): void {
    if (!this.formContenuto?.nativeElement) return; // esco se il contenitore del form non esiste

    this.contattiAnimazioni.uscita(this.formContenuto.nativeElement, {
      titleSelector: 'h2',
      rowSelector: '.campo-wrapper, .form-riga-doppia, .form-bottoni',
    }).then(() => {
      this.formInviatoMsg = false; // azzero il flag di invio del form
      this.messaggioForm.reset(); // pulisco i campi del form
      gsap.set(this.formContenuto!.nativeElement, { pointerEvents: 'none' }); // disattivo le interazioni sul form
      this.mostraForm = false; // nascondo il form

      if (!this.datiPersonaliContenuto?.nativeElement) return; // esco se il contenuto principale non esiste

      gsap.set(this.datiPersonaliContenuto.nativeElement, { display: 'block', opacity: 1 }); // ripristino il contenuto principale
      this.contattiAnimazioni.prepara(this.datiPersonaliContenuto.nativeElement); // preparo il contenuto principale per il nuovo ingresso

      requestAnimationFrame(() => {
        this.contattiAnimazioni.ingresso(this.datiPersonaliContenuto!.nativeElement); // faccio rientrare il contenuto principale
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
   * Chiude il pannello dati personali con animazione se possibile.
   *
   * Se il contenitore non esiste chiude subito e torna indietro
   * nella cronologia del browser.
   *
   * @returns void
   */
  chiudi(): void {
    const el = this.datiPersonaliContenuto?.nativeElement; // recupero il contenitore principale

    if (!el) {
      this.visibile = false; // nascondo subito il pannello se non ho il contenitore
      window.history.back(); // torno indietro nella cronologia
      return;
    }

    this.contattiAnimazioni.uscita(el).then(() => {
      this.visibile = false; // nascondo il pannello dopo l'uscita
      this.viewReady = false; // resetto lo stato di view pronta
      this.datiReady = false; // resetto lo stato di dati pronti
      window.history.back(); // torno indietro nella cronologia
    });
  }

  onChiudi = () => {
    if (!this.visibile) return; // esco se il pannello non e' visibile

    const animaEPoi = (el: HTMLElement, cfg?: any): Promise<void> => {
      return this.contattiAnimazioni.uscita(el, cfg).then(() => {
        this.visibile = false; // nascondo il pannello dopo l'uscita
        this.mostraForm = false; // richiudo il form
        this.viewReady = false; // resetto lo stato di view pronta
        this.datiReady = false; // resetto lo stato di dati pronti
      });
    };

    if (this.mostraForm && this.formContenuto?.nativeElement) {
      animaEPoi(this.formContenuto.nativeElement, {
        titleSelector: 'h2',
        rowSelector: '.campo-wrapper, .form-riga-doppia, .form-bottoni',
      }); // faccio uscire il form se in questo momento e' aperto
      return;
    }

    const el = this.datiPersonaliContenuto?.nativeElement; // recupero il contenitore principale
    if (!el) { this.visibile = false; return; } // chiudo subito se il contenitore non esiste
    animaEPoi(el); // faccio uscire il contenuto principale
  };
}
