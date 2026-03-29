// servizio che costruisce e gestisce i form dell'iscrizione multi-step, caricando anche nazioni e comuni da API per i campi condivisi tra i vari step

import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';

@Injectable()
export class IscrizioneFormService {
  reactiveForm!: FormGroup; // tengo il form del primo step con i dati anagrafici principali
  reactiveFormStep2!: FormGroup; // tengo il form del secondo step con i dati di residenza o domicilio
  reactiveFormStep3!: FormGroup; // tengo il form del terzo step con contatti e credenziali finali

  nazioni: any[] = []; // conservo l'elenco delle nazioni caricate da API per usarlo nei campi a tendina
  comuni: any[] = []; // conservo l'elenco dei comuni caricato da API per usarlo nei campi a tendina

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private cambioLinguaService: CambioLinguaService,
  ) {
    this.costruisciForms(); // costruisco subito tutti i form dei vari step quando il servizio viene creato
  }

  /**
   * Carica da API l'elenco delle nazioni disponibili.
   * - Legge la lingua corrente
   * - Ordina le nazioni usando il nome corretto in base alla lingua attiva
   * - Salva il risultato nell'array condiviso nazioni
   *
   * @returns void
   */
  caricaNazioni(): void {
    this.apiService.getNazioni().subscribe((rit) => {
      // chiamo le API per recuperare l'elenco delle nazioni
      const lingua = this.cambioLinguaService.leggiCodiceLingua(); // leggo il codice lingua corrente per ordinare nel modo corretto
      this.nazioni = (rit.data ?? []).sort(
        (
          a: any,
          b: any, // salvo le nazioni ordinate, usando array vuoto se il backend non restituisce dati
        ) =>
          (lingua === 'it' ? a.nazione_it : (a.nazione_en ?? '')) // scelgo il nome della nazione in italiano oppure inglese per il primo elemento
            .localeCompare(
              lingua === 'it' ? b.nazione_it : (b.nazione_en ?? ''),
              lingua,
            ), // confronto col secondo elemento usando la lingua corrente
      );
    });
  }

  /**
   * Carica da API l'elenco dei comuni disponibili.
   * - Ordina i comuni alfabeticamente
   * - Salva il risultato nell'array condiviso comuni
   *
   * @returns void
   */
  caricaComuni(): void {
    this.apiService.getComuni().subscribe((rit) => {
      // chiamo le API per recuperare l'elenco dei comuni
      this.comuni = (rit.data ?? []).sort(
        (
          a: any,
          b: any, // salvo i comuni ordinati, usando array vuoto se non arrivano dati
        ) => (a.comune ?? '').localeCompare(b.comune ?? '', 'it'), // ordino alfabeticamente usando il nome del comune in italiano
      );
    });
  }

  /**
   * Costruisce tutti i form group usati nei tre step dell'iscrizione.
   * - Primo step: dati anagrafici
   * - Secondo step: dati di indirizzo
   * - Terzo step: contatti e password
   *
   * @returns void
   */
  private costruisciForms(): void {
    this.reactiveForm = this.fb.group({
      // costruisco il form del primo step con i dati anagrafici
      nome: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(50),
          Validators.pattern(/^[A-Za-zÀ-ÿ\s'-]+$/),
        ],
      ], // definisco il campo nome con obbligatorieta', lunghezze e caratteri ammessi
      cognome: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(50),
          Validators.pattern(/^[A-Za-zÀ-ÿ\s'-]+$/),
        ],
      ], // definisco il campo cognome con obbligatorieta', lunghezze e caratteri ammessi
      dataGg: [
        '',
        [Validators.required, Validators.pattern(/^(0[1-9]|[12]\d|3[01])$/)],
      ], // definisco il giorno di nascita con formato a due cifre valido
      dataMm: [
        '',
        [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])$/)],
      ], // definisco il mese di nascita con formato a due cifre valido
      dataAaaa: [
        '',
        [
          Validators.required,
          Validators.pattern(/^\d{4}$/),
          this.validaAnnoNascita(),
        ],
      ], // definisco l'anno di nascita con formato a quattro cifre e validatore custom
      sesso: ['', Validators.required], // definisco il campo sesso come obbligatorio
      paese: ['IT', Validators.required], // imposto come default il paese IT e lo rendo obbligatorio
      comune: ['', Validators.required], // definisco il comune come obbligatorio
      citta: [''], // tengo il campo citta' libero senza validatori obbligatori
      codiceFiscale: [
        '',
        [
          Validators.required,
          Validators.pattern(
            /^[A-Za-z]{6}\d{2}[AaBbCcDdEeHhLlMmPpRrSsTt](0[1-9]|[12]\d|3[01]|4[1-9]|[56]\d|7[01])[A-Za-z]\d{3}[A-Za-z]$/,
          ),
        ],
      ], // definisco il codice fiscale come obbligatorio e con pattern completo
    });

    this.reactiveFormStep2 = this.fb.group({
      // costruisco il form del secondo step con i dati di indirizzo
      nazioneD: ['IT', Validators.required], // imposto come default la nazione IT e la rendo obbligatoria
      comuneD: ['', Validators.required], // definisco il comune di destinazione come obbligatorio
      cittaD: [''], // tengo il campo citta' aggiuntiva senza obbligatorieta'
      via: [
        '',
        [
          Validators.minLength(3),
          Validators.maxLength(100),
          Validators.pattern(/^[A-Za-zÀ-ÿ0-9\s'.,°\/\-]+$/),
        ],
      ], // definisco la via con limiti di lunghezza e caratteri ammessi
      civico: [
        '',
        [Validators.maxLength(10), Validators.pattern(/^\d+[A-Za-z0-9\/\-]*$/)],
      ], // definisco il civico con lunghezza massima e pattern consentito
      dettagli: ['', [Validators.minLength(3), Validators.maxLength(200)]], // definisco i dettagli aggiuntivi con limiti di lunghezza
      provinciaD: [
        '',
        [Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)],
      ], // definisco la provincia come obbligatoria e composta da due lettere
      cap: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]], // definisco il CAP come obbligatorio e composto da cinque cifre
    });

    this.reactiveFormStep3 = this.fb.group({
      // costruisco il form del terzo step con contatti e credenziali
      telefono: [
        '',
        [
          Validators.minLength(6),
          Validators.maxLength(20),
          Validators.pattern(/^\+?[\d\s\-().]{6,20}$/),
        ],
      ], // definisco il telefono con lunghezze minime e massime e pattern flessibile
      emailSecondaria: [
        '',
        [
          Validators.email,
          Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/),
          Validators.maxLength(40),
        ],
      ], // definisco l'email secondaria con validazione email e lunghezza massima
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(30),
          Validators.pattern(/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/),
        ],
      ], // definisco la password come obbligatoria con requisiti minimi di sicurezza
      confermaPassword: ['', Validators.required], // definisco il campo di conferma password come obbligatorio
    });
  }

  /**
   * Crea il validatore personalizzato per l'anno di nascita.
   * - Se il valore non e' numerico non segnala errori qui
   * - Segnala errore se l'anno e' troppo vecchio
   * - Segnala errore se l'anno e' troppo recente
   *
   * @returns (control: AbstractControl) => ValidationErrors | null Funzione validatrice da applicare al controllo.
   */
  private validaAnnoNascita() {
    return (control: AbstractControl): ValidationErrors | null => {
      // restituisco una funzione validatrice da applicare al controllo anno
      const anno = parseInt(control.value, 10); // provo a convertire il valore del controllo in numero intero
      if (isNaN(anno)) return null; // se non e' un numero lascio ad altri validator il compito di segnalare l'errore
      const oggi = new Date().getFullYear(); // leggo l'anno corrente per fare i confronti anagrafici
      if (anno < oggi - 200) return { annoTroppoVecchio: true }; // segnalo errore se l'anno risulta troppo lontano nel passato
      if (anno > oggi - 5) return { annoTroppoGiovane: true }; // segnalo errore se l'anno risulta troppo recente
      return null; // se tutti i controlli passano considero valido il campo
    };
  }
}
