// ─── Funzioni pure – nessuna dipendenza Angular ─────────────────────────────

export interface RobustezzaResult {
  robustezza:  0 | 1 | 2 | 3;
  entropyPerc: number;
}

export function calcolaRobustezzaPassword(
  pwd: string,
  paroleComuni: string[],
): RobustezzaResult {
  if (!pwd) return { robustezza: 0, entropyPerc: 0 };

  let symbolsCount = 0;
  if (/[a-z]/.test(pwd))           symbolsCount += 19;
  if (/[A-Z]/.test(pwd))           symbolsCount += 21;
  if (/\d/.test(pwd))              symbolsCount += 22;
  if (/[^A-Za-z\d\s]/.test(pwd))  symbolsCount += 32;

  let entropy = pwd.length * Math.log2(symbolsCount || 1);

  if (/(.)\1{2,}/.test(pwd)) entropy -= 15;

  const pwdLow = pwd.toLowerCase();
  for (const word of paroleComuni) {
    if (pwdLow.includes(word)) entropy -= 20;
  }

  const entropyPerc = Math.min(Math.max((entropy / 80) * 100, 0), 100);

  let robustezza: 0 | 1 | 2 | 3;
  if (entropyPerc >= 50)      robustezza = 3;
  else if (entropyPerc >= 25) robustezza = 2;
  else                        robustezza = 1;

  return { robustezza, entropyPerc };
}
