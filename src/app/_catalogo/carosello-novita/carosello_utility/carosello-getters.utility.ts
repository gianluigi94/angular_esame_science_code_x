// Utility che calcola e restituisce (in base all’indice corrente) i dati della slide corrente/precedente/successiva, evitando di duplicare questi calcoli nel componente; qui 'getter' = 'funzione che dà un valore' con meno codice.

export class CaroselloGettersUtility {

  /**
 * Recupera il titolo della slide precedente rispetto a quella corrente.
 *
 * Gestisce il wrap (fine/inizio) usando il modulo sulla lunghezza dell'elenco.
 *
 * @param ctx Contesto del componente/carousel
 * @returns Titolo della slide precedente, oppure '' se i dati non sono disponibili
 */
  static getPrevTitolo(ctx: any): string { // Recupero il titolo della slide precedente (rispetto alla corrente)
    if (!ctx.titoliAlt.length || !ctx.immagini.length) return ''; // Esco con stringa vuota se non ho dati sufficienti
    const len = ctx.immagini.length; // Salvo la lunghezza per riutilizzarla nei calcoli modulo
    const currentIndex = (ctx.indiceCorrente - 1 + len) % len; // Calcolo l'indice reale 0-based della slide corrente gestendo il wrap
    const prevIndex = (currentIndex - 1 + len) % len; // Calcolo l'indice reale 0-based della slide precedente gestendo il wrap
    return ctx.titoliAlt[prevIndex] || ''; // Ritorno il titolo precedente oppure stringa vuota se manca
  }

  /**
 * Recupera il titolo della slide successiva rispetto a quella corrente.
 *
 * Gestisce il wrap (fine/inizio) usando il modulo sulla lunghezza dell'elenco.
 *
 * @param ctx Contesto del componente/carousel
 * @returns Titolo della slide successiva, oppure '' se i dati non sono disponibili
 */
  static getNextTitolo(ctx: any): string { // Recupero il titolo della slide successiva (rispetto alla corrente)
    if (!ctx.titoliAlt.length || !ctx.immagini.length) return ''; // Esco con stringa vuota se non ho dati sufficienti
    const len = ctx.immagini.length; // Salvo la lunghezza per riutilizzarla nei calcoli modulo
    const currentIndex = (ctx.indiceCorrente - 1 + len) % len; // Calcolo l'indice reale 0-based della slide corrente gestendo il wrap
    const nextIndex = (currentIndex + 1) % len; // Calcolo l'indice reale 0-based della slide successiva gestendo il wrap
    return ctx.titoliAlt[nextIndex] || ''; // Ritorno il titolo successivo oppure stringa vuota se manca
  }

  /**
 * Calcola l'indice reale 0-based della slide corrente a partire dall'indice 1-based.
 *
 * Gestisce il wrap nel range valido usando il modulo sulla lunghezza dell'elenco.
 *
 * @param ctx Contesto del componente/carousel
 * @returns Indice reale 0-based della slide corrente
 */
  static getIndiceRealeZeroBased(ctx: any): number { // Calcolo l'indice reale 0-based della slide corrente (ignorando eventuali cloni)
    if (!ctx.immagini.length) return 0; // Se non ho immagini, torno 0 come default
    const len = ctx.immagini.length; // Salvo la lunghezza per il calcolo modulo
    return (ctx.indiceCorrente - 1 + len) % len; // Converto il 1-based in 0-based e faccio wrap nel range valido
  }

  /**
 * Recupera il titolo della slide corrente.
 *
 * @param ctx Contesto del componente/carousel
 * @returns Titolo della slide corrente, oppure '' se i dati non sono disponibili
 */
  static getTitoloCorrente(ctx: any): string { // Recupero il titolo della slide corrente
    if (!ctx.titoliAlt.length) return ''; // Esco con stringa vuota se l'array titoli e' vuoto
    return ctx.titoliAlt[CaroselloGettersUtility.getIndiceRealeZeroBased(ctx)] || ''; // Prendo il titolo all'indice reale corrente o fallback a stringa vuota
  }

  /**
 * Recupera l'immagine titolo della slide corrente.
 *
 * @param ctx Contesto del componente/carousel
 * @returns URL dell'immagine titolo della slide corrente, oppure '' se i dati non sono disponibili
 */
  static getImgTitoloCorrente(ctx: any): string { // Recupero l'immagine titolo della slide corrente
    if (!ctx.imgTitolo.length) return ''; // Esco con stringa vuota se l'array immagini titolo e' vuoto
    return ctx.imgTitolo[CaroselloGettersUtility.getIndiceRealeZeroBased(ctx)] || ''; // Prendo l'immagine titolo all'indice reale corrente o fallback a stringa vuota
  }

  /**
 * Recupera il sottotitolo della slide corrente.
 *
 * @param ctx Contesto del componente/carousel
 * @returns Sottotitolo della slide corrente, oppure '' se i dati non sono disponibili
 */
  static getSottotitoloCorrente(ctx: any): string { // Recupero il sottotitolo della slide corrente
    if (!ctx.sottotitoli.length) return ''; // Esco con stringa vuota se l'array sottotitoli e' vuoto
    return ctx.sottotitoli[CaroselloGettersUtility.getIndiceRealeZeroBased(ctx)] || ''; // Prendo il sottotitolo all'indice reale corrente o fallback a stringa vuota
  }

}
