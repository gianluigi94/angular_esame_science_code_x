// Carica le voci del menu categorie dall'API.
import { forkJoin }   from 'rxjs';
import { take }       from 'rxjs/operators';
import { ApiService } from 'src/app/_servizi_globali/api.service';

export class HeaderCategorieHelper {

  voci: Array<{ idCategoria: string; codice: string; label: string }> = []; // tengo le voci finali del menu categorie
  inCaricamento = false; // evito richiami doppi mentre sto gia' caricando

  // Riceve i riferimenti necessari per chiamare API e capire la lingua corrente.
  /**
   * Inizializza l'helper per il caricamento delle categorie.
   * @param api Service API usato per leggere categorie e traduzioni.
   * @param isIt Callback che indica se la lingua corrente e' italiana.
   * @returns Non restituisce nulla.
   */
  constructor(
    private api: ApiService, // uso questo service per leggere i dati dal backend
    private isIt: () => boolean, // controllo da qui se devo usare italiano o inglese
  ) {}

  // Carica categorie e traduzioni e costruisce l'elenco finale delle voci menu.
  /**
   * Recupera categorie e traduzioni e popola le voci del menu.
   * @returns Non restituisce nulla.
   */
  carica(): void {
    if (this.inCaricamento) return; // blocco una nuova chiamata se un caricamento e' gia' in corso
    this.inCaricamento = true; // segno subito che il caricamento e' partito

    forkJoin([
      this.api.getCategorieCatalogo().pipe(take(1)), // prendo una sola risposta con l'elenco categorie
      this.api.getCategorieTraduzioni().pipe(take(1)), // prendo una sola risposta con le traduzioni
    ]).subscribe({
      next: ([categorie, traduzioni]) => {
        const listaCategorie = Array.isArray((categorie as any)?.data?.items) // provo prima il formato con data.items
          ? (categorie as any).data.items
          : Array.isArray((categorie as any)?.data) ? (categorie as any).data : []; // altrimenti ripiego su data o array vuoto

        const listaTraduzioni = Array.isArray((traduzioni as any)?.data?.items) // provo prima il formato con data.items
          ? (traduzioni as any).data.items
          : Array.isArray((traduzioni as any)?.data) ? (traduzioni as any).data : []; // altrimenti ripiego su data o array vuoto

        const idLingua = this.isIt() ? 1 : 2; // scelgo l'id lingua in base alla lingua corrente
        const mappaNome: Record<string, string> = {}; // costruisco una mappa id categoria -> nome tradotto

        for (const tr of listaTraduzioni) {
          if (String(tr?.id_lingua) !== String(idLingua)) continue; // ignoro le traduzioni della lingua sbagliata

          const idCat = String(tr?.id_categoria || ''); // leggo l'id categoria della traduzione
          const nome  = String(tr?.nome || ''); // leggo il nome tradotto della categoria

          if (idCat && nome) mappaNome[idCat] = nome; // salvo la traduzione solo se ho entrambi i valori
        }

        const voci: Array<{ idCategoria: string; codice: string; label: string }> = []; // preparo la lista finale del menu

        for (const c of listaCategorie) {
          const idCategoria = String(c?.id_categoria || c?.idCategoria || ''); // recupero l'id categoria supportando piu' formati
          const codice      = String(c?.codice || c?.code || ''); // recupero il codice supportando piu' nomi campo

          if (!idCategoria) continue; // salto gli elementi senza id valido

          voci.push({ idCategoria, codice, label: mappaNome[idCategoria] || codice || idCategoria }); // costruisco la voce finale usando traduzione, codice o id
        }

        this.voci = voci; // aggiorno le voci del menu con il risultato finale
        this.inCaricamento = false; // sblocco il flag di caricamento dopo il successo
      },
      error: () => {
        this.voci = []; // in errore svuoto il menu per evitare dati incoerenti
        this.inCaricamento = false; // sblocco il flag anche in caso di errore
      },
    });
  }
}
