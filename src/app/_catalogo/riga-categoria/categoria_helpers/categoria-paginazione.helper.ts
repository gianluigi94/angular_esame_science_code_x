// Helper che gestisce lo stato della paginazione del carosello e aggiorna lo scorrimento del wrapper.

export class CategoriaPaginazioneHelper {
  indicePagina = 0; // tengo l'indice della pagina corrente
  numeroMassimoPagine = 0; // tengo il numero massimo di pagine raggiungibili
  trasformazioneWrapper = ''; // memorizzo la translateX del wrapper
  cicloTrackBy = 0; // tengo un contatore per forzare il refresh del trackBy

  /**
   * Aggiorna il numero massimo di pagine disponibili.
   * - Divide il totale delle locandine per quelle visibili
   * - Converte il risultato nel massimo indice pagina raggiungibile
   * - Garantisce sempre un valore minimo pari a zero
   *
   * @param totalLocandine Numero totale di locandine presenti.
   * @param locandineVisibili Numero di locandine visibili per pagina.
   * @returns void
   */
  calcolaNumeroMassimoPagine(
    totalLocandine: number,
    locandineVisibili: number,
  ): void {
    this.numeroMassimoPagine = Math.max(
      Math.ceil(totalLocandine / locandineVisibili) - 1,
      0,
    ); // calcolo il massimo indice pagina partendo da totale e visibili
  }

  /**
   * Ricalcola la trasformazione del wrapper del carosello.
   * - Usa l'indice pagina corrente
   * - Traduce il wrapper a step del 100 percento
   *
   * @returns void
   */
  aggiornaTrasformazioneWrapper(): void {
    this.trasformazioneWrapper = `translateX(${-this.indicePagina * 100}%)`; // aggiorno la translateX del wrapper in base alla pagina corrente
  }

  /**
   * Imposta la pagina iniziale del carosello.
   * - Normalizza il valore ricevuto
   * - Applica un clamp tra zero e il massimo disponibile
   * - Aggiorna subito la trasformazione del wrapper
   *
   * @param pagina Pagina iniziale richiesta.
   * @returns void
   */
  impostaPaginaIniziale(pagina: number): void {
    const clamped = Math.max(
      0,
      Math.min(
        Number.isFinite(pagina) ? Math.floor(pagina) : 0,
        this.numeroMassimoPagine,
      ),
    ); // porto la pagina dentro i limiti validi
    this.indicePagina = clamped; // salvo la pagina iniziale effettiva
    this.aggiornaTrasformazioneWrapper(); // aggiorno la posizione del wrapper
  }

  /**
   * Avanza alla pagina successiva del carosello.
   * - Verifica che esista una pagina successiva
   * - Aggiorna indice e trasformazione
   * - Esegue la callback di scroll fornita dal chiamante
   *
   * @param onScroll Callback da eseguire dopo il cambio pagina.
   * @returns void
   */
  paginaSuccessiva(onScroll: () => void): void {
    if (this.indicePagina < this.numeroMassimoPagine) {
      this.indicePagina++; // avanzo di una pagina se non sono gia' all'ultima
      this.aggiornaTrasformazioneWrapper(); // aggiorno la posizione del wrapper
      onScroll(); // notifico il chiamante dopo l'avanzamento
    }
  }

  /**
   * Torna alla pagina precedente del carosello.
   * - Verifica che esista una pagina precedente
   * - Aggiorna indice e trasformazione
   * - Esegue la callback di scroll fornita dal chiamante
   *
   * @param onScroll Callback da eseguire dopo il cambio pagina.
   * @returns void
   */
  paginaPrecedente(onScroll: () => void): void {
    if (this.indicePagina > 0) {
      this.indicePagina--; // torno indietro di una pagina se non sono gia' alla prima
      this.aggiornaTrasformazioneWrapper(); // aggiorno la posizione del wrapper
      onScroll(); // notifico il chiamante dopo l'arretramento
    }
  }

  /**
   * Salva nello storico la pagina corrente della categoria.
   * - Esce subito se il salvataggio non e' abilitato
   * - Legge lo storico esistente da sessionStorage
   * - Aggiunge il nuovo record con categoria e pagina corrente
   * - Risalva lo storico aggiornato
   *
   * @param idCategoria Identificativo della categoria corrente.
   * @param abilitaSalvataggio Indica se il salvataggio dello storico e' attivo.
   * @returns void
   */
  registraClickScrollCategoria(
    idCategoria: string,
    abilitaSalvataggio: boolean,
  ): void {
    if (!abilitaSalvataggio) return; // esco subito se il salvataggio non e' attivo
    try {
      const chiave = 'storico_scroll_categorie'; // definisco la chiave di storage dello storico
      const raw = sessionStorage.getItem(chiave); // leggo l'eventuale storico gia' salvato
      const storico = raw ? JSON.parse(raw) : []; // ricostruisco lo storico oppure parto da lista vuota
      storico.push({
        idCategoria: String(idCategoria || '').trim(),
        pagina: this.indicePagina,
      }); // aggiungo la categoria con la pagina corrente
      sessionStorage.setItem(chiave, JSON.stringify(storico)); // salvo nuovamente lo storico aggiornato
    } catch {} // provo a salvare senza rompere il flusso in caso di errore
  }

  /**
   * Restituisce la chiave da usare nel trackBy della locandina.
   * - Usa la src come chiave base
   * - Quando e' attiva la copertura per cambio tipo include anche ciclo e indice
   * - Permette cosi' di forzare il refresh degli elementi quando serve
   *
   * @param indice Indice della locandina nel ciclo corrente.
   * @param loc Locandina di riferimento.
   * @param mostraSpinner Indica se e' attiva la copertura con spinner.
   * @param motivoCopertura Motivo corrente della copertura.
   * @returns string Chiave trackBy da usare per la locandina.
   */
  tracciaLocandina(
    indice: number,
    loc: { src: string },
    mostraSpinner: boolean,
    motivoCopertura: string,
  ): string {
    const base = String(loc?.src || ''); // ricavo la chiave base partendo dalla src
    if (mostraSpinner && motivoCopertura === 'tipo')
      return this.cicloTrackBy + '|' + indice + '|' + base; // costruisco una chiave estesa per forzare il refresh nel cambio tipo
    return base; // nel caso normale uso solo la chiave base
  }

  /**
   * Incrementa il contatore usato dal trackBy.
   * - Serve a invalidare le chiavi precedenti
   * - Viene usato nei casi in cui va forzato il refresh delle locandine
   *
   * @returns void
   */
  incrementaCicloTrackBy(): void {
    this.cicloTrackBy += 1; // incremento il contatore che forza il refresh del trackBy
  }

  /**
   * Reimposta la paginazione alla pagina iniziale.
   * - Riporta l'indice pagina a zero
   * - Aggiorna subito la trasformazione del wrapper
   *
   * @returns void
   */
  resetPagina(): void {
    this.indicePagina = 0; // riporto la pagina corrente alla prima
    this.aggiornaTrasformazioneWrapper(); // aggiorno la posizione del wrapper dopo il reset
  }
}
