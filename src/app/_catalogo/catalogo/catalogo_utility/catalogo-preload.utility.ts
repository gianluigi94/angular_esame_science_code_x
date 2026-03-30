// Utility che gestisce il preload delle immagini delle righe del catalogo e l'aggiornamento in place delle righe e delle locandine, mantenendo i riferimenti esistenti dove possibile.

export class CatalogoPreloadUtility {
  /**
   * Precarica tutte le immagini presenti nelle righe ricevute.
   * - Estrae tutte le URL delle locandine
   * - Crea un oggetto Image per ciascuna URL
   * - Considera completato il preload sia in caso di load sia in caso di errore
   * - Se disponibile, prova a usare anche decode per anticipare la decodifica dell'immagine
   *
   * @param righe Elenco delle righe contenenti locandine con relative src da precaricare.
   * @returns Promise<void> Promise risolta quando tutte le immagini raccolte hanno completato il tentativo di preload.
   */
  static precaricaImmaginiRighe(
    righe: { locandine: { src: string }[] }[],
  ): Promise<void> {
    const urls: string[] = []; // preparo l'array che conterra' tutte le URL immagini da precaricare

    for (const r of righe || []) {
      // scorro tutte le righe ricevute, gestendo anche il caso di array nullo o undefined
      for (const u of r.locandine || []) {
        // scorro tutte le locandine della riga corrente, gestendo anche il caso di array nullo o undefined
        const s = String(u?.src || ''); // normalizzo la src della locandina corrente come stringa sicura
        if (s) urls.push(s); // se la src e' valida la aggiungo alla lista delle URL da precaricare
      }
    }

    if (!urls.length) return Promise.resolve(); // se non ho raccolto nessuna URL risolvo subito senza fare altro

    const promesse = urls.map(
      (u) =>
        new Promise<void>((resolve) => {
          // creo una promise per ogni URL da precaricare
          const img = new Image(); // creo un oggetto Image dedicato al preload della URL corrente
          img.onload = () => resolve(); // considero completato il preload quando l'immagine finisce di caricarsi
          img.onerror = () => resolve(); // considero completato anche un eventuale errore per non bloccare il flusso

          if ((img as any).decode) {
            // se il browser espone decode provo a usarlo per anticipare la decodifica dell'immagine
            img.src = u; // assegno subito la URL all'immagine per avviare il caricamento
            (img as any)
              .decode()
              .then(() => resolve())
              .catch(() => resolve()); // in ogni caso considero concluso il tentativo anche se decode fallisce
          } else {
            img.src = u; // se decode non e' disponibile avvio semplicemente il caricamento assegnando la URL
          }
        }),
    );

    return Promise.all(promesse).then(() => {}); // aspetto che tutti i tentativi di preload risultino completati
  }

  /**
   * Aggiorna in place l'array delle righe demo del contesto usando le nuove righe ricevute.
   * - Costruisce una mappa delle righe esistenti per idCategoria
   * - Riutilizza gli oggetti gia' presenti quando possibile
   * - Aggiorna category e posters mantenendo i riferimenti esistenti
   * - Riordina infine l'array finale nello stesso ordine delle nuove righe
   *
   * @param contesto Contesto che contiene l'array righeDemo da aggiornare.
   * @param nuoveRighe Nuovo insieme di righe da applicare al catalogo.
   * @returns void
   */
  static aggiornaRigheInPlace(
    contesto: any,
    nuoveRighe: { idCategoria: string; category: string; posters: string[] }[],
  ): void {
    const mappaEsistenti: Record<string, any> = {}; // preparo una mappa per recuperare rapidamente le righe esistenti per idCategoria

    for (const r of contesto.righeDemo || []) {
      // scorro tutte le righe demo attuali del contesto
      mappaEsistenti[String(r.idCategoria)] = r; // salvo la riga corrente nella mappa usando l'idCategoria come chiave
    }

    const ordine: any[] = []; // preparo l'array finale ordinato che conterra' le righe aggiornate

    for (const n of nuoveRighe) {
      // scorro tutte le nuove righe da applicare
      const idCat = String(n.idCategoria); // normalizzo l'idCategoria della nuova riga
      const r = mappaEsistenti[idCat] || {
        idCategoria: idCat,
        category: '',
        posters: [],
      }; // riuso la riga esistente se presente, altrimenti ne creo una nuova con struttura minima

      r.category = n.category; // aggiorno la category della riga con il nuovo valore ricevuto
      CatalogoPreloadUtility.aggiornaLocandineInPlace(r.posters, n.posters); // aggiorno in place l'array posters della riga mantenendo il riferimento esistente
      ordine.push(r); // aggiungo la riga aggiornata all'array finale rispettando l'ordine delle nuove righe
    }

    contesto.righeDemo.splice(0, contesto.righeDemo.length, ...ordine); // sostituisco in place il contenuto di righeDemo con il nuovo ordine aggiornato
  }

  /**
   * Aggiorna in place un array target di locandine stringa usando i valori della sorgente.
   * - Allunga il target se e' piu' corto della sorgente
   * - Accorcia il target se e' piu' lungo della sorgente
   * - Copia infine ogni elemento della sorgente nel target mantenendo lo stesso array
   *
   * @param target Array destinazione da aggiornare in place.
   * @param sorgente Array sorgente con i valori da copiare.
   * @returns void
   */
  static aggiornaLocandineInPlace(target: string[], sorgente: string[]): void {
    const t = target || []; // mi salvo il riferimento del target oppure un array vuoto di fallback
    const s = sorgente || []; // mi salvo il riferimento della sorgente oppure un array vuoto di fallback

    while (t.length < s.length) t.push(''); // se il target e' piu' corto aggiungo stringhe vuote finche' raggiunge la stessa lunghezza della sorgente
    if (t.length > s.length) t.splice(s.length); // se il target e' piu' lungo lo accorcio alla lunghezza esatta della sorgente

    for (let i = 0; i < s.length; i++) {
      t[i] = s[i]; // copio in place ogni elemento della sorgente nella posizione corrispondente del target
    }
  }
}
