// Helper che gestisce il caricamento e la selezione delle stagioni nella scheda serie.

import { Location } from '@angular/common';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { SchedaStateContext } from '../scheda_utility/scheda-state.context';
import { attendi, precaricaImmagini, secondiInLeggibile } from '../scheda_utility/scheda-url.utils';

export class SchedaStagioniHelper {
  private idCaricamento = 0; // tengo l'id progressivo del caricamento corrente
  private readonly timerMinimoPlaceholderMs = 500; // imposto il tempo minimo del placeholder
  caricamentoStagioneInCorso = false; // segno se sto caricando una stagione

  constructor(
    private ctx: SchedaStateContext,
    private api: ApiService,
    private cambioLingua: CambioLinguaService,
    private location: Location,
  ) {}

  /**
   * Seleziona una stagione e ne prepara i dati se necessario.
   * - Evita ricariche inutili quando la stagione e' gia' pronta
   * - Aggiorna subito l'URL della stagione selezionata
   * - Mostra lo stato di caricamento
   * - Carica gli episodi oppure precarica le anteprime dalla cache
   * - Ignora il completamento se nel frattempo e' partito un nuovo caricamento
   *
   * @param numeroStagione Numero della stagione da selezionare.
   * @returns Promise<void> Promise risolta al termine della selezione.
   */
  async selezionaStagione(numeroStagione: string): Promise<void> {
    const stagioneCorrente = this.ctx.stagioneSelezionata
      ?? (this.ctx.stagioni.length > 0 ? String(this.ctx.stagioni[0].numero_stagione) : null); // ricavo la stagione corrente o la prima disponibile
    if (
      stagioneCorrente === numeroStagione &&
      !this.caricamentoStagioneInCorso &&
      this.ctx.stagioneCachata.has(numeroStagione)
    ) return; // esco se la stagione richiesta e' gia' selezionata e pronta

    this.aggiornaUrlStagione(numeroStagione); // aggiorno l'URL con la stagione selezionata
    const mioId = ++this.idCaricamento; // genero l'id del caricamento corrente
    this.caricamentoStagioneInCorso = true; // attivo lo stato di caricamento stagione
    this.ctx.stagioneSelezionata = numeroStagione; // salvo la stagione selezionata nel contesto

    if (!this.ctx.stagioneCachata.has(numeroStagione)) {
      const stagione = this.ctx.stagioni.find((s) => String(s.numero_stagione) === numeroStagione); // cerco l'oggetto stagione corrispondente
      if (stagione) {
        await Promise.all([
          attendi(this.timerMinimoPlaceholderMs), // mantengo il placeholder per il tempo minimo
          this.caricaEpisodiStagione(stagione.id_stagione, numeroStagione), // carico gli episodi della stagione richiesta
        ]);
      } else {
        await attendi(this.timerMinimoPlaceholderMs); // se non trovo la stagione aspetto comunque il minimo previsto
      }
    } else {
      await precaricaImmagini(this.urlAnteprimePerStagione(numeroStagione)); // se la stagione e' in cache precarico solo le anteprime
    }

    if (mioId !== this.idCaricamento) return; // esco se nel frattempo e' partito un altro caricamento
    this.caricamentoStagioneInCorso = false; // chiudo lo stato di caricamento della stagione
  }

  /**
   * Carica gli episodi e le traduzioni della stagione richiesta.
   * - Recupera dati episodi e traduzioni nella lingua corrente
   * - Costruisce la mappa traduzioni per id episodio
   * - Calcola l'offset progressivo delle stagioni precedenti
   * - Compone il blocco dati della stagione con anteprime e durata leggibile
   * - Salva il risultato nel contesto e precarica le immagini
   *
   * @param idStagione Id interno della stagione da caricare.
   * @param numeroStagione Numero della stagione da salvare nel contesto.
   * @returns Promise<void> Promise risolta al termine del caricamento.
   */
  caricaEpisodiStagione(idStagione: number, numeroStagione: string): Promise<void> {
    const lingua = this.cambioLingua.leggiCodiceLingua(); // leggo la lingua corrente
    const slug = this.ctx.slugCorrente; // leggo lo slug corrente usato per le anteprime

    return new Promise<void>((resolve) => {
      Promise.all([
        this.api.getEpisodi(idStagione).toPromise(), // richiedo gli episodi della stagione
        this.api.getEpisodiTraduzioni(idStagione, lingua).toPromise(), // richiedo le traduzioni degli episodi
      ]).then(([resEpisodi, resTrad]) => {
        const episodi: any[] = Array.isArray(resEpisodi?.data) ? (resEpisodi as any).data : []; // normalizzo la lista episodi
        const traduzioni: any[] = Array.isArray(resTrad?.data) ? (resTrad as any).data : []; // normalizzo la lista traduzioni

        const mapTrad: Record<number, { titolo: string; descrizione: string }> = {}; // preparo la mappa traduzioni per episodio
        traduzioni.forEach((t) => {
          mapTrad[t.id_episodio] = { titolo: t.titolo || '', descrizione: t.descrizione || '' }; // salvo titolo e descrizione tradotti per ogni episodio
        });

        const stagObj: Record<string, { titolo: string; descrizione: string; anteprima: string; durata: string; chiaveArchivio: string }> = {}; // preparo l'oggetto finale della stagione
        episodi.forEach((ep) => {
          const chiave = String(ep.chiave_archivio ?? '');
          const anteprima = slug && chiave ? `assets/screen/${slug}/${chiave}.webp` : '';
          const trad = mapTrad[ep.id_episodio] || { titolo: '', descrizione: '' }; // recupero la traduzione dell'episodio o fallback vuoto
          stagObj[`ep${ep.id_episodio}`] = {
            titolo: trad.titolo,
            descrizione: trad.descrizione,
            anteprima,
            durata: secondiInLeggibile(ep.durata),
            chiaveArchivio: chiave,
          }; // salvo i dati finali dell'episodio dentro l'oggetto stagione
        });

        this.ctx.serieData = { ...this.ctx.serieData, [numeroStagione]: stagObj }; // aggiorno i dati serie con la stagione appena caricata
        this.ctx.stagioneCachata.add(numeroStagione); // segno la stagione come cachata
        precaricaImmagini(this.urlAnteprimePerStagione(numeroStagione)).then(resolve); // precarico le anteprime della stagione e poi risolvo
      }).catch(() => resolve()); // in caso di errore risolvo comunque
    });
  }

  /**
   * Restituisce gli URL delle anteprime della stagione richiesta.
   *
   * @param numeroStagione Numero della stagione da leggere.
   * @returns string[] Lista degli URL anteprima disponibili per la stagione.
   */
  urlAnteprimePerStagione(numeroStagione: string): string[] {
    if (!this.ctx.serieData?.[numeroStagione]) return []; // esco se non ho dati per la stagione richiesta
    const episodi = this.ctx.serieData[numeroStagione]; // recupero i dati episodi della stagione
    return Object.keys(episodi)
      .map((k) => episodi[k]?.anteprima)
      .filter((u: any) => !!u); // restituisco solo le anteprime valide
  }

  /**
   * Aggiorna l'URL corrente inserendo il segmento della stagione selezionata.
   * - Rimuove un eventuale segmento stagione gia' presente
   * - Sceglie il segmento localizzato corretto
   * - Mantiene intatta l'eventuale query string
   *
   * @param numeroStagione Numero della stagione da scrivere nell'URL.
   * @returns void
   */
  aggiornaUrlStagione(numeroStagione: string): void {
    const pathCompleto = this.location.path(false); // leggo il path completo corrente
    const [path, query] = pathCompleto.split('?'); // separo path e query string
    const baseUrl = path.replace(/\/(stagione|season)\/\d+$/, ''); // rimuovo un eventuale segmento stagione finale
    const segmento = path.includes('/en/') ? 'season' : 'stagione'; // scelgo il segmento localizzato corretto
    const nuovoPath = `${baseUrl}/${segmento}/${numeroStagione}`; // costruisco il nuovo path completo di stagione
    this.location.replaceState(query ? `${nuovoPath}?${query}` : nuovoPath); // aggiorno l'URL mantenendo l'eventuale query string
  }
}
