// Service che centralizza il cambio lingua dell'app, sincronizza traduzioni, percorsi correnti e dati collegati.

import { Injectable, Injector } from '@angular/core';
import { BehaviorSubject, Subject, forkJoin, of, take, switchMap, map, tap, catchError} from 'rxjs';
import { TraduzioniService } from './traduzioni.service';
import { CaroselloNovitaService } from 'src/app/_catalogo/carosello-novita/carosello_services/carosello-novita.service';
import { NovitaInfo } from 'src/app/_interfacce/Inovita-info.interface';
import { Authservice } from 'src/app/_benvenuto/login/_login_service/auth.service';
import { ToastService } from 'src/app/_servizi_globali/toast.service';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { traduciSegmentiUrl } from '../_helpers_globali/helpers';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import gsap from 'gsap';

gsap.registerPlugin(ScrollTrigger);

@Injectable({ providedIn: 'root' })
export class CambioLinguaService {
  linguaUtente = 'inglese'; // conservo la lingua scelta dall'utente in formato testuale
  iconaLingua = 'assets/en.svg'; // conservo il percorso dell'icona della lingua corrente
  iconaLingua$ = new BehaviorSubject<string>(''); // espongo l'icona corrente come stream per aggiornare la UI

  cambioLinguaAvviato$ = new Subject<string>(); // notifico che ho iniziato il cambio lingua passando il codice lingua
  cambioLinguaApplicata$ = new Subject<{ // notifico che ho applicato la lingua e passo anche la mappa novita' pronta
    codice: string; // conservo il codice lingua applicato
    mappaNovita: Record<string, NovitaInfo>; // conservo la mappa novita' pronta per gli altri flussi
  }>();

  constructor(
    private traduzioniService: TraduzioniService,
    private injector: Injector,
    private authService: Authservice,
    private router: Router,
    private location: Location,
    private toastService: ToastService
  ) {
    this.impostaLinguaIniziale(); // imposto subito lingua e icona iniziali leggendo storage o browser
    this.iconaLingua$.next(this.iconaLingua); // pubblico subito l'icona iniziale cosi' la UI si aggiorna
    const codiceLingua = this.leggiCodiceLingua(); // ricavo il codice lingua corrente dalla lingua testuale

    this.traduzioniService
      .assicuraTraduzioni$(codiceLingua) // chiedo al servizio traduzioni di avere pronte le traduzioni iniziali
      .pipe(take(1)) // prendo solo il primo completamento e poi chiudo
      .subscribe(() => { // aspetto che le traduzioni siano disponibili
        this.traduzioniService.usaLingua(codiceLingua); // applico la lingua cosi' la UI usa le traduzioni corrette
      });
  }

  /**
   * Esegue il toggle della lingua dell'app e applica il cambio in modo coordinato.
   *
   * @returns void
   */
  cambiaLingua(): void {
    if (this.linguaUtente === 'inglese') { // controllo se la lingua attuale e' inglese
      this.linguaUtente = 'italiano'; // imposto la nuova lingua a italiano
      this.iconaLingua = 'assets/it.svg'; // imposto l'icona italiana
    } else { // entro qui se la lingua attuale non e' inglese
      this.linguaUtente = 'inglese'; // imposto la nuova lingua a inglese
      this.iconaLingua = 'assets/en.svg'; // imposto l'icona inglese
    }

    localStorage.setItem('lingua_utente', this.linguaUtente); // salvo la lingua scelta cosi' resta anche al prossimo avvio
    localStorage.setItem('video_lingua', this.linguaUtente); // salvo anche la lingua video coerente con la lingua utente
    this.iconaLingua$.next(this.iconaLingua); // notifico subito la nuova icona

    const codice = this.leggiCodiceLingua(); // calcolo il codice lingua 'it' o 'en'
    const scroller = document.querySelector('.main-scroll') as HTMLElement | null; // recupero lo scroller principale se presente

    if (scroller) { // controllo se lo scroller esiste
      sessionStorage.setItem('welcome_scrollTop', String(scroller.scrollTop)); // salvo la posizione di scroll corrente
      sessionStorage.setItem('welcome_restore', '1'); // segno che lo scroll dovra' essere ripristinato
    }

    this.sincBenvenutoPathConLingua(codice); // sincronizzo il path dell'area benvenuto con la nuova lingua
    this.sincCatalogoPathConLingua(codice); // sincronizzo il path dell'area catalogo con la nuova lingua
    this.sincNotFoundPathConLingua(codice); // sincronizzo il path della pagina not found con la nuova lingua
    this.sincContattiPathConLingua(codice); // sincronizzo il path della pagina contatti con la nuova lingua
    this.sincIscrizionePathConLingua(codice);
    this.sincPianoPathConLingua(codice);
    this.toastService.chiudiTutti(); // chiudo eventuali toast aperti per evitare messaggi nella lingua sbagliata
    this.cambioLinguaAvviato$.next(codice); // notifico che ho iniziato il cambio lingua con quel codice

    const srv = this.prendiCaroselloNovitaService(); // recupero il servizio del carosello
    const possoCaricareNovita = this.utenteAutenticato() && !!srv; // decido se posso caricare le novita' solo se sono autenticato e il servizio esiste

    const novita$ = possoCaricareNovita // scelgo quale observable usare per la mappa novita'
      ? srv!.getInfoNovitaMap(codice).pipe( // se posso chiedo al server le info novita' per la lingua
          take(1), // prendo una sola risposta e poi chiudo
          catchError(() => of({} as Record<string, NovitaInfo>)) // se fallisce continuo con una mappa vuota
        )
      : of({} as Record<string, NovitaInfo>); // se non posso caricare uso direttamente una mappa vuota

    forkJoin({ // aspetto che finiscano piu' operazioni in parallelo
      t: this.traduzioniService.assicuraTraduzioni$(codice).pipe(take(1)), // assicuro le traduzioni per la lingua scelta
      m: novita$, // carico se possibile la mappa delle novita'
    })
      .pipe( // compongo i passaggi successivi
        switchMap(({ m }) => // prendo la mappa novita' prodotta dallo step precedente
          this.precaricaImmaginiTitolo$(m).pipe(map(() => m)) // precarico le immagini dei titoli e poi ritorno la mappa novita'
        ),
        tap((mappaNovita) => { // quando e' tutto pronto applico i cambi finali
          this.traduzioniService.usaLingua(codice); // applico davvero la lingua alle traduzioni
          this.cambioLinguaApplicata$.next({ codice, mappaNovita }); // notifico che la lingua e' stata applicata e passo anche i dati del carosello

          requestAnimationFrame(() => { // aspetto un frame prima di riallineare gli ScrollTrigger
            requestAnimationFrame(() => { // aspetto un secondo frame per dare tempo al layout di aggiornarsi
              try { // provo a forzare il refresh degli ScrollTrigger
                ScrollTrigger.refresh(); // ricalcolo start e end dei trigger
                ScrollTrigger.update(); // aggiorno subito lo stato corrente dei trigger
                console.log('[LANG] ScrollTrigger refresh after language apply'); // scrivo un log diagnostico del refresh lingua
              } catch {} // ignoro eventuali errori di refresh
            });
          });
        })
      )
      .subscribe(); // avvio la pipeline
  }

  /**
   * Converte la lingua testuale salvata nel codice lingua usato dall'app.
   *
   * @returns string
   */
  leggiCodiceLingua(): string {
    return this.linguaUtente === 'italiano' ? 'it' : 'en'; // ritorno 'it' se la lingua e' italiano altrimenti 'en'
  }

  /**
   * Restituisce il prefisso URL coerente con il codice lingua ricevuto.
   *
   * @param codice Codice lingua da convertire in prefisso URL.
   * @returns string
   */
  prefissoDaCodice(codice: string): string {
    return String(codice || '').toLowerCase() === 'it' ? '/it' : '/en'; // ritorno il prefisso URL corretto in base al codice lingua
  }

  /**
   * Restituisce il path base dell'area benvenuto coerente con la lingua ricevuta.
   *
   * @param codice Codice lingua da usare per costruire il path.
   * @returns string
   */
  baseBenvenutoDaLingua(codice: string): string {
    const pref = this.prefissoDaCodice(codice); // ricavo il prefisso lingua da usare nell'URL
    const base = String(codice || '').toLowerCase() === 'it' ? '/benvenuto' : '/welcome'; // ricavo il segmento base coerente con la lingua
    return pref + base; // ritorno il path base completo
  }

  /**
   * Restituisce il segmento login coerente con la lingua ricevuta.
   *
   * @param codice Codice lingua da usare per il segmento login.
   * @returns string
   */
  sottoPathLoginDaLingua(codice: string): string {
    return String(codice || '').toLowerCase() === 'it' ? 'accedi' : 'login'; // ritorno il segmento login corretto per la lingua
  }

  /**
   * Precarica le immagini 'img_titolo' presenti nella mappa delle novita'.
   *
   * @param mappa Mappa delle novita' contenente anche gli URL dei titoli da precaricare.
   * @returns any
   */
  private precaricaImmaginiTitolo$(mappa: Record<string, NovitaInfo>) { // creo una funzione che precarica le immagini dei titoli delle novita'
    const urls = Object.values(mappa) // trasformo la mappa in una lista di valori
      .map((x) => x.img_titolo) // estraggo da ogni elemento l'URL dell'immagine titolo
      .filter(Boolean); // tengo solo gli URL non vuoti

    if (!urls.length) return of(void 0); // se non ho URL ritorno subito un observable che completa

    return forkJoin(urls.map((u) => this.precaricaImmagine$(u))).pipe( // precarico tutte le immagini in parallelo
      map(() => void 0) // trasformo il risultato finale in void
    );
  }

  /**
   * Precarica una singola immagine e completa quando e' pronta.
   *
   * @param url URL dell'immagine da precaricare.
   * @returns any
   */
  private precaricaImmagine$(url: string) { // creo una funzione che precarica una singola immagine
    return new (class { // creo una classe solo per incapsulare la Promise
      asObservable() { // creo un metodo che ritorna qualcosa di osservabile
        return new Promise<void>((ok) => { // creo una Promise che risolve quando l'immagine e' caricata o decodificata
          const img = new Image(); // creo un oggetto Image del browser
          img.src = url; // imposto l'URL per far partire il download

          if ((img as any).decode) { // controllo se il browser supporta decode()
            (img as any) // uso l'immagine castata per accedere a decode
              .decode() // provo a decodificare l'immagine
              .then(() => ok()) // risolvo se la decodifica va a buon fine
              .catch(() => ok()); // risolvo comunque anche se la decodifica fallisce
          } else if (img.complete) { // controllo se l'immagine risulta gia' completa
            ok(); // risolvo subito se l'immagine e' gia' pronta
          } else {
            img.onload = img.onerror = () => ok(); // risolvo quando carica o anche se va in errore
          }
        });
      }
    })().asObservable(); // istanzio la classe e chiamo subito asObservable per ottenere la Promise
  }

  /**
   * Verifica se le traduzioni della prossima lingua sono gia' presenti in cache.
   *
   * @returns boolean
   */
  haInCacheProssimaLingua(): boolean {
    const prossimaLingua = this.linguaUtente === 'italiano' ? 'inglese' : 'italiano'; // calcolo quale sarebbe la lingua dopo il toggle
    const codiceProssima = prossimaLingua === 'italiano' ? 'it' : 'en'; // converto la prossima lingua nel suo codice
    return this.traduzioniService.haTraduzioniInCache(codiceProssima); // controllo nel servizio traduzioni se quel codice e' gia' in cache
  }

  /**
   * Determina la lingua iniziale all'avvio del servizio.
   *
   * @returns void
   */
  private impostaLinguaIniziale(): void {
    const salvata = localStorage.getItem('lingua_utente'); // leggo se l'utente aveva salvato una lingua

    if (salvata === 'italiano' || salvata === 'inglese') { // controllo se il valore salvato e' valido
      this.linguaUtente = salvata; // uso la lingua salvata
    } else { // entro qui se non c'e' una lingua valida salvata
      const primaria = (navigator.languages?.[0] || navigator.language || '') // ricavo la lingua primaria dal browser
        .toLowerCase() // normalizzo in minuscolo
        .trim(); // rimuovo eventuali spazi superflui

      const eItaliano = primaria === 'it' || primaria.startsWith('it-'); // controllo se la lingua primaria del browser e' italiana
      this.linguaUtente = eItaliano ? 'italiano' : 'inglese'; // imposto la lingua iniziale in base al browser
      localStorage.setItem('lingua_utente', this.linguaUtente); // salvo subito la preferenza rilevata dal browser
      localStorage.setItem('video_lingua', this.linguaUtente); // salvo anche la lingua video coerente
    }

    this.iconaLingua = this.linguaUtente === 'italiano' ? 'assets/it.svg' : 'assets/en.svg'; // imposto l'icona coerente con la lingua scelta
  }

  /**
   * Indica se l'utente risulta autenticato leggendo lo stato auth corrente.
   *
   * @returns boolean
   */
  private utenteAutenticato(): boolean {
    const auth = this.authService.leggiObsAuth().getValue(); // leggo lo stato auth corrente dall'observable dell'autenticazione
    return !!auth?.tk; // ritorno true se esiste un token
  }

  /**
   * Recupera in modo sicuro il servizio del carosello novita' tramite injector.
   *
   * @returns CaroselloNovitaService | null
   */
  private prendiCaroselloNovitaService(): CaroselloNovitaService | null {
    return this.injector.get(CaroselloNovitaService, null); // chiedo all'injector il servizio e ritorno null se non e' disponibile
  }

  /**
   * Sincronizza il path dell'area benvenuto con la lingua ricevuta senza navigare.
   *
   * @param codice Codice lingua da applicare al path corrente.
   * @returns void
   */
  private sincBenvenutoPathConLingua(codice: string): void {
    const full = // preparo il path completo attuale con eventuali query e hash
      this.location.path(true) || // provo a leggere il path tramite Location
      (window.location.pathname + window.location.search + window.location.hash) || // ripiego sul path nativo del browser
      ''; // uso stringa vuota come fallback finale
    const path = full.split('?')[0].split('#')[0]; // isolo il solo path senza query e hash
    const m = path.match(/^\/(it|en)\/(benvenuto|welcome)(\/.*)?$/); // verifico se mi trovo nell'area benvenuto

    if (!m) return; // esco subito se il path non appartiene all'area benvenuto

    const base = this.baseBenvenutoDaLingua(codice); // ricavo la base benvenuto corretta per la lingua
    let tail = m[3] || ''; // ricavo l'eventuale coda del path dopo la base

    tail = tail.replace(/^\/(login|accedi)(\/|$)/, (match, _leaf, slash) => { // normalizzo la foglia login o accedi se presente
      const leaf = this.sottoPathLoginDaLingua(codice); // ricavo il segmento login corretto per la lingua
      return '/' + leaf + (slash || ''); // ricompongo la foglia con l'eventuale slash finale
    });

    const target = (base + tail).replace(/\/+$/,''); // costruisco il path di destinazione pulito
    const current = String(path || '').replace(/\/+$/,''); // normalizzo il path corrente per il confronto

    if (target === current) return; // esco se il target coincide gia' con il path corrente

    const soloPath = full.split('?')[0].split('#')[0]; // ricavo di nuovo il solo path senza query e hash
    const tailQh = full.substring(soloPath.length); // ricavo la parte finale con query e hash se presenti
    this.location.replaceState(target + tailQh); // cambio URL senza navigare e senza ricreare componenti
  }

  /**
   * Imposta la lingua a partire da un codice e applica traduzioni e icona coerenti.
   *
   * @param codice Codice lingua da applicare.
   * @param salva Indica se salvare la lingua anche nel localStorage.
   * @returns void
   */
  impostaLinguaDaCodice(codice: string, salva: boolean = false): void {
    const c = String(codice || '').toLowerCase() === 'it' ? 'it' : 'en'; // normalizzo il codice lingua ricevuto
    this.linguaUtente = c === 'it' ? 'italiano' : 'inglese'; // aggiorno la lingua utente testuale
    this.iconaLingua = c === 'it' ? 'assets/it.svg' : 'assets/en.svg'; // aggiorno l'icona coerente con la lingua

    if (salva) localStorage.setItem('lingua_utente', this.linguaUtente); // salvo la lingua se richiesto

    this.iconaLingua$.next(this.iconaLingua); // notifico la nuova icona alla UI

    this.traduzioniService.assicuraTraduzioni$(c).pipe(take(1)).subscribe(() => { // assicuro le traduzioni della lingua richiesta
      this.traduzioniService.usaLingua(c); // applico la lingua appena le traduzioni sono pronte
    });
  }

  /**
   * Sincronizza il path dell'area catalogo con la lingua ricevuta senza navigare.
   *
   * @param codice Codice lingua da applicare al path corrente.
   * @returns void
   */
  private sincCatalogoPathConLingua(codice: string): void {
    const full = // preparo il path completo attuale con eventuali query e hash
      this.location.path(true) || // provo a leggere il path tramite Location
      (window.location.pathname + window.location.search + window.location.hash) || // ripiego sul path nativo del browser
      ''; // uso stringa vuota come fallback finale
    const soloPath = full.split('?')[0].split('#')[0]; // isolo il solo path senza query e hash
    const tail = full.substring(soloPath.length); // ricavo la parte finale con query e hash

    const m = soloPath.match(/^\/(it|en)\/(catalogo|catalog)(\/.*)?$/); // verifico se mi trovo nell'area catalogo

    if (!m) return; // esco subito se il path non appartiene all'area catalogo

    const c = String(codice || '').toLowerCase() === 'it' ? 'it' : 'en'; // normalizzo il codice lingua richiesto
    const base = '/' + c + (c === 'it' ? '/catalogo' : '/catalog'); // costruisco la base catalogo corretta per la lingua
    let resto = (m[3] || ''); // ricavo il resto del path dopo la base catalogo

    resto = traduciSegmentiUrl(resto, c as 'it' | 'en'); // traduco gli eventuali segmenti secondari del path
    const target = (base + resto).replace(/\/+$/, ''); // costruisco il path di destinazione pulito
    const current = soloPath.replace(/\/+$/, ''); // normalizzo il path corrente per il confronto

    if (target === current) return; // esco se il target coincide gia' con il path corrente

    this.location.replaceState(target + tail); // cambio URL senza navigare e senza ricreare componenti
  }

  /**
   * Sincronizza il path della pagina not found con la lingua ricevuta senza navigare.
   *
   * @param codice Codice lingua da applicare al path corrente.
   * @returns void
   */
  private sincNotFoundPathConLingua(codice: string): void {
    const full = // preparo il path completo attuale con eventuali query e hash
      this.location.path(true) || // provo a leggere il path tramite Location
      (window.location.pathname + window.location.search + window.location.hash) || // ripiego sul path nativo del browser
      ''; // uso stringa vuota come fallback finale
    const soloPath = full.split('?')[0].split('#')[0]; // isolo il solo path senza query e hash
    const tail = full.substring(soloPath.length); // ricavo la parte finale con query e hash
    const m = soloPath.match(/^\/(it|en)\/(non-trovato|not-found)(\/.*)?$/); // verifico se mi trovo nella pagina not found

    if (!m) return; // esco subito se il path non appartiene alla pagina not found

    const c = String(codice || '').toLowerCase() === 'it' ? 'it' : 'en'; // normalizzo il codice lingua richiesto
    const segmento404 = c === 'it' ? 'non-trovato' : 'not-found'; // ricavo il segmento corretto della pagina 404
    const resto = m[3] || ''; // ricavo l'eventuale coda del path
    const target = ('/' + c + '/' + segmento404 + resto).replace(/\/+$/, ''); // costruisco il path di destinazione pulito
    const current = soloPath.replace(/\/+$/, ''); // normalizzo il path corrente per il confronto

    if (target === current) return; // esco se il target coincide gia' con il path corrente

    this.location.replaceState(target + tail); // cambio URL senza navigare e senza ricreare componenti
  }

  /**
   * Sincronizza il path della pagina contatti con la lingua ricevuta senza navigare.
   *
   * @param codice Codice lingua da applicare al path corrente.
   * @returns void
   */
  private sincContattiPathConLingua(codice: string): void {
    const full = // preparo il path completo attuale con eventuali query e hash
      this.location.path(true) || // provo a leggere il path tramite Location
      (window.location.pathname + window.location.search + window.location.hash) || // ripiego sul path nativo del browser
      ''; // uso stringa vuota come fallback finale
    const soloPath = full.split('?')[0].split('#')[0]; // isolo il solo path senza query e hash
    const tail = full.substring(soloPath.length); // ricavo la parte finale con query e hash
    const m = soloPath.match(/^\/(it|en)\/(contatti|contact)(\/.*)?$/); // verifico se mi trovo nella pagina contatti

    if (!m) return; // esco subito se il path non appartiene alla pagina contatti

    const c = String(codice || '').toLowerCase() === 'it' ? 'it' : 'en'; // normalizzo il codice lingua richiesto
    const segmento = c === 'it' ? 'contatti' : 'contact'; // ricavo il segmento corretto della pagina contatti
    const resto = m[3] || ''; // ricavo l'eventuale coda del path
    const target = ('/' + c + '/' + segmento + resto).replace(/\/+$/, ''); // costruisco il path di destinazione pulito
    const current = soloPath.replace(/\/+$/, ''); // normalizzo il path corrente per il confronto

    if (target === current) return; // esco se il target coincide gia' con il path corrente

    this.location.replaceState(target + tail); // cambio URL senza navigare e senza ricreare componenti
  }
private sincPianoPathConLingua(codice: string): void {
    const full =
      this.location.path(true) ||
      (window.location.pathname + window.location.search + window.location.hash) ||
      '';
    const soloPath = full.split('?')[0].split('#')[0];
    const tail = full.substring(soloPath.length);
    const m = soloPath.match(/^\/(it|en)\/(piano|plan)(\/.*)?$/);

    if (!m) return;

    const c = String(codice || '').toLowerCase() === 'it' ? 'it' : 'en';
    const segmento = c === 'it' ? 'piano' : 'plan';
    const resto = m[3] || '';
    const target = ('/' + c + '/' + segmento + resto).replace(/\/+$/, '');
    const current = soloPath.replace(/\/+$/, '');

    if (target === current) return;

    this.location.replaceState(target + tail);
  }
  /**
   * Sincronizza il path della pagina iscrizione con la lingua ricevuta senza navigare.
   *
   * @param codice Codice lingua da applicare al path corrente.
   * @returns void
   */
  private sincIscrizionePathConLingua(codice: string): void {
    const full = // preparo il path completo attuale con eventuali query e hash
      this.location.path(true) || // provo a leggere il path tramite Location
      (window.location.pathname + window.location.search + window.location.hash) || // ripiego sul path nativo del browser
      ''; // uso stringa vuota come fallback finale
    const soloPath = full.split('?')[0].split('#')[0]; // isolo il solo path senza query e hash
    const tail = full.substring(soloPath.length); // ricavo la parte finale con query e hash
    const m = soloPath.match(/^\/(it|en)\/(benvenuto|welcome)\/(registrazione|registration)(\/.*)?$/); // verifico se mi trovo nella pagina iscrizione

    if (!m) return; // esco subito se il path non appartiene alla pagina iscrizione

    const c = String(codice || '').toLowerCase() === 'it' ? 'it' : 'en'; // normalizzo il codice lingua richiesto
    const base = this.baseBenvenutoDaLingua(c); // ricavo la base benvenuto coerente con la lingua
    const sottoPath = c === 'it' ? 'registrazione' : 'registration'; // ricavo il segmento iscrizione corretto per la lingua
    const resto = m[4] || ''; // ricavo l'eventuale coda del path
    const target = (base + '/' + sottoPath + resto).replace(/\/+$/, ''); // costruisco il path di destinazione pulito
    const current = soloPath.replace(/\/+$/, ''); // normalizzo il path corrente per il confronto

    if (target === current) return; // esco se il target coincide gia' con il path corrente

    this.location.replaceState(target + tail); // cambio URL senza navigare e senza ricreare componenti
  }
}
