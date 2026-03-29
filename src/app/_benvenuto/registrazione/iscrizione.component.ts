// componente che gestisce tutto il flusso della registrazione multi-step: caricamento dati iniziali, animazioni tra step, controllo password, scelta piano finale e raccolta dei dati conclusivi

import { Component, OnInit, AfterViewInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import gsap from 'gsap';
import { UtilityService } from '../login/_login_service/login_utility.service';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { SaturnoService } from 'src/app/_servizi_globali/animazioni_saturno/three/saturno.service';
import { SaturnoRouteAnimazioniService } from 'src/app/_servizi_globali/animazioni_saturno/gsap/saturno-route-animazioni.service';
import { SaturnoPosizioniService } from 'src/app/_servizi_globali/animazioni_saturno/saturno_posizioni.service';
import { IscrizioneFormService } from './iscrizione_services/iscrizione-form.service';
import { IscrizioneStep1Service } from './iscrizione_services/iscrizione-step1.service';
import { IscrizioneStep2Service } from './iscrizione_services/iscrizione-step2.service';
import { calcolaRobustezzaPassword } from './iscrizione_helpers/password.helper';
import { animaEntrata, animaEntrataStep2, animaUscita, animaSfocatura, resetElementiStep } from './iscrizione_helpers/animazioni.helper';
import { Datepicker } from 'vanillajs-datepicker';
import it from 'vanillajs-datepicker/locales/it';

(Datepicker as any).locales.it = (it as any).it; // registro manualmente la localizzazione italiana del datepicker esterno

const CHIAVE_PAGINA_REGISTRAZIONE = 'pagina_registrazione'; // la chiave usata in sessionStorage per ricordare che l'utente si trova nella pagina registrazione

@Component({
  selector: 'app-iscrizione',
  templateUrl: './iscrizione.component.html',
  styleUrls: ['./iscrizione.component.scss'],
  providers: [
    IscrizioneFormService,
    IscrizioneStep1Service,
    IscrizioneStep2Service,
  ], // fornisco al componente istanze dedicate dei service dei form e dei vari step
})
export class IscrizioneComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly s1 = this.step1; // riferimento corto al service del primo step
  readonly s2 = this.step2; // riferimento corto al service del secondo step
  readonly sf = this.forms; // riferimento corto al service che contiene i form e i dati condivisi

  stepAttuale = 1; // il numero dello step attualmente visibile
  formInviato = false; // flag che mi dice se il form del primo step e' gia' stato inviato almeno una volta
  formInviatoStep2 = false; // flag che mi dice se il form del secondo step e' gia' stato inviato almeno una volta
  formInviatoStep3 = false; // flag che mi dice se il form del terzo step e' gia' stato inviato almeno una volta
  emailUtente = ''; // l'email passata dalla pagina precedente tramite state di navigazione
  pianoSelezionato: 'base' | 'pro' | null = null; // il piano scelto nello step finale

  mostraPassword = false; // flag che decide se mostrare in chiaro la password
  mostraConfermaPassword = false; // flag che decide se mostrare in chiaro la conferma password
  errorePasswordNonCombacia = false; // flag che segnala il caso in cui password e conferma password non coincidono
  passwordRobustezza: 0 | 1 | 2 | 3 = 0; // il livello di robustezza calcolato per la password
  passwordEntropyPerc = 0; // la percentuale di entropia calcolata per la password

  private paroleComuni: string[] = []; // conservo l'elenco di parole comuni usate per penalizzare la robustezza della password
  private subLingua?: Subscription; // la sottoscrizione al cambio lingua per poterla chiudere in destroy

  /**
   * Restituisce il colore dinamico della barra di robustezza password.
   * - Per valori sotto 50 tende dal rosso verso il giallo
   * - Per valori sopra 50 tende dal giallo verso un arancione piu' stabile
   *
   * @returns string Colore CSS in formato rgb(...).
   */
  get pwdColore(): string {
    const p = this.passwordEntropyPerc; // leggo la percentuale di entropia corrente
    if (p < 50) return `rgb(255,${Math.round((p / 50) * 255)},0)`; // sotto 50 aumento progressivamente il verde partendo dal rosso
    return `rgb(${Math.round((1 - (p - 50) / 50) * 255)},180,0)`; // sopra 50 riduco progressivamente il rosso mantenendo un tono caldo
  }

  /**
   * Mi dice se nella password corrente manca almeno una lettera maiuscola.
   *
   * @returns boolean True se non e' presente nessuna maiuscola.
   */
  get pwdMancaMaiuscola(): boolean {
    return !/[A-Z]/.test(
      this.forms.reactiveFormStep3?.get('password')?.value ?? '',
    );
  } // controllo se il valore attuale della password contiene almeno una maiuscola

  /**
   * Mi dice se nella password corrente manca almeno una cifra.
   *
   * @returns boolean True se non e' presente nessun numero.
   */
  get pwdMancaNumero(): boolean {
    return !/\d/.test(
      this.forms.reactiveFormStep3?.get('password')?.value ?? '',
    );
  } // controllo se il valore attuale della password contiene almeno un numero

  /**
   * Mi dice se nella password corrente manca almeno un simbolo speciale.
   *
   * @returns boolean True se non e' presente nessun simbolo speciale.
   */
  get pwdMancaSimbolo(): boolean {
    return !/[^A-Za-z0-9]/.test(
      this.forms.reactiveFormStep3?.get('password')?.value ?? '',
    );
  } // controllo se il valore attuale della password contiene almeno un simbolo non alfanumerico

  constructor(
    public cambioLinguaService: CambioLinguaService,
    private cdr: ChangeDetectorRef,
    private saturnoService: SaturnoService,
    private saturnoRouteAnimazioniService: SaturnoRouteAnimazioniService,
    private saturnoPosizioniService: SaturnoPosizioniService,
    public forms: IscrizioneFormService,
    public step1: IscrizioneStep1Service,
    public step2: IscrizioneStep2Service,
  ) {}

  /**
   * Chiude tutti i dropdown custom quando l'utente clicca in qualsiasi punto del documento.
   *
   * @returns void
   */
  @HostListener('document:click')
  chiudiDropdown(): void {
    this.step1.chiudiDropdown(); // chiedo al service del primo step di chiudere i suoi dropdown
    this.step2.chiudiDropdown(); // chiedo al service del secondo step di chiudere i suoi dropdown
  }

  /**
   * Metodo chiamato automaticamente all'inizializzazione del componente.
   * - Salva in sessionStorage che l'utente e' nella pagina registrazione
   * - Legge l'email passata via state dalla pagina precedente
   * - Aggiorna i prezzi iniziali del piano in base al paese di domicilio
   * - Carica il file delle parole comuni per il controllo password
   * - Avvia il caricamento di nazioni e comuni
   * - Si sottoscrive ai cambi lingua per aggiornare la lingua del datepicker
   *
   * @returns void
   */
  ngOnInit(): void {
    try {
      sessionStorage.setItem(CHIAVE_PAGINA_REGISTRAZIONE, '1');
    } catch {} // provo a salvare in sessionStorage un flag che identifica la pagina registrazione
    this.emailUtente = history.state?.email ?? ''; // leggo l'email passata nella navigazione precedente oppure stringa vuota
    this.step2.aggiornaPrezzi(this.step2.paeseDomValore); // aggiorno subito i prezzi in base al paese di domicilio iniziale

    fetch('assets/common_words.json') // carico il file locale con le parole comuni da penalizzare nel controllo password
      .then((r) => r.json()) // trasformo la risposta in JSON
      .then((data: { commonWords: string[] }) => {
        this.paroleComuni = data.commonWords.map((w) => w.toLowerCase()); // salvo tutte le parole in minuscolo per confrontarle piu' facilmente
      })
      .catch(() => {
        this.paroleComuni = [];
      }); // se il file non viene caricato uso una lista vuota

    this.forms.caricaNazioni(); // avvio il caricamento delle nazioni usate nei select
    this.forms.caricaComuni(); // avvio il caricamento dei comuni usati nei select

    this.subLingua = this.cambioLinguaService.cambioLinguaApplicata$.subscribe(
      ({ codice }) => {
        this.step1.datepicker?.setOptions({
          language: codice === 'it' ? 'it' : 'en',
        }); // quando cambia lingua aggiorno la lingua del datepicker se e' gia' inizializzato
      },
    );
  }

  /**
   * Metodo chiamato automaticamente dopo il rendering della view.
   * - Nasconde sottotitolo e indicatore di scroll
   * - Avvia l'animazione iniziale del primo step
   * - Inizializza il datepicker con la lingua corrente
   * - Attiva la sfocatura sullo sfondo
   *
   * @returns void
   */
  ngAfterViewInit(): void {
    UtilityService.nascondiSottotitoloEScrol(); // nascondo sottotitolo e indicatore di scroll in questa pagina
    animaEntrata(); // avvio l'animazione di entrata iniziale del primo step
    this.step1.inizializzaDatepicker(
      this.cambioLinguaService.leggiCodiceLingua(),
    ); // inizializzo il datepicker con la lingua attuale
    animaSfocatura(true); // faccio comparire lo strato di sfocatura sullo sfondo
  }

  /**
   * Metodo chiamato automaticamente quando il componente viene distrutto.
   * Serve a chiudere la sottoscrizione al cambio lingua.
   *
   * @returns void
   */
  ngOnDestroy(): void {
    this.subLingua?.unsubscribe(); // se esiste la sottoscrizione al cambio lingua la chiudo
  }

  /**
   * Gestisce il passaggio dal primo al secondo step.
   * - Segna il form del primo step come inviato
   * - Se non e' valido marca tutti i campi come toccati e si ferma
   * - Se e' valido esegue l'uscita animata
   * - Passa allo step 2 e avvia la nuova entrata animata
   *
   * @returns void
   */
  avanti(): void {
    this.formInviato = true; // segno che il form del primo step e' stato inviato almeno una volta
    if (this.forms.reactiveForm.invalid) {
      this.forms.reactiveForm.markAllAsTouched();
      return;
    } // se il form non e' valido marco tutto come toccato e mi fermo
    animaUscita().then(() => {
      this.stepAttuale = 2; // porto l'interfaccia al secondo step
      this.cdr.detectChanges(); // forzo l'aggiornamento della view per renderizzare il nuovo step
      resetElementiStep(); // riporto gli elementi del nuovo step allo stato iniziale prima dell'entrata
      setTimeout(() => animaEntrataStep2(), 16); // avvio l'animazione di entrata con un leggero rinvio al frame successivo
    });
  }

  /**
   * Gestisce il passaggio dal secondo al terzo step.
   * - Segna il form del secondo step come inviato
   * - Se non e' valido marca tutti i campi come toccati e si ferma
   * - Verifica la coerenza dell'indirizzo italiano
   * - In caso di incoerenza mostra errore e flash di Saturno
   * - Se tutto e' corretto passa allo step 3 con animazione
   *
   * @returns void
   */
  avanti2(): void {
    this.formInviatoStep2 = true; // segno che il form del secondo step e' stato inviato almeno una volta
    if (this.forms.reactiveFormStep2.invalid) {
      this.forms.reactiveFormStep2.markAllAsTouched();
      return;
    } // se il form non e' valido marco tutto come toccato e mi fermo
    if (!this.step2.verificaCoerenzaIndirizzo()) {
      this.step2.erroreCoerenzaIndirizzo = true; // accendo il flag che segnala incoerenza tra comune, provincia e CAP
      this.saturnoService.flashErrorLight(); // faccio lampeggiare Saturno come feedback di errore
      return; // mi fermo senza avanzare di step
    }
    this.step2.erroreCoerenzaIndirizzo = false; // se la verifica passa spengo l'eventuale errore precedente
    animaUscita().then(() => {
      this.stepAttuale = 3; // porto l'interfaccia al terzo step
      this.cdr.detectChanges(); // aggiorno la view per renderizzare il nuovo step
      resetElementiStep(); // riporto gli elementi allo stato iniziale prima della nuova entrata
      setTimeout(() => animaEntrataStep2(), 16); // avvio l'animazione di entrata del nuovo step
    });
  }

  /**
   * Gestisce il passaggio dal terzo al quarto step.
   * - Segna il form del terzo step come inviato
   * - Se non e' valido marca tutti i campi come toccati e si ferma
   * - Controlla che password e conferma password coincidano
   * - In caso di errore mostra feedback visivo
   * - Se tutto e' corretto muove la scena di Saturno, toglie la sfocatura
   *   e passa allo step 4 con animazione dedicata
   *
   * @returns void
   */
  avanti3(): void {
    this.formInviatoStep3 = true; // segno che il form del terzo step e' stato inviato almeno una volta
    this.errorePasswordNonCombacia = false; // resetto l'errore di mismatch password prima dei controlli
    if (this.forms.reactiveFormStep3.invalid) {
      this.forms.reactiveFormStep3.markAllAsTouched();
      return;
    } // se il form non e' valido marco tutto come toccato e mi fermo
    const pwd = this.forms.reactiveFormStep3.get('password')!.value; // leggo il valore della password
    const conf = this.forms.reactiveFormStep3.get('confermaPassword')!.value; // leggo il valore della conferma password
    if (pwd !== conf) {
      this.errorePasswordNonCombacia = true;
      this.saturnoService.flashErrorLight();
      return;
    } // se i due valori non coincidono segnalo l'errore e mi fermo

    const scene = this.saturnoService.getScene(); // recupero la scena three collegata a Saturno
    const light = this.saturnoService.getDirectionalLight(); // recupero la luce direzionale collegata a Saturno
    if (scene)
      this.saturnoRouteAnimazioniService.animaVerso(
        scene,
        'LOGIN_LATERALE',
        0.9,
        light ?? undefined,
      ); // se la scena esiste la animo verso la posizione definita per il login laterale
    animaSfocatura(false); // faccio scomparire la sfocatura dello sfondo

    animaUscita().then(() => {
      this.stepAttuale = 4; // porto l'interfaccia allo step finale di scelta piano
      this.cdr.detectChanges(); // aggiorno la view per renderizzare il nuovo step
      const righe = document.querySelectorAll('.campo-animato'); // recupero tutti gli elementi che devono comparire con animazione nello step finale
      gsap.set(righe, {
        opacity: 0,
        scaleX: 0,
        transformOrigin: 'center center',
      }); // imposto gli elementi finali invisibili e chiusi orizzontalmente
      setTimeout(
        () =>
          gsap.to(righe, {
            opacity: 1,
            scaleX: 1,
            duration: 0.9,
            ease: 'power2.out',
            stagger: 0.12,
          }),
        16,
      ); // faccio comparire e aprire gli elementi con una nuova animazione
    });
  }

  /**
   * Gestisce la conferma finale della registrazione.
   * - Legge i valori dei tre form
   * - Calcola hash SHA-512 di email e password
   * - Stampa in console tutti i dati raccolti
   *
   * @returns void
   */
  avanti4(): void {
    const f1 = this.forms.reactiveForm.value; // leggo tutti i valori raccolti nel primo step
    const f2 = this.forms.reactiveFormStep2.value; // leggo tutti i valori raccolti nel secondo step
    const f3 = this.forms.reactiveFormStep3.value; // leggo tutti i valori raccolti nel terzo step
    Promise.all([this.sha512(this.emailUtente), this.sha512(f3.password)]) // calcolo in parallelo l'hash dell'email e della password
      .then(([emailHash, passwordHash]) => {
        console.log('=== DATI REGISTRAZIONE ===', {
          nome: f1.nome,
          cognome: f1.cognome, // dati anagrafici base
          dataNascita: `${f1.dataGg}/${f1.dataMm}/${f1.dataAaaa}`, // data di nascita ricomposta in formato testuale
          sesso: f1.sesso,
          paeseNascita: f1.paese, // sesso e paese di nascita
          comuneNascita: f1.comune || f1.citta,
          codiceFiscale: f1.codiceFiscale, // luogo di nascita e codice fiscale
          paeseDomicilio: f2.nazioneD,
          comuneDomicilio: f2.comuneD || f2.cittaD, // dati del domicilio
          via: f2.via,
          civico: f2.civico,
          provinciaD: f2.provinciaD,
          cap: f2.cap,
          dettagli: f2.dettagli, // dettagli indirizzo
          telefono: f3.telefono,
          emailSecondaria: f3.emailSecondaria, // recapiti aggiuntivi
          piano: this.pianoSelezionato, // piano scelto nello step finale
          email_sha512: emailHash,
          password_sha512: passwordHash, // hash SHA-512 di email e password
        });
      });
  }

  /**
   * Gestisce il ritorno dal secondo al primo step.
   * - Esegue l'uscita animata
   * - Torna allo step 1
   * - Reimposta gli elementi e rilancia l'entrata iniziale
   *
   * @returns void
   */
  indietro(): void {
    animaUscita().then(() => {
      this.stepAttuale = 1; // torno al primo step
      this.cdr.detectChanges(); // aggiorno la view per renderizzare lo step corretto
      resetElementiStep(); // riporto gli elementi allo stato iniziale
      setTimeout(() => animaEntrata(), 16); // rilancio l'animazione di entrata del primo step
    });
  }

  /**
   * Gestisce il ritorno dal terzo al secondo step.
   * - Esegue l'uscita animata
   * - Torna allo step 2
   * - Reimposta gli elementi e rilancia l'entrata del secondo step
   *
   * @returns void
   */
  indietro2(): void {
    animaUscita().then(() => {
      this.stepAttuale = 2; // torno al secondo step
      this.cdr.detectChanges(); // aggiorno la view per renderizzare lo step corretto
      resetElementiStep(); // riporto gli elementi allo stato iniziale
      setTimeout(() => animaEntrataStep2(), 16); // rilancio l'animazione di entrata del secondo step
    });
  }

  /**
   * Gestisce il ritorno dallo step finale al terzo step.
   * - Riposiziona la scena di Saturno verso la posa della registrazione bassa
   * - Riattiva la sfocatura
   * - Esegue l'uscita animata dello step finale
   * - Torna allo step 3 e rilancia l'entrata animata
   *
   * @returns void
   */
  indietro3(): void {
    const scene = this.saturnoService.getScene(); // recupero la scena three collegata a Saturno
    const light = this.saturnoService.getDirectionalLight(); // recupero la luce direzionale collegata a Saturno
    if (scene) {
      const pose = this.saturnoPosizioniService.getPose('REGISTRAZIONE_BASSO'); // recupero la posa da usare per il ritorno alla registrazione
      const dur = 1.3; // definisco la durata comune delle animazioni di rientro
      gsap.to(scene.position, {
        ...pose.position,
        duration: dur,
        ease: 'power2.inOut',
      }); // animo la posizione della scena verso la posa prevista
      gsap.to(scene.scale, {
        ...pose.scale,
        duration: dur,
        ease: 'power2.inOut',
      }); // animo la scala della scena verso la posa prevista
      gsap.to(scene.rotation, {
        ...pose.rotation,
        y: pose.rotation.y + Math.PI * 2, // aggiungo un giro completo sull'asse y prima di fermarmi alla rotazione finale
        duration: dur,
        ease: 'power1.inOut',
        overwrite: true,
        onComplete: () => {
          scene.rotation.y = pose.rotation.y;
        }, // a fine animazione riallineo esattamente la rotazione y desiderata
      });
      if (light)
        gsap.to(light.position, {
          z: 10.1001,
          duration: dur,
          ease: 'power2.inOut',
        }); // se la luce esiste animo anche la sua posizione z
    }
    animaSfocatura(true); // riattivo la sfocatura dello sfondo
    animaUscita().then(() => {
      this.stepAttuale = 3; // torno al terzo step
      this.cdr.detectChanges(); // aggiorno la view per renderizzare lo step corretto
      resetElementiStep(); // riporto gli elementi allo stato iniziale
      setTimeout(() => animaEntrataStep2(), 16); // rilancio l'animazione di entrata del terzo step
    });
  }

  /**
   * Aggiorna lo stato di robustezza della password mentre l'utente scrive.
   * - Calcola robustezza ed entropia usando l'helper dedicato
   * - Salva i risultati nello stato del componente
   *
   * @param pwd string Password corrente digitata dall'utente.
   * @returns void
   */
  onPasswordInput(pwd: string): void {
    const rit = calcolaRobustezzaPassword(pwd, this.paroleComuni); // calcolo robustezza ed entropia della password corrente
    this.passwordRobustezza = rit.robustezza; // salvo il livello finale di robustezza
    this.passwordEntropyPerc = rit.entropyPerc; // salvo la percentuale di entropia
  }

  /**
   * Mostra o nasconde la password oppure la conferma password.
   * - Decide quale input gestire in base al parametro
   * - Salva la posizione del cursore
   * - Inverte il flag di visibilita'
   * - Ripristina focus e selezione del testo
   *
   * @param campo 'password' | 'conferma' Campo su cui agire.
   * @returns void
   */
  toggleVisibilitaPassword(campo: 'password' | 'conferma'): void {
    const id = campo === 'password' ? 'password_reg' : 'conferma_password_reg'; // scelgo l'id dell'input corretto in base al campo richiesto
    const input = document.getElementById(id) as HTMLInputElement; // recupero dal DOM l'input reale su cui devo agire
    const start = input?.selectionStart ?? null; // salvo la posizione iniziale del cursore o della selezione
    const end = input?.selectionEnd ?? null; // salvo la posizione finale del cursore o della selezione
    if (campo === 'password')
      this.mostraPassword = !this.mostraPassword; // se sto agendo sulla password inverto il relativo flag di visibilita'
    else this.mostraConfermaPassword = !this.mostraConfermaPassword; // altrimenti inverto il flag della conferma password
    setTimeout(() => {
      input?.focus();
      if (start !== null && end !== null) input?.setSelectionRange(start, end);
    }, 0); // dopo l'aggiornamento della view ripristino focus e selezione del testo
  }

  /**
   * Calcola l'hash SHA-512 di una stringa.
   * - Converte il testo in bytes
   * - Usa Web Crypto API per calcolare il digest
   * - Restituisce il risultato in formato esadecimale
   *
   * @param testo string Testo da trasformare in hash.
   * @returns Promise<string> Hash SHA-512 in formato esadecimale.
   */
  private async sha512(testo: string): Promise<string> {
    const data = new TextEncoder().encode(testo); // converto il testo in un array di byte UTF-8
    const hashBuffer = await crypto.subtle.digest('SHA-512', data); // calcolo il digest SHA-512 usando la Web Crypto API
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0')) // trasformo ogni byte in una coppia esadecimale
      .join(''); // unisco tutto in una singola stringa finale
  }
}
