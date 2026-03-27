// ─── Funzioni pure – nessuna dipendenza Angular ─────────────────────────────

export function cfLettere(str: string, isNome: boolean): string {
  const pulita = str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');

  const consonanti = pulita.replace(/[AEIOU]/g, '');
  const vocali     = pulita.replace(/[^AEIOU]/g, '');

  // Regola speciale nome: 4+ consonanti → usa 1ª, 3ª, 4ª
  if (isNome && consonanti.length >= 4) {
    return consonanti[0] + consonanti[2] + consonanti[3];
  }
  return (consonanti + vocali + 'XXX').slice(0, 3);
}

export function cfControllo(codice15: string): string {
  const valoriDispari: Record<string, number> = {
    '0':1,'1':0,'2':5,'3':7,'4':9,'5':13,'6':15,'7':17,'8':19,'9':21,
    'A':1,'B':0,'C':5,'D':7,'E':9,'F':13,'G':15,'H':17,'I':19,'J':21,
    'K':2,'L':4,'M':18,'N':20,'O':11,'P':3,'Q':6,'R':8,'S':12,'T':14,
    'U':16,'V':10,'W':22,'X':25,'Y':24,'Z':23,
  };

  let somma = 0;
  for (let i = 0; i < 15; i++) {
    const c = codice15[i];
    // Posizione dispari (indice pari in base 0)
    somma += i % 2 === 0
      ? (valoriDispari[c] ?? 0)
      : (/\d/.test(c) ? parseInt(c, 10) : c.charCodeAt(0) - 65);
  }
  return String.fromCharCode((somma % 26) + 65);
}
