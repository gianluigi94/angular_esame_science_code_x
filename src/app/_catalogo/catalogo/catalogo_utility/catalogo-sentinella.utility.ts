// Utility che gestisce l'osservatore della sentinella del catalogo e il controllo forzato del caricamento quando la sentinella entra in vista.

export class CatalogoSentinellaUtility {
  /**
   * Inizializza l'IntersectionObserver della sentinella del catalogo.
   * - Disconnette un eventuale osservatore precedente
   * - Recupera l'elemento host della sentinella
   * - Osserva l'ingresso della sentinella nel viewport
   * - Verifica i flag necessari prima di autorizzare un nuovo caricamento
   * - Applica un piccolo ritardo prima di avviare il caricamento delle righe successive
   *
   * @param contesto Contesto che espone sentinella, stato, timer e metodi necessari alla gestione dell'osservatore.
   * @returns void
   */
  static inizializzaOsservatoreSentinella(contesto: any): void {
    try {
      contesto.osservatoreSentinella?.disconnect();
    } catch {} // provo a disconnettere un eventuale osservatore precedente senza bloccare il flusso
    contesto.osservatoreSentinella = null; // azzero il riferimento all'osservatore precedente

    const host = contesto.sentinella?.nativeElement; // recupero l'elemento DOM reale associato alla sentinella
    if (!host) return; // se l'elemento host non esiste esco subito senza creare l'osservatore

    contesto.osservatoreSentinella = new IntersectionObserver(
      (entries) => {
        // reagisco ai cambi di intersezione della sentinella nel viewport
        for (const e of entries) {
          // scorro tutte le entry ricevute dall'observer
          if (!e.isIntersecting) continue; // se la sentinella non e' in intersezione ignoro questa entry
          if (!contesto.sentinellaPronta) continue; // se la sentinella non e' pronta ignoro questa entry
          if (!contesto.utenteHaScrollato) continue; // se l'utente non ha ancora scrollato non faccio partire il caricamento automatico
          if (!contesto.haAltreRighe) return; // se non ci sono altre righe esco subito senza fare altro
          if (contesto.caricamentoRighe) return; // se un caricamento e' gia' in corso esco subito senza sovrapporre altre chiamate

          if (contesto.timerSentinella) clearTimeout(contesto.timerSentinella); // se esiste un timer sentinella precedente lo annullo
          contesto.timerSentinella = setTimeout(() => {
            // applico un piccolo ritardo prima del caricamento per evitare attivazioni troppo aggressive
            contesto.timerSentinella = 0; // azzero il riferimento al timer sentinella appena scatta
            contesto.caricaAltreQuattroRigheDaApi(); // avvio il caricamento del blocco successivo di righe
          }, 400);
        }
      },
      { root: null, threshold: 0.1 }, // osservo rispetto al viewport con soglia minima di visibilita' del 10%
    );

    contesto.osservatoreSentinella.observe(host); // collego l'osservatore all'elemento host della sentinella
  }

  /**
   * Forza un controllo immediato della sentinella senza attendere l'IntersectionObserver.
   * - Verifica che la sentinella sia pronta e che ci siano ancora righe disponibili
   * - Recupera l'elemento host della sentinella
   * - Controlla manualmente se la sentinella e' visibile nel viewport
   * - Avvia il caricamento del blocco successivo se tutte le condizioni sono soddisfatte
   *
   * @param contesto Contesto che espone sentinella, stato e metodo di caricamento delle righe successive.
   * @returns void
   */
  static forzaControlloSentinella(contesto: any): void {
    if (!contesto.sentinellaPronta) return; // se la sentinella non e' pronta esco subito
    if (!contesto.haAltreRighe) return; // se non ci sono altre righe da caricare esco subito
    if (contesto.caricamentoRighe) return; // se un caricamento e' gia' in corso esco subito

    const host = contesto.sentinella?.nativeElement as HTMLElement; // recupero l'elemento DOM reale della sentinella
    if (!host) return; // se l'elemento host non esiste esco senza fare nulla

    const r = host.getBoundingClientRect(); // leggo il bounding rect attuale della sentinella nel viewport
    const inVista = r.top <= window.innerHeight && r.bottom >= 0; // verifico manualmente se la sentinella risulta visibile almeno in parte
    if (!inVista) return; // se la sentinella non e' visibile esco senza caricare altre righe

    contesto.caricaAltreQuattroRigheDaApi(); // se la sentinella e' in vista avvio subito il caricamento del blocco successivo
  }
}
