// Utility che gestisce la costruzione e l'allineamento della rotta del catalogo in base alla lingua corrente e al tipo di contenuto selezionato.

import { TipoContenuto } from '../../riga-categoria/categoria_services/tipo-contenuto.service';

export class CatalogoRoutingUtility {
  /**
   * Costruisce il percorso base del catalogo in base alla lingua corrente.
   * - Legge il codice lingua dal servizio di cambio lingua
   * - Sceglie il prefisso localizzato della lingua
   * - Sceglie il segmento base localizzato del catalogo
   * - Restituisce il path base completo
   *
   * @param contesto Contesto che espone il servizio di cambio lingua.
   * @returns string Path base del catalogo coerente con la lingua corrente.
   */
  static baseCatalogoDaLingua(contesto: any): string {
    const codice = contesto.cambioLingua.leggiCodiceLingua(); // leggo il codice lingua corrente dal contesto
    const pref = codice === 'it' ? '/it' : '/en'; // scelgo il prefisso lingua corretto in base al codice corrente
    const base = codice === 'it' ? '/catalogo' : '/catalog'; // scelgo il segmento base del catalogo localizzato
    return pref + base; // restituisco il path base completo combinando prefisso lingua e base catalogo
  }

  /**
   * Restituisce il sotto-path del catalogo corrispondente al tipo di contenuto selezionato.
   * - Legge la lingua corrente
   * - Determina se devo usare la variante inglese o italiana
   * - Traduce il tipo contenuto nel segmento di rotta corretto
   *
   * @param contesto Contesto che espone il servizio di cambio lingua.
   * @param val Tipo di contenuto da convertire in sotto-path.
   * @returns string Segmento di rotta localizzato relativo al tipo di contenuto.
   */
  static sottoPathDaTipo(contesto: any, val: TipoContenuto): string {
    const codice = contesto.cambioLingua.leggiCodiceLingua(); // leggo il codice lingua corrente dal contesto
    const en = codice === 'en'; // ricavo un flag comodo che mi dice se sono in inglese

    if (val === 'film') return en ? '/movies' : '/film'; // se il tipo e' film restituisco il segmento localizzato corrispondente
    if (val === 'serie') return en ? '/series' : '/serie'; // se il tipo e' serie restituisco il segmento localizzato corrispondente
    return en ? '/movies-series' : '/film-serie'; // per il tipo misto restituisco il segmento localizzato di fallback
  }

  /**
   * Forza la rotta del catalogo a essere coerente con lingua e tipo selezionato.
   * - Analizza la rotta corrente separando path, query string e hash
   * - Verifica che il path corrente appartenga davvero all'area catalogo localizzata
   * - Ricostruisce la base corretta in base alla lingua o, se richiesto, preserva quella presente nell'URL
   * - Sostituisce il sotto-path principale quando si e' nella root catalogo o in una vista principale
   * - Aggiorna la rotta solo se il target differisce dal path corrente
   *
   * @param contesto Contesto che espone location, cambio lingua e tipo selezionato.
   * @param preservaBaseDaUrl Se true mantiene la base lingua/catalogo gia' presente nell'URL invece di ricalcolarla.
   * @returns void
   */
  static forzaRottaCatalogoDaLinguaETipo(
    contesto: any,
    preservaBaseDaUrl: boolean = false,
  ): void {
    const full = contesto.location.path(true) || ''; // leggo il path completo corrente includendo anche query string e hash se presenti
    const soloPath = full.split('?')[0].split('#')[0]; // estraggo solo la parte di path puro escludendo query string e hash
    const tail = full.substring(soloPath.length); // mi salvo la parte finale esclusa dal path puro per poterla riattaccare dopo

    const matchBase = soloPath.match(/^\/(it|en)\/(catalogo|catalog)(\/.*)?$/); // verifico che il path corrente appartenga davvero a una rotta catalogo localizzata
    if (!matchBase) return; // se non sono dentro una rotta catalogo esco senza fare nulla

    const prefissoDaUrl = '/' + matchBase[1]; // ricostruisco il prefisso lingua partendo dal match dell'URL corrente
    const baseCatalogoDaUrl = prefissoDaUrl + '/' + matchBase[2]; // ricostruisco la base catalogo presente nell'URL corrente

    const nuovaBase = preservaBaseDaUrl
      ? baseCatalogoDaUrl
      : CatalogoRoutingUtility.baseCatalogoDaLingua(contesto); // scelgo se preservare la base letta dall'URL oppure ricalcolarla dalla lingua corrente

    const resto = soloPath.replace(/^\/(it|en)\/(catalogo|catalog)/, ''); // ricavo la parte residua del path togliendo la base catalogo localizzata

    const eRootCatalogo = resto === '' || resto === '/'; // verifico se mi trovo esattamente nella root del catalogo
    const eVistaPrincipale =
      /^\/(film|serie|film-serie|movies|series|movies-series)\/?$/.test(resto); // verifico se mi trovo in una delle viste principali note del catalogo

    const nuovoResto =
      eRootCatalogo || eVistaPrincipale
        ? CatalogoRoutingUtility.sottoPathDaTipo(
            contesto,
            contesto.tipoSelezionato,
          )
        : resto; // se sono in root o in una vista principale sostituisco il resto col sotto-path coerente al tipo selezionato, altrimenti mantengo il resto originale

    const targetPath = (nuovaBase + nuovoResto).replace(/\/+$/, ''); // costruisco il path target finale rimuovendo eventuali slash finali superflui
    const currentPath = soloPath.replace(/\/+$/, ''); // normalizzo anche il path corrente rimuovendo eventuali slash finali superflui

    if (targetPath !== currentPath) {
      contesto.location.go(targetPath + tail);
    } // aggiorno la rotta solo se il path target differisce davvero da quello corrente, preservando query string e hash
  }
}
