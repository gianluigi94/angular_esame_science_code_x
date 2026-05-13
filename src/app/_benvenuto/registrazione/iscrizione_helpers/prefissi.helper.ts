export interface StatoPrefissoRecapito {
  aperto: boolean;
  valore: string;
  filtro: string;
  indice: number;
  modificatoManualmente: boolean;
}

export function prefissiFiltratiCondivisi(nazioni: any[], filtro: string): any[] {
  const espansi: any[] = [];

  for (const n of nazioni) {
    if (!n.prefisso_tel) continue;

    const parti = n.prefisso_tel.split('/');
    const primo = parti[0];
    const match = primo.match(/^(\+\d+-)/);
    const base = match ? match[1] : '';

    espansi.push({ ...n, prefisso_tel: primo });

    for (let i = 1; i < parti.length; i++) {
      espansi.push({ ...n, prefisso_tel: base + parti[i] });
    }
  }

  const unici = new Map<string, any>();

  for (const n of espansi) {
    if (!unici.has(n.prefisso_tel)) unici.set(n.prefisso_tel, n);
  }

  const lista = Array.from(unici.values()).sort((a, b) => {
    const parsA = (a.prefisso_tel ?? '').replace('+', '').split('-');
    const parsB = (b.prefisso_tel ?? '').replace('+', '').split('-');
    const mainA = parseInt(parsA[0] || '0', 10);
    const mainB = parseInt(parsB[0] || '0', 10);

    if (mainA !== mainB) return mainA - mainB;

    const subA = parseInt(parsA[1] || '0', 10);
    const subB = parseInt(parsB[1] || '0', 10);

    return subA - subB;
  });

  if (!filtro.trim()) return lista;

  const f = filtro.replace('+', '');

  return lista.filter((n) => (n.prefisso_tel ?? '').replace('+', '').startsWith(f));
}

export function trovaPrefissoDaInput(
  nazioni: any[],
  valoreInput: string,
  valoreCorrente: string,
  cercaAncheNazione = false,
): string | null {
  const val = valoreInput.trim();

  if (!val) return null;

  const valNorm = val.toLowerCase().replace('+', '');

  if (valoreCorrente && valoreCorrente.replace('+', '') === valNorm) return null;

  const trovato = nazioni.find((n) => {
    if (!n.prefisso_tel) return false;

    const stessoPrefisso = (n.prefisso_tel ?? '').replace('+', '') === valNorm;

    if (!cercaAncheNazione) return stessoPrefisso;

    return (
      stessoPrefisso ||
      (n.nazione_it ?? '').toLowerCase() === valNorm ||
      (n.nazione_en ?? '').toLowerCase() === valNorm
    );
  });

  return trovato?.prefisso_tel ?? null;
}

export function primoPrefissoDaIso(nazioni: any[], iso: string, fallback = '+39'): string {
  const nazione = nazioni.find((n) => n.iso === iso);
  const raw = nazione?.prefisso_tel ?? fallback;

  return raw.split('/')[0];
}

export function chiudiStatoPrefisso(stato: StatoPrefissoRecapito): void {
  stato.aperto = false;
  stato.filtro = '';
  stato.indice = -1;
}

export function trackByPrefissoCondiviso(_index: number, n: any): string {
  return n.prefisso_tel;
}
