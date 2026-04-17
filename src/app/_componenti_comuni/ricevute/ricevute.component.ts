import { Component } from '@angular/core';
import { AfterViewInit } from '@angular/core';
import gsap from 'gsap';

interface RigaGiorno {
  giorno: number;
  importo: number;
  imposte: number;
  valuta: string;
  piano: 'base' | 'premium';
}

interface RigaMese {
  id: string;
  mese: string;
  anno: number;
  giornoEmissione: number;
  totale: number;
  valuta: string;
  stato: 'corrente' | 'saldato';
  giorni: RigaGiorno[];
  aperta: boolean;
}

@Component({
  selector: 'app-ricevute',
  templateUrl: './ricevute.component.html',
  styleUrls: ['./ricevute.component.scss'],
})
export class RicevuteComponent implements AfterViewInit {

  righe: RigaMese[] = [
    {
      id: 'apr-2026',
      mese: 'ui.mesi.aprile',
      anno: 2026,
      giornoEmissione: 30,
      totale: 6.84,
      valuta: '€',
      stato: 'corrente',
      aperta: false,
      giorni: Array.from({ length: 17 }, (_, i) => ({
        giorno: i + 1,
        importo: 0.40,
        imposte: 0.07,
        valuta: '€',
        piano: 'base' as const,
      })),
    },
    {
      id: 'mar-2026',
      mese: 'ui.mesi.marzo',
      anno: 2026,
      giornoEmissione: 31,
      totale: 12.40,
      valuta: '€',
      stato: 'saldato',
      aperta: false,
      giorni: Array.from({ length: 31 }, (_, i) => ({
        giorno: i + 1,
        importo: 0.40,
        imposte: 0.07,
        valuta: '€',
        piano: 'base' as const,
      })),
    },
    {
      id: 'feb-2026',
      mese: 'ui.mesi.febbraio',
      anno: 2026,
      giornoEmissione: 28,
      totale: 11.20,
      valuta: '€',
      stato: 'saldato',
      aperta: false,
      giorni: Array.from({ length: 28 }, (_, i) => ({
        giorno: i + 1,
        importo: 0.40,
        imposte: 0.07,
        valuta: '€',
        piano: 'base' as const,
      })),
    },
    {
      id: 'gen-2026',
      mese: 'ui.mesi.gennaio',
      anno: 2026,
      giornoEmissione: 31,
      totale: 12.40,
      valuta: '€',
      stato: 'saldato',
      aperta: false,
      giorni: Array.from({ length: 31 }, (_, i) => ({
        giorno: i + 1,
        importo: 0.40,
        imposte: 0.07,
        valuta: '€',
        piano: 'base' as const,
      })),
    },
  ];

  ngAfterViewInit(): void {
    sessionStorage.setItem('vengo_da_ricevute', 'true');

    const titolo = document.querySelector('.ricevute-titolo') as HTMLElement | null;
    const tabella = document.querySelector('.ricevute-tabella') as HTMLElement | null;
    const sfocatura = document.querySelector('.sfocatura') as HTMLElement | null;

    if (tabella) gsap.set(tabella, { opacity: 0, scaleX: 0, transformOrigin: 'center center' });
    if (titolo) gsap.set(titolo, { opacity: 0 });
    if (sfocatura) gsap.set(sfocatura, { opacity: 0 });

    setTimeout(() => {
      if (sfocatura) gsap.to(sfocatura, { opacity: 1, duration: 0.7, ease: 'power2.out' });
      if (tabella) gsap.to(tabella, { opacity: 1, scaleX: 1, duration: 0.9, ease: 'power2.out' });
      if (titolo) gsap.to(titolo, { opacity: 1, duration: 0.6, delay: 0.5, ease: 'power2.out' });
    }, 500);
  }

  toggleDettagli(riga: RigaMese): void {
    riga.aperta = !riga.aperta;
  }

  scarica(riga: RigaMese, event: Event): void {
    event.stopPropagation();
  }
}
