// Servizio che fornisce al carosello i contenuti 'novità' già pronti all’uso, occupandosi di recuperarli, riordinarli e riutilizzarli senza rifare lavoro inutilmente.

import { Injectable } from '@angular/core';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { IRispostaServer } from 'src/app/_interfacce/IRispostaServer.interface';
import { film } from 'src/app/_type/film.type';
import { serie } from 'src/app/_type/serie.type';
import { forkJoin, map, Observable, shareReplay } from 'rxjs';
import { NovitaInfo } from 'src/app/_interfacce/Inovita-info.interface';
import { NovitaItem } from 'src/app/_interfacce/Inovita-item.interface';


@Injectable({ providedIn: 'root' })// Registro il servizio nel root injector
export class CaroselloNovitaService {
  private novitaCache$?: Observable<NovitaItem[]>; // mi tengo una cache in memoria dell'elenco novita' gia' pronto per evitare chiamate ripetute

  private ordineUltimeSei: string[] = [
    // definisco l'ordine fisso con cui voglio tenere in coda le ultime sei novita', le nuove si metteranno per prima in ordine di 'aggiunta'
    'serie.cavalli_contro_circuiti',
    'film.il_mio_gatto_nella_scatola',
    'film.l_era_dell_alchimia',
    'serie.rivelazioni_dalla_sonda_cassini',
    'serie.rna_e_la_memoria_cellulare',
    'film.il_lungo_volo_del_coraggio',
  ];

  constructor(private api: ApiService) {}

  /**
 * Restituisce un Observable con la lista delle novita' (film e serie) gia' pronta all'uso.
 *
 * Usa una cache in memoria per evitare chiamate ripetute; se 'forceRefresh' e' true
 * ricrea la cache e ricarica i dati dal backend.
 * Unisce film e serie marcati come novita' (con immagine di sfondo), li riordina
 * e condivide l'ultimo valore tramite shareReplay.
 *
 * @param forceRefresh Se true forza il ricaricamento dei dati ignorando la cache
 * @returns Observable con l'elenco delle novita' ordinate
 */
  getNovita(forceRefresh: boolean = false): Observable<NovitaItem[]> {
    if (!this.novitaCache$ || forceRefresh) {
      // ricreo la cache se non esiste ancora oppure se mi viene chiesto un refresh
      const elencoFilm$ = this.api // preparo lo stream che carica l'elenco dei film
        .getElencoFilm() // chiedo al backend l'elenco dei film
        .pipe(map((risp: IRispostaServer) => risp.data as film[])); // estraggo i dati e li tratto come lista di film

      const elencoSerie$ = this.api // preparo lo stream che carica l'elenco delle serie
        .getElencoSerie() // chiedo al backend l'elenco delle serie
        .pipe(map((risp: IRispostaServer) => risp.data as serie[])); // estraggo i dati e li tratto come lista di serie

      this.novitaCache$ = forkJoin([elencoFilm$, elencoSerie$]).pipe(
        // eseguo in parallelo le due chiamate e creo un unico stream con entrambi i risultati
        map(([filmList, serieList]) => {
          // trasformo le due liste in un elenco unico di novita'
                  const filmNovita = filmList.filter((f) => !!f.novita);
 const serieNovita = serieList.filter((s) => !!s.novita);

          const elenco: NovitaItem[] = [
            ...filmNovita,
            ...serieNovita,
          ] as NovitaItem[]; // unisco film e serie novita' in un unico elenco tipizzato

          return this.ordinaNovita(elenco); // riordino l'elenco con la stessa logica usata prima e lo restituisco
        }),
        shareReplay(1) // memorizzo l'ultimo valore in modo che le subscribe successive lo ricevano subito senza rifare le chiamate
      );
    }

    return this.novitaCache$; // restituisco la cache corrente (gia' pronta oppure appena creata)
  }


  /**
 * Ordina un elenco di novita' secondo la logica del carosello.
 *
 * Regola:
 * - tutte le novita' non presenti nelle 'ultime sei' vengono ordinate per data (piu' recente prima)
 * - le 'ultime sei' vengono mantenute in coda rispettando l'ordine fisso definito in 'ordineUltimeSei'
 *
 * @param elenco Elenco di novita' da ordinare
 * @returns Elenco ordinato secondo le regole del carosello
 */
  private ordinaNovita(elenco: NovitaItem[]): NovitaItem[] {
    const mappaUltimeSei = new Map<string, number>( // creo una mappa descrizione->posizione per riconoscere e ordinare le ultime sei
      this.ordineUltimeSei.map((descrizione, indice) => [descrizione, indice]) // trasformo l’array in coppie [chiave,valore]
    );

    const altri: NovitaItem[] = []; // preparo un array dove metto tutte le novità che NON sono nelle ultime sei
    const ultimeSei: NovitaItem[] = []; // preparo un array dove metto solo le novità che fanno parte delle ultime

    for (const item of elenco) { // scorro ogni elemento dell’elenco in ingresso
      if (item.descrizione && mappaUltimeSei.has(item.descrizione)) { // se l'item ha una descrizione valida ed è tra le ultime
        ultimeSei.push(item); // lo aggiungo all’array ultimeSei
      } else { // altrimenti
        altri.push(item); // lo aggiungo all’array altri
      }
    }

    altri.sort((a, b) => { // ordino gli 'altri' in base alla data di creazione (più recente prima)
      const ta = new Date(a.created_at ?? 0).getTime(); // ricavo il timestamp di a
      const tb = new Date(b.created_at ?? 0).getTime(); // ricavo il timestamp di b

      return tb - ta; // faccio l’ordinamento decrescente: b prima di a se b è più recente
    });

    ultimeSei.sort((a, b) => { // ordino le 'ultime sei' seguendo l’ordine fisso definito nella mappa
      const pa = a.descrizione ? mappaUltimeSei.get(a.descrizione) ?? 0 : 0; // prendo la posizione di a nella mappa
      const pb = b.descrizione ? mappaUltimeSei.get(b.descrizione) ?? 0 : 0; // prendo la posizione di b nella mappa
      return pa - pb; // ordino in modo crescente per rispettare l’ordine fisso (indice più piccolo prima)
    });

    return [...altri, ...ultimeSei]; // restituisco l’elenco finale: prima gli 'altri' (recenti), poi le 'ultime sei' in coda
  }

  private infoNovitaCachePerLingua: Record< // dichiaro una cache che indicizzo per lingua
    string,
    Observable<Record<string, NovitaInfo>> // specifico che il valore è un Observable di una mappa descrizione->NovitaInfo
  > = {};

  /**
 * Restituisce una mappa descrizione->NovitaInfo per la lingua richiesta.
 *
 * Usa una cache separata per lingua; se 'forceRefresh' e' true ricrea la cache per quella lingua.
 * Filtra i record ricevuti dal backend mantenendo solo quelli della lingua richiesta e costruisce
 * una mappa utilizzando 'descrizione' come chiave.
 *
 * @param lang Codice lingua richiesto
 * @param forceRefresh Se true forza il ricaricamento ignorando la cache per quella lingua
 * @returns Observable con la mappa descrizione->NovitaInfo per la lingua richiesta
 */
  getInfoNovitaMap(
    lang: string, // ricevo la lingua richiesta
    forceRefresh: boolean = false // permetto di forzare il refresh della cache (di default no)
  ): Observable<Record<string, NovitaInfo>> { // dichiaro che ritorno un Observable di mappa descrizione->NovitaInfo
    if (!this.infoNovitaCachePerLingua[lang] || forceRefresh) { // se non ho ancora la cache per quella lingua oppure mi chiedono refresh
      this.infoNovitaCachePerLingua[lang] = this.api.getVnovita().pipe( // salvo in cache lo stream che recupera le novità dal backend
        map((risp: IRispostaServer) => { // trasformo la risposta del server in una struttura più comoda
           const elenco = risp.data as {
   descrizione: string;
   titolo: string;
   sottotitolo: string;
   lingua: string;
 }[];

          const mappa: Record<string, NovitaInfo> = {}; // preparo una mappa vuota che riempirò con descrizione->info

          for (const item of elenco) { // scorro ogni riga ricevuta dal backend
            if (item.lingua !== lang) continue; // salto subito gli elementi che non sono della lingua richiesta
            if (!item.descrizione) continue; // salto gli elementi senza descrizione perché non posso usarli come chiave

            if (!mappa[item.descrizione]) { // se non ho ancora inserito info per questa descrizione
              const slug = this.slugDaDescrizione(item.descrizione);
 mappa[item.descrizione] = {
   titolo: item.titolo || '',
   img_titolo: this.urlTitolo(lang, slug),
   sottotitolo: item.sottotitolo || '',
   trailer: this.urlTrailer(lang, slug),
 };
            }
          }

          return mappa;
        }),
        shareReplay(1) // memorizzo l'ultimo valore così le subscribe successive non rifanno la chiamata
      );
    }

    return this.infoNovitaCachePerLingua[lang]; // restituisco l’observable in cache per la lingua richiesta
  }
 private slugDaDescrizione(descrizione: string): string {
   const d = String(descrizione || '').trim();
   return d.replace(/^film\./i, '').replace(/^serie\./i, '');
 }

 private urlTitolo(lang: string, slug: string): string {
   return `assets/titoli_${lang}/titolo_${lang}_${slug}.webp`;
 }

 private urlTrailer(lang: string, slug: string): string {
   const folder = lang === 'it' ? 'mp4-trailer-it' : 'mp4-trailer-en';
   const prefix = lang === 'it' ? 'trailer_ita_' : 'trailer_en_';
   return `https://d2kd3i5q9rl184.cloudfront.net/${folder}/${prefix}${slug}.mp4`;
 }

}
