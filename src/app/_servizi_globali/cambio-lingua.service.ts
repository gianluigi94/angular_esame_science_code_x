// service che centralizza cosa accade quando l'utente preme il pulsante per cambiare lingua (mi affianco il traduzioni.services)
import { Injectable, Injector } from '@angular/core';
import { BehaviorSubject, Subject, forkJoin, of, take, switchMap, map, tap, catchError} from 'rxjs';
import { TraduzioniService } from './traduzioni.service';
import { CaroselloNovitaService } from 'src/app/_catalogo/carosello-novita/carosello_services/carosello-novita.service';
import { NovitaInfo } from 'src/app/_interfacce/Inovita-info.interface';
import { Authservice } from 'src/app/_benvenuto/login/_login_service/auth.service';
import { ToastService } from 'src/app/_servizi_globali/toast.service';
import { Router } from '@angular/router';
@Injectable({ providedIn: 'root' }) // Rendo questo servizio disponibile in tutta l'app
export class CambioLinguaService {
  linguaUtente = 'inglese'; // Salvo la lingua scelta dall'utente in formato testuale, inglese default
  iconaLingua = 'assets/en.svg'; // Salvo il percorso dell'icona della lingua corrente, inglese default
  iconaLingua$ = new BehaviorSubject<string>(''); // Espongo l'icona corrente come stream per aggiornare la UI

  cambioLinguaAvviato$ = new Subject<string>(); // Notifico che ho iniziato il cambio lingua passando il codice 'it'/
  cambioLinguaApplicata$ = new Subject<{
    codice: string;
    mappaNovita: Record<string, NovitaInfo>;
  }>(); // Notifico che ho applicato la lingua e passo anche la mappa novità pronta

  constructor(
    private traduzioniService: TraduzioniService,
    private injector: Injector,
    private authService: Authservice,
    private router: Router,
    private toastService: ToastService
  ) {
    this.impostaLinguaIniziale(); // Imposto subito la lingua e icona iniziali leggendo localStorage o lingua del browser

    this.iconaLingua$.next(this.iconaLingua); // Pubblico l'icona iniziale così la UI si aggiorna subito

    const codiceLingua = this.leggiCodiceLingua(); // Ricavo il codice 'it' o 'en' dalla linguaUtente
    this.traduzioniService
      .assicuraTraduzioni$(codiceLingua) // Chiedo al servizio traduzioni di avere pronte le traduzioni per quella lingua
      .pipe(take(1)) // Prendo solo il primo completamento e poi chiudo
      .subscribe(() => {  // Quando le traduzioni sono disponibili
        this.traduzioniService.usaLingua(codiceLingua); // Applico la lingua così la UI usa le traduzioni corrette
      });
  }

  /**
 * Esegue il toggle della lingua dell'app e applica il cambio in modo coordinato.
 *
 * Flusso:
 * - Alterna 'linguaUtente' e aggiorna 'iconaLingua' + localStorage.
 * - Chiude eventuali toast aperti per evitare messaggi nella lingua sbagliata.
 * - Notifica l'inizio del cambio con 'cambioLinguaAvviato$'.
 * - In parallelo:
 *   - assicura il caricamento delle traduzioni tramite 'TraduzioniService'
 *   - se l'utente è autenticato e il servizio è disponibile, carica la mappa novità del carosello
 * - Precarica le immagini dei titoli  e poi applica la lingua.
 * - Notifica il completamento con 'cambioLinguaApplicata$' passando anche 'mappaNovita'.
 *
 * @returns void
 */
  cambiaLingua(): void {

    if (this.linguaUtente === 'inglese') { // Controllo se la lingua attuale è inglese
      this.linguaUtente = 'italiano'; // Imposto la nuova lingua a italiano
      this.iconaLingua = 'assets/it.svg'; // Imposto l'icona italiana
    } else {
      this.linguaUtente = 'inglese'; // Al contrario imposto la nuova lingua a inglese
      this.iconaLingua = 'assets/en.svg'; // Imposto l'icona inglese
    }

    localStorage.setItem('lingua_utente', this.linguaUtente); // Salvo la lingua scelta così resta anche al prossimo avvio
    this.iconaLingua$.next(this.iconaLingua); // Notifico subito la nuova icona

    const codice = this.leggiCodiceLingua(); // Calcolo il codice lingua 'it' o 'en'
    this.sincBenvenutoPathConLingua(codice);
    this.toastService.chiudiTutti(); // Chiudo tutti i toast per non lasciarli in una lingua sbagliata
    this.cambioLinguaAvviato$.next(codice); // Notifico che ho iniziato il cambio lingua con quel codice

    const srv = this.prendiCaroselloNovitaService(); // Recupero il servizio del carosello
    const possoCaricareNovita = this.utenteAutenticato() && !!srv; // Decido se posso caricare le novità solo se sono autenticato e il servizio esiste

    const novita$ = possoCaricareNovita // Scelgo quale observable usare per la mappa novità
      ? srv!.getInfoNovitaMap(codice).pipe( // Se posso, chiedo al server le info novità per la lingua
          take(1), // Prendo una sola risposta e poi chiudo
          catchError(() => of({} as Record<string, NovitaInfo>)) // Se fallisce, continuo con una mappa vuota
        )
      : of({} as Record<string, NovitaInfo>); // Se non posso caricare, uso direttamente una mappa vuota

    forkJoin({ // Aspetto che finiscano più operazioni in parallelo
      // t = traduzioni / m= mappa novità
      t: this.traduzioniService.assicuraTraduzioni$(codice).pipe(take(1)), // Carico/assicuro le traduzioni per la lingua scelta
      m: novita$, // Carico (se posso) la mappa delle novità
    })
      .pipe( // Compongo i passaggi successivi
        switchMap(({ m }) =>
          this.precaricaImmaginiTitolo$(m).pipe(map(() => m))
        ), // Precarico le immagini dei titoli e poi ritorno la mappa novità
        tap((mappaNovita) => {     // Quando è tutto pronto applico i cambi
          this.traduzioniService.usaLingua(codice); // Applico davvero la lingua alle traduzioni

          this.cambioLinguaApplicata$.next({ codice, mappaNovita }); // Notifico che la lingua è stata applicata e passo anche i dati del carosello
        })
      )
      .subscribe(); // Avvio la pipeline
  }

  /**
 * Converte la lingua testuale salvata in 'linguaUtente' nel codice lingua usato dall'app.
 *
 * @returns 'it' se 'linguaUtente' è 'italiano', altrimenti 'en'.
 */
  leggiCodiceLingua(): string {
    return this.linguaUtente === 'italiano' ? 'it' : 'en'; // Ritorno 'it' se la lingua è italiano, altrimenti 'en'
  }
  baseBenvenutoDaLingua(codice: string): string {
    return String(codice || '').toLowerCase() === 'it' ? '/benvenuto' : '/welcome';
  }

  sottoPathLoginDaLingua(codice: string): string {
    return String(codice || '').toLowerCase() === 'it' ? 'accedi' : 'login';
  }
  /**
 * Precarica le immagini 'img_titolo' presenti nella mappa delle novità.
 *
 * Estrae gli URL dalla mappa e avvia il preload in parallelo; completa quando tutte le immagini
 * risultano caricate/decodificate (o comunque non bloccanti in caso di errore).
 *
 * @param mappa Mappa delle novità indicizzata per chiave, contenente i dati (incluso 'img_titolo').
 * @returns Observable che completa quando il preload è terminato (o subito se non ci sono URL).
 */
  private precaricaImmaginiTitolo$(mappa: Record<string, NovitaInfo>) { // Creo una funzione che precarica le immagini dei titoli delle novità
    const urls = Object.values(mappa)
      .map((x) => x.img_titolo)
      .filter(Boolean); // Estraggo tutte le img_titolo e tengo solo quelle non vuote

    if (!urls.length) return of(void 0); // Se non ho url, ritorno subito un observable 'vuoto' che completa

    return forkJoin(urls.map((u) => this.precaricaImmagine$(u))).pipe(
      map(() => void 0)
    ); // Precarico tutte le immagini e poi ritorno void quando ho finito
  }

  /**
 * Precarica una singola immagine e completa quando è pronta (caricata o decodificata).
 *
 * Usa 'HTMLImageElement.decode()' se disponibile per aspettare la decodifica; in alternativa
 * completa su 'load' o anche su 'error' per non bloccare il flusso.
 *
 * @param url URL dell'immagine da precaricare.
 * @returns Promise/observable che si risolve quando l'immagine è pronta (o comunque non bloccante).
 */
  private precaricaImmagine$(url: string) {
    return new (class { // Creo una classe solo per incapsulare la Promise
      asObservable() { // Creo un metodo che ritorna qualcosa di osservabile
        return new Promise<void>((ok) => {  // Creo una Promise che risolve quando l'immagine è caricata/decodificata
          const img = new Image(); // Creo un oggetto Image del browser
          img.src = url; // Imposto l'URL per far partire il download
          if ((img as any).decode) {  // Controllo se il browser supporta decode()
            (img as any)
              .decode()
              .then(() => ok())
              .catch(() => ok()); // Aspetto decode e in ogni caso risolvo per non bloccare il flusso
          } else if (img.complete)
            ok(); // Se l'immagine è già completa, risolvo subito
          else img.onload = img.onerror = () => ok(); // Altrimenti risolvo quando carica o anche se va in errore
        });
      }
    })().asObservable(); // Istanzio la classe e chiamo subito asObservable() per ottenere la Promise
  }
/**
 * Verifica se le traduzioni della prossima lingua (quella che verrebbe selezionata al prossimo toggle)
 * sono già presenti in cache nel 'TraduzioniService'.
 *
 * @returns True se le traduzioni della prossima lingua risultano già caricate, altrimenti false.
 */
  haInCacheProssimaLingua(): boolean {
    const prossimaLingua =
      this.linguaUtente === 'italiano' ? 'inglese' : 'italiano'; // Calcolo quale sarebbe la lingua dopo il toggle
    const codiceProssima = prossimaLingua === 'italiano' ? 'it' : 'en'; // Converto la prossima lingua nel suo codice
    return this.traduzioniService.haTraduzioniInCache(codiceProssima); // Controllo nel servizio traduzioni se quel codice è già in cache
  }

  /**
 * Determina la lingua iniziale all'avvio del servizio.
 *
 * Priorità:
 * - Se presente e valida, usa 'lingua_utente' da localStorage ('italiano'/'inglese').
 * - Altrimenti usa la lingua primaria del browser e imposta 'italiano' se è 'it' o inizia con 'it-'.
 * Aggiorna anche 'iconaLingua' coerentemente.
 *
 * @link https://developer.mozilla.org/en-US/docs/Web/API/Navigator/languages
 * @returns void
 */
  private impostaLinguaIniziale(): void {
    const salvata = localStorage.getItem('lingua_utente'); // Leggo se l'utente aveva salvato una lingua

    if (salvata === 'italiano' || salvata === 'inglese') { // Controllo se il valore salvato è valido
      this.linguaUtente = salvata; // Uso la lingua salvata
    } else { // Se non c'è nulla di valido in localStorage
      const primaria = (navigator.languages?.[0] || navigator.language || '')
        .toLowerCase()
        .trim(); // Leggo la lingua principale del browser

      const eItaliano = primaria === 'it' || primaria.startsWith('it-'); // Controllo se la lingua del browser è italiano
      this.linguaUtente = eItaliano ? 'italiano' : 'inglese'; // Imposto la lingua iniziale in base al browser
    }

    this.iconaLingua =
      this.linguaUtente === 'italiano' ? 'assets/it.svg' : 'assets/en.svg'; // Imposto l'icona coerente con la lingua scelta
  }

  /**
 * Indica se l'utente risulta autenticato leggendo lo stato auth corrente.
 *
 * @returns True se esiste un token 'tk', altrimenti false.
 */
  private utenteAutenticato(): boolean {
    const auth = this.authService.leggiObsAuth().getValue(); // Leggo lo stato auth corrente dall'observable dell'autenticazione
    return !!auth?.tk; // Ritorno true se esiste un token (tk)
  }

  /**
 * Recupera in modo sicuro il servizio 'CaroselloNovitaService' tramite 'Injector'.
 *
 * Serve per evitare errori quando il servizio non è disponibile nel contesto corrente.
 *
 * @returns Istanza di 'CaroselloNovitaService' se disponibile, altrimenti null.
 */
  private prendiCaroselloNovitaService(): CaroselloNovitaService | null {
    return this.injector.get(CaroselloNovitaService, null); // Chiedo all'injector il servizio e ritorno null se non è disponibile
  }

      private sincBenvenutoPathConLingua(codice: string): void {
    const full = this.router.url || '';
    const path = full.split('?')[0].split('#')[0];

        const m = path.match(/^\/(benvenuto|welcome)(\/.*)?$/);
    if (!m) return;

    const base = this.baseBenvenutoDaLingua(codice);
        let tail = m[2] || '';
    // normalizzo la foglia login/accedi se presente
    tail = tail.replace(/^\/(login|accedi)(\/|$)/, (match, _leaf, slash) => {
      const leaf = this.sottoPathLoginDaLingua(codice);
      return '/' + leaf + (slash || '');
    });
    const target = (base + tail).replace(/\/+$/,'');
    const current = String(path || '').replace(/\/+$/,'');
    if (target === current) return;

    this.router.navigateByUrl(target, {
      replaceUrl: true,
      state: { saltaAnimazioniLogin: true },
    });
  }
}
