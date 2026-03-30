// Componente not-found che gestisce apertura, chiusura e navigazione di ritorno dalla schermata 404.
import { AnimateService } from 'src/app/_servizi_globali/animazioni_saturno/animate.service';
import { vengoDaBenvenutoDaSessione, salvaPathNonTrovatoDopoCaricamento } from 'src/app/_helpers_globali/helpers';
import { Component, AfterViewInit, OnInit, OnDestroy } from '@angular/core';
import { Authservice } from 'src/app/_benvenuto/login/_login_service/auth.service';
import { Router } from '@angular/router';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { Subscription } from 'rxjs';
import { NotFoundCloseService } from '../titles-main/not-found-close.service';
import { TraduzioniService } from 'src/app/_servizi_globali/traduzioni.service';

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.scss']
})
export class NotFoundComponent implements AfterViewInit, OnInit, OnDestroy {
  private subClose404?: Subscription; // salvo la subscribe della chiusura 404

  public vengoDaBenvenuto: boolean = false; // salvo se arrivo dalla schermata di benvenuto

  public mostra404 = false; // controllo la visibilita' della maschera 404
  public animazione404InCorso = false; // controllo se la chiusura animata e' in corso
  traduzioniPronte = false; // controllo se le traduzioni iniziali sono pronte
  public navigazioneInCorso = false; // controllo se la navigazione e' gia' partita
  private deveRicaricare = false; // salvo se alla chiusura devo forzare un reload
  public autenticato = false; // salvo se l'utente risulta autenticato
  public timerFallbackNavigazione: any = 0; // salvo il timer fallback della navigazione

  constructor(
    private animateService: AnimateService,
    private notFoundClose: NotFoundCloseService,
    private authService: Authservice,
    private router: Router,
    private traduzioniService: TraduzioniService,
    public cambioLinguaService: CambioLinguaService
  ) {}

  /**
   * Gestisce la fase successiva al rendering della view.
   *
   * Imposta lo stato di provenienza, sincronizza l'animazione globale
   * e salva il path 404 dopo il caricamento iniziale.
   *
   * @returns void
   */
  ngAfterViewInit(): void {
    this.vengoDaBenvenuto = vengoDaBenvenutoDaSessione(); // leggo se provengo dalla schermata benvenuto

    requestAnimationFrame(() => { // aspetto il frame successivo prima di toccare l'animazione globale
      this.animateService.setXNormale(); // ripristino la posizione X normale
      this.animateService.setTitoloAltoGlobal(); // imposto il titolo globale in alto

      requestAnimationFrame(() => { // aspetto un altro frame per completare l'assestamento visivo
        setTimeout(() => { // rimando di un tick il salvataggio del path
          salvaPathNonTrovatoDopoCaricamento(window.location.pathname); // salvo il path 404 corrente dopo il caricamento
        }, 0); // eseguo appena possibile nel ciclo eventi
      });
    });

    setTimeout(() => { this.mostra404 = true; }, 600); // mostro la maschera 404 dopo il piccolo ritardo iniziale
  }

  /**
   * Gestisce il click di chiusura della pagina 404.
   *
   * Determina se alla chiusura serve un reload completo
   * in base allo stato di autenticazione corrente.
   *
   * @returns void
   */
  chiudi404DaClick(): void {
    const auth = this.authService.leggiObsAuth().value; // leggo lo stato auth corrente
    const autenticato = auth && auth.tk !== null; // verifico se il token auth e' presente
    this.deveRicaricare = !autenticato; // decido se dopo la chiusura devo ricaricare
    this.chiudi404(); // avvio la chiusura della 404
  }

  /**
   * Avvia la chiusura animata della schermata 404.
   *
   * Blocca richieste duplicate e prepara un fallback
   * nel caso in cui il transitionend non parta.
   *
   * @returns void
   */
  chiudi404(): void {
    if (this.animazione404InCorso) return; // blocco una seconda chiusura mentre l'animazione e' gia' in corso
    if (this.navigazioneInCorso) return; // blocco la chiusura se la navigazione e' gia' partita
    if (!this.mostra404) return; // blocco tutto se la 404 e' gia' chiusa

    this.animazione404InCorso = true; // segno che l'animazione di chiusura e' iniziata
    this.mostra404 = false; // nascondo la maschera 404 per far partire la transizione

    if (this.timerFallbackNavigazione) { // controllo se esiste gia' un timer fallback attivo
      clearTimeout(this.timerFallbackNavigazione); // pulisco il timer fallback precedente
      this.timerFallbackNavigazione = 0; // azzero il riferimento al timer fallback
    } // chiudo il controllo del timer precedente
    this.timerFallbackNavigazione = setTimeout(() => { // preparo un fallback se transitionend non arriva
      this.eseguiNavigazioneCatalogo(); // eseguo comunque la navigazione verso il catalogo
    }, 420); // aspetto poco piu' della durata reale della transizione css
  }

  /**
   * Gestisce la fine della transizione della maschera 404.
   *
   * Esegue la navigazione finale solo se la chiusura
   * animata e' effettivamente in corso.
   *
   * @param event Evento di fine transizione intercettato dal template.
   * @returns void
   */
  onMaskTransitionEnd(event: TransitionEvent): void {
    if (!this.animazione404InCorso) return; // ignoro l'evento se non sono in fase di chiusura
    this.eseguiNavigazioneCatalogo(); // proseguo con la navigazione finale
  }

  /**
   * Esegue la navigazione di uscita dalla schermata 404.
   *
   * Pulisce il fallback, salva il flag di transizione
   * e decide se ricaricare la pagina o navigare al catalogo.
   *
   * @returns void
   */
  eseguiNavigazioneCatalogo(): void {
    if (this.navigazioneInCorso) return; // blocco una seconda navigazione se e' gia' partita

    this.navigazioneInCorso = true; // segno che la navigazione e' iniziata
    this.animazione404InCorso = false; // chiudo lo stato di animazione 404

    if (this.timerFallbackNavigazione) { // controllo se il timer fallback e' ancora attivo
      clearTimeout(this.timerFallbackNavigazione); // pulisco il timer fallback attivo
      this.timerFallbackNavigazione = 0; // azzero il riferimento al timer fallback
    } // chiudo il controllo sul timer

    try { // provo a salvare il flag di transizione in sessione
      sessionStorage.setItem('transizione_404_catalogo', '1'); // segno che sto uscendo dalla 404 verso il catalogo
    } catch {} // ignoro eventuali errori di accesso alla sessione

    if (this.deveRicaricare) { // controllo se devo ricaricare completamente la pagina
      setTimeout(() => { // aspetto il tempo necessario per chiudere l'animazione
        window.location.href = '/'; // ricarico puntando direttamente alla home
      }, 600); // ritardo coerente con la chiusura visiva
      return; // interrompo qui il flusso per non eseguire anche la navigate Angular
    } // chiudo il ramo del reload

    const lingua = this.cambioLinguaService.leggiCodiceLingua(); // leggo la lingua corrente
    const baseCatalogo =
      lingua === 'it' // controllo se la lingua corrente e' italiana
        ? '/it/catalogo/film-serie' // imposto il catalogo italiano
        : '/en/catalog/movies-series'; // imposto il catalogo inglese

    setTimeout(() => { // aspetto il tempo necessario per completare la chiusura visiva
      this.router.navigateByUrl(baseCatalogo); // navigo al catalogo corretto in base alla lingua
    }, 600); // ritardo coerente con la fine dell'animazione
  }

  /**
   * Inizializza stato e sottoscrizioni del componente.
   *
   * Aggiorna lo stato traduzioni, legge l'autenticazione iniziale
   * e si sottoscrive agli eventi di chiusura esterna della 404.
   *
   * @returns void
   */
  ngOnInit(): void {
    this.traduzioniService.traduzioniInizialiCaricate$.subscribe(v => { // mi sottoscrivo allo stato di caricamento traduzioni
      this.traduzioniPronte = v; // aggiorno il flag di traduzioni pronte
    });
    const auth = this.authService.leggiObsAuth().value; // leggo lo stato auth iniziale
    this.autenticato = auth && auth.tk !== null; // salvo se l'utente e' autenticato

    this.subClose404 = this.notFoundClose.close404$.subscribe((reload) => { // mi sottoscrivo alle richieste esterne di chiusura 404
      this.deveRicaricare = reload; // aggiorno se devo ricaricare dopo la chiusura
      this.chiudi404(); // avvio la chiusura della schermata 404
    });
  }

  /**
   * Libera le sottoscrizioni aperte dal componente.
   *
   * @returns void
   */
  ngOnDestroy(): void {
    this.subClose404?.unsubscribe(); // chiudo la subscribe della chiusura 404 se esiste
  }
}
