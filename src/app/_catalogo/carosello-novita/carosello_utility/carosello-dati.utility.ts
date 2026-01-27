  // Utility che centralizza il caricamento e la preparazione dei dati del carosello, così il componente riceve uno stato coerente e 'pronto' .

  import { Observable, combineLatest } from 'rxjs';
  import { shareReplay } from 'rxjs/operators';
  import { InfoNovita } from 'src/app/_type/info-novita.type';
  import { NovitaItemMin } from 'src/app/_type/novita-item-min.type';



  export class CaroselloDatiUtility {

    /**
   * Carica e prepara i dati del carosello creando uno stato coerente e pronto per la UI.
   *
   * Inizializza lo stato di readiness, crea gli stream per elenco novita e mappa info,
   * registra le sottoscrizioni e popola immagini, descrizioni, titoli, sottotitoli e trailer.
   * Aggiorna overlay e tenta l'avvio iniziale del trailer quando i dati necessari sono disponibili.
   *
   * @param ctx Contesto del componente/carousel che contiene servizi, stato e subscription container
   * @returns void
   */
    static caricaDati(ctx: any): void {
      // Carico e preparo i dati del carosello
      const giaPronto = ctx.caricamentoCaroselloService.caroselloPronto$.value; // Leggo se il carosello risulta gia' pronto
      if (!giaPronto) ctx.caricamentoCaroselloService.resetta(); // Se non e' pronto, resetto lo stato del service
      ctx.segnalatiTitoliPronti = giaPronto; // Allineo il flag interno allo stato iniziale

      const lang = ctx.cambioLinguaService.leggiCodiceLingua(); // Leggo la lingua corrente

      const novita$ = (
        ctx.caroselloNovitaService.getNovita() as Observable<NovitaItemMin[]>
      ).pipe(shareReplay(1)); // Creo lo stream delle novita con cache dell'ultimo valore
      const mappa$ = (
        ctx.caroselloNovitaService.getInfoNovitaMap(lang) as Observable<
          Record<string, InfoNovita>
        >
      ).pipe(shareReplay(1)); // Creo lo stream della mappa info per la lingua con cache

      ctx.subs.add(
        // Registro la subscription per poterla disiscrivere
        novita$.subscribe({
          // Mi iscrivo allo stream delle novita
          next: (elencoOrdinato: NovitaItemMin[]) => {
            // Gestisco l'elenco ordinato quando arriva
            ctx.immagini = elencoOrdinato.map((x) =>
    CaroselloDatiUtility.urlSfondoDaDescrizione(x.descrizione || '')
  );
            ctx.descrizioni = elencoOrdinato.map((x) => x.descrizione || ''); // Estraggo le descrizioni con fallback a stringa vuota

            ctx.sfondiCaricati = {}; // Resetto lo stato di caricamento sfondi
            ctx.logSfondiFatto = false; // Resetto il flag di log per gli sfondi

            if (ctx.immagini.length > 0) {
              // Se ho contenuti, preparo ripresa e stato iniziale
              const indiceSalvato = ctx.leggiIndiceRealeDaStorage(); // Leggo l'indice reale 0-based da storage
              if (indiceSalvato !== null) {
                // Se ho un valore salvato, lo applico
                const len = ctx.immagini.length; // Calcolo il numero di slide disponibili
                const clamp = Math.max(
                  0,
                  Math.min(indiceSalvato, Math.max(0, len - 1))
                ); // l'indice per restare nel range valido
                ctx.indiceCorrente = clamp + 1; // Converto
              } else {
                // Se non ho nulla salvato, riparto dalla prima
                ctx.indiceCorrente = 1; // Imposto la prima slide come corrente
              }

              ctx.transizioneAttiva = false; // Disattivo l'animazione per posizionarmi subito
              ctx.stileTrasformazione = `translateX(-${
                ctx.indiceCorrente * 100
              }%)`; // Imposto la trasformazione coerente con l'indice

              if (typeof ctx.impostaIndiciSfondiCritici === 'function') ctx.impostaIndiciSfondiCritici(); // Calcolo gli indici sfondi che mi servono subito (cur/prev/next)

              ctx.provaAvvioInizialeTrailer(); // Provo ad avviare il trailer iniziale se possibile
            } else {
              // Se non ho immagini, segnalo 'pronto' per non bloccare
              if (!giaPronto) {
                // Se non ero gia' pronto, segnalo ora i readiness
                ctx.caricamentoCaroselloService.segnalaSfondiPronti(); // Segnalo sfondi pronti nel caso vuoto
                ctx.caricamentoCaroselloService.segnalaTitoliPronti(); // Segnalo titoli pronti nel caso vuoto
                ctx.segnalatiTitoliPronti = true; // Segno internamente che ho gia' segnalato i titoli
              }
            }
          },
          error: (err: any) =>
            console.error('Errore nel caricamento novita', err),
        })
      );

      ctx.subs.add(
        // Registro la subscription combinata per titoli e trailer
        combineLatest<[NovitaItemMin[], Record<string, InfoNovita>]>([
          novita$,
          mappa$,
        ]).subscribe(([elencoOrdinato, mappa]) => {
          // Aspetto sia elenco che mappa per derivare i campi
          const descr = elencoOrdinato.map(
            (x: NovitaItemMin) => x.descrizione || ''
          ); // Ricostruisco le chiavi descrizione coerenti con l'elenco

          ctx.mappaNovitaCorrente = mappa; // Salvo la mappa corrente delle novita
          ctx.titoliAlt = descr.map((d: string) => mappa[d]?.titolo || ''); // Popolo i titoli alt dalla mappa
          ctx.imgTitolo = descr.map((d: string) => mappa[d]?.img_titolo || ''); // le immagini titolo dalla mappa
          ctx.sottotitoli = descr.map((d: string) => mappa[d]?.sottotitolo || ''); // i sottotitoli dalla mappa
          ctx.trailers = descr.map((d: string) => mappa[d]?.trailer || ''); // gli url trailer dalla mappa

          ctx.aggiornaOverlayPerIndiceCorrente(ctx.indiceCorrente, false); // Prima paint: aggiorno overlay senza transizione
          ctx.provaAvvioInizialeTrailer(); // Riprovo l'avvio trailer ora che ho anche i trailer
        })
      );
    }

    /**
   * Segnala che l'immagine titolo dell'overlay e' stata caricata ed e' pronta.
   *
   * Aggiorna i flag di visibilita', logga una sola volta e notifica il service di caricamento
   * dei titoli quando la readiness non era ancora stata segnalata.
   *
   * @param ctx Contesto del componente/carousel
   * @returns void
   */
    static segnalaTitoloCaricato(ctx: any): void {
      ctx.titoloPronto = true; // Segno che il titolo e' pronto a essere mostrato

      if (!ctx.logTitoliFatto && ctx.imgTitoloOverlay) {
        // Loggo una sola volta e solo se c'e' un'immagine titolo in overlay
        ctx.logTitoliFatto = true; // Impedisco log successivi
        console.log('TITOLI PRONTI alle ' + performance.now() + ' ms'); // Stampo il tempo di readiness dei titoli
      }

      if (!ctx.segnalatiTitoliPronti) {
        // Se non ho ancora notificato la readiness al service, lo faccio ora
        ctx.segnalatiTitoliPronti = true; // Marco che la segnalazione e' stata fatta
        ctx.caricamentoCaroselloService.segnalaTitoliPronti(); // Notifico al service che i titoli sono pronti
      }

      if (!ctx.inBlackoutTitoli) {
        // Se non sono in blackout, posso rendere visibili subito titolo e sottotitolo
        ctx.titoloVisibile = true; // Rendo visibile il titolo
        ctx.sottotitoloVisibile = true; // Rendo visibile il sottotitolo
      }
    }

    /**
   * Precarica un'immagine e risolve quando il caricamento termina (anche in caso di errore).
   *
   * Non blocca la UI: risolve sempre, e risolve subito se l'URL e' vuoto o l'immagine e' gia' completa.
   *
   * @param url URL dell'immagine da precaricare
   * @returns Promise risolta quando il preload e' terminato
   */
    static precaricaImmagine(url: string): Promise<void> {
      return new Promise((ok) => {
        // Creo una promise che risolve sempre
        if (!url) return ok(); // Se l'url e' vuoto, considero il preload completato
        const img = new Image(); // Creo un oggetto Image per avviare il download
        img.src = url; // Imposto la sorgente e faccio partire il caricamento
        if (img.complete) return ok(); // Se e' gia' in cache/complete, risolvo subito
        img.onload = img.onerror = () => ok(); // Risolvo sia in caso di load che di error per non bloccare la UI
      });
    }

  /**
   * Segnala che lo sfondo del carosello a un certo indice e' stato caricato.
   *
   * Aggiorna la mappa degli sfondi caricati e, quando risultano pronti tutti gli sfondi critici
   * (corrente, precedente, successivo), logga una sola volta e notifica il service di readiness.
   *
   * @param ctx Contesto del componente/carousel
   * @param indice Indice dello sfondo che e' stato caricato
   * @returns void
   */
    static segnalaSfondoCaricato(ctx: any, indice: number): void {
      if (ctx.logSfondiFatto) return; // Esco se ho gia' fatto il log e la segnalazione 'sfondi pronti'
      if (!ctx.immagini || ctx.immagini.length === 0) return; // Esco se non ho immagini configurate
      if (ctx.sfondiCaricati[indice]) return; // Esco se avevo gia' segnato questo indice come caricato

      ctx.sfondiCaricati[indice] = true; // indico questo sfondo come caricato

      if (CaroselloDatiUtility.sfondiCriticiPronti(ctx)) {
        // Controllo se gli sfondi critici (cur/prev/next) risultano tutti pronti
        ctx.logSfondiFatto = true; // Impedisco log/notify ripetuti
        console.log('SFONDI CRITICI PRONTI alle ' + performance.now() + ' ms'); // Stampo il tempo di readiness degli sfondi critici
        ctx.caricamentoCaroselloService.segnalaSfondiPronti(); // Notifico al service che gli sfondi necessari sono pronti
      }
    }

    /**
   * Verifica se tutti gli sfondi critici risultano gia' caricati.
   *
   * Se non sono definiti indici critici, considera lo stato pronto.
   *
   * @param ctx Contesto del componente/carousel
   * @returns true se tutti gli sfondi critici sono pronti, false altrimenti
   */
    static sfondiCriticiPronti(ctx: any): boolean {
      if (!ctx.indiciSfondiCritici.length) return true; // Se non ho indici critici, considero tutto pronto
      return ctx.indiciSfondiCritici.every(
        (i: number) => !!ctx.sfondiCaricati[i]
      ); // Controllo che per ogni indice critico io abbia un true nella mappa
    }

    static urlSfondoDaDescrizione(descrizione: string): string {
    const d = String(descrizione || '').trim();
    const slug = d.replace(/^film\./i, '').replace(/^serie\./i, '');
    return `assets/carosello_locandine/carosello_${slug}.webp`;
  }

  }
