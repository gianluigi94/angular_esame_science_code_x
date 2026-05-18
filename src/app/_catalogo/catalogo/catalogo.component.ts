// Componente principale del catalogo che coordina caricamento righe, cambio lingua, cambio tipo contenuto, sentinella, cache, sessionStorage e scroll verso categorie specifiche.

import {Component, OnDestroy, OnInit, AfterViewInit, ElementRef, QueryList, ViewChildren, HostListener, ViewChild} from '@angular/core';
import { Subscription, take, skip, distinctUntilChanged, forkJoin } from 'rxjs';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { CatalogoRoutingUtility } from './catalogo_utility/catalogo-routing.utility';
import { CatalogoPreloadUtility } from './catalogo_utility/catalogo-preload.utility';
import { CatalogoCaricamentoUtility } from './catalogo_utility/catalogo-caricamento.utility';
import { CatalogoSentinellaUtility } from './catalogo_utility/catalogo-sentinella.utility';
import { TipoContenuto,  TipoContenutoService } from '../riga-categoria/categoria_services/tipo-contenuto.service';
import { Router } from '@angular/router';
import { CatalogoSessionStorageUtility } from './catalogo_utility/catalogo-session-storage.utility';
import { Location } from '@angular/common';
import { CatalogoScrollCategoriaUtility } from './catalogo_utility/catalogo-scroll-categoria.utility';
import { AnimazioniScomparsaService } from 'src/app/_catalogo/riga-categoria/categoria_services/animazioni-scomparsa.service';
import { ScorrimentoCatalogoService } from '../riga-categoria/categoria_services/scorrimento-catalogo.service';
import { CatalogoCacheService } from '../riga-categoria/categoria_services/catalogo-cache.service';
import { RigaCategoriaComponent } from '../riga-categoria/riga-categoria.component';
import { SchedaCacheService } from '../scheda/scheda_service/scheda-cache.service';
import { Authservice } from 'src/app/_benvenuto/login/_login_service/auth.service';

@Component({
  selector: 'app-catalogo',
  templateUrl: './catalogo.component.html',
  styleUrls: ['./catalogo.component.scss'],
})
export class CatalogoComponent implements OnInit, AfterViewInit, OnDestroy {
  constructor(
    public api: ApiService,
    public tipoContenuto: TipoContenutoService,
    public router: Router,
    public location: Location,
    public cambioLingua: CambioLinguaService,
    public schedaCache: SchedaCacheService,
    public cacheCatalogo: CatalogoCacheService,
    public servizioAnimazioni: AnimazioniScomparsaService,
    public scorrimentoCatalogo: ScorrimentoCatalogoService,
    private authService: Authservice,
  ) {}

  tickResetPagine = 0; // contatore che uso per forzare il reset delle pagine interne delle righe
  timerCambioTipo: any = 0; // il timer usato per ritardare il caricamento dopo un cambio tipo
  sottoscrizioni = new Subscription(); // raccolgo qui tutte le subscription per poterle chiudere in destroy
  idCicloRighe = 0; // uso un id incrementale per invalidare cicli di caricamento righe ormai obsoleti
  timerCaricaFino: any = 0; // il timer usato nel caricamento progressivo fino a una categoria
  tokenScroll = 0; // token incrementale per invalidare vecchie richieste di scroll a categoria
  limiteRighe = 4; // definisco quante righe caricare per blocco
  offsetRighe = 0; // traccia di quante righe risultano gia' caricate
  haAltreRighe = true; // flag che mi dice se il server potrebbe avere ancora altre righe da restituire
  hoFinitoTutto = false; // flag che mi dice se ho esaurito completamente il catalogo
  caricamentoRighe = false; // flag che mi dice se in questo momento e' in corso un caricamento righe

  timerSentinella: any = 0; // il timer debounce usato dalla sentinella prima di caricare altre righe
  osservatoreSentinella: IntersectionObserver | null = null; // salvo il riferimento all'IntersectionObserver della sentinella
  sentinellaPronta = false; // flag che mi dice se la sentinella puo' attivare nuovi caricamenti
  utenteHaScrollato = false; // flag che mi dice se l'utente ha gia' effettuato almeno uno scroll
  scrollYPrimaCambio = 0; //  posizione verticale di scroll prima di un cambio/caricamento importante
  timerAutoScrollSessione: any = 0; // il timer usato per l'autoscroll iniziale ricavato dalla sessione
  autoScrollSessioneEseguito = false; // flag che mi dice se l'autoscroll iniziale da sessionStorage e' gia' stato eseguito
  cinqueElementi = Array(5).fill(0); // preparo un array fisso di cinque elementi utile al template

  locandinaDemo = 'assets/locandine_it/locandina_it_abbraccia_il_vento.webp'; // il path della locandina demo da usare come fallback
  locandineDemo: {
    src: string;
    titolo: string;
    sottotitolo: string;
    tipo: string;
    id_media: string;
  }[] = Array(8)
    .fill(0)
    .map(() => ({
      src: this.locandinaDemo, // assegno la locandina demo come src di fallback
      titolo: '', // il titolo demo come stringa vuota
      sottotitolo: '', // il sottotitolo demo come stringa vuota
      tipo: '', // il tipo demo come stringa vuota
      id_media: '', // l'id media demo come stringa vuota
    }));

  righeDemo: {
    idCategoria: string;
    category: string;
    locandine: {
      src: string;
      titolo: string;
      sottotitolo: string;
      tipo: string;
      id_media: string;
    }[];
  }[] = []; // tengo qui l'elenco delle righe attualmente renderizzate nel catalogo
  tipoSelezionato: TipoContenuto = 'film_serie';

  get isAmministratore(): boolean {
    const id = this.authService.leggiObsAuth().value?.idRuolo;
    return id === 4 || id === 7;
  }

  apriFormAggiungiMedia(idCategoria: string): void {
    window.dispatchEvent(new CustomEvent('apri-form-aggiungi-media', { detail: { idCategoria } }));
  } // tengo il tipo contenuto corrente selezionato, inizialmente film_serie

  @ViewChild('sentinella', { read: ElementRef })
  sentinella!: ElementRef; // collego il riferimento alla sentinella DOM usata per il lazy loading verticale

  @ViewChildren('rigaCatalogo', { read: ElementRef })
  righeCatalogo!: QueryList<ElementRef>; // collego i riferimenti DOM delle righe catalogo per le animazioni

  @ViewChildren('rigaCatalogo')
  righeComponenti!: QueryList<RigaCategoriaComponent>; // collego i riferimenti ai componenti riga per operazioni logiche come pagina iniziale

  /**
   * Metodo eseguito dopo l'inizializzazione della vista.
   * - Inizializza le animazioni sulle righe gia' presenti
   * - Reinizializza le animazioni quando cambia la lista delle righe DOM
   * - Inizializza l'osservatore della sentinella
   *
   * @returns void
   */
  ngAfterViewInit(): void {
    this.servizioAnimazioni.inizializzaAnimazioni(this.righeCatalogo); // inizializzo le animazioni sulle righe presenti dopo il rendering della vista
    this.righeCatalogo.changes.subscribe(() => {
      this.servizioAnimazioni.inizializzaAnimazioni(this.righeCatalogo);
    }); // quando cambia la lista delle righe DOM reinizializzo le animazioni
    this.inizializzaOsservatoreSentinella(); // inizializzo l'osservatore della sentinella per i caricamenti successivi
  }

  @HostListener('wheel', ['$event'])
  /**
   * Gestisce l'evento wheel dell'utente sul catalogo.
   * - Segna che l'utente ha scrollato
   * - Delega al servizio animazioni la gestione della rotellina
   *
   * @param evento Evento wheel ricevuto dal browser.
   * @returns void
   */
  gestisciRotellina(evento: WheelEvent): void {
    this.utenteHaScrollato = true; // segno che l'utente ha effettuato uno scroll con la rotellina
    this.servizioAnimazioni.gestisciWheel(evento); // delego al servizio animazioni la gestione dell'evento wheel
  }

  /**
   * Metodo eseguito all'inizializzazione del componente.
   * - Recupera il tipo contenuto corrente
   * - Allinea la rotta del catalogo a lingua e tipo
   * - Prova a ripristinare i dati dalla cache se validi
   * - Altrimenti carica le prime righe da API
   * - Gestisce l'autoscroll iniziale da sessionStorage
   * - Si sottoscrive alle richieste di scroll categoria, al cambio lingua e al cambio tipo contenuto
   *
   * @returns void
   */
  ngOnInit(): void {
    try {
      const da404 = sessionStorage.getItem('transizione_404_catalogo') === '1'; // provo a leggere il flag di ingresso da transizione 404
      // lo lascio solo se mi serve immediatamente in questo ingresso
    } catch {} // ignoro eventuali errori di accesso al sessionStorage

    this.tipoSelezionato = this.tipoContenuto.leggiTipo(); // leggo dal servizio il tipo contenuto attualmente selezionato
    this.forzaRottaCatalogoDaLinguaETipo(); // allineo subito la rotta del catalogo a lingua e tipo correnti

    const lingua = this.cambioLingua.leggiCodiceLingua(); // leggo la lingua corrente per validare eventuale cache
    if (this.cacheCatalogo.valida(lingua, this.tipoSelezionato)) {
      // entro qui se la cache catalogo risulta ancora valida per lingua e tipo correnti
      this.righeDemo = this.cacheCatalogo.righeDemo.slice(); // ripristino le righe demo copiandole dalla cache
      this.offsetRighe = this.cacheCatalogo.offsetRighe; // ripristino l'offset righe dalla cache
      this.haAltreRighe = this.cacheCatalogo.haAltreRighe; // ripristino il flag che indica se ci sono altre righe
      this.hoFinitoTutto = this.cacheCatalogo.hoFinitoTutto; // ripristino il flag di completamento totale del catalogo
      requestAnimationFrame(() => {
        // aspetto il frame successivo per ripristinare scroll e sentinella a DOM pronto
        window.scrollTo(0, this.cacheCatalogo.scrollY || 0); // ripristino la posizione verticale di scroll salvata in cache
        this.sentinellaPronta = this.haAltreRighe && !this.hoFinitoTutto; // aggiorno lo stato della sentinella in base ai flag ripristinati
        if (this.sentinellaPronta) this.inizializzaOsservatoreSentinella(); // se la sentinella deve essere attiva la reinizializzo
        this.provaAutoScrollDaSessionStorage(); // provo anche l'eventuale autoscroll iniziale da sessionStorage
      });
    } else {
      // entro qui se non ho una cache valida da riutilizzare
      this.caricaPrimeRigheDaApi(0, false); // carico da API il primo blocco di righe
      this.provaAutoScrollDaSessionStorage(); // provo comunque l'autoscroll iniziale da sessionStorage
    }

    this.sottoscrizioni.add(
      this.scorrimentoCatalogo.richieste$.subscribe((idCategoria: string) => {
        this.gestisciScrollACategoria(idCategoria);
      }),
    ); // mi sottoscrivo alle richieste esterne di scroll verso una categoria specifica

    this.sottoscrizioni.add(
      this.cambioLingua.cambioLinguaApplicata$.subscribe(() => {
        // reagisco al cambio lingua gia' applicato
        this.cacheCatalogo.svuota(); // svuoto la cache del catalogo per evitare riuso incoerente
        this.schedaCache.svuota(); // svuoto anche la cache delle schede
        this.forzaRottaCatalogoDaLinguaETipo(false); // riallineo la rotta del catalogo alla nuova lingua
        this.caricaPrimeRigheDaApi(0, false); // ricarico da API le prime righe nella nuova lingua
      }),
    );

    this.sottoscrizioni.add(
      this.tipoContenuto.tipoSelezionato$
        .pipe(distinctUntilChanged(), skip(1))
        .subscribe((tipo) => {
          // reagisco ai cambi reali del tipo contenuto saltando la prima emissione iniziale
          this.cacheCatalogo.svuota(); // svuoto la cache del catalogo per il nuovo tipo
          this.pulisciStoricoScrollOrizzontaleDaSessionStorage(); // pulisco lo storico dello scroll orizzontale salvato in sessione
          this.tipoSelezionato = tipo; // aggiorno il tipo selezionato locale
          this.tickResetPagine += 1; // incremento il tick che forza il reset delle pagine interne
          this.avviaCambioTipoConAttese(); // avvio il flusso di cambio tipo con le attese previste
          this.forzaRottaCatalogoDaLinguaETipo(true); // aggiorno la rotta mantenendo la base gia' presente nell'URL
        }),
    );
  }

  /**
   * Metodo eseguito alla distruzione del componente.
   * - Salva lo stato corrente nella cache del catalogo
   * - Chiude tutte le subscription
   * - Ripulisce osservatori e timer attivi
   * - Disconnette l'osservatore della sentinella
   *
   * @returns void
   */
  ngOnDestroy(): void {
    this.cacheCatalogo.righeDemo = this.righeDemo.slice(); // salvo in cache una copia delle righe correnti
    this.cacheCatalogo.offsetRighe = this.offsetRighe; // salvo in cache l'offset corrente
    this.cacheCatalogo.haAltreRighe = this.haAltreRighe; // salvo in cache il flag che indica se ci sono altre righe
    this.cacheCatalogo.hoFinitoTutto = this.hoFinitoTutto; // salvo in cache il flag di completamento totale
    this.cacheCatalogo.tipo = this.tipoSelezionato; // salvo in cache il tipo contenuto corrente
    this.cacheCatalogo.lingua = this.cambioLingua.leggiCodiceLingua(); // salvo in cache la lingua corrente
    this.cacheCatalogo.scrollY = window.scrollY || 0; // salvo in cache la posizione verticale di scroll corrente

    this.sottoscrizioni.unsubscribe(); // chiudo tutte le subscription registrate dal componente

    try {
      this.servizioAnimazioni.disconnettiOsservatori();
    } catch {} // provo a disconnettere eventuali osservatori del servizio animazioni senza rompere il flusso

    if (this.timerCambioTipo) {
      clearTimeout(this.timerCambioTipo); // se esiste il timer di cambio tipo lo annullo
      this.timerCambioTipo = 0; // azzero il riferimento al timer di cambio tipo
    }

    if (this.timerSentinella) {
      clearTimeout(this.timerSentinella); // se esiste il timer della sentinella lo annullo
      this.timerSentinella = 0; // azzero il riferimento al timer della sentinella
    }

    if (this.timerCaricaFino) {
      clearTimeout(this.timerCaricaFino); // se esiste il timer di caricamento fino a categoria lo annullo
      this.timerCaricaFino = 0; // azzero il riferimento al timer di caricamento fino a categoria
    }

    if (this.timerAutoScrollSessione) {
      clearTimeout(this.timerAutoScrollSessione); // se esiste il timer dell'autoscroll di sessione lo annullo
      this.timerAutoScrollSessione = 0; // azzero il riferimento al timer dell'autoscroll di sessione
    }

    try {
      this.osservatoreSentinella?.disconnect();
    } catch {} // provo a disconnettere l'osservatore della sentinella senza generare errori bloccanti
    this.osservatoreSentinella = null; // azzero definitivamente il riferimento all'osservatore della sentinella
  }

  /**
   * Restituisce la chiave di tracking per una riga categoria del catalogo.
   *
   * @param _indice Indice corrente della riga nell'iterazione.
   * @param riga Riga del catalogo di cui usare l'idCategoria come chiave.
   * @returns string Chiave stabile per il tracking della riga.
   */
  tracciaRigaCategoria(_indice: number, riga: { idCategoria: string }): string {
    return riga.idCategoria; // restituisco l'id categoria come chiave stabile per il trackBy
  }

  /**
   * Restituisce il path base del catalogo in base alla lingua corrente.
   *
   * @returns string Path base localizzato del catalogo.
   */
  baseCatalogoDaLingua(): string {
    return CatalogoRoutingUtility.baseCatalogoDaLingua(this); // delego alla utility routing il calcolo del path base del catalogo
  }

  /**
   * Restituisce il sotto-path del catalogo relativo al tipo contenuto richiesto.
   *
   * @param val Tipo contenuto da convertire nel segmento di rotta corretto.
   * @returns string Segmento di rotta localizzato relativo al tipo contenuto.
   */
  sottoPathDaTipo(val: TipoContenuto): string {
    return CatalogoRoutingUtility.sottoPathDaTipo(this, val); // delego alla utility routing il calcolo del sotto-path per il tipo richiesto
  }

  /**
   * Forza la rotta del catalogo a essere coerente con lingua e tipo contenuto correnti.
   *
   * @param preservaBaseDaUrl Se true mantiene la base lingua/catalogo gia' presente nell'URL.
   * @returns void
   */
  forzaRottaCatalogoDaLinguaETipo(preservaBaseDaUrl: boolean = false): void {
    CatalogoRoutingUtility.forzaRottaCatalogoDaLinguaETipo(
      this,
      preservaBaseDaUrl,
    ); // delego alla utility routing l'allineamento della rotta a lingua e tipo
  }

  /**
   * Precarica le immagini di un insieme di righe del catalogo.
   *
   * @param righe Righe contenenti le locandine da precaricare.
   * @returns Promise<void> Promise risolta al termine del preload.
   */
  precaricaImmaginiRighe(
    righe: { locandine: { src: string }[] }[],
  ): Promise<void> {
    return CatalogoPreloadUtility.precaricaImmaginiRighe(righe); // delego alla utility preload il precaricamento delle immagini delle righe
  }

  /**
   * Aggiorna in place le righe del catalogo usando le nuove righe ricevute.
   *
   * @param nuoveRighe Nuovo insieme di righe da applicare.
   * @returns void
   */
  aggiornaRigheInPlace(
    nuoveRighe: { idCategoria: string; category: string; posters: string[] }[],
  ): void {
    CatalogoPreloadUtility.aggiornaRigheInPlace(this, nuoveRighe); // delego alla utility preload l'aggiornamento in place delle righe
  }

  /**
   * Aggiorna in place un array target di locandine usando i valori della sorgente.
   *
   * @param target Array destinazione da aggiornare.
   * @param sorgente Array sorgente con i valori da copiare.
   * @returns void
   */
  aggiornaLocandineInPlace(target: string[], sorgente: string[]): void {
    CatalogoPreloadUtility.aggiornaLocandineInPlace(target, sorgente); // delego alla utility preload l'aggiornamento in place delle locandine
  }

  /**
   * Avvia il flusso di cambio tipo contenuto rispettando le attese previste.
   * - Annulla un eventuale timer precedente
   * - Incrementa l'id del ciclo righe
   * - Notifica l'avvio del cambio tipo
   * - Dopo il ritardo previsto ricarica le prime righe
   *
   * @returns void
   */
  avviaCambioTipoConAttese(): void {
    if (this.timerCambioTipo) {
      clearTimeout(this.timerCambioTipo); // se esiste un timer precedente di cambio tipo lo annullo
      this.timerCambioTipo = 0; // azzero il riferimento al timer di cambio tipo
    }

    this.idCicloRighe += 1; // incremento l'id del ciclo righe per invalidare eventuali caricamenti precedenti
    const id = this.idCicloRighe; // mi salvo l'id del ciclo corrente di cambio tipo

    this.tipoContenuto.notificaCambioTipoAvviato(this.tipoSelezionato, id); // notifico al servizio che il cambio tipo e' stato avviato

    this.timerCambioTipo = setTimeout(() => {
      // aspetto il piccolo ritardo previsto prima di applicare davvero il nuovo caricamento
      this.timerCambioTipo = 0; // azzero il riferimento al timer appena scatta
      this.caricaPrimeRigheDaApi(id, true); // ricarico le prime righe usando l'id forzato e notificando il tipo applicato
    }, 100);
  }

  /**
   * Inizializza l'osservatore della sentinella del catalogo.
   *
   * @returns void
   */
  inizializzaOsservatoreSentinella(): void {
    CatalogoSentinellaUtility.inizializzaOsservatoreSentinella(this); // delego alla utility sentinella l'inizializzazione dell'osservatore
  }

  /**
   * Carica il primo blocco di righe del catalogo oppure ricarica il blocco iniziale.
   *
   * @param idForzato Id ciclo opzionale da usare per il caricamento corrente.
   * @param notificaTipoApplicato Se true notifica che il tipo e' stato applicato.
   * @returns void
   */
  caricaPrimeRigheDaApi(
    idForzato: number = 0,
    notificaTipoApplicato: boolean = false,
  ): void {
    CatalogoCaricamentoUtility.caricaPrimeRigheDaApi(
      this,
      idForzato,
      notificaTipoApplicato,
    ); // delego alla utility caricamento il caricamento iniziale o di ricarica delle righe
  }

  /**
   * Carica il blocco successivo di quattro righe del catalogo.
   *
   * @returns void
   */
  caricaAltreQuattroRigheDaApi(): void {
    CatalogoCaricamentoUtility.caricaAltreQuattroRigheDaApi(this); // delego alla utility caricamento il caricamento del blocco successivo di righe
  }

  /**
   * Gestisce lo scroll del catalogo verso una categoria specifica.
   *
   * @param idCategoria Id della categoria da raggiungere.
   * @returns void
   */
  gestisciScrollACategoria(idCategoria: string): void {
    CatalogoScrollCategoriaUtility.gestisciScrollACategoria(this, idCategoria); // delego alla utility scroll categoria la gestione dello scroll mirato
  }

  /**
   * Carica progressivamente righe del catalogo fino a trovare una categoria specifica.
   *
   * @param idCategoria Id della categoria da trovare.
   * @param token Token di validazione dello scroll corrente.
   * @returns Promise<boolean> Promise risolta con true se la categoria viene trovata, false altrimenti.
   */
  caricaFinoACategoria(idCategoria: string, token: number): Promise<boolean> {
    return CatalogoCaricamentoUtility.caricaFinoACategoria(
      this,
      idCategoria,
      token,
    ); // delego alla utility caricamento il caricamento progressivo fino alla categoria richiesta
  }

  /**
   * Forza un controllo immediato della sentinella del catalogo.
   *
   * @returns void
   */
  forzaControlloSentinella(): void {
    CatalogoSentinellaUtility.forzaControlloSentinella(this); // delego alla utility sentinella il controllo forzato della sentinella
  }

  /**
   * Legge da sessionStorage l'ultima categoria salvata.
   *
   * @returns string Id categoria letto da sessionStorage oppure stringa vuota.
   */
  leggiCategoriaDaSessionStorage(): string {
    return CatalogoSessionStorageUtility.leggiCategoriaDaSessionStorage(); // delego alla utility sessionStorage la lettura dell'ultima categoria salvata
  }

  /**
   * Pulisce da sessionStorage l'ultima categoria salvata.
   *
   * @returns void
   */
  pulisciCategoriaDaSessionStorage(): void {
    CatalogoSessionStorageUtility.pulisciCategoriaDaSessionStorage(); // delego alla utility sessionStorage la rimozione dell'ultima categoria salvata
  }

  /**
   * Pulisce da sessionStorage lo storico dello scroll orizzontale delle categorie.
   *
   * @returns void
   */
  pulisciStoricoScrollOrizzontaleDaSessionStorage(): void {
    CatalogoSessionStorageUtility.pulisciStoricoScrollOrizzontaleDaSessionStorage(); // delego alla utility sessionStorage la pulizia dello storico scroll orizzontale
  }

  /**
   * Prova ad avviare l'autoscroll iniziale usando i dati salvati in sessionStorage.
   *
   * @returns void
   */
  provaAutoScrollDaSessionStorage(): void {
    CatalogoSessionStorageUtility.provaAutoScrollDaSessionStorage(this); // delego alla utility sessionStorage il tentativo di autoscroll iniziale
  }

  /**
   * Legge da sessionStorage la pagina orizzontale salvata per una categoria specifica.
   *
   * @param idCategoria Id della categoria di cui leggere la posizione orizzontale.
   * @returns {{ idCategoria: string; pagina: number } | null} Dati di scroll orizzontale oppure null.
   */
  leggiScrollOrizzontalePerCategoriaDaSessionStorage(
    idCategoria: string,
  ): { idCategoria: string; pagina: number } | null {
    return CatalogoSessionStorageUtility.leggiScrollOrizzontalePerCategoriaDaSessionStorage(
      idCategoria,
    ); // delego alla utility sessionStorage la lettura dello scroll orizzontale per categoria
  }

  /**
   * Prova ad applicare lo scroll orizzontale iniziale alla riga della categoria richiesta.
   *
   * @param idCategoria Id della categoria su cui applicare la pagina iniziale.
   * @returns {{ eseguito: boolean; idCategoria: string; pagina: number } | null} Esito dell'applicazione oppure null.
   */
  applicaScrollOrizzontaleInizialePerCategoria(
    idCategoria: string,
  ): { eseguito: boolean; idCategoria: string; pagina: number } | null {
    return CatalogoSessionStorageUtility.applicaScrollOrizzontaleInizialePerCategoria(
      this,
      idCategoria,
    ); // delego alla utility sessionStorage l'applicazione della pagina iniziale orizzontale
  }

  /**
   * Salva in sessionStorage la posizione di scroll orizzontale per una categoria.
   *
   * @param idCategoria Id della categoria da salvare.
   * @param pagina Pagina orizzontale da salvare.
   * @returns void
   */
  salvaScrollOrizzontaleInSessionStorage(
    idCategoria: string,
    pagina: number,
  ): void {
    CatalogoSessionStorageUtility.salvaScrollOrizzontaleInSessionStorage(
      idCategoria,
      pagina,
    ); // delego alla utility sessionStorage il salvataggio della posizione orizzontale per categoria
  }
}
