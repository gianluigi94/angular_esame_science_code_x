// Utility che gestisce lo scroll del catalogo verso una categoria specifica, caricando altre righe se necessario e posizionando la vista all'altezza desiderata.

export class CatalogoScrollCategoriaUtility {
  /**
   * Gestisce lo scroll verso una categoria specifica del catalogo.
   * - Normalizza e valida l'id categoria richiesto
   * - Attiva lo spinner di scroll e invalida eventuali operazioni precedenti
   * - Carica progressivamente le righe fino a trovare la categoria richiesta
   * - Quando la categoria e' disponibile, calcola la posizione target e avvia lo scroll animato
   * - Forza infine un controllo della sentinella dopo il completamento dello scroll
   *
   * @param contesto Contesto che espone stato, servizi e metodi necessari alla gestione dello scroll.
   * @param idCategoria Id della categoria verso cui eseguire lo scroll.
   * @returns void
   */
  static gestisciScrollACategoria(contesto: any, idCategoria: string): void {
    const id = String(idCategoria || '').trim(); // normalizzo l'id categoria richiesto come stringa ripulita
    if (!id) return; // se l'id e' vuoto esco subito senza fare nulla

    contesto.scorrimentoCatalogo.impostaSpinnerScroll(true); // accendo lo spinner che segnala lo scroll/caricamento verso la categoria
    contesto.utenteHaScrollato = true; // segno che da questo momento c'e' stata un'azione di scroll richiesta

    contesto.tokenScroll += 1; // incremento il token di scroll per invalidare eventuali operazioni precedenti ancora in corso
    const token = contesto.tokenScroll; // mi salvo il token corrente da passare al caricamento fino a categoria

    if (contesto.timerCaricaFino) {
      clearTimeout(contesto.timerCaricaFino); // se esiste un timer di caricamento fino a categoria lo annullo
      contesto.timerCaricaFino = 0; // azzero il riferimento al timer di caricamento fino a categoria
    }

    contesto.caricaFinoACategoria(id, token).then((trovata: boolean) => {
      // provo a caricare le righe necessarie fino a rendere disponibile la categoria richiesta
      if (!trovata) {
        contesto.scorrimentoCatalogo.impostaSpinnerScroll(false); // se la categoria non viene trovata spengo lo spinner
        return; // esco senza tentare lo scroll
      }

      requestAnimationFrame(() => {
        // aspetto il frame successivo per lavorare sul DOM aggiornato
        const el = document.getElementById('cat_' + id); // cerco l'elemento DOM associato alla categoria richiesta
        if (!el) {
          contesto.scorrimentoCatalogo.impostaSpinnerScroll(false); // se l'elemento non esiste spengo lo spinner
          return; // esco senza eseguire lo scroll
        }

        const rect = el.getBoundingClientRect(); // leggo la posizione corrente dell'elemento nel viewport
        const y =
          (window.scrollY || 0) +
          rect.top -
          Math.floor(window.innerHeight * 0.65); // calcolo la coordinata Y target portando la categoria circa al 65% dell'altezza finestra

        contesto.scorrimentoCatalogo.impostaSpinnerScroll(false); // spengo lo spinner subito prima di avviare lo scroll animato
        contesto.servizioAnimazioni.scrollaA(y, 0.35); // avvio lo scroll animato verso la coordinata calcolata
        setTimeout(() => contesto.forzaControlloSentinella(), 380); // poco dopo lo scroll forzo un controllo della sentinella
      });
    });
  }
}
