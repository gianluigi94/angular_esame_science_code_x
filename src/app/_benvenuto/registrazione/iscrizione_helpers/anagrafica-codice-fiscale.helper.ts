import { cfControllo, cfLettere } from './codice-fiscale.helper';

export function calcolaCodiceFiscaleAnagrafica(
  nome: string,
  cognome: string,
  gg: string,
  mm: string,
  aaaa: string,
  sesso: string,
  paese: string,
  comune: string,
  comuni: any[],
  nazioni: any[],
): string {
  if (!nome || !cognome || gg.length < 2 || mm.length < 2 || aaaa.length < 4 || !sesso) return '';
  if (!paese) return '';
  if (paese === 'IT' && !comune) return '';

  const codiceCatastale = paese === 'IT'
    ? comuni.find((c: any) => c.comune === comune)?.codice_belfiore ?? ''
    : nazioni.find((n: any) => n.iso === paese)?.codice_belfiore ?? '';

  if (!codiceCatastale) return '';

  const meseCodici = ['A','B','C','D','E','H','L','M','P','R','S','T'];
  const giornoNum = parseInt(gg, 10) + (sesso === 'F' ? 40 : 0);

  const parziale = (
    cfLettere(cognome, false) +
    cfLettere(nome, true) +
    aaaa.slice(-2) +
    (meseCodici[parseInt(mm, 10) - 1] ?? '') +
    String(giornoNum).padStart(2, '0') +
    codiceCatastale
  ).toUpperCase();

  if (parziale.length !== 15) return '';

  return parziale + cfControllo(parziale);
}
