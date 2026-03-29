/**
 * Estrae le tre lettere da usare nel codice fiscale partendo da un nome o cognome.
 * - Normalizza la stringa rimuovendo accenti e caratteri non alfabetici
 * - Separa consonanti e vocali
 * - Se e' un nome con almeno 4 consonanti applica la regola speciale
 * - Altrimenti compone il risultato con consonanti, vocali ed eventuali riempimenti
 *
 * @param str string Valore di partenza da cui ricavare le lettere.
 * @param isNome boolean Se true applica la regola speciale prevista per il nome.
 * @returns string Le tre lettere da usare nel codice fiscale.
 */
export function cfLettere(str: string, isNome: boolean): string {
  const pulita = str
    .normalize('NFD') // normalizzo la stringa per separare eventuali lettere accentate dai segni diacritici
    .replace(/[\u0300-\u036f]/g, '') // rimuovo tutti i segni diacritici cosi' elimino gli accenti
    .toUpperCase() // trasformo tutto in maiuscolo per lavorare in formato uniforme
    .replace(/[^A-Z]/g, ''); // tengo solo le lettere dalla A alla Z eliminando tutto il resto

  const consonanti = pulita.replace(/[AEIOU]/g, ''); // ricavo solo le consonanti eliminando tutte le vocali
  const vocali = pulita.replace(/[^AEIOU]/g, ''); // ricavo solo le vocali eliminando tutto cio' che non e' vocale

  if (isNome && consonanti.length >= 4) {
    // controllo se sto lavorando sul nome e se ho almeno quattro consonanti disponibili
    return consonanti[0] + consonanti[2] + consonanti[3]; // applico la regola speciale prendendo prima, terza e quarta consonante
  }

  return (consonanti + vocali + 'XXX').slice(0, 3); // compongo il risultato usando consonanti, poi vocali, poi eventuali X di riempimento fino a tre caratteri
}

/**
 * Calcola il carattere di controllo finale del codice fiscale partendo dai primi 15 caratteri.
 * - Usa una tabella dedicata per i caratteri in posizione dispari
 * - Per le posizioni pari usa il valore numerico diretto o la posizione alfabetica
 * - Somma tutti i valori ottenuti
 * - Converte il resto modulo 26 nella lettera finale di controllo
 *
 * @param codice15 string I primi 15 caratteri del codice fiscale.
 * @returns string Il carattere finale di controllo.
 */
export function cfControllo(codice15: string): string {
  const valoriDispari: Record<string, number> = {
    '0': 1,
    '1': 0,
    '2': 5,
    '3': 7,
    '4': 9,
    '5': 13,
    '6': 15,
    '7': 17,
    '8': 19,
    '9': 21,
    A: 1,
    B: 0,
    C: 5,
    D: 7,
    E: 9,
    F: 13,
    G: 15,
    H: 17,
    I: 19,
    J: 21,
    K: 2,
    L: 4,
    M: 18,
    N: 20,
    O: 11,
    P: 3,
    Q: 6,
    R: 8,
    S: 12,
    T: 14,
    U: 16,
    V: 10,
    W: 22,
    X: 25,
    Y: 24,
    Z: 23,
  }; // preparo la tabella dei valori da usare per i caratteri nelle posizioni dispari

  let somma = 0; // inizializzo la somma totale dei valori dei primi quindici caratteri

  for (let i = 0; i < 15; i++) {
    // scorro uno alla volta i primi quindici caratteri del codice fiscale
    const c = codice15[i]; // leggo il carattere corrente da elaborare

    somma +=
      i % 2 === 0
        ? (valoriDispari[c] ?? 0) // se sono in posizione dispari reale uso la tabella dedicata dei valori dispari
        : /\d/.test(c)
          ? parseInt(c, 10)
          : c.charCodeAt(0) - 65; // se sono in posizione pari uso il numero diretto oppure l'indice alfabetico della lettera
  }

  return String.fromCharCode((somma % 26) + 65); // trasformo il resto modulo 26 nella lettera finale di controllo
}
