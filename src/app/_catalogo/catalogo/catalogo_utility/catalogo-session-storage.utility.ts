// Utility che gestisce lettura, pulizia e applicazione dei dati in sessionStorage per autoscroll verticale e ripristino dello scroll orizzontale delle categorie del catalogo.

export class CatalogoSessionStorageUtility {
  /**
   * Legge da sessionStorage l'id dell'ultima categoria cliccata.
   * - Recupera il valore salvato con la chiave dedicata
   * - Lo normalizza come stringa ripulita
   * - In caso di errore restituisce una stringa vuota
   *
   * @returns string Id categoria letto da sessionStorage oppure stringa vuota.
   */
  static leggiCategoriaDaSessionStorage(): string {
    try {
      return String(
        sessionStorage.getItem('ultima_categoria_click') || '',
      ).trim(); // leggo e normalizzo l'id dell'ultima categoria cliccata salvata in sessionStorage
    } catch {
      return ''; // se la lettura fallisce restituisco una stringa vuota come fallback sicuro
    }
  }

  /**
   * Rimuove da sessionStorage l'id dell'ultima categoria cliccata.
   *
   * @returns void
   */
  static pulisciCategoriaDaSessionStorage(): void {
    try {
      sessionStorage.removeItem('ultima_categoria_click'); // provo a rimuovere da sessionStorage la chiave dell'ultima categoria cliccata
    } catch {} // ignoro eventuali errori di accesso a sessionStorage
  }

  /**
   * Rimuove da sessionStorage lo storico dello scroll orizzontale delle categorie.
   *
   * @returns void
   */
  static pulisciStoricoScrollOrizzontaleDaSessionStorage(): void {
    try {
      sessionStorage.removeItem('storico_scroll_categorie'); // provo a rimuovere da sessionStorage lo storico dello scroll orizzontale delle categorie
    } catch {} // ignoro eventuali errori di accesso a sessionStorage
  }

  /**
   * Prova ad avviare automaticamente lo scroll verso la categoria salvata in sessione.
   * - Evita esecuzioni multiple nella stessa sessione logica
   * - Se non trova una categoria salvata riporta la pagina in cima
   * - Pianifica lo scroll alla categoria con un piccolo ritardo
   * - Prova poi ad applicare anche lo scroll orizzontale iniziale della riga corrispondente
   * - Pulisce infine i dati temporanei usati per l'operazione
   *
   * @param contesto Contesto che espone stato, timer, servizi e metodi necessari alla gestione dell'autoscroll.
   * @returns void
   */
  static provaAutoScrollDaSessionStorage(contesto: any): void {
    if (contesto.autoScrollSessioneEseguito) return; // se l'autoscroll di sessione e' gia' stato eseguito esco subito

    const idCategoria =
      CatalogoSessionStorageUtility.leggiCategoriaDaSessionStorage(); // leggo da sessionStorage l'eventuale id categoria da raggiungere
    if (!idCategoria) {
      contesto.servizioAnimazioni.scrollaA(0, 0); // se non ho una categoria salvata riporto subito la pagina in cima
      return; // esco senza proseguire con l'autoscroll
    }

    contesto.autoScrollSessioneEseguito = true; // segno che l'autoscroll di sessione e' stato avviato per evitare doppie esecuzioni

    if (contesto.timerAutoScrollSessione) {
      clearTimeout(contesto.timerAutoScrollSessione); // se esiste un timer precedente di autoscroll sessione lo annullo
      contesto.timerAutoScrollSessione = 0; // azzero il riferimento al timer di autoscroll sessione
    }

    contesto.timerAutoScrollSessione = setTimeout(() => {
      // pianifico l'autoscroll con un piccolo ritardo per lasciare stabilizzare il catalogo
      contesto.timerAutoScrollSessione = 0; // azzero il riferimento al timer appena scatta
      contesto.gestisciScrollACategoria(idCategoria); // avvio lo scroll verticale verso la categoria salvata

      setTimeout(() => {
        // poco dopo provo anche a ripristinare la pagina orizzontale della riga corrispondente
        const esito =
          CatalogoSessionStorageUtility.applicaScrollOrizzontaleInizialePerCategoria(
            contesto,
            idCategoria,
          ); // provo ad applicare lo scroll orizzontale iniziale per la categoria richiesta

        CatalogoSessionStorageUtility.pulisciStoricoScrollOrizzontaleDaSessionStorage(); // pulisco lo storico orizzontale temporaneo usato per il ripristino

        if (esito?.eseguito) {
          CatalogoSessionStorageUtility.salvaScrollOrizzontaleInSessionStorage(
            esito.idCategoria,
            esito.pagina,
          );
        } // se il ripristino e' stato eseguito risalvo il nuovo stato orizzontale coerente
      }, 120);

      CatalogoSessionStorageUtility.pulisciCategoriaDaSessionStorage(); // pulisco subito la categoria salvata in sessione dopo aver avviato il flusso
    }, 80);
  }

  /**
   * Legge da sessionStorage la pagina orizzontale salvata per una categoria specifica.
   * - Valida l'id categoria richiesto
   * - Recupera e interpreta lo storico serializzato
   * - Cerca l'ultima voce corrispondente alla categoria richiesta
   * - Valida il numero di pagina trovato
   * - Restituisce una struttura normalizzata oppure null
   *
   * @param idCategoria Id della categoria per cui recuperare la pagina orizzontale salvata.
   * @returns {{ idCategoria: string; pagina: number } | null} Dati validi di scroll orizzontale per la categoria oppure null.
   */
  static leggiScrollOrizzontalePerCategoriaDaSessionStorage(
    idCategoria: string,
  ): { idCategoria: string; pagina: number } | null {
    try {
      const id = String(idCategoria || '').trim(); // normalizzo l'id categoria richiesto
      if (!id) return null; // se l'id e' vuoto esco subito con null

      const raw = sessionStorage.getItem('storico_scroll_categorie'); // leggo da sessionStorage il JSON dello storico scroll categorie
      if (!raw) return null; // se non esiste nulla salvato esco con null

      const storico = JSON.parse(raw); // provo a interpretare il contenuto JSON salvato
      if (!Array.isArray(storico) || !storico.length) return null; // se il contenuto non e' un array valido o e' vuoto esco con null

      let trovato: any = null; // preparo una variabile dove salvero' l'ultima voce trovata per la categoria richiesta

      for (let i = storico.length - 1; i >= 0; i--) {
        // scorro lo storico dalla fine per trovare la voce piu' recente della categoria richiesta
        const voce = storico[i] || {}; // recupero la voce corrente con fallback a oggetto vuoto
        const idVoce = String(voce?.idCategoria || '').trim(); // normalizzo l'id categoria della voce corrente
        if (idVoce === id) {
          trovato = voce; // salvo la voce trovata
          break; // interrompo il ciclo alla prima corrispondenza piu' recente
        }
      }

      if (!trovato) return null; // se non ho trovato nessuna voce per la categoria richiesta esco con null

      const pagina = Number(trovato?.pagina); // converto in numero la pagina salvata nella voce trovata
      if (!Number.isFinite(pagina) || pagina < 0) return null; // se la pagina non e' valida oppure e' negativa esco con null

      return { idCategoria: id, pagina: Math.floor(pagina) }; // restituisco il risultato normalizzato usando una pagina intera non negativa
    } catch {
      return null; // se qualcosa fallisce nella lettura o nel parsing restituisco null
    }
  }

  /**
   * Prova ad applicare alla riga corretta la pagina orizzontale iniziale salvata in sessione.
   * - Legge i dati di scroll orizzontale per la categoria richiesta
   * - Cerca il componente riga corrispondente tra quelli renderizzati
   * - Applica la pagina iniziale al target trovato
   * - Restituisce l'esito dell'operazione con i dati applicati
   *
   * @param contesto Contesto che espone la lista dei componenti riga renderizzati.
   * @param idCategoria Id della categoria su cui provare ad applicare lo scroll orizzontale iniziale.
   * @returns {{ eseguito: boolean; idCategoria: string; pagina: number } | null} Esito applicato oppure null se impossibile.
   */
  static applicaScrollOrizzontaleInizialePerCategoria(
    contesto: any,
    idCategoria: string,
  ): { eseguito: boolean; idCategoria: string; pagina: number } | null {
    const match =
      CatalogoSessionStorageUtility.leggiScrollOrizzontalePerCategoriaDaSessionStorage(
        idCategoria,
      ); // leggo l'eventuale pagina orizzontale salvata per la categoria richiesta
    if (!match) return null; // se non trovo dati salvati esco con null

    const righe = contesto.righeComponenti
      ? contesto.righeComponenti.toArray()
      : []; // recupero l'array dei componenti riga renderizzati oppure un array vuoto
    if (!righe.length) return null; // se non ho righe renderizzate esco con null

    const target = righe.find(
      (r: any) => String(r?.idCategoria || '').trim() === match.idCategoria,
    ); // cerco la riga il cui idCategoria coincide con quello richiesto
    if (!target) return null; // se non trovo la riga target esco con null

    target.impostaPaginaIniziale(match.pagina); // applico alla riga target la pagina iniziale orizzontale recuperata

    return {
      eseguito: true, // segnalo che l'applicazione e' stata eseguita con successo
      idCategoria: match.idCategoria, // restituisco l'id categoria effettivamente applicato
      pagina: match.pagina, // restituisco la pagina effettivamente applicata
    };
  }

  /**
   * Salva in sessionStorage la posizione di scroll orizzontale per una categoria.
   * - Normalizza id categoria e numero di pagina
   * - Costruisce uno storico minimale con una sola voce
   * - Serializza e salva il contenuto nella chiave dedicata
   *
   * @param idCategoria Id della categoria di cui salvare la posizione orizzontale.
   * @param pagina Numero di pagina orizzontale da salvare.
   * @returns void
   */
  static salvaScrollOrizzontaleInSessionStorage(
    idCategoria: string,
    pagina: number,
  ): void {
    try {
      const id = String(idCategoria || '').trim(); // normalizzo l'id categoria da salvare
      const p = Number.isFinite(pagina) ? Math.max(0, Math.floor(pagina)) : 0; // normalizzo la pagina come intero non negativo con fallback a zero
      if (!id) return; // se l'id categoria e' vuoto esco senza salvare nulla

      const chiave = 'storico_scroll_categorie'; // definisco la chiave sessionStorage usata per lo storico scroll categorie
      const storico = [{ idCategoria: id, pagina: p }]; // costruisco lo storico minimale con la sola voce corrente
      sessionStorage.setItem(chiave, JSON.stringify(storico)); // serializzo e salvo lo storico in sessionStorage
    } catch {} // ignoro eventuali errori di accesso o scrittura su sessionStorage
  }
}
