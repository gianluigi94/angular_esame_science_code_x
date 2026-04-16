// servizio che gestisce tutta la logica del secondo step dell'iscrizione: paese e comune di domicilio, CAP, provincia, prezzi per nazione e controlli di coerenza dell'indirizzo

import { Injectable }    from '@angular/core';
import { Validators }    from '@angular/forms';
import { TranslateService }    from '@ngx-translate/core';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { ApiService }          from 'src/app/_servizi_globali/api.service';
import { IscrizioneFormService } from './iscrizione-form.service';

@Injectable()
export class IscrizioneStep2Service {

  paeseDomAperto   = false; // flag che mi dice se il dropdown del paese di domicilio e' aperto
  paeseDomValore   = 'IT'; // il codice ISO del paese di domicilio selezionato
  filtroNazioniDom = ''; // il testo digitato per filtrare le nazioni del domicilio
  indiceNazioneDom = -1; // l'indice evidenziato da tastiera nella lista delle nazioni

  comuneDomAperto  = false; // flag che mi dice se il dropdown del comune di domicilio e' aperto
  comuneDomValore  = ''; // il comune di domicilio selezionato
  filtroComuniDom  = ''; // il testo digitato per filtrare i comuni del domicilio
  indiceComuneDom  = -1; // l'indice evidenziato da tastiera nella lista dei comuni

  capDomAperto     = false; // flag che mi dice se il dropdown del CAP e' aperto
  capValore        = ''; // il CAP corrente selezionato o digitato
  filtroCapDom     = ''; // il testo digitato per filtrare le opzioni CAP
  indiceCapDom     = -1; // l'indice evidenziato da tastiera nella lista dei CAP
  capIsMulti       = false; // flag che mi dice se il comune selezionato ha piu' CAP possibili
  capMultiOpzioni: string[] = []; // l'elenco dei CAP possibili quando il comune ne ha piu' di uno
  capFlash         = false; // flag usato per attivare il flash visivo sul campo CAP

  provinciaFlash          = false; // flag usato per attivare il flash visivo sul campo provincia
  erroreCoerenzaIndirizzo = false; // flag che puo' essere usato per segnalare un errore di coerenza tra comune, provincia e CAP

  prezzoBase    = '5€'; // i prezzi base da cui parto con i calcoli
  prezzoPremium = '10€';
  // un getter e' una proprieta' speciale di una classe che  permette di leggere un valore
  // come se fosse un campo normale, ma in realta' dietro esegue una funzione
  /**
   * Restituisce il form del secondo step gia' costruito dal servizio condiviso.
   *
   * @returns FormGroup Form del secondo step dell'iscrizione.
   */
  get form() { return this.fs.reactiveFormStep2; } // espongo in modo comodo il form del secondo step

  /**
   * Mi dice se il paese di domicilio selezionato e' l'Italia.
   *
   * @returns boolean True se il paese corrente e' IT, altrimenti false.
   */
  get isItaliaDom(): boolean { return this.paeseDomValore === 'IT'; } // controllo rapidamente se il domicilio e' in Italia

  /**
   * Restituisce l'elenco delle nazioni filtrato in base al testo digitato.
   * - Se non c'e' filtro restituisce tutte le nazioni
   * - Se c'e' filtro confronta sia il nome italiano sia quello inglese
   *
   * @returns any[] Elenco delle nazioni filtrate per il domicilio.
   */
  get nazioniFiltrateDom(): any[] {
    if (!this.filtroNazioniDom.trim()) return this.fs.nazioni; // se non ho scritto nulla restituisco tutte le nazioni disponibili
    const f = this.filtroNazioniDom.toLowerCase(); // porto il filtro in minuscolo per confrontarlo piu' facilmente
    return this.fs.nazioni.filter(n =>
      (n.nazione_it ?? '').toLowerCase().startsWith(f) || // controllo se il nome italiano inizia col filtro digitato
      (n.nazione_en ?? '').toLowerCase().startsWith(f) // oppure se il nome inglese inizia col filtro digitato
    );
  }

  /**
   * Restituisce l'elenco dei comuni filtrato in base al testo digitato.
   * - Se non c'e' filtro restituisce lista vuota
   * - Se c'e' filtro restituisce solo i primi 50 risultati
   *
   * @returns any[] Elenco dei comuni filtrati per il domicilio.
   */
  get comuniFiltreatiDom(): any[] {
    if (!this.filtroComuniDom.trim()) return []; // se non ho scritto nulla non mostro nessun comune
    const f = this.filtroComuniDom.toLowerCase(); // porto il filtro in minuscolo per confrontarlo con i comuni
    return this.fs.comuni
      .filter(c => (c.comune ?? '').toLowerCase().startsWith(f)) // tengo solo i comuni che iniziano con il testo digitato
      .slice(0, 50); // limito il risultato ai primi 50 elementi
  }

  /**
   * Restituisce l'elenco dei CAP filtrato in base al testo digitato.
   * - Se non c'e' filtro restituisce tutte le opzioni disponibili
   * - Se c'e' filtro tiene solo i CAP che iniziano con il testo scritto
   *
   * @returns string[] Elenco dei CAP filtrati.
   */
  get capFiltrate(): string[] {
    if (!this.filtroCapDom.trim()) return this.capMultiOpzioni; // se non ho scritto nulla restituisco tutte le opzioni CAP disponibili
    return this.capMultiOpzioni.filter(c => c.startsWith(this.filtroCapDom)); // tengo solo i CAP che iniziano col filtro digitato
  }

  constructor(
    private fs:                  IscrizioneFormService,
    private apiService:          ApiService,
    private cambioLinguaService: CambioLinguaService,
    private translateService:    TranslateService,
  ) {}

  /**
   * Aggiorna i prezzi mostrati in base alla nazione selezionata.
   * - Recupera da API tasso, aliquota e simbolo valuta
   * - Se i dati non sono validi ripristina i prezzi di default
   * - Se i dati sono validi calcola i prezzi convertiti
   *
   * @param iso string Codice ISO della nazione.
   * @returns void
   */
  aggiornaPrezzi(iso: string): void {
    this.apiService.getPrezziNazione(iso).subscribe({
      next: (rit) => {
        const d = rit.data; // leggo i dati restituiti dal backend per la nazione selezionata
        if (!d || !d.tasso || parseFloat(d.tasso) <= 0) {
          this.prezzoBase = '5€'; this.prezzoPremium = '10€'; return; // se i dati non sono validi torno ai prezzi di default
        }
        const tasso:    number = parseFloat(d.tasso); // converto il tasso in numero
        const aliquota: number = d.aliquota ? parseFloat(d.aliquota) / 100 : 0; // converto l'aliquota in numero percentuale decimale
        const simbolo:  string = d.valuta_simbolo ?? '€'; // leggo il simbolo valuta oppure uso euro come fallback
        const prezzoBase    = d.prezzo_base_mensile    ? parseFloat(d.prezzo_base_mensile)    : 5;
        const prezzoPremium = d.prezzo_premium_mensile ? parseFloat(d.prezzo_premium_mensile) : 10;
        const calcola  = (base: number) =>
          `${(base * tasso * (1 + aliquota)).toFixed(2)}${simbolo}`;
        this.prezzoBase    = calcola(prezzoBase);
        this.prezzoPremium = calcola(prezzoPremium);
      },
      error: () => { this.prezzoBase = '5€'; this.prezzoPremium = '10€'; }, // se la chiamata fallisce torno ai prezzi di default
    });
  }

  /**
   * Restituisce la label del paese di domicilio in base alla lingua corrente.
   * - Se non ho ancora un valore mostra il placeholder
   * - Se trovo la nazione restituisco il nome nella lingua attiva
   *
   * @returns string Testo da mostrare nel campo paese di domicilio.
   */
  paeseDomLabel(): string {
    if (!this.paeseDomValore)
      return this.translateService.instant('ui.registrazione.placeholder.seleziona_paese'); // se non ho un paese selezionato mostro il placeholder tradotto
    const nazione = this.fs.nazioni.find(n => n.iso === this.paeseDomValore); // cerco la nazione corrispondente al codice ISO selezionato
    if (!nazione) return ''; // se non trovo la nazione restituisco stringa vuota
    return this.cambioLinguaService.leggiCodiceLingua() === 'it' // controllo la lingua corrente dell'app
      ? nazione.nazione_it // se sono in italiano mostro il nome italiano
      : nazione.nazione_en; // altrimenti mostro il nome inglese
  }

  /**
   * Apre o chiude il dropdown del paese di domicilio.
   * - Blocca la propagazione del click
   * - Chiude gli altri dropdown
   * - Precarica il filtro con la label attuale
   * - Sposta il focus sull'input del filtro
   *
   * @param event Event Evento del click sul selettore.
   * @returns void
   */
  togglePaeseDom(event: Event): void {
    event.stopPropagation(); // blocco la propagazione cosi' il click non interferisce con altri listener
    this.paeseDomAperto = !this.paeseDomAperto; // inverto lo stato di apertura del menu paese di domicilio
    if (this.paeseDomAperto) {
      this.comuneDomAperto = false; // se apro il paese chiudo il dropdown del comune
      this.capDomAperto    = false; // se apro il paese chiudo il dropdown del CAP
      this.indiceNazioneDom = -1; // resetto l'indice della lista nazioni
      this.filtroNazioniDom = this.paeseDomValore ? this.paeseDomLabel() : ''; // se ho gia' un paese selezionato precompilo il filtro con la sua label
      setTimeout(() => {
        const i = document.querySelector('.paese-dom-input') as HTMLInputElement; // cerco l'input del filtro paese di domicilio nel DOM
        if (i) { i.focus(); i.select(); } // se lo trovo gli do focus e seleziono tutto il testo
      }, 0);
    }
    if (!this.paeseDomAperto) { this.filtroNazioniDom = ''; this.indiceNazioneDom = -1; } // se chiudo il menu pulisco filtro e indice
  }

  /**
   * Aggiorna il filtro del paese di domicilio mentre l'utente digita.
   * - Salva il testo corrente
   * - Resetta l'indice tastiera
   * - Apre il dropdown se era chiuso
   *
   * @param event Event Evento input del campo paese.
   * @returns void
   */
  onInputPaeseDom(event: Event): void {
    this.filtroNazioniDom = (event.target as HTMLInputElement).value; // leggo il testo corrente dell'input paese di domicilio
    this.indiceNazioneDom = -1; // resetto l'indice tastiera della lista
    if (!this.paeseDomAperto) this.paeseDomAperto = true; // se il dropdown era chiuso lo apro
  }

  /**
   * Gestisce la navigazione da tastiera nella lista delle nazioni del domicilio.
   * - Freccia giu' scende
   * - Freccia su risale
   * - Enter seleziona la nazione corrente
   * - Escape chiude il dropdown e pulisce filtro e indice
   *
   * @param event KeyboardEvent Evento tastiera dell'input paese.
   * @returns void
   */
  navigaPaeseDom(event: KeyboardEvent): void {
    if (!this.paeseDomAperto) return; // se il menu non e' aperto non faccio nulla
    const lista = this.nazioniFiltrateDom; // ricavo la lista corrente delle nazioni filtrate
    if (event.key === 'ArrowDown') {
      event.preventDefault(); // blocco il comportamento nativo del browser
      this.filtroNazioniDom = (event.target as HTMLInputElement).value; // aggiorno il filtro col testo presente nell'input
      this.indiceNazioneDom = Math.min(this.indiceNazioneDom + 1, lista.length - 1); // avanzo di una posizione senza superare il fondo
    } else if (event.key === 'ArrowUp') {
      event.preventDefault(); // blocco il comportamento nativo del browser
      this.filtroNazioniDom = (event.target as HTMLInputElement).value; // tengo sincronizzato il filtro col contenuto dell'input
      this.indiceNazioneDom = Math.max(this.indiceNazioneDom - 1, -1); // risalgo di una posizione senza scendere sotto -1
    } else if (event.key === 'Enter' && this.indiceNazioneDom >= 0) {
      event.preventDefault(); // blocco il comportamento nativo del browser
      this.selezionaPaeseDom(lista[this.indiceNazioneDom].iso); // seleziono la nazione evidenziata usando il suo codice ISO
    } else if (event.key === 'Escape') {
      this.paeseDomAperto   = false; // chiudo il dropdown del paese di domicilio
      this.filtroNazioniDom = ''; // pulisco il filtro
      this.indiceNazioneDom = -1; // resetto l'indice tastiera
    }
  }

  /**
   * Gestisce il blur del campo paese di domicilio.
   * - Se il focus passa dentro il dropdown non faccio nulla
   * - Se il testo scritto corrisponde esattamente a una nazione la seleziono
   *
   * @param event FocusEvent Evento blur del campo paese.
   * @returns void
   */
  onBlurPaeseDom(event: FocusEvent): void {
    const dest = event.relatedTarget as HTMLElement | null; // leggo l'elemento che ricevera' il focus dopo il blur
    if (dest?.closest('.select-dropdown')) return; // se sto andando su un elemento interno al dropdown non faccio nulla
    const val = (event.target as HTMLInputElement).value.trim().toLowerCase(); // leggo il testo inserito e lo normalizzo
    if (!val) return; // se non c'e' testo non devo selezionare nulla
    if (this.paeseDomValore && this.paeseDomLabel().toLowerCase() === val) return; // se il testo coincide gia' col paese selezionato non faccio nulla
    const trovata = this.fs.nazioni.find(n =>
      (n.nazione_it ?? '').toLowerCase() === val || // provo a trovare una corrispondenza esatta col nome italiano
      (n.nazione_en ?? '').toLowerCase() === val // oppure col nome inglese
    );
    if (trovata) this.selezionaPaeseDom(trovata.iso); // se trovo una nazione valida la seleziono
  }

  /**
   * Salva il paese di domicilio selezionato e aggiorna i validator collegati.
   * - Aggiorna i prezzi per la nuova nazione
   * - Aggiorna il form e marca il controllo come toccato
   * - Se passo da Italia a estero o viceversa resetta i campi collegati
   * - Cambia i validator di comune, citta', provincia e CAP
   *
   * @param valore string Codice ISO del paese selezionato.
   * @returns void
   */
  selezionaPaeseDom(valore: string): void {
    const cambiaTipo = (valore === 'IT') !== (this.paeseDomValore === 'IT'); // controllo se sto passando da Italia a estero o viceversa
    this.paeseDomValore   = valore; // salvo il nuovo paese selezionato
    this.paeseDomAperto   = false; // chiudo il dropdown del paese
    this.filtroNazioniDom = ''; // pulisco il filtro del paese
    this.indiceNazioneDom = -1; // resetto l'indice tastiera della lista
    this.aggiornaPrezzi(valore); // aggiorno i prezzi mostrati in base alla nuova nazione
    this.form.get('nazioneD')!.setValue(valore); // aggiorno il controllo del form con il nuovo paese
    this.form.get('nazioneD')!.markAsTouched(); // marco il controllo come toccato

    if (cambiaTipo) {
      this.comuneDomValore = ''; // se cambio tipo azzero il comune selezionato
      this.filtroComuniDom = ''; // pulisco il filtro dei comuni
      this.capValore = ''; this.capIsMulti = false; this.capMultiOpzioni = []; // resetto tutto cio' che riguarda il CAP
      this.form.get('comuneD')!.setValue(''); // pulisco il controllo comune del form
      this.form.get('cittaD')!.setValue(''); // pulisco il controllo citta' del form
      this.form.get('provinciaD')!.setValue(''); // pulisco il controllo provincia del form
      this.form.get('cap')!.setValue(''); // pulisco il controllo CAP del form

      if (valore === 'IT') {
        this.form.get('comuneD')!.setValidators(Validators.required); // se torno in Italia rendo il comune obbligatorio
        this.form.get('cittaD')!.clearValidators(); // tolgo i validator della citta' estera
        this.form.get('provinciaD')!.setValidators([Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)]); // in Italia rendo obbligatoria la provincia con due lettere
        this.form.get('cap')!.setValidators([Validators.required, Validators.pattern(/^\d{5}$/)]); // in Italia rendo obbligatorio il CAP di cinque cifre
      } else {
        this.form.get('cittaD')!.setValidators([Validators.required, Validators.minLength(2), Validators.maxLength(80)]); // all'estero rendo obbligatoria la citta' libera con limiti di lunghezza
        this.form.get('comuneD')!.clearValidators(); // all'estero tolgo l'obbligatorieta' del comune italiano
        this.form.get('provinciaD')!.clearValidators(); // all'estero tolgo i validator della provincia
        this.form.get('cap')!.clearValidators(); // all'estero tolgo i validator del CAP
      }
      this.form.get('comuneD')!.updateValueAndValidity(); // ricalcolo validita' del controllo comune
      this.form.get('cittaD')!.updateValueAndValidity(); // ricalcolo validita' del controllo citta'
      this.form.get('provinciaD')!.updateValueAndValidity(); // ricalcolo validita' del controllo provincia
      this.form.get('cap')!.updateValueAndValidity(); // ricalcolo validita' del controllo CAP
    }
  }

  /**
   * Apre o chiude il dropdown del comune di domicilio.
   * - Blocca la propagazione del click
   * - Chiude gli altri dropdown
   * - Precarica il filtro col comune attuale
   * - Sposta il focus sull'input del filtro
   *
   * @param event Event Evento del click sul selettore.
   * @returns void
   */
  toggleComuneDom(event: Event): void {
    event.stopPropagation(); // blocco la propagazione cosi' il click non chiude subito il dropdown
    this.comuneDomAperto = !this.comuneDomAperto; // inverto lo stato di apertura del menu comune
    if (this.comuneDomAperto) {
      this.paeseDomAperto  = false; // se apro il comune chiudo il dropdown del paese
      this.capDomAperto    = false; // se apro il comune chiudo il dropdown del CAP
      this.indiceComuneDom = -1; // resetto l'indice tastiera della lista comuni
      this.filtroComuniDom = this.comuneDomValore ?? ''; // se ho gia' un comune selezionato precompilo il filtro con quel valore
      setTimeout(() => {
        const i = document.querySelector('.comune-dom-input') as HTMLInputElement; // cerco l'input del filtro comune nel DOM
        if (i) { i.focus(); i.select(); } // se lo trovo gli do focus e seleziono tutto il testo
      }, 0);
    }
    if (!this.comuneDomAperto) { this.filtroComuniDom = ''; this.indiceComuneDom = -1; } // se chiudo il menu pulisco filtro e indice
  }

  /**
   * Aggiorna il filtro del comune di domicilio mentre l'utente digita.
   * - Salva il testo corrente
   * - Resetta l'indice tastiera
   * - Apre il dropdown se era chiuso
   *
   * @param event Event Evento input del campo comune.
   * @returns void
   */
  onInputComuneDom(event: Event): void {
    this.filtroComuniDom = (event.target as HTMLInputElement).value; // leggo il testo corrente dell'input comune
    this.indiceComuneDom = -1; // resetto l'indice tastiera della lista
    if (!this.comuneDomAperto) this.comuneDomAperto = true; // se il dropdown era chiuso lo apro
  }

  /**
   * Gestisce la navigazione da tastiera nella lista dei comuni del domicilio.
   * - Freccia giu' scende
   * - Freccia su risale
   * - Enter seleziona il comune corrente
   * - Escape chiude il dropdown e pulisce filtro e indice
   *
   * @param event KeyboardEvent Evento tastiera dell'input comune.
   * @returns void
   */
  navigaComuneDom(event: KeyboardEvent): void {
    if (!this.comuneDomAperto) return; // se il menu non e' aperto non faccio nulla
    const lista = this.comuniFiltreatiDom; // ricavo la lista corrente dei comuni filtrati
    if (event.key === 'ArrowDown') {
      event.preventDefault(); // blocco il comportamento nativo del browser
      this.filtroComuniDom = (event.target as HTMLInputElement).value; // aggiorno il filtro col testo presente nell'input
      this.indiceComuneDom = Math.min(this.indiceComuneDom + 1, lista.length - 1); // avanzo di una posizione senza superare l'ultima
    } else if (event.key === 'ArrowUp') {
      event.preventDefault(); // blocco il comportamento nativo del browser
      this.filtroComuniDom = (event.target as HTMLInputElement).value; // tengo sincronizzato il filtro col contenuto dell'input
      this.indiceComuneDom = Math.max(this.indiceComuneDom - 1, -1); // risalgo di una posizione senza scendere sotto -1
    } else if (event.key === 'Enter' && this.indiceComuneDom >= 0) {
      event.preventDefault(); // blocco il comportamento nativo del browser
      this.selezionaComuneDom(lista[this.indiceComuneDom].comune); // seleziono il comune evidenziato
    } else if (event.key === 'Escape') {
      this.comuneDomAperto = false; // chiudo il dropdown del comune
      this.filtroComuniDom = ''; // pulisco il filtro dei comuni
      this.indiceComuneDom = -1; // resetto l'indice tastiera
    }
  }

  /**
   * Gestisce il blur del campo comune di domicilio.
   * - Se il focus passa dentro il dropdown non faccio nulla
   * - Se il testo scritto corrisponde esattamente a un comune lo seleziono
   *
   * @param event FocusEvent Evento blur del campo comune.
   * @returns void
   */
  onBlurComuneDom(event: FocusEvent): void {
    const dest = event.relatedTarget as HTMLElement | null; // leggo l'elemento che ricevera' il focus dopo il blur
    if (dest?.closest('.select-dropdown')) return; // se sto andando su un elemento del dropdown non faccio nulla
    const val = (event.target as HTMLInputElement).value.trim().toLowerCase(); // leggo e normalizzo il testo inserito
    if (!val) return; // se il campo e' vuoto non devo selezionare nulla
    if (this.comuneDomValore && this.comuneDomValore.toLowerCase() === val) return; // se il testo coincide gia' col comune scelto non faccio nulla
    const trovato = this.fs.comuni.find(c => (c.comune ?? '').toLowerCase() === val); // cerco una corrispondenza esatta tra i comuni disponibili
    if (trovato) this.selezionaComuneDom(trovato.comune); // se trovo una corrispondenza seleziono il comune
  }

  /**
   * Salva il comune di domicilio selezionato e aggiorna automaticamente provincia e CAP.
   * - Aggiorna il form e marca il controllo come toccato
   * - Compila la provincia dal comune selezionato
   * - Gestisce il caso di CAP singolo oppure multiplo
   * - Attiva gli effetti visivi di flash sui campi compilati
   *
   * @param valore string Comune selezionato.
   * @returns void
   */
  selezionaComuneDom(valore: string): void {
    this.comuneDomValore = valore; // salvo il valore del comune scelto
    this.comuneDomAperto = false; // chiudo il dropdown del comune
    this.filtroComuniDom = ''; // pulisco il filtro dei comuni
    this.indiceComuneDom = -1; // resetto l'indice tastiera
    this.form.get('comuneD')!.setValue(valore); // aggiorno il controllo comune del form
    this.form.get('comuneD')!.markAsTouched(); // marco il controllo come toccato

    const comune = this.fs.comuni.find(c => c.comune === valore); // cerco il record completo del comune selezionato
    if (!comune) return; // se non trovo il comune esco senza proseguire

    const sigla = (comune.sigla_automobilistica ?? '').toUpperCase(); // ricavo la sigla automobilistica della provincia in maiuscolo
    this.form.get('provinciaD')!.setValue(sigla); // aggiorno il controllo provincia del form
    this.form.get('provinciaD')!.markAsTouched(); // marco il controllo provincia come toccato
    this.provinciaFlash = false; // azzero prima il flag di flash per poterlo riattivare
    setTimeout(() => { this.provinciaFlash = true;  }, 10); // attivo quasi subito il flash visivo sulla provincia
    setTimeout(() => { this.provinciaFlash = false; }, 1510); // spengo il flash dopo il tempo voluto

    this.capValore = ''; this.capIsMulti = false; this.capMultiOpzioni = []; // resetto tutto cio' che riguarda il CAP precedente
    this.capFlash  = false; // spengo il flag di flash del CAP
    this.form.get('cap')!.setValue(''); // pulisco il controllo CAP del form

    if (comune.cap_inizio && comune.cap_fine && String(comune.cap_inizio) !== String(comune.cap_fine)) {
      const inizio = parseInt(String(comune.cap_inizio), 10); // converto il CAP iniziale in numero
      const fine   = parseInt(String(comune.cap_fine),   10); // converto il CAP finale in numero
      if (!isNaN(inizio) && !isNaN(fine) && fine > inizio) {
        const opzioni: string[] = []; // preparo l'array che conterra' tutti i CAP possibili
        for (let n = inizio; n <= fine; n++) opzioni.push(String(n).padStart(5, '0')); // genero tutte le opzioni CAP comprese nell'intervallo
        this.capIsMulti = true; // segno che il comune ha piu' CAP possibili
        this.capMultiOpzioni = opzioni; // salvo tutte le opzioni CAP generate
        this.form.get('cap')!.clearValidators(); // rimuovo temporaneamente i validator del CAP finche' l'utente non sceglie un'opzione
        this.form.get('cap')!.updateValueAndValidity(); // aggiorno subito la validita' del controllo CAP
        setTimeout(() => { this.capFlash = true; setTimeout(() => { this.capFlash = false; }, 1510); }, 30); // attivo il flash visivo sul CAP multi-opzione
        return; // esco qui perche' il CAP dovra' essere scelto dall'utente
      }
    }
    if (comune.cap) {
      this.capValore = String(comune.cap).padStart(5, '0'); // se il comune ha un CAP singolo lo salvo in formato a cinque cifre
      this.form.get('cap')!.setValue(this.capValore); // aggiorno il controllo CAP del form
      this.form.get('cap')!.markAsTouched(); // marco il controllo CAP come toccato
      setTimeout(() => { this.capFlash = true;  }, 10); // attivo quasi subito il flash visivo sul CAP
      setTimeout(() => { this.capFlash = false; }, 1510); // spengo il flash dopo il tempo voluto
    }
  }

  /**
   * Apre o chiude il dropdown del CAP quando ci sono piu' opzioni disponibili.
   * - Blocca la propagazione del click
   * - Chiude gli altri dropdown
   * - Precarica il filtro col CAP attuale
   * - Sposta il focus sull'input del filtro
   *
   * @param event Event Evento del click sul selettore.
   * @returns void
   */
  toggleCapDom(event: Event): void {
    event.stopPropagation(); // blocco la propagazione cosi' il click non interferisce con altri listener
    this.capDomAperto = !this.capDomAperto; // inverto lo stato di apertura del menu CAP
    if (this.capDomAperto) {
      this.paeseDomAperto  = false; // se apro il CAP chiudo il dropdown del paese
      this.comuneDomAperto = false; // se apro il CAP chiudo il dropdown del comune
      this.indiceCapDom    = -1; // resetto l'indice tastiera della lista CAP
      this.filtroCapDom    = this.capValore ?? ''; // se ho gia' un CAP selezionato precompilo il filtro con quel valore
      setTimeout(() => {
        const i = document.querySelector('.cap-dom-input') as HTMLInputElement; // cerco l'input del filtro CAP nel DOM
        if (i) { i.focus(); i.select(); } // se lo trovo gli do focus e seleziono tutto il testo
      }, 0);
    }
    if (!this.capDomAperto) { this.filtroCapDom = ''; this.indiceCapDom = -1; } // se chiudo il menu pulisco filtro e indice
  }

  /**
   * Aggiorna il filtro del CAP mentre l'utente digita.
   * - Salva il testo corrente
   * - Resetta l'indice tastiera
   * - Apre il dropdown se era chiuso
   *
   * @param event Event Evento input del campo CAP.
   * @returns void
   */
  onInputCapDom(event: Event): void {
    this.filtroCapDom = (event.target as HTMLInputElement).value; // leggo il testo corrente dell'input CAP
    this.indiceCapDom = -1; // resetto l'indice tastiera della lista
    if (!this.capDomAperto) this.capDomAperto = true; // se il dropdown era chiuso lo apro
  }

  /**
   * Gestisce la navigazione da tastiera nella lista dei CAP.
   * - Freccia giu' scende
   * - Freccia su risale
   * - Enter seleziona il CAP corrente
   * - Escape chiude il dropdown e pulisce filtro e indice
   *
   * @param event KeyboardEvent Evento tastiera dell'input CAP.
   * @returns void
   */
  navigaCapDom(event: KeyboardEvent): void {
    if (!this.capDomAperto) return; // se il menu non e' aperto non faccio nulla
    const lista = this.capFiltrate; // ricavo la lista corrente dei CAP filtrati
    if (event.key === 'ArrowDown') {
      event.preventDefault(); // blocco il comportamento nativo del browser
      this.indiceCapDom = Math.min(this.indiceCapDom + 1, lista.length - 1); // avanzo di una posizione senza superare l'ultima
    } else if (event.key === 'ArrowUp') {
      event.preventDefault(); // blocco il comportamento nativo del browser
      this.indiceCapDom = Math.max(this.indiceCapDom - 1, -1); // risalgo di una posizione senza scendere sotto -1
    } else if (event.key === 'Enter' && this.indiceCapDom >= 0) {
      event.preventDefault(); // blocco il comportamento nativo del browser
      this.selezionaCapDom(lista[this.indiceCapDom]); // seleziono il CAP evidenziato
    } else if (event.key === 'Escape') {
      this.capDomAperto = false; // chiudo il dropdown del CAP
      this.filtroCapDom = ''; // pulisco il filtro dei CAP
      this.indiceCapDom = -1; // resetto l'indice tastiera
    }
  }

  /**
   * Gestisce il blur del campo CAP.
   * - Se il focus passa dentro il dropdown non faccio nulla
   * - Se il testo scritto corrisponde a un'opzione valida la seleziono
   *
   * @param event FocusEvent Evento blur del campo CAP.
   * @returns void
   */
  onBlurCapDom(event: FocusEvent): void {
    const dest = event.relatedTarget as HTMLElement | null; // leggo l'elemento che ricevera' il focus dopo il blur
    if (dest?.closest('.select-dropdown')) return; // se sto andando su un elemento del dropdown non faccio nulla
    const val = (event.target as HTMLInputElement).value.trim(); // leggo il testo inserito senza normalizzarlo perche' il CAP e' numerico
    if (!val || this.capValore === val) return; // se il valore e' vuoto o coincide gia' con quello selezionato non faccio nulla
    const trovato = this.capMultiOpzioni.find(c => c === val); // cerco una corrispondenza esatta tra le opzioni CAP disponibili
    if (trovato) this.selezionaCapDom(trovato); // se trovo una corrispondenza seleziono il CAP
  }

  /**
   * Salva il CAP selezionato e aggiorna il form.
   * - Chiude il dropdown
   * - Ripristina i validator del CAP
   * - Marca il controllo come toccato
   * - Attiva il flash visivo
   *
   * @param valore string CAP selezionato.
   * @returns void
   */
  selezionaCapDom(valore: string): void {
    this.capValore    = valore; // salvo il CAP selezionato
    this.capDomAperto = false; // chiudo il dropdown del CAP
    this.filtroCapDom = ''; // pulisco il filtro dei CAP
    this.indiceCapDom = -1; // resetto l'indice tastiera
    this.form.get('cap')!.setValidators([Validators.required, Validators.pattern(/^\d{5}$/)]); // ripristino i validator standard del CAP italiano
    this.form.get('cap')!.setValue(valore); // aggiorno il controllo CAP del form
    this.form.get('cap')!.markAsTouched(); // marco il controllo come toccato
    this.form.get('cap')!.updateValueAndValidity(); // ricalcolo subito la validita' del controllo CAP
    setTimeout(() => { this.capFlash = true;  }, 10); // attivo quasi subito il flash visivo sul CAP
    setTimeout(() => { this.capFlash = false; }, 1510); // spengo il flash dopo il tempo voluto
  }

  /**
   * Gestisce la digitazione manuale nel campo CAP.
   * - Tiene solo le cifre
   * - Sincronizza il valore locale
   * - Aggiorna il controllo del form
   *
   * @param event Event Evento input del campo CAP.
   * @returns void
   */
  onInputCap(event: Event): void {
    const input = event.target as HTMLInputElement; // recupero l'input reale del CAP
    const val   = input.value.replace(/[^0-9]/g, ''); // tengo solo i caratteri numerici eliminando tutto il resto
    input.value = val; // riscrivo il valore pulito nell'input
    this.capValore = val; // sincronizzo il valore locale del CAP
    this.form.get('cap')!.setValue(val); // aggiorno il controllo CAP del form
  }

  /**
   * Gestisce la digitazione manuale nel campo provincia.
   * - Porta il testo in maiuscolo
   * - Tiene solo le lettere
   * - Aggiorna il controllo del form
   *
   * @param event Event Evento input del campo provincia.
   * @returns void
   */
  onInputProvincia(event: Event): void {
    const input = event.target as HTMLInputElement; // recupero l'input reale della provincia
    const val   = input.value.toUpperCase().replace(/[^A-Z]/g, ''); // tengo solo lettere maiuscole eliminando tutto il resto
    input.value = val; // riscrivo il valore pulito nell'input
    this.form.get('provinciaD')!.setValue(val); // aggiorno il controllo provincia del form
  }

  /**
   * Verifica la coerenza tra comune, provincia e CAP del domicilio.
   * - Se non sono in Italia considero tutto coerente
   * - Se non trovo il comune considero tutto coerente
   * - In Italia controllo che la provincia corrisponda
   * - Controllo che il CAP sia uguale oppure dentro l'intervallo previsto
   *
   * @returns boolean True se l'indirizzo e' coerente, altrimenti false.
   */
  verificaCoerenzaIndirizzo(): boolean {
    if (!this.isItaliaDom) return true; // se il domicilio non e' in Italia non applico questo controllo di coerenza
    const comune = this.fs.comuni.find(c => c.comune === this.comuneDomValore); // cerco il record completo del comune selezionato
    if (!comune) return true; // se non trovo il comune non blocco qui il flusso

    const provinciaInserita = (this.form.get('provinciaD')!.value ?? '').toUpperCase(); // leggo la provincia inserita dall'utente e la porto in maiuscolo
    const provinciaAttesa   = (comune.sigla_automobilistica ?? '').toUpperCase(); // ricavo la provincia attesa dal comune selezionato

    let capOk: boolean; // preparo la variabile che dira' se il CAP e' coerente col comune
    if (comune.cap_inizio && comune.cap_fine && String(comune.cap_inizio) !== String(comune.cap_fine)) {
      const inizio = parseInt(String(comune.cap_inizio), 10); // converto il CAP iniziale in numero
      const fine   = parseInt(String(comune.cap_fine),   10); // converto il CAP finale in numero
      const capNum = parseInt(this.capValore, 10); // converto il CAP inserito o selezionato in numero
      capOk = !isNaN(capNum) && capNum >= inizio && capNum <= fine; // considero valido il CAP se sta dentro l'intervallo previsto
    } else {
      capOk = this.capValore === String(comune.cap).padStart(5, '0'); // nel caso di CAP singolo controllo che coincida esattamente
    }
    return provinciaInserita === provinciaAttesa && capOk; // restituisco true solo se provincia e CAP risultano entrambi coerenti
  }

  /**
   * Chiude contemporaneamente tutti i dropdown custom del secondo step.
   *
   * @returns void
   */
  chiudiDropdown(): void {
    this.paeseDomAperto  = false; // chiudo il dropdown del paese di domicilio
    this.comuneDomAperto = false; // chiudo il dropdown del comune di domicilio
    this.capDomAperto    = false; // chiudo il dropdown del CAP
  }
}
