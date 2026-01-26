// services dove centralizzo la chiamate ami
import { Injectable } from '@angular/core';
import { ChiamataHTTP } from '../_type/chiamateHTTP.type';
import { HttpClient } from '@angular/common/http';
import { concatMap, map, Observable, take, tap } from 'rxjs';
import { IRispostaServer } from '../_interfacce/IRispostaServer.interface';
import { UtilityService } from '../_benvenuto/login/_login_service/login_utility.service';

@Injectable({ providedIn: 'root' }) // Rendo questo servizio disponibile in tutta l'app senza doverlo dichiarare in un modulo
export class ApiService {
  constructor(private http: HttpClient) {}

  /**
 * Costruisce l'URL completo di una risorsa API a partire da server, versione e segmenti dell'endpoint.
 *
 * Converte i segmenti in stringa e li unisce con '/' per ottenere un URL del tipo:
 *
 * @param risorsa Lista di segmenti dell'endpoint (stringhe o numeri) da concatenare.
 * @returns URL completo della risorsa.
 */
  protected calcolaRisorsa(risorsa: (string | number)[]): string {
    // funzione che costruisce l'URL di una chiamata API
    // const server: string = 'http://localhost/science_codex/public/api';
    // const server: string = 'http://192.168.1.36/science_codex/public/api';
    const server: string = 'https://api.sciencecodex.net/api';
    const versione: string = 'v1'; // Definisco la versione dell'API da usare

    const segments = [server, versione, ...risorsa.map(String)]; // Unisco server, versione e parametri della risorsa in un array
    const url = segments.join('/'); // Costruisco l'URL finale unendo i segmenti con /

    return url;
  }

  /**
 * Esegue una richiesta HTTP generica verso l'API usando il tipo di chiamata indicato.
 *

 *
 * @param risorsa Segmenti dell'endpoint
 * @param tipo Tipo di chiamata HTTP
 * @param parametri Parametri query opzionali (default: null).
 * @returns Observable con la risposta standard del server ('IRispostaServer').
 */
  protected richiestaGenerica(
    risorsa: (string | number)[], // Ricevo i pezzi dell'endpoint
    tipo: ChiamataHTTP, // Ricevo il tipo di chiamata
    parametri: Object | null = null // Ricevo eventuali parametri query (opzionali)
  ): Observable<IRispostaServer> { // Dico che ritorno un Observable con la risposta del server
    const url = this.calcolaRisorsa(risorsa); // Costruisco l'URL completo usando i segmenti della risorsa

    switch (
      tipo // Scelgo cosa fare in base al tipo di chiamata
    ) {
      case 'GET': // Gestisco il caso GET
        const options = parametri ? { params: parametri as any } : {}; // Creo le options con i params solo se esistono
        return this.http.get<IRispostaServer>(url, options); // Faccio la GET e ritorno l'observable della risposta

      default:
        return this.http.get<IRispostaServer>(url); // Faccio comunque una GET senza parametri
    }
  }

  /**
 * Recupera l'elenco delle categorie (tipologie indirizzi).
 *
 * @returns Observable con la risposta del server contenente l'elenco categorie.
 */
  public getTipologieIndirizzi(): Observable<IRispostaServer> {
    const risorsa: string[] = ['categorie']; // Definisco l'endpoint da chiamare
    return this.richiestaGenerica(risorsa, 'GET'); // Riutilizzo richiesta generica per fare la GET
  }

  /**
 * Recupera una categoria specifica tramite id.
 *
 * @param id Identificativo della categoria.
 * @returns Observable con la risposta del server contenente i dettagli della categoria.
 */
  public getTipologiaIndirizzo(id: string): Observable<IRispostaServer> {
    const risorsa: string[] = ['categorie', id]; // Definisco l'endpoint includendo l'id
    return this.richiestaGenerica(risorsa, 'GET'); // Riutilizzo la richiesta generica per fare la GET
  }

  /**
 * Esegue la fase 1 del login recuperando i dati necessari  a partire dall'hash utente.
 *
 * @param hashUtente Hash dell'utente normalizzato.
 * @returns Observable con la risposta del server della fase 1.
 */
  public getLoginFase1(hashUtente: string): Observable<IRispostaServer> {
    //metodo per fare la prima chiamata di login usando solo l'hash utente
    const risorsa: string[] = ['accedi', hashUtente]; // Imposto l'endpoint /accedi/{hashUtente}
    const rit = this.richiestaGenerica(risorsa, 'GET'); // Faccio la richiesta GET generica e salvo il risultato
    return rit;
  }

  /**
 * Esegue la fase 2 del login usando hash utente, password mascherata e opzione 'resta collegato'.
 *
 * Se 'collegato' è true aggiunge il parametro query 'collegato=1'.
 *
 * @param hashUtente Hash dell'utente normalizzato.
 * @param hashPassword Hash/password mascherata calcolata lato client.
 * @param collegato Se true richiede una sessione persistente.
 * @returns Observable con la risposta del server della fase 2.
 */
  public getLoginFase2(
    hashUtente: string, // Ricevo l'hash dell'utente
    hashPassword: string, // Ricevo l'hash della password (o password mascherata)
    collegato: boolean // Ricevo se devo restare collegato
  ): Observable<IRispostaServer> { // Dico che ritorno un Observable con la risposta del server
    const risorsa: string[] = ['accedi', hashUtente, hashPassword]; // Imposto l'endpoint /accedi/{hashUtente}/{hashPassword}
    const parametri = collegato ? { collegato: '1' } : {}; // Aggiungo il parametro collegato=1  se richiesto in querystring
    return this.richiestaGenerica(risorsa, 'GET', parametri); // Faccio la GET passando anche i parametri
  }

  /**
 * Esegue il login completo a due fasi tramite pipeline RxJS.
 *
 * Flusso:
 * - Normalizza l'utente e calcola gli hash.
 * - Fase 1: richiede al server i dati per calcolare la password mascherata  'sale'.
 * - Calcola la password mascherata con 'UtilityService.nascondiPassword'.
 * - Fase 2: invia hash utente + password mascherata e l'opzione 'restaCollegato'.
 *
 * @param utente Username inserito dall'utente.
 * @param password Password inserita dall'utente.
 * @param restaCollegato Se true richiede una sessione persistente.
 * @returns Observable con la risposta del server del login.
 */
  public login(
    utente: string, // Ricevo l'username inserito
    password: string, // Ricevo la password inserita
    restaCollegato: boolean // Ricevo se l'utente vuole restare collegato
  ): Observable<IRispostaServer> {  // Ritorno un Observable con la risposta del server
    const utenteNorm = utente.trim().toLowerCase(); // Normalizzo l'utente togliendo spazi e mettendo in minuscolo
    const hashUtente: string = UtilityService.hash(utenteNorm); // Calcolo l'hash dell'utente normalizzato
    const hashPassword: string = UtilityService.hash(password); // Calcolo l'hash della password

    const controllo$ = this.getLoginFase1(hashUtente).pipe( // Avvio la fase 1 e costruisco la pipeline RxJS
      take(1), // Prendo solo la prima risposta e poi chiudo
      tap((x) => console.log('DATI', x)), // Loggo i dati ricevuti per debug
      map((rit: IRispostaServer): string => {  // Trasformo la risposta della fase 1 nella password 'nascosta'
        const sale: string = rit.data.sale; // Estraggo il sale dalla risposta del server
        const passwordNascosta = UtilityService.nascondiPassword( // Calcolo una password mascherata usando hash e sale
          hashPassword, // Passo l'hash della password
          sale // Passo il sale del server
        );
        return passwordNascosta; // Ritorno la password mascherata come output della map
      }),
      concatMap((passwordNascosta: string) => { // Passo alla fase 2 aspettando che la fase 1 sia completata
        return this.getLoginFase2(hashUtente, passwordNascosta, restaCollegato); // Chiamo la fase 2 con utente, password e opzione resta collegato
      })
    );

    return controllo$;
  }

  /**
 * Recupera l'elenco dei film.
 *
 * @returns Observable con la risposta del server contenente l'elenco film.
 */
  public getElencoFilm(): Observable<IRispostaServer> {
    const risorsa: string[] = ['film']; // Imposto l'endpoint /film
    return this.richiestaGenerica(risorsa, 'GET'); // Faccio la GET
  }

  /**
 * Recupera l'elenco delle serie.
 *
 * @returns Observable con la risposta del server contenente l'elenco serie.
 */
  public getElencoSerie(): Observable<IRispostaServer> {
    const risorsa: string[] = ['serie']; // Imposto l'endpoint /serie
    return this.richiestaGenerica(risorsa, 'GET'); // Faccio la GET
  }

  /**
 * Recupera l'elenco delle novità.
 *
 * @returns Observable con la risposta del server contenente le novità.
 */
  getVnovita(): Observable<IRispostaServer> {
    const risorsa: string[] = ['novita']; // Imposto l'endpoint /novita
    return this.richiestaGenerica(risorsa, 'GET'); // Faccio la GET
  }

  /**
 * Esegue il logout lato server.
 *
 * @returns Observable con la risposta del server del logout.
 */
  public logout(): Observable<IRispostaServer> {
    const risorsa: (string | number)[] = ['logout']; // Imposto l'endpoint /logout
    return this.richiestaGenerica(risorsa, 'GET'); // Chiamo la GET di logout
  }

 /**
 * Scarica le traduzioni per una specifica lingua.
 *
 * Chiama l'endpoint 'traduzioni-lingua/<codiceLingua>' e ritorna un dizionario chiave -> traduzione.
 * non vuole Irisposta server voglio solo chiave->valore
 * @param codiceLingua Codice lingua.
 * @returns Observable con la mappa delle traduzioni.
 */
  public getTraduzioniLingua( codiceLingua: string ): Observable<Record<string, string>> {
    const url = this.calcolaRisorsa(['traduzioni-lingua', codiceLingua]); // Costruisco l'URL /traduzioni-lingua/{codiceLingua}
    return this.http.get<Record<string, string>>(url); // Faccio la GET diretta e ritorno un dizionario chiave->traduzione
  }



  /**
 * Recupera l'elenco delle categorie (per righe catalogo).
 *
 * @returns Observable con la risposta del server contenente l'elenco categorie.
 */
  public getCategorieCatalogo(): Observable<IRispostaServer> {
    const risorsa: string[] = ['categorie']; // Imposto l'endpoint /categorie
    return this.richiestaGenerica(risorsa, 'GET'); // Faccio la GET
  }



/**
 * Recupera l'elenco delle traduzioni categorie.
 *
 * @returns Observable con la risposta del server contenente l'elenco traduzioni categorie.
 */
  public getCategorieTraduzioni(): Observable<IRispostaServer> {
    const risorsa: string[] = ['categorie-traduzioni']; // Imposto l'endpoint /categorie-traduzioni
    return this.richiestaGenerica(risorsa, 'GET'); // Faccio la GET
  }


/**
 * Recupera le locandine per categorie (vista categorie-locandine).
 *
 * @returns Observable con la risposta del server contenente id_categoria, img_locandina, lingua.
 */
  public getCategorieLocandine(): Observable<IRispostaServer> {
    const risorsa: string[] = ['categorie-locandine']; // Imposto l'endpoint /categorie-locandine
    return this.richiestaGenerica(risorsa, 'GET'); // Faccio la GET
  }

   public getCatalogoRighe(
 lingua: string,
 tipo: string,
 limit: number = 4,
 offset: number = 0
 ): Observable<IRispostaServer> {
 const risorsa: string[] = ['catalogo-righe'];
 const parametri = {
 lingua: String(lingua),
 tipo: String(tipo),
 limit: String(limit),
 offset: String(offset),
 };
 return this.richiestaGenerica(risorsa, 'GET', parametri);
 }
}
