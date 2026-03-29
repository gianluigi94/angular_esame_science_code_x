/**
 * Definisce il formato del risultato restituito dal calcolo di robustezza della password.
 * - robustezza rappresenta il livello finale su una scala da 0 a 3
 * - entropyPerc rappresenta la percentuale di entropia calcolata e limitata tra 0 e 100
 */
export interface RobustezzaResult {
  robustezza: 0 | 1 | 2 | 3;
  entropyPerc: number;
}

/**
 * Calcola una stima della robustezza di una password.
 * - Controlla quali categorie di caratteri sono presenti
 * - Stima l'entropia in base a lunghezza e varieta' dei simboli usati
 * - Applica penalita' se trova ripetizioni eccessive o parole comuni
 * - Converte il risultato in una percentuale e in un livello finale di robustezza
 *
 * @param pwd string Password da analizzare.
 * @param paroleComuni string[] Elenco di parole comuni da penalizzare se presenti nella password.
 * @returns RobustezzaResult Oggetto con livello di robustezza e percentuale di entropia.
 */
export function calcolaRobustezzaPassword(
  pwd: string,
  paroleComuni: string[],
): RobustezzaResult {
  if (!pwd) return { robustezza: 0, entropyPerc: 0 }; // se la password e' vuota restituisco subito robustezza minima ed entropia zero

  let symbolsCount = 0; // preparo il contatore dei simboli teoricamente disponibili in base ai gruppi presenti nella password
  if (/[a-z]/.test(pwd)) symbolsCount += 19; // se trovo lettere minuscole aumento il totale dei simboli disponibili
  if (/[A-Z]/.test(pwd)) symbolsCount += 21; // se trovo lettere maiuscole aumento ancora il totale disponibile
  if (/\d/.test(pwd)) symbolsCount += 22; // se trovo cifre aggiungo anche il contributo dei numeri
  if (/[^A-Za-z\d\s]/.test(pwd)) symbolsCount += 32; // se trovo simboli speciali aggiungo anche quel gruppo al totale

  let entropy = pwd.length * Math.log2(symbolsCount || 1); // stimo l'entropia moltiplicando la lunghezza per il logaritmo base 2 dello spazio dei simboli

  if (/(.)\1{2,}/.test(pwd)) entropy -= 15; // se trovo caratteri ripetuti almeno tre volte di seguito applico una penalita' all'entropia

  const pwdLow = pwd.toLowerCase(); // porto la password in minuscolo per confrontarla piu' facilmente con le parole comuni
  for (const word of paroleComuni) {
    // scorro una alla volta le parole comuni che voglio penalizzare
    if (pwdLow.includes(word)) entropy -= 20; // se la password contiene una parola comune riduco ulteriormente l'entropia
  }

  const entropyPerc = Math.min(Math.max((entropy / 80) * 100, 0), 100); // trasformo l'entropia in percentuale e la blocco sempre tra zero e cento

  let robustezza: 0 | 1 | 2 | 3; // preparo la variabile che conterra' il livello finale di robustezza
  if (entropyPerc >= 50)
    robustezza = 3; // se la percentuale e' almeno 50 assegno il livello piu' alto gestito qui
  else if (entropyPerc >= 25)
    robustezza = 2; // se la percentuale e' almeno 25 assegno un livello intermedio
  else robustezza = 1; // altrimenti assegno il livello minimo per una password non vuota

  return { robustezza, entropyPerc }; // restituisco il livello finale di robustezza insieme alla percentuale calcolata
}
