// servizio che gestisce tutta la logica del primo step dell'iscrizione: dropdown custom, datepicker, selezioni guidate e calcolo automatico del codice fiscale

import { Injectable } from '@angular/core';
import { Validators } from '@angular/forms';
import { Datepicker } from 'vanillajs-datepicker';
import { TranslateService } from '@ngx-translate/core';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { IscrizioneFormService } from './iscrizione-form.service';
import { calcolaCodiceFiscaleAnagrafica } from '../iscrizione_helpers/anagrafica-codice-fiscale.helper';

@Injectable()
export class IscrizioneStep1Service {
  sessoAperto = false; // flag che mi dice se il dropdown del sesso e' aperto
  sessoValore = ''; // tengo il valore attualmente selezionato per il sesso
  indiceSesso = -1; // tengo l'indice evidenziato da tastiera dentro il menu del sesso

  cfValore = ''; // tengo il codice fiscale calcolato o inserito attualmente
  cfFlash = false; // flag usato per attivare l'effetto visivo di flash sul codice fiscale
  cfModificatoManualmente = false; // flag che mi dice se l'utente ha modificato a mano il codice fiscale

  paeseAperto = false; // flag che mi dice se il dropdown del paese di nascita e' aperto
  paeseValore = 'IT'; // tengo il codice ISO del paese di nascita selezionato
  filtroNazioni = ''; // tengo il testo scritto dall'utente per filtrare le nazioni
  indiceNazione = -1; // tengo l'indice evidenziato da tastiera nella lista nazioni

  comuneAperto = false; // flag che mi dice se il dropdown del comune di nascita e' aperto
  comuneValore = ''; // tengo il valore del comune di nascita selezionato
  filtroComuni = ''; // tengo il testo scritto dall'utente per filtrare i comuni
  indiceComune = -1; // tengo l'indice evidenziato da tastiera nella lista comuni

  datepicker: any; // tengo il riferimento all'istanza del datepicker esterno
  datepickerAperto = false; // flag che mi dice se il datepicker risulta aperto a video

  private _sessoFocusDaTab = false; // flag interno che uso per capire se il focus sul sesso arriva da TAB

  /**
   * Restituisce il form del primo step gia' costruito dal servizio condiviso.
   *
   * @returns FormGroup Form del primo step dell'iscrizione.
   */
  get form() {
    return this.fs.reactiveForm;
  } // espongo in modo comodo il form del primo step

  /**
   * Mi dice se il paese selezionato e' l'Italia.
   *
   * @returns boolean True se il paese corrente e' IT, altrimenti false.
   */
  get isItalia(): boolean {
    return this.paeseValore === 'IT';
  } // controllo rapidamente se la nascita e' in Italia

  /**
   * Restituisce l'elenco delle nazioni filtrato in base al testo digitato.
   * - Se non c'e' filtro restituisce tutte le nazioni
   * - Se c'e' filtro confronta sia il nome italiano sia quello inglese
   *
   * @returns any[] Elenco delle nazioni filtrate.
   */
  get nazioniFiltrate(): any[] {
    if (!this.filtroNazioni.trim()) return this.fs.nazioni; // se non ho scritto nulla restituisco tutte le nazioni disponibili
    const f = this.filtroNazioni.toLowerCase(); // porto il filtro in minuscolo per confrontarlo piu' facilmente
    return this.fs.nazioni.filter(
      (n) =>
        (n.nazione_it ?? '').toLowerCase().startsWith(f) || // controllo se il nome italiano inizia col filtro digitato
        (n.nazione_en ?? '').toLowerCase().startsWith(f), // oppure se il nome inglese inizia col filtro digitato
    );
  }

  /**
   * Restituisce l'elenco dei comuni filtrato in base al testo digitato.
   * - Se non c'e' filtro restituisce lista vuota
   * - Se c'e' filtro restituisce solo i primi 50 risultati
   *
   * @returns any[] Elenco dei comuni filtrati.
   */
  get comuniFiltrati(): any[] {
    if (!this.filtroComuni.trim()) return []; // se non ho scritto nulla non mostro nessun comune
    const f = this.filtroComuni.toLowerCase(); // porto il filtro in minuscolo per confrontarlo con i comuni
    return this.fs.comuni
      .filter((c) => (c.comune ?? '').toLowerCase().startsWith(f)) // tengo solo i comuni che iniziano con il testo digitato
      .slice(0, 50); // limito il risultato ai primi 50 elementi
  }

  constructor(
    private fs: IscrizioneFormService,
    private cambioLinguaService: CambioLinguaService,
    private translateService: TranslateService,
  ) {}

  /**
   * Restituisce la label tradotta da mostrare nel selettore del sesso.
   * - Se non ho ancora un valore selezionato mostra il placeholder
   * - Se ho un valore selezionato restituisce la traduzione corrispondente
   *
   * @returns string Testo da mostrare nel campo sesso.
   */
  sessoLabel(): string {
    if (!this.sessoValore)
      return this.translateService.instant(
        'ui.registrazione.sesso.placeholder',
      ); // se non ho selezionato nulla mostro il placeholder tradotto
    const map: Record<string, string> = {
      M: this.translateService.instant('ui.registrazione.sesso.maschio'), // traduco la voce maschio
      F: this.translateService.instant('ui.registrazione.sesso.femmina'), // traduco la voce femmina
      NS: this.translateService.instant(
        'ui.registrazione.sesso.non_specificato',
      ), // traduco la voce non specificato
    };
    return map[this.sessoValore] ?? ''; // restituisco la label associata al valore attuale
  }

  /**
   * Restituisce la label del paese di nascita in base alla lingua corrente.
   * - Se non ho ancora un valore mostra il placeholder
   * - Se trovo la nazione restituisco il nome nella lingua attiva
   *
   * @returns string Testo da mostrare nel campo paese.
   */
  paeseLabel(): string {
    if (!this.paeseValore)
      return this.translateService.instant(
        'ui.registrazione.placeholder.seleziona_paese',
      ); // se non ho un paese selezionato mostro il placeholder tradotto
    const nazione = this.fs.nazioni.find((n) => n.iso === this.paeseValore); // cerco la nazione corrispondente al codice ISO selezionato
    if (!nazione) return ''; // se non trovo la nazione restituisco stringa vuota
    return this.cambioLinguaService.leggiCodiceLingua() === 'it' // controllo la lingua corrente dell'app
      ? nazione.nazione_it // se sono in italiano mostro il nome italiano
      : nazione.nazione_en; // altrimenti mostro il nome inglese
  }

  /**
   * Restituisce la label del comune di nascita da mostrare nel selettore.
   * - Se c'e' un comune selezionato mostra quello
   * - Altrimenti mostra il placeholder tradotto
   *
   * @returns string Testo da mostrare nel campo comune.
   */
  comuneLabel(): string {
    return (
      this.comuneValore ||
      this.translateService.instant('ui.registrazione.comune.piccola')
    ); // mostro il comune selezionato oppure il placeholder tradotto
  }

  /**
   * Apre o chiude il dropdown del sesso.
   * - Blocca la propagazione del click
   * - Chiude gli altri dropdown quando apro questo
   * - Resetta l'indice tastiera quando lo chiudo
   *
   * @param event Event Evento del click sul selettore.
   * @returns void
   */
  toggleSesso(event: Event): void {
    event.stopPropagation(); // blocco la propagazione cosi' il click non chiude subito il dropdown
    this.sessoAperto = !this.sessoAperto; // inverto lo stato di apertura del menu sesso
    if (this.sessoAperto) {
      this.paeseAperto = false;
      this.comuneAperto = false;
    } // se apro il sesso chiudo paese e comune
    if (!this.sessoAperto) {
      this.indiceSesso = -1;
    } // se chiudo il sesso azzero l'indice navigato da tastiera
  }

  /**
   * Apre il dropdown del sesso solo quando il focus arriva tramite tastiera.
   * - Se il focus non arriva da TAB non fa nulla
   * - Se arriva da TAB apre il menu e chiude gli altri
   *
   * @param _event FocusEvent Evento di focus ricevuto dal campo.
   * @returns void
   */
  apriSessoSoloTastiera(_event: FocusEvent): void {
    if (!this._sessoFocusDaTab) return; // se il focus non arriva da TAB non apro nulla
    this._sessoFocusDaTab = false; // resetto subito il flag interno
    this.sessoAperto = true; // apro il dropdown del sesso
    this.paeseAperto = false; // chiudo il dropdown del paese
    this.comuneAperto = false; // chiudo il dropdown del comune
  }

  /**
   * Salva il sesso selezionato e aggiorna il form.
   * - Chiude il dropdown
   * - Marca il controllo come toccato
   * - Ricalcola il codice fiscale
   *
   * @param valore string Valore del sesso scelto.
   * @returns void
   */
  selezionaSesso(valore: string): void {
    this.sessoValore = valore; // salvo il valore di sesso selezionato
    this.sessoAperto = false; // chiudo il dropdown del sesso
    this.indiceSesso = -1; // azzero l'indice tastiera del menu
    this.form.get('sesso')!.setValue(valore); // aggiorno il controllo del form con il valore selezionato
    this.form.get('sesso')!.markAsTouched(); // marco il controllo come toccato
    this.calcolaCodiceFiscale(); // provo a ricalcolare il codice fiscale con il nuovo dato
  }

  /**
   * Gestisce la navigazione da tastiera nel dropdown del sesso.
   * - Freccia giu' apre o scende
   * - Freccia su risale
   * - Enter seleziona l'opzione corrente
   * - Escape chiude il dropdown
   *
   * @param event KeyboardEvent Evento tastiera ricevuto dal campo.
   * @returns void
   */
  navigaSesso(event: KeyboardEvent): void {
    const opzioni = ['M', 'F', 'NS']; // preparo l'elenco fisso delle opzioni del sesso
    if (event.key === 'ArrowDown') {
      event.preventDefault(); // blocco il comportamento nativo del browser
      if (!this.sessoAperto) {
        this.sessoAperto = true;
        this.paeseAperto = false;
        this.comuneAperto = false;
      } // se il menu non era aperto lo apro e chiudo gli altri
      this.indiceSesso = Math.min(this.indiceSesso + 1, opzioni.length - 1); // avanzo di una posizione senza superare l'ultima
    } else if (event.key === 'ArrowUp') {
      event.preventDefault(); // blocco il comportamento nativo del browser
      this.indiceSesso = Math.max(this.indiceSesso - 1, 0); // torno indietro di una posizione senza scendere sotto zero
    } else if (
      event.key === 'Enter' &&
      this.sessoAperto &&
      this.indiceSesso >= 0
    ) {
      event.preventDefault(); // blocco il comportamento nativo del browser
      this.selezionaSesso(opzioni[this.indiceSesso]); // seleziono la voce attualmente evidenziata
    } else if (event.key === 'Escape') {
      this.sessoAperto = false; // chiudo il dropdown del sesso
      this.indiceSesso = -1; // resetto l'indice tastiera
    }
  }

  /**
   * Apre o chiude il dropdown del paese di nascita.
   * - Blocca la propagazione del click
   * - Chiude gli altri dropdown
   * - Precarica il testo del filtro con la label attuale
   * - Sposta il focus sull'input del filtro
   *
   * @param event Event Evento del click sul selettore.
   * @returns void
   */
  togglePaese(event: Event): void {
    event.stopPropagation(); // blocco la propagazione cosi' il click non interferisce con altri listener
    this.paeseAperto = !this.paeseAperto; // inverto lo stato di apertura del menu paese
    if (this.paeseAperto) {
      this.sessoAperto = false; // se apro il paese chiudo il dropdown del sesso
      this.comuneAperto = false; // se apro il paese chiudo il dropdown del comune
      this.indiceNazione = -1; // resetto l'indice della lista nazioni
      this.filtroNazioni = this.paeseValore ? this.paeseLabel() : ''; // se ho gia' un paese selezionato precompilo il filtro con la sua label
      setTimeout(() => {
        const i = document.querySelector('.paese-input') as HTMLInputElement; // cerco l'input del filtro paese nel DOM
        if (i) {
          i.focus();
          i.select();
        } // se lo trovo gli do focus e seleziono tutto il testo
      }, 0);
    }
    if (!this.paeseAperto) {
      this.filtroNazioni = '';
      this.indiceNazione = -1;
    } // se chiudo il menu pulisco filtro e indice
  }

  /**
   * Aggiorna il filtro del paese mentre l'utente digita.
   * - Salva il testo corrente
   * - Resetta l'indice tastiera
   * - Apre il dropdown se era chiuso
   *
   * @param event Event Evento input del campo paese.
   * @returns void
   */
  onInputPaese(event: Event): void {
    this.filtroNazioni = (event.target as HTMLInputElement).value; // leggo il testo corrente dell'input paese
    this.indiceNazione = -1; // resetto l'indice tastiera della lista
    if (!this.paeseAperto) this.paeseAperto = true; // se il dropdown era chiuso lo apro
  }

  /**
   * Gestisce la navigazione da tastiera nella lista delle nazioni.
   * - Freccia giu' scende
   * - Freccia su risale
   * - Enter seleziona la nazione corrente
   * - Escape chiude il dropdown e pulisce filtro e indice
   *
   * @param event KeyboardEvent Evento tastiera dell'input paese.
   * @returns void
   */
  navigaPaese(event: KeyboardEvent): void {
    if (!this.paeseAperto) return; // se il menu non e' aperto non faccio nulla
    const lista = this.nazioniFiltrate; // ricavo la lista corrente delle nazioni filtrate
    if (event.key === 'ArrowDown') {
      event.preventDefault(); // blocco il comportamento nativo del browser
      this.filtroNazioni = (event.target as HTMLInputElement).value; // aggiorno il filtro col testo presente nell'input
      this.indiceNazione = Math.min(this.indiceNazione + 1, lista.length - 1); // avanzo di una posizione senza superare il fondo
    } else if (event.key === 'ArrowUp') {
      event.preventDefault(); // blocco il comportamento nativo del browser
      this.filtroNazioni = (event.target as HTMLInputElement).value; // tengo sincronizzato il filtro col contenuto dell'input
      this.indiceNazione = Math.max(this.indiceNazione - 1, -1); // risalgo di una posizione senza scendere sotto -1
    } else if (event.key === 'Enter' && this.indiceNazione >= 0) {
      event.preventDefault(); // blocco il comportamento nativo del browser
      this.selezionaPaese(lista[this.indiceNazione].iso); // seleziono la nazione evidenziata usando il suo codice ISO
    } else if (event.key === 'Escape') {
      this.paeseAperto = false; // chiudo il dropdown del paese
      this.filtroNazioni = ''; // pulisco il filtro
      this.indiceNazione = -1; // resetto l'indice tastiera
    }
  }

  /**
   * Gestisce il blur del campo paese.
   * - Se il focus passa dentro il dropdown non faccio nulla
   * - Se il testo scritto corrisponde esattamente a una nazione la seleziono
   *
   * @param event FocusEvent Evento blur del campo paese.
   * @returns void
   */
  onBlurPaese(event: FocusEvent): void {
    const dest = event.relatedTarget as HTMLElement | null; // leggo l'elemento che ricevera' il focus dopo il blur
    if (dest?.closest('.select-dropdown')) return; // se sto andando su un elemento interno al dropdown non faccio nulla
    const val = (event.target as HTMLInputElement).value.trim().toLowerCase(); // leggo il testo inserito e lo normalizzo
    if (!val) return; // se non c'e' testo non devo selezionare nulla
    if (this.paeseValore && this.paeseLabel().toLowerCase() === val) return; // se il testo coincide gia' col paese selezionato non faccio nulla
    const trovata = this.fs.nazioni.find(
      (n) =>
        (n.nazione_it ?? '').toLowerCase() === val || // provo a trovare una corrispondenza esatta col nome italiano
        (n.nazione_en ?? '').toLowerCase() === val, // oppure col nome inglese
    );
    if (trovata) this.selezionaPaese(trovata.iso); // se trovo una nazione valida la seleziono
  }

  /**
   * Salva il paese selezionato e aggiorna i validator collegati.
   * - Aggiorna il form e marca il controllo come toccato
   * - Se passo da Italia a estero o viceversa resetta i campi collegati
   * - Cambia i validator di comune, citta' e codice fiscale
   * - Ricalcola il codice fiscale
   *
   * @param valore string Codice ISO del paese selezionato.
   * @returns void
   */
  selezionaPaese(valore: string): void {
    const cambiaTipo = (valore === 'IT') !== (this.paeseValore === 'IT'); // controllo se sto passando da Italia a estero o viceversa
    this.paeseValore = valore; // salvo il nuovo paese selezionato
    this.paeseAperto = false; // chiudo il dropdown del paese
    this.filtroNazioni = ''; // pulisco il filtro del paese
    this.indiceNazione = -1; // resetto l'indice tastiera della lista
    this.form.get('paese')!.setValue(valore); // aggiorno il controllo del form con il nuovo paese
    this.form.get('paese')!.markAsTouched(); // marco il controllo come toccato

    if (cambiaTipo) {
      this.comuneValore = ''; // se cambio tipo azzero il comune selezionato
      this.filtroComuni = ''; // pulisco il filtro dei comuni
      this.cfValore = ''; // azzero il codice fiscale corrente
      this.cfFlash = false; // spengo il flag di flash visivo sul codice fiscale
      this.cfModificatoManualmente = false; // resetto il flag di modifica manuale del codice fiscale
      this.form.get('comune')!.setValue(''); // pulisco il controllo comune del form
      this.form.get('citta')!.setValue(''); // pulisco il controllo citta' del form
      this.form.get('codiceFiscale')!.setValue(''); // pulisco il controllo codice fiscale del form

      if (valore === 'IT') {
        this.form.get('comune')!.setValidators(Validators.required); // se torno in Italia rendo il comune obbligatorio
        this.form.get('citta')!.clearValidators(); // tolgo i validator della citta' estera
        this.form
          .get('codiceFiscale')!
          .setValidators([
            Validators.required,
            Validators.pattern(
              /^[A-Za-z]{6}\d{2}[AaBbCcDdEeHhLlMmPpRrSsTt](0[1-9]|[12]\d|3[01]|4[1-9]|[56]\d|7[01])[A-Za-z]\d{3}[A-Za-z]$/,
            ),
          ]); // in Italia rendo il codice fiscale obbligatorio con pattern completo
      } else {
        this.form
          .get('citta')!
          .setValidators([
            Validators.required,
            Validators.minLength(2),
            Validators.maxLength(80),
          ]); // all'estero rendo obbligatoria la citta' libera con limiti di lunghezza
        this.form.get('comune')!.clearValidators(); // all'estero tolgo l'obbligatorieta' del comune italiano
        this.form
          .get('codiceFiscale')!
          .setValidators([
            Validators.pattern(
              /^[A-Za-z]{6}\d{2}[AaBbCcDdEeHhLlMmPpRrSsTt](0[1-9]|[12]\d|3[01]|4[1-9]|[56]\d|7[01])[A-Za-z]\d{3}[A-Za-z]$/,
            ),
          ]); // all'estero lascio solo il pattern senza obbligatorieta'
      }
      this.form.get('comune')!.updateValueAndValidity(); // ricalcolo validita' del controllo comune
      this.form.get('citta')!.updateValueAndValidity(); // ricalcolo validita' del controllo citta'
      this.form.get('codiceFiscale')!.updateValueAndValidity(); // ricalcolo validita' del controllo codice fiscale
    }
    this.calcolaCodiceFiscale(); // provo a ricalcolare il codice fiscale col nuovo paese
  }

  /**
   * Apre o chiude il dropdown del comune di nascita.
   * - Blocca la propagazione del click
   * - Chiude gli altri dropdown
   * - Precarica il filtro col comune attuale
   * - Sposta il focus sull'input del filtro
   *
   * @param event Event Evento del click sul selettore.
   * @returns void
   */
  toggleComune(event: Event): void {
    event.stopPropagation(); // blocco la propagazione cosi' il click non chiude subito il dropdown
    this.comuneAperto = !this.comuneAperto; // inverto lo stato di apertura del menu comune
    if (this.comuneAperto) {
      this.sessoAperto = false; // se apro il comune chiudo il dropdown del sesso
      this.paeseAperto = false; // se apro il comune chiudo il dropdown del paese
      this.indiceComune = -1; // resetto l'indice tastiera della lista comuni
      this.filtroComuni = this.comuneValore ?? ''; // se ho gia' un comune selezionato precompilo il filtro con quel valore
      setTimeout(() => {
        const i = document.querySelector('.comune-input') as HTMLInputElement; // cerco l'input del filtro comune nel DOM
        if (i) {
          i.focus();
          i.select();
        } // se lo trovo gli do focus e seleziono tutto il testo
      }, 0);
    }
    if (!this.comuneAperto) {
      this.filtroComuni = '';
      this.indiceComune = -1;
    } // se chiudo il menu pulisco filtro e indice
  }

  /**
   * Aggiorna il filtro del comune mentre l'utente digita.
   * - Salva il testo corrente
   * - Resetta l'indice tastiera
   * - Apre il dropdown se era chiuso
   *
   * @param event Event Evento input del campo comune.
   * @returns void
   */
  onInputComune(event: Event): void {
    this.filtroComuni = (event.target as HTMLInputElement).value; // leggo il testo corrente dell'input comune
    this.indiceComune = -1; // resetto l'indice tastiera della lista
    if (!this.comuneAperto) this.comuneAperto = true; // se il dropdown era chiuso lo apro
  }

  /**
   * Gestisce la navigazione da tastiera nella lista dei comuni.
   * - Freccia giu' scende
   * - Freccia su risale
   * - Enter seleziona il comune corrente
   * - Escape chiude il dropdown e pulisce filtro e indice
   *
   * @param event KeyboardEvent Evento tastiera dell'input comune.
   * @returns void
   */
  navigaComune(event: KeyboardEvent): void {
    if (!this.comuneAperto) return; // se il menu non e' aperto non faccio nulla
    const lista = this.comuniFiltrati; // ricavo la lista corrente dei comuni filtrati
    if (event.key === 'ArrowDown') {
      event.preventDefault(); // blocco il comportamento nativo del browser
      this.filtroComuni = (event.target as HTMLInputElement).value; // aggiorno il filtro col testo presente nell'input
      this.indiceComune = Math.min(this.indiceComune + 1, lista.length - 1); // avanzo di una posizione senza superare l'ultima
    } else if (event.key === 'ArrowUp') {
      event.preventDefault(); // blocco il comportamento nativo del browser
      this.filtroComuni = (event.target as HTMLInputElement).value; // tengo sincronizzato il filtro col contenuto dell'input
      this.indiceComune = Math.max(this.indiceComune - 1, -1); // risalgo di una posizione senza scendere sotto -1
    } else if (event.key === 'Enter' && this.indiceComune >= 0) {
      event.preventDefault(); // blocco il comportamento nativo del browser
      this.selezionaComune(lista[this.indiceComune].comune); // seleziono il comune evidenziato
    } else if (event.key === 'Escape') {
      this.comuneAperto = false; // chiudo il dropdown del comune
      this.filtroComuni = ''; // pulisco il filtro dei comuni
      this.indiceComune = -1; // resetto l'indice tastiera
    }
  }

  /**
   * Gestisce il blur del campo comune.
   * - Se il focus passa dentro il dropdown non faccio nulla
   * - Se il testo scritto corrisponde esattamente a un comune lo seleziono
   *
   * @param event FocusEvent Evento blur del campo comune.
   * @returns void
   */
  onBlurComune(event: FocusEvent): void {
    const dest = event.relatedTarget as HTMLElement | null; // leggo l'elemento che ricevera' il focus dopo il blur
    if (dest?.closest('.select-dropdown')) return; // se sto andando su un elemento del dropdown non faccio nulla
    const val = (event.target as HTMLInputElement).value.trim().toLowerCase(); // leggo e normalizzo il testo inserito
    if (!val) return; // se il campo e' vuoto non devo selezionare nulla
    if (this.comuneValore && this.comuneValore.toLowerCase() === val) return; // se il testo coincide gia' col comune scelto non faccio nulla
    const trovato = this.fs.comuni.find(
      (c) => (c.comune ?? '').toLowerCase() === val,
    ); // cerco una corrispondenza esatta tra i comuni disponibili
    if (trovato) this.selezionaComune(trovato.comune); // se trovo una corrispondenza seleziono il comune
  }

  /**
   * Salva il comune selezionato e aggiorna il form.
   * - Chiude il dropdown
   * - Marca il controllo come toccato
   * - Ricalcola il codice fiscale
   *
   * @param valore string Comune selezionato.
   * @returns void
   */
  selezionaComune(valore: string): void {
    this.comuneValore = valore; // salvo il valore del comune scelto
    this.comuneAperto = false; // chiudo il dropdown del comune
    this.filtroComuni = ''; // pulisco il filtro dei comuni
    this.indiceComune = -1; // resetto l'indice tastiera
    this.form.get('comune')!.setValue(valore); // aggiorno il controllo comune del form
    this.form.get('comune')!.markAsTouched(); // marco il controllo come toccato
    this.calcolaCodiceFiscale(); // provo a ricalcolare il codice fiscale col nuovo comune
  }

  /**
   * Svuota il codice fiscale attuale e resetta i flag collegati.
   * - Pulisce il valore locale
   * - Pulisce il controllo del form
   * - Marca il campo come toccato
   *
   * @returns void
   */
  svuotaCF(): void {
    this.cfValore = ''; // azzero il valore locale del codice fiscale
    this.cfFlash = false; // spengo il flag di flash visivo
    this.cfModificatoManualmente = false; // resetto il flag di modifica manuale
    this.form.get('codiceFiscale')!.setValue(''); // pulisco il controllo codice fiscale del form
    this.form.get('codiceFiscale')!.markAsTouched(); // marco il controllo come toccato
  }

  /**
   * Calcola automaticamente il codice fiscale quando tutti i dati minimi sono presenti.
   * - Legge nome, cognome, data, sesso e luogo di nascita
   * - Costruisce il parziale da 15 caratteri
   * - Calcola il carattere finale di controllo
   * - Aggiorna il form se il valore e' nuovo e non e' stato modificato a mano
   *
   * @returns void
   */
  calcolaCodiceFiscale(): void {
    const nome =
      (document.getElementById('nome') as HTMLInputElement)?.value?.trim() ??
      ''; // leggo il nome direttamente dall'input del DOM
    const cognome =
      (document.getElementById('cognome') as HTMLInputElement)?.value?.trim() ??
      ''; // leggo il cognome direttamente dall'input del DOM
    const gg =
      (document.getElementById('data_gg') as HTMLInputElement)?.value ?? ''; // leggo il giorno di nascita
    const mm =
      (document.getElementById('data_mm') as HTMLInputElement)?.value ?? ''; // leggo il mese di nascita
    const aaaa =
      (document.getElementById('data_aaaa') as HTMLInputElement)?.value ?? ''; // leggo l'anno di nascita

    const cf = calcolaCodiceFiscaleAnagrafica(
      nome,
      cognome,
      gg,
      mm,
      aaaa,
      this.sessoValore,
      this.paeseValore,
      this.comuneValore,
      this.fs.comuni,
      this.fs.nazioni,
    );

    if (!cf) return;
    if (cf === this.cfValore || this.cfModificatoManualmente) return; // se il valore e' gia' quello corrente o l'utente l'ha modificato a mano non sovrascrivo nulla

    this.cfValore = cf; // salvo il nuovo codice fiscale calcolato
    this.form.get('codiceFiscale')!.setValue(cf); // aggiorno il controllo del form col nuovo codice fiscale
    this.form.get('codiceFiscale')!.markAsTouched(); // marco il controllo come toccato
    this.cfFlash = false; // azzero prima il flag di flash per poterlo riattivare
    setTimeout(() => {
      this.cfFlash = true;
    }, 10); // attivo quasi subito il flash visivo
    setTimeout(() => {
      this.cfFlash = false;
    }, 1510); // spengo il flash dopo il tempo voluto
  }

  /**
   * Inizializza il datepicker esterno collegato ai campi della data di nascita.
   * - Recupera l'input del datepicker
   * - Crea l'istanza con lingua e formato corretti
   * - Sincronizza apertura, chiusura e data scelta con i controlli del form
   *
   * @param lingua string Codice lingua da usare per il datepicker.
   * @returns void
   */
  inizializzaDatepicker(lingua: string): void {
    const input = document.getElementById(
      'datepicker-input',
    ) as HTMLInputElement; // recupero dal DOM l'input usato dal datepicker
    if (!input) return; // se non trovo l'input non posso inizializzare nulla

    this.datepicker = new Datepicker(input, {
      format: 'dd/mm/yyyy', // imposto il formato giorno mese anno
      autohide: true, // faccio chiudere automaticamente il calendario dopo la selezione
      language: lingua === 'it' ? 'it' : 'en', // scelgo la lingua del calendario in base al parametro ricevuto
      weekStart: 1, // imposto il lunedi' come primo giorno della settimana
    });

    input.addEventListener('show', () => {
      this.datepickerAperto = true;
    }); // quando il datepicker si apre aggiorno il flag interno
    input.addEventListener('hide', () => {
      this.datepickerAperto = false;
    }); // quando il datepicker si chiude aggiorno il flag interno
    input.addEventListener('changeDate', (e: any) => {
      const data: Date = e.detail.date; // leggo la data selezionata dal datepicker
      if (!data) return; // se non ho una data valida esco subito
      const gg = String(data.getDate()).padStart(2, '0'); // ricavo il giorno in due cifre
      const mm = String(data.getMonth() + 1).padStart(2, '0'); // ricavo il mese in due cifre
      const aaaa = String(data.getFullYear()); // ricavo l'anno completo
      (document.getElementById('data_gg') as HTMLInputElement).value = gg; // sincronizzo l'input del giorno nel DOM
      (document.getElementById('data_mm') as HTMLInputElement).value = mm; // sincronizzo l'input del mese nel DOM
      (document.getElementById('data_aaaa') as HTMLInputElement).value = aaaa; // sincronizzo l'input dell'anno nel DOM
      this.form.get('dataGg')!.setValue(gg);
      this.form.get('dataGg')!.markAsTouched(); // aggiorno e marco il controllo giorno
      this.form.get('dataMm')!.setValue(mm);
      this.form.get('dataMm')!.markAsTouched(); // aggiorno e marco il controllo mese
      this.form.get('dataAaaa')!.setValue(aaaa);
      this.form.get('dataAaaa')!.markAsTouched(); // aggiorno e marco il controllo anno
      this.calcolaCodiceFiscale(); // provo a ricalcolare il codice fiscale dopo il cambio data
    });
  }

  /**
   * Apre o chiude manualmente il datepicker.
   * - Blocca la propagazione del click
   * - Se il datepicker e' aperto lo chiude
   * - Se e' chiuso lo apre
   *
   * @param event Event Evento del click sul bottone o campo collegato.
   * @returns void
   */
  apriDatepicker(event: Event): void {
    if (!this.datepicker) return; // se il datepicker non e' inizializzato non posso agire
    event.stopPropagation(); // blocco la propagazione del click
    this.datepickerAperto ? this.datepicker.hide() : this.datepicker.show(); // in base allo stato corrente apro o chiudo il datepicker
  }

  /**
   * Gestisce la digitazione nei campi giorno, mese e anno permettendo solo numeri
   * e aggiungendo navigazione fluida tra gli input con tasti speciali.
   * - Backspace puo' tornare al campo precedente
   * - Delete puo' spostarsi al campo successivo
   * - ArrowLeft e ArrowRight spostano il focus tra i campi
   * - Tab resta libero
   * - Tutto il resto viene bloccato se non numerico
   *
   * @param event KeyboardEvent Evento tastiera del campo data.
   * @param campo 'gg' | 'mm' | 'aaaa' Campo corrente della data.
   * @returns void
   */
  soloNumeri(event: KeyboardEvent, campo?: 'gg' | 'mm' | 'aaaa'): void {
    const input = event.target as HTMLInputElement; // recupero l'input su cui l'utente sta digitando

    if (event.key === 'Backspace') {
      if (
        campo &&
        campo !== 'gg' &&
        input.selectionStart === 0 &&
        input.selectionEnd === 0
      ) {
        event.preventDefault(); // se sono a inizio campo blocco il comportamento standard
        const prec = (
          campo === 'mm'
            ? document.getElementById('data_gg')
            : document.getElementById('data_mm')
        ) as HTMLInputElement; // ricavo il campo precedente in base al campo attuale
        if (prec) {
          prec.focus();
          prec.value = prec.value.slice(0, -1);
          prec.setSelectionRange(prec.value.length, prec.value.length);
        } // porto il focus al precedente e cancello il suo ultimo carattere
      }
      return; // dopo la gestione del backspace esco
    }
    if (event.key === 'Delete') {
      if (input.selectionStart === input.value.length) {
        const succ = (
          campo === 'gg'
            ? document.getElementById('data_mm')
            : campo === 'mm'
              ? document.getElementById('data_aaaa')
              : null
        ) as HTMLInputElement | null; // ricavo il campo successivo in base al campo attuale
        if (succ) {
          event.preventDefault();
          succ.focus();
          succ.value = succ.value.slice(1);
          succ.setSelectionRange(0, 0);
        } // porto il focus al successivo e cancello il suo primo carattere
      }
      return; // dopo la gestione del delete esco
    }
    if (event.key === 'ArrowLeft' && input.selectionStart === 0) {
      event.preventDefault(); // blocco il movimento standard del cursore
      const prec = (
        campo === 'mm'
          ? document.getElementById('data_gg')
          : campo === 'aaaa'
            ? document.getElementById('data_mm')
            : null
      ) as HTMLInputElement | null; // ricavo il campo precedente
      if (prec) {
        prec.focus();
        prec.setSelectionRange(prec.value.length, prec.value.length);
      } // porto il focus sul campo precedente mettendo il cursore in fondo
      return; // dopo la gestione della freccia sinistra esco
    }
    if (
      event.key === 'ArrowRight' &&
      input.selectionStart === input.value.length
    ) {
      event.preventDefault(); // blocco il movimento standard del cursore
      const succ = (
        campo === 'gg'
          ? document.getElementById('data_mm')
          : campo === 'mm'
            ? document.getElementById('data_aaaa')
            : null
      ) as HTMLInputElement | null; // ricavo il campo successivo
      if (succ) {
        succ.focus();
        succ.setSelectionRange(0, 0);
      } // porto il focus sul campo successivo mettendo il cursore all'inizio
      return; // dopo la gestione della freccia destra esco
    }
    if (event.key === 'Tab') return; // lascio passare il TAB senza bloccarlo
    if (!/^\d$/.test(event.key)) event.preventDefault(); // blocco qualsiasi tasto che non sia una cifra
  }

  /**
   * Sposta automaticamente il focus al campo successivo della data
   * quando il campo corrente raggiunge almeno due caratteri.
   *
   * @param event Event Evento input del campo data.
   * @param campo 'gg' | 'mm' Campo corrente da cui decidere il successivo.
   * @returns void
   */
  avanzaData(event: Event, campo: 'gg' | 'mm'): void {
    const input = event.target as HTMLInputElement; // recupero il campo su cui l'utente ha appena digitato
    if (input.value.length >= 2) {
      const prossimo =
        campo === 'gg'
          ? document.getElementById('data_mm')
          : document.getElementById('data_aaaa'); // scelgo il campo successivo in base al campo corrente
      prossimo?.focus(); // se il campo successivo esiste gli do il focus
    }
  }

  /**
   * Gestisce il click o focus generale sull'area data.
   * - Se il target e' gia' un input o un bottone non faccio nulla
   * - Altrimenti porto il focus sul primo campo mancante
   * - Se tutti sono completi torno sul giorno
   *
   * @param event Event Evento ricevuto dall'area data.
   * @returns void
   */
  focusData(event: Event): void {
    const target = event.target as HTMLElement; // recupero l'elemento reale che ha generato l'evento
    if (target.tagName === 'INPUT' || target.closest('button')) return; // se ho cliccato gia' su input o bottone non devo spostare il focus
    const gg = document.getElementById('data_gg') as HTMLInputElement; // recupero il campo giorno
    const mm = document.getElementById('data_mm') as HTMLInputElement; // recupero il campo mese
    const aaaa = document.getElementById('data_aaaa') as HTMLInputElement; // recupero il campo anno
    if (!gg.value) {
      gg.focus();
      return;
    } // se manca il giorno porto il focus li'
    if (!mm.value) {
      mm.focus();
      return;
    } // se manca il mese porto il focus li'
    if (!aaaa.value || aaaa.value.length < 4) {
      aaaa.focus();
      return;
    } // se manca l'anno o e' incompleto porto il focus li'
    gg.focus(); // se tutto e' pieno torno sul giorno
  }

  /**
   * Controlla se almeno uno dei campi della data contiene qualcosa.
   *
   * @returns boolean True se giorno, mese o anno hanno almeno un valore.
   */
  dataCompilata(): boolean {
    const gg = (document.getElementById('data_gg') as HTMLInputElement)?.value; // leggo il valore attuale del giorno
    const mm = (document.getElementById('data_mm') as HTMLInputElement)?.value; // leggo il valore attuale del mese
    const aaaa = (document.getElementById('data_aaaa') as HTMLInputElement)
      ?.value; // leggo il valore attuale dell'anno
    return !!(gg || mm || aaaa); // restituisco true se almeno uno dei tre campi contiene qualcosa
  }

  /**
   * Intercetta il TAB sul form per aprire automaticamente il menu sesso
   * quando il focus esce dall'anno di nascita.
   *
   * @param event KeyboardEvent Evento tastiera del form.
   * @returns void
   */
  onTabForm(event: KeyboardEvent): void {
    if ((event.target as HTMLElement) === document.getElementById('data_aaaa'))
      this._sessoFocusDaTab = true; // se sto uscendo con TAB dal campo anno preparo l'apertura del menu sesso al focus successivo
  }

  /**
   * Gestisce il blur dei campi anagrafici.
   * - Se sto andando sul bottone avanti e non sono in Italia non ricalcolo
   * - Negli altri casi provo a ricalcolare il codice fiscale
   *
   * @param event FocusEvent Evento blur di un campo anagrafico.
   * @returns void
   */
  onBlurAnag(event: FocusEvent): void {
    const dest = event.relatedTarget as HTMLElement | null; // leggo l'elemento che ricevera' il focus dopo il blur
    if ((dest?.classList.contains('avanti_btn') ?? false) && !this.isItalia)
      return; // se sto andando sul bottone avanti e sono all'estero salto il ricalcolo qui
    this.calcolaCodiceFiscale(); // negli altri casi provo a ricalcolare il codice fiscale
  }

  /**
   * Blocca l'invio del form con Enter quando non si e' sul vero bottone submit.
   *
   * @param event KeyboardEvent Evento tastiera del form.
   * @returns void
   */
  onEnterForm(event: KeyboardEvent): void {
    const target = event.target as HTMLElement; // recupero l'elemento che ha ricevuto il tasto Enter
    if (target.tagName === 'BUTTON' && target.getAttribute('type') === 'submit')
      return; // se sono davvero sul bottone submit lascio passare l'Enter
    event.preventDefault(); // negli altri casi blocco l'invio implicito del form
  }

  /**
   * Chiude contemporaneamente tutti i dropdown custom del primo step.
   *
   * @returns void
   */
  chiudiDropdown(): void {
    this.sessoAperto = false; // chiudo tuttu i dropdown
    this.paeseAperto = false;
    this.comuneAperto = false;
  }
}
