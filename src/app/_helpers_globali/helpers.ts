/**
 * Determina se l'utente sta utilizzando un dispositivo mobile o tablet.
 *
 * Il controllo viene effettuato analizzando lo user agent e cercando
 * parole chiave tipiche dei browser mobile/tablet.
 *
 * @param userAgent User agent da analizzare. Di default viene usato quello del browser corrente.
 * @returns boolean True se il dispositivo e' mobile o tablet, false altrimenti.
 */
export function isMobileOrTablet(userAgent: string = navigator.userAgent): boolean { // controllo se lo user agent appartiene a mobile o tablet
  const ua = userAgent.toLowerCase(); // porto lo user agent in minuscolo
  return /android|iphone|ipad|ipod|blackberry|opera mini|iemobile|wpdesktop/.test(ua); // verifico se contiene parole chiave tipiche dei device mobili
}

/**
 * Verifica se il browser in uso e' Firefox.
 *
 * Il controllo esclude esplicitamente SeaMonkey, che puo' contenere
 * la stringa 'firefox' nello user agent.
 *
 * @param userAgent User agent da analizzare. Di default viene usato quello del browser corrente.
 * @returns boolean True se il browser e' Firefox, false altrimenti.
 */
export function isFirefox(userAgent: string = navigator.userAgent): boolean { // controllo se il browser e' Firefox
  try { // mi proteggo da eventuali input non validi
    const ua = (userAgent || '').toLowerCase(); // normalizzo lo user agent in minuscolo
    return ua.includes('firefox') && !ua.includes('seamonkey'); // verifico Firefox ed escludo SeaMonkey
  } catch { // intercetto eventuali errori
    return false; // considero non Firefox in caso di problemi
  }
}

/**
 * Pulisce un URL rimuovendo query string e hash.
 *
 * Restituisce solo il path principale prima di '?' e '#'.
 *
 * @param url URL da pulire.
 * @returns string URL senza query string e hash.
 */
export function pulisciUrl(url: string): string { // pulisco un URL togliendo query string e hash
  return (url || '').split('?')[0].split('#')[0]; // tengo solo il path principale
}

/**
 * Verifica se l'URL corrisponde esattamente alla home del catalogo.
 *
 * La verifica viene fatta sull'URL pulito e senza prefisso lingua.
 *
 * @param url URL da verificare.
 * @returns boolean True se l'URL e' una home catalogo valida, false altrimenti.
 */
export function isCatalogoHome(url: string): boolean { // controllo se l'URL e' una home valida del catalogo
  const path = pulisciUrl(url || ''); // pulisco l'URL ricevuto
  const p = path.replace(/^\/(it|en)(?=\/|$)/, ''); // rimuovo l'eventuale prefisso lingua
  return (
    p === '/catalogo' || // verifico la home catalogo italiana
    p === '/catalogo/' || // verifico la home catalogo italiana con slash finale
    p === '/catalogo/film' || // verifico la home catalogo film italiana
    p === '/catalogo/serie' || // verifico la home catalogo serie italiana
    p === '/catalogo/film-serie' || // verifico la home catalogo film-serie italiana
    p === '/catalog' || // verifico la home catalogo inglese
    p === '/catalog/' || // verifico la home catalogo inglese con slash finale
    p === '/catalog/movies' || // verifico la home catalogo movies inglese
    p === '/catalog/series' || // verifico la home catalogo series inglese
    p === '/catalog/movies-series' // verifico la home catalogo movies-series inglese
  );
}

/**
 * Verifica se l'URL appartiene all'area catalogo.
 *
 * La verifica viene fatta sull'URL pulito e senza prefisso lingua.
 *
 * @param url URL da verificare.
 * @returns boolean True se l'URL appartiene all'area catalogo, false altrimenti.
 */
export function isAreaCatalogo(url: string): boolean { // controllo se l'URL appartiene all'area catalogo
  const path = pulisciUrl(url || ''); // pulisco l'URL ricevuto
  const p = path.replace(/^\/(it|en)(?=\/|$)/, ''); // rimuovo l'eventuale prefisso lingua
  return p.startsWith('/catalogo') || p.startsWith('/catalog'); // verifico se il path parte con una base catalogo valida
}

/**
 * Imposta l'attributo lang del tag html.
 *
 * Forza solo i codici supportati 'it' ed 'en'.
 *
 * @param documento Documento su cui impostare il lang.
 * @param codice Codice lingua da applicare.
 * @returns void
 */
export function impostaLangHtml(documento: Document, codice: string): void { // imposto il lang del documento HTML
  const lang = codice === 'it' ? 'it' : 'en'; // normalizzo il codice su una lingua supportata
  documento.documentElement.setAttribute('lang', lang); // scrivo il valore sull'elemento html
}

const CHIAVE_SESSIONE_PATH = 'ultimo_path'; // definisco la chiave sessione per l'ultimo path utile

/**
 * Salva in sessionStorage il path corrente senza query string e hash.
 *
 * Ignora root vuota, root lingua e pagina 404.
 *
 * @param url URL corrente da salvare.
 * @returns void
 */
export function salvaPathInSessionStorage(url: string): void { // salvo in sessione l'ultimo path utile
  try { // mi proteggo da eventuali errori di accesso alla sessione
    const pathPulito = pulisciUrl(url || ''); // pulisco l'URL prima di salvarlo
    if ( // controllo i casi in cui non devo salvare il path
      !pathPulito || // ignoro path vuoti
      pathPulito === '/' || // ignoro la root assoluta
      /^\/(it|en)$/.test(pathPulito) || // ignoro la root lingua
      /^\/(it|en)\/(non-trovato|not-found)(\/|$)/.test(pathPulito) // ignoro la pagina 404
    ) {
      return; // esco senza salvare nulla
    }

    const last = sessionStorage.getItem(CHIAVE_SESSIONE_PATH) || ''; // leggo l'ultimo path salvato
    const eraContatti = /^\/(it\/contatti|en\/contact)(\/|$)/.test(last); // verifico se prima ero nella pagina contatti
    const oraContatti = /^\/(it\/contatti|en\/contact)(\/|$)/.test(pathPulito); // verifico se ora sono nella pagina contatti

    if (eraContatti && !oraContatti) { // controllo se sto uscendo dai contatti
      setTimeout(() => { // ritardo leggermente la pulizia del flag
        sessionStorage.removeItem('vengo_da_contatti'); // rimuovo il flag di provenienza da contatti
      }, 500); // aspetto mezzo secondo
    }

    const eraLogin = /^\/(it\/benvenuto\/accedi|en\/welcome\/sign-in)(\/|$)/.test(last); // verifico se prima ero nella login
    const oraLogin = /^\/(it\/benvenuto\/accedi|en\/welcome\/sign-in)(\/|$)/.test(pathPulito); // verifico se ora sono nella login
    if (eraLogin && !oraLogin) { // controllo se sto uscendo dalla login
      setTimeout(() => { // ritardo leggermente la pulizia del flag
        sessionStorage.removeItem('vengo_da_login'); // rimuovo il flag di provenienza dalla login
      }, 500); // aspetto mezzo secondo
    }

    const eraRegistrazione = /^\/(it\/benvenuto\/registrazione|en\/welcome\/registration)(\/|$)/.test(last); // verifico se prima ero nella registrazione
    const oraRegistrazione = /^\/(it\/benvenuto\/registrazione|en\/welcome\/registration)(\/|$)/.test(pathPulito); // verifico se ora sono nella registrazione
    if (eraRegistrazione && !oraRegistrazione) { // controllo se sto uscendo dalla registrazione
      setTimeout(() => { // ritardo leggermente la pulizia del flag
        sessionStorage.removeItem('pagina_registrazione'); // rimuovo il flag della pagina registrazione
      }, 500); // aspetto mezzo secondo
    }

    const eraContatti2 = /^\/(it\/contatti|en\/contact)(\/|$)/.test(last); // verifico di nuovo se prima ero nei contatti
    const oraContatti2 = /^\/(it\/contatti|en\/contact)(\/|$)/.test(pathPulito); // verifico di nuovo se ora sono nei contatti
    if (eraContatti2 && !oraContatti2) { // controllo se sto uscendo dai contatti
      setTimeout(() => { // ritardo leggermente la pulizia del flag
        sessionStorage.removeItem('vengo_da_registrazione'); // rimuovo il flag collegato alla registrazione
      }, 500); // aspetto mezzo secondo
    }

    sessionStorage.setItem(CHIAVE_SESSIONE_PATH, pathPulito); // salvo il path pulito come ultimo path utile
  } catch {} // ignoro eventuali errori di sessionStorage
}

/**
 * Legge il path salvato in sessionStorage.
 *
 * @returns string Il path salvato oppure stringa vuota.
 */
export function leggiPathDaSessionStorage(): string { // leggo il path salvato in sessione
  try { // mi proteggo da eventuali errori di accesso alla sessione
    return sessionStorage.getItem(CHIAVE_SESSIONE_PATH) || ''; // restituisco il path salvato o stringa vuota
  } catch { // intercetto eventuali errori
    return ''; // torno stringa vuota in caso di problemi
  }
}

/**
 * Verifica se l'ultimo path salvato indica una provenienza da benvenuto o welcome.
 *
 * Usa il path letto dalla sessione e lo ripulisce prima del controllo.
 *
 * @returns boolean True se l'utente proviene da benvenuto o welcome, false altrimenti.
 */
export function vengoDaBenvenutoDaSessione(): boolean { // controllo se l'ultimo path salvato arriva dall'area benvenuto o welcome
  try { // mi proteggo da eventuali errori
    const last = pulisciUrl(leggiPathDaSessionStorage() || ''); // leggo e pulisco l'ultimo path salvato

    return (
      last === '/it/benvenuto' || // verifico la welcome italiana con prefisso it
      last === '/it/welcome' || // verifico la welcome inglese sotto prefisso it
      last === '/en/benvenuto' || // verifico la welcome italiana sotto prefisso en
      last === '/en/welcome' // verifico la welcome inglese con prefisso en
    );
  } catch { // intercetto eventuali errori
    return false; // considero false in caso di problemi
  }
}

/**
 * Salva forzatamente il path della pagina 404 dopo il caricamento.
 *
 * Accetta solo rotte 404 italiane o inglesi.
 *
 * @param url URL corrente da salvare.
 * @returns void
 */
export function salvaPathNonTrovatoDopoCaricamento(url: string): void { // salvo forzatamente il path della pagina 404
  try { // mi proteggo da eventuali errori di sessionStorage
    const pathPulito = pulisciUrl(url || ''); // pulisco l'URL ricevuto
    if (!pathPulito) return; // esco se il path e' vuoto

    if (!/^\/(it|en)\/(non-trovato|not-found)(\/|$)/.test(pathPulito)) { // verifico che il path sia davvero una rotta 404 valida
      return; // esco se non e' una rotta 404 accettata
    }

    sessionStorage.setItem(CHIAVE_SESSIONE_PATH, pathPulito); // salvo il path 404 come ultimo path utile
  } catch {} // ignoro eventuali errori di sessionStorage
}

/**
 * Calcola un hash numerico a 32 bit a partire da una stringa.
 *
 * Usa una variante basata su moltiplicazioni e xor per ottenere
 * un valore deterministico non firmato.
 *
 * @param testo Testo da trasformare in hash.
 * @returns number Hash numerico a 32 bit.
 */
export function calcolaHash32(testo: string): number { // calcolo un hash numerico deterministico a 32 bit
  let h = 2166136261; // inizializzo il valore base dell'hash
  for (let i = 0; i < testo.length; i++) { // scorro ogni carattere del testo
    h ^= testo.charCodeAt(i); // mescolo il codice del carattere corrente
    h = Math.imul(h, 16777619); // applico la moltiplicazione intera per proseguire il mixing
  }
  return h >>> 0; // restituisco l'hash come intero non firmato
}

/**
 * Estrae uno slug a partire dall'URL di una locandina.
 *
 * Se il nome file segue il formato locandina_it_slug.webp
 * o locandina_en_slug.webp, restituisce solo lo slug.
 *
 * @param url URL o nome file della locandina.
 * @returns string Lo slug estratto.
 */
export function slugDaLocandina(url: string): string { // ricavo lo slug dal nome file della locandina
  const u = String(url || ''); // normalizzo il valore ricevuto in stringa
  const file = (u.split('/').pop() || '').trim(); // estraggo l'ultimo segmento del path come nome file
  const m = file.match(/^locandina_(it|en)_(.+)\.webp$/i); // verifico se il file rispetta il formato atteso
  if (m && m[2]) return m[2]; // restituisco lo slug interno se il match e' valido
  return file.replace(/\.webp$/i, ''); // altrimenti tolgo solo l'estensione webp
}

/**
 * Mescola una lista di locandine in modo deterministico.
 *
 * L'ordinamento dipende dal seed e dallo slug ricavato da ogni src.
 *
 * @param lista Lista di elementi con proprieta' src.
 * @param seed Seed usato per il mescolamento deterministico.
 * @returns T[] Nuova lista ordinata in modo deterministico.
 */
export function mescolaDeterministicaLocandine<T extends { src: string }>(
  lista: T[], // ricevo la lista da mescolare
  seed: string, // ricevo il seed di ordinamento
): T[] {
  const s = String(seed || ''); // normalizzo il seed in stringa
  return (lista || []).slice().sort((a, b) => { // creo una copia ordinata della lista
    const ka = calcolaHash32(s + '|' + slugDaLocandina(String(a?.src || ''))); // calcolo la chiave hash del primo elemento
    const kb = calcolaHash32(s + '|' + slugDaLocandina(String(b?.src || ''))); // calcolo la chiave hash del secondo elemento
    return ka - kb; // ordino in base alla differenza tra le due chiavi
  });
}

/**
 * Traduce i segmenti di un URL in base alla lingua richiesta.
 *
 * Corregge segmenti di path e alcuni parametri query
 * tra le versioni italiana e inglese.
 *
 * @param url URL da tradurre.
 * @param langSalvata Lingua di destinazione.
 * @returns string URL tradotto.
 */
export function traduciSegmentiUrl(url: string, langSalvata: 'it' | 'en'): string { // traduco i segmenti dell'URL verso la lingua richiesta
  let u = url; // parto dall'URL originale

  if (langSalvata === 'it') { // controllo se devo tradurre verso l'italiano
    u = u.replace(/\/(welcome)(\/|$)/, '/benvenuto$2'); // traduco welcome in benvenuto
    u = u.replace(/\/(login)(\/|$)/, '/accedi$2'); // traduco login in accedi
    u = u.replace(/\/(catalog)(\/|$)/, '/catalogo$2'); // traduco catalog in catalogo
    u = u.replace(/\/(movies-series)(\/|$)/, '/film-serie$2'); // traduco movies-series in film-serie
    u = u.replace(/\/(movies)(\/|$)/, '/film$2'); // traduco movies in film
    u = u.replace(/\/(series)(\/|$)/, '/serie$2'); // traduco series in serie
    u = u.replace(/\/(season)(\/|$)/, '/stagione$2'); // traduco season in stagione
    u = u.replace(/([?&])play=/, '$1riproduzione='); // traduco il parametro play in riproduzione
  } else { // entro nel ramo di traduzione verso l'inglese
    u = u.replace(/\/(benvenuto)(\/|$)/, '/welcome$2'); // traduco benvenuto in welcome
    u = u.replace(/\/(accedi)(\/|$)/, '/login$2'); // traduco accedi in login
    u = u.replace(/\/(catalogo)(\/|$)/, '/catalog$2'); // traduco catalogo in catalog
    u = u.replace(/\/(film-serie)(\/|$)/, '/movies-series$2'); // traduco film-serie in movies-series
    u = u.replace(/\/(film)(\/|$)/, '/movies$2'); // traduco film in movies
    u = u.replace(/\/(serie)(\/|$)/, '/series$2'); // traduco serie in series
    u = u.replace(/\/(stagione)(\/|$)/, '/season$2'); // traduco stagione in season
    u = u.replace(/([?&])riproduzione=/, '$1play='); // traduco il parametro riproduzione in play
  }

  return u; // restituisco l'URL tradotto finale
}
