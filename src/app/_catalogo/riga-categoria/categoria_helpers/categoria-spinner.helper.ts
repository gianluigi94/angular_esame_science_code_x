// Helper che gestisce la copertura con spinner durante cambio lingua e cambio tipo.

import { ChangeDetectorRef, ElementRef, QueryList } from '@angular/core';

export class CategoriaSpinnerHelper {
  mostraSpinner = false; //lo stato di visibilita' dello spinner
  motivoCopertura = ''; // memorizzo il motivo corrente della copertura
  inAttesaImmagini = false; // segno se sto aspettando le immagini
  attendoAggiornamentoLocandine = false; // segno se sto aspettando l'aggiornamento delle locandine

  private idCiclo = 0; //l'id del ciclo corrente
  private avvioSpinnerAt = 0; // salvo quando parte lo spinner
  private totaleAtteso = 0; //quante immagini devo aspettare
  private conteggioCaricate = 0; // conto quante immagini sono arrivate
  private readonly permanenzaMinimaMs = 350; // imposto la permanenza minima dello spinner
  private readonly fallbackMaxMs = 2000; // imposto il timeout massimo di fallback
  private timerFallback: any = 0; //il timer di fallback
  private timerNascondi: any = 0; //il timer di chiusura

  constructor(
    private cdr: ChangeDetectorRef,
    private getElementi: () => QueryList<ElementRef>,
    private getLocandine: () => any[],
  ) {}

  /**
   * Avvia un nuovo ciclo di copertura.
   * - Reimposta timer e contatori
   * - Mostra subito lo spinner
   * - Forza il refresh della view
   * - Se il motivo e' 'tipo' verifica anche la copertura completa
   *
   * @param motivo Motivo che ha avviato la copertura.
   * @param idForzato Id opzionale da usare al posto dell'incremento automatico.
   * @returns number Id del ciclo di copertura avviato.
   */
  avviaCopertura(motivo: string, idForzato = 0): number {
    this.idCiclo = idForzato || (this.idCiclo + 1); // imposto l'id del ciclo corrente
    this.motivoCopertura = motivo; // salvo il motivo della copertura
    this.azzeraTimer(); // pulisco i timer del ciclo precedente
    this.inAttesaImmagini = false; // resetto lo stato di attesa immagini
    this.totaleAtteso = 0; // azzero il totale atteso
    this.conteggioCaricate = 0; // azzero il conteggio delle immagini caricate
    this.mostraSpinner = true; // mostro subito lo spinner
    this.avvioSpinnerAt = Date.now(); // salvo il momento di avvio
    try {
      this.cdr.detectChanges();
    } catch {} // provo ad aggiornare subito la view
    requestAnimationFrame(() => {
      try {
        this.cdr.detectChanges();
      } catch {} // riprovo il refresh al frame successivo
      if (motivo === 'tipo') this.assicuraCoperturaCompleta(this.idCiclo, 0); // se sto cambiando tipo controllo che la copertura sia davvero visibile
    });
    return this.idCiclo; // restituisco l'id del ciclo appena avviato
  }

  /**
   * Avvia l'attesa delle immagini durante il cambio lingua.
   * - Verifica che il ciclo sia ancora valido
   * - Esce se lo spinner non e' visibile
   * - Esce se le locandine non sono ancora state aggiornate
   * - Calcola quante immagini deve aspettare
   * - Attiva un fallback temporale massimo
   *
   * @param id Id del ciclo che richiede l'attesa.
   * @returns void
   */
  avviaAttesaImmaginiLingua(id: number): void {
    if (id !== this.idCiclo) return; // esco se il ciclo non e' piu' quello corrente
    if (!this.mostraSpinner) return; // esco se la copertura non e' piu' visibile
    if (this.attendoAggiornamentoLocandine) return; // esco se sto ancora aspettando l'aggiornamento delle locandine

    this.inAttesaImmagini = true; // entro nello stato di attesa immagini
    this.totaleAtteso = (this.getLocandine() || []).length; // leggo quante locandine devo aspettare
    this.conteggioCaricate = 0; // resetto il conteggio delle immagini caricate

    if (this.totaleAtteso === 0) {
      this.fineSePronto(true, id);
      return;
    } // se non devo aspettare nulla provo a chiudere subito
    if (this.timerFallback) clearTimeout(this.timerFallback); // cancello un eventuale fallback precedente
    this.timerFallback = setTimeout(() => this.fineSePronto(true, id), this.fallbackMaxMs); // pianifico la chiusura forzata al timeout massimo
  }

  /**
   * Registra la stabilizzazione di una singola immagine.
   * - Aggiorna il conteggio interno
   * - Verifica se ora la copertura puo' terminare
   *
   * @returns void
   */
  immagineStabilizzata(): void {
    if (!this.inAttesaImmagini) return; // esco se non sto aspettando immagini
    this.conteggioCaricate += 1; // incremento il numero di immagini caricate
    this.fineSePronto(false, this.idCiclo); // verifico se posso chiudere la copertura
  }

  /**
   * Chiude la copertura quando tutto e' pronto oppure in caso di forzatura.
   * - Verifica che il ciclo sia ancora valido
   * - Controlla se il contenuto e' pronto
   * - Rispetta la permanenza minima dello spinner
   * - Nasconde la copertura al termine dell'attesa residua
   *
   * @param forzatura Indica se la chiusura deve avvenire anche senza tutte le immagini.
   * @param id Id del ciclo da validare prima della chiusura.
   * @returns void
   */
  fineSePronto(forzatura: boolean, id: number): void {
    if (id !== this.idCiclo) return; // esco se il ciclo non e' piu' valido
    const pronto = forzatura || this.conteggioCaricate >= this.totaleAtteso; // verifico se posso considerare pronto il contenuto
    if (!pronto) return; // esco se non sono ancora pronto
    this.inAttesaImmagini = false; // tolgo lo stato di attesa immagini
    if (this.timerNascondi) clearTimeout(this.timerNascondi); // cancello una chiusura gia' pianificata
    const manca = Math.max(0, this.permanenzaMinimaMs - (Date.now() - (this.avvioSpinnerAt || 0))); // calcolo quanto manca alla permanenza minima
    this.timerNascondi = setTimeout(() => {
      if (id !== this.idCiclo) return; // continuo solo se il ciclo e' ancora valido
      this.mostraSpinner = false; // nascondo lo spinner
      this.motivoCopertura = ''; // pulisco il motivo della copertura
      try {
        this.cdr.detectChanges();
      } catch {} // provo ad aggiornare la view dopo la chiusura
    }, manca);
  }

  /**
   * Chiude la copertura dopo un breve ritardo minimo.
   * - Verifica che il ciclo sia ancora valido
   * - Annulla eventuali chiusure gia' pianificate
   * - Nasconde spinner e motivo dopo il ritardo previsto
   *
   * @param id Id del ciclo da validare prima della chiusura.
   * @returns void
   */
  fineCoperturaDopoMinimo(id: number): void {
    if (id !== this.idCiclo) return; // esco se il ciclo non e' piu' valido
    if (this.timerNascondi) clearTimeout(this.timerNascondi); // cancello un'eventuale chiusura precedente
    this.timerNascondi = setTimeout(() => {
      if (id !== this.idCiclo) return; // continuo solo se il ciclo e' ancora valido
      this.mostraSpinner = false; // nascondo lo spinner
      this.motivoCopertura = ''; // pulisco il motivo della copertura
      try {
        this.cdr.detectChanges();
      } catch {} // provo ad aggiornare la view dopo la chiusura
    }, 100);
  }

  /**
   * Cancella tutti i timer interni della copertura.
   *
   * @returns void
   */
  azzeraTimer(): void {
    if (this.timerFallback) {
      clearTimeout(this.timerFallback);
      this.timerFallback = 0;
    } // cancello il timer di fallback se esiste
    if (this.timerNascondi) {
      clearTimeout(this.timerNascondi);
      this.timerNascondi = 0;
    } // cancello il timer di chiusura se esiste
  }

  /**
   * Verifica che la copertura risulti davvero visibile su tutte le locandine.
   * - Verifica che il ciclo sia ancora valido
   * - Aspetta la presenza degli elementi se non sono ancora pronti
   * - Controlla la classe visibile su ogni cover
   * - Forza nuovi tentativi fino al limite massimo
   *
   * @param id Id del ciclo da validare.
   * @param tentativi Numero di tentativi gia' effettuati.
   * @returns void
   */
  assicuraCoperturaCompleta(id: number, tentativi: number): void {
    if (id !== this.idCiclo) return; // esco se il ciclo non e' piu' valido
    if (!this.mostraSpinner) return; // esco se la copertura non e' piu' visibile

    const lista = this.getElementi()?.toArray() ?? []; // recupero gli elementi correnti da controllare
    if (!lista.length) {
      if (tentativi >= 10) return; // smetto di riprovare se ho raggiunto il limite
      requestAnimationFrame(() => this.assicuraCoperturaCompleta(id, tentativi + 1)); // riprovo al frame successivo se gli elementi non sono ancora pronti
      return;
    }
    let ok = true; // parto assumendo che tutte le coperture siano visibili
    for (const ref of lista) {
      const cover = ref?.nativeElement?.querySelector('.carica_img'); // cerco la cover dentro l'elemento corrente
      if (!cover?.classList?.contains('visibile')) {
        ok = false;
        break;
      } // se una cover non e' visibile segno che devo riprovare
    }
    if (ok || tentativi >= 10) return; // esco se e' tutto pronto oppure se ho finito i tentativi
    try {
      this.cdr.detectChanges();
    } catch {} // provo a forzare il refresh prima del nuovo tentativo
    requestAnimationFrame(() => this.assicuraCoperturaCompleta(id, tentativi + 1)); // riprogrammo il controllo al frame successivo
  }

  /**
   * Restituisce l'id del ciclo di copertura corrente.
   *
   * @returns number Id del ciclo corrente.
   */
  leggiIdCiclo(): number {
    return this.idCiclo; // restituisco l'id del ciclo corrente
  }

  /**
   * Ripulisce l'helper alla distruzione.
   *
   * @returns void
   */
  destroy(): void {
    this.azzeraTimer(); // pulisco tutti i timer ancora attivi
  }
}
