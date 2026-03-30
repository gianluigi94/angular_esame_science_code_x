// utility che gestisce la navigazione dalla slide corrente del carosello verso la relativa scheda dettaglio, preparando prima url, immagini e dati da passare nello state

import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { CaroselloGettersUtility } from './carosello-getters.utility';

export class CaroselloNavigazioneUtility {
  /**
   * Porta l'utente alla scheda dettaglio del contenuto attualmente selezionato nel carosello.
   * - Ricava la slide reale corrente e la sua descrizione
   * - Recupera tipo e id_media dalla mappa novita corrente
   * - Costruisce l'URL corretto in base a lingua e tipo contenuto
   * - Precarica lo sfondo e recupera dati tradotti e dati tabellari
   * - Esegue prima un fade-out audio
   * - Naviga passando nello state le informazioni gia' pronte
   *
   * @param contesto any Contesto del carosello da cui leggere stato, servizi e router.
   * @returns Promise<void> Promise risolta quando la navigazione e' stata richiesta.
   */
  static async vaiAllaSchedaCorrente(contesto: any): Promise<void> {
    const indiceReale =
      CaroselloGettersUtility.getIndiceRealeZeroBased(contesto); // ricavo l'indice reale 0-based della slide corrente ignorando eventuali cloni
    const descrizione = contesto.descrizioni[indiceReale]; // leggo la descrizione semantica della slide corrente usando l'indice reale
    if (!descrizione) return; // se non trovo una descrizione valida non posso costruire la navigazione e termino

    const info = contesto.mappaNovitaCorrente[descrizione]; // recupero dalla mappa corrente le informazioni collegate a quella descrizione
    if (!info?.tipo || !info?.id_media) return; // se mancano tipo o id_media non posso costruire l'URL corretto e termino

    const tipo = info.tipo; // salvo il tipo del contenuto corrente, ad esempio film oppure serie
    const id = info.id_media; // salvo l'id media del contenuto corrente
    const lingua = contesto.cambioLinguaService.leggiCodiceLingua(); // leggo la lingua corrente dell'app per costruire i path corretti

    const baseCatalogo = lingua === 'it' ? '/it/catalogo' : '/en/catalog'; // scelgo il path base del catalogo in base alla lingua corrente
    const fogliaFilm = lingua === 'it' ? '/film' : '/movies'; // scelgo la foglia URL dei film in base alla lingua corrente
    const fogliaSerie = lingua === 'it' ? '/serie' : '/series'; // scelgo la foglia URL delle serie in base alla lingua corrente
    const fogliaUrl = tipo === 'serie' ? fogliaSerie : fogliaFilm; // in base al tipo contenuto scelgo se usare la foglia serie oppure film
    const url = baseCatalogo + fogliaUrl + '/' + id; // compongo l'URL finale della scheda dettaglio usando base, foglia e id

    const slug = String(descrizione)
      .replace(/^(film|serie)\./, '')
      .trim(); // ricavo lo slug pulito togliendo il prefisso film. o serie. e gli eventuali spazi
    const urlSfondo = `assets/carosello_locandine/carosello_${slug}.webp`; // costruisco il path locale dell'immagine di sfondo da passare alla pagina di destinazione
    const urlImgTitolo = `assets/titoli_${lingua}/titolo_${lingua}_${slug}.webp`; // costruisco il path locale dell'immagine titolo nella lingua corrente

    const caricaImmagine = (src: string): Promise<void> =>
      new Promise((resolve) => {
        const img = new Image(); // creo un oggetto Image per precaricare l'immagine
        img.onload = () => resolve(); // considero completato il preload quando l'immagine si carica
        img.onerror = () => resolve(); // considero completato anche se l'immagine va in errore per non bloccare il flusso
        img.src = src; // assegno la sorgente e faccio partire il caricamento
      });

    const traduzioni$ =
      tipo === 'film'
        ? contesto.api.getFilmTraduzioni(id, lingua)
        : contesto.api.getSerieTraduzioni(id, lingua); // scelgo la chiamata API corretta per recuperare le traduzioni del contenuto in base a tipo e lingua

    const tabella$ =
      tipo === 'film' ? contesto.api.getFilm(id) : contesto.api.getSerie(id); // scelgo la chiamata API corretta per recuperare i dati tabellari del contenuto in base al tipo

    const [_sfondo, tradRes, tabellaRes] = await Promise.all([
      caricaImmagine(urlSfondo), // precarico l'immagine di sfondo prima della navigazione
      firstValueFrom(traduzioni$.pipe(take(1))).catch(() => null), // recupero una sola risposta delle traduzioni e in caso di errore torno null
      firstValueFrom(tabella$.pipe(take(1))).catch(() => null), // recupero una sola risposta dei dati tabellari e in caso di errore torno null
    ]);

    const descrizioneTestuale = String(
      (tradRes as any)?.data?.descrizione || '',
    ); // estraggo la descrizione testuale tradotta oppure uso stringa vuota
    const tabellaDati = (tabellaRes as any)?.data ?? null; // estraggo i dati tabellari restituiti dal backend oppure null

    await contesto.stopVideoGlobale.richiediSoloFadeAudio(350).catch(() => {}); // prima della navigazione richiedo un fade-out del solo audio con durata 350 ms

    contesto.router.navigateByUrl(url, {
      state: { urlSfondo, urlImgTitolo, descrizioneTestuale, tabellaDati },
    }); // avvio la navigazione verso la scheda dettaglio passando nello state sfondo, titolo e dati gia' pronti
  }
}
