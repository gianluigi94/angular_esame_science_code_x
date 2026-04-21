import { Component } from '@angular/core';
import { AfterViewInit, OnInit } from '@angular/core';
import gsap from 'gsap';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { IRispostaServer } from 'src/app/_interfacce/IRispostaServer.interface';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { CambioRicevuteAnimazioneService } from 'src/app/_servizi_globali/cambio-ricevute-animazione.service';

interface RigaGiorno {
  data: string;
  giorno: number;
  mese: string;
  anno: number;
  importo: number;
  imposte: number;
  valuta: string;
  piano: 'base' | 'premium';
}

interface RigaMese {
  id: number;
  idRicevuta: number;
  mese: string;
  anno: number;
  giornoEmissione: number;
  totale: number;
  valuta: string;
  stato: 'corrente' | 'saldato';
  giorni: RigaGiorno[];
  giorniCaricati: boolean;
  caricamentoGiorni: boolean;
  aperta: boolean;
}

@Component({
  selector: 'app-ricevute',
  templateUrl: './ricevute.component.html',
  styleUrls: ['./ricevute.component.scss'],
})
export class RicevuteComponent implements AfterViewInit, OnInit {

  righe: RigaMese[] = [];
  caricamento: boolean = true;

  private chiaviMesi: string[] = [
    'ui.mesi.gennaio', 'ui.mesi.febbraio', 'ui.mesi.marzo', 'ui.mesi.aprile',
    'ui.mesi.maggio', 'ui.mesi.giugno', 'ui.mesi.luglio', 'ui.mesi.agosto',
    'ui.mesi.settembre', 'ui.mesi.ottobre', 'ui.mesi.novembre', 'ui.mesi.dicembre',
  ];

 constructor(
    private api: ApiService,
    private cambioLingua: CambioLinguaService,
    private cambioRicevute: CambioRicevuteAnimazioneService,
  ) {}

  get linguaCorrente(): string {
    return this.cambioLingua.leggiCodiceLingua();
  }

  ngOnInit(): void {
    sessionStorage.setItem('vengo_da_ricevute', 'true');
    this.api.getRicevute().subscribe({
      next: (ris: IRispostaServer) => {
        const dati = ris.data || [];
        this.righe = dati.map((r: any) => this.mappaRicevuta(r));
        this.caricamento = false;
        this.cambioRicevute.spinnerVisibile$.next(false);
        setTimeout(() => this.avviaAnimazioniIngresso(), 0);
      },
      error: () => {
        this.caricamento = false;
        this.cambioRicevute.spinnerVisibile$.next(false);
        setTimeout(() => this.avviaAnimazioniIngresso(), 0);
      },
    });
  }

  ngAfterViewInit(): void {}

  private avviaAnimazioniIngresso(): void {
    const titolo = document.querySelector('.ricevute-titolo') as HTMLElement | null;
    const tabella = document.querySelector('.ricevute-tabella') as HTMLElement | null;
    const sfocatura = document.querySelector('.sfocatura') as HTMLElement | null;
    const bottoneIndietro = document.querySelector('.ricevute-indietro-btn') as HTMLElement | null;
    if (tabella) gsap.set(tabella, { opacity: 0, scaleX: 0, transformOrigin: 'center center' });
    if (titolo) gsap.set(titolo, { opacity: 0 });
    if (sfocatura) gsap.set(sfocatura, { opacity: 0 });

    if (sfocatura) gsap.to(sfocatura, { opacity: 1, duration: 0.7, ease: 'power2.out' });
    if (tabella) gsap.to(tabella, { opacity: 1, scaleX: 1, duration: 0.9, delay: 0.25, ease: 'power2.out' });
    if (titolo) gsap.to(titolo, { opacity: 1, duration: 0.6, ease: 'power2.out' });
     if (bottoneIndietro) gsap.to(bottoneIndietro, { opacity: 1, duration: 0.6, delay: 0.25, ease: 'power2.out' });
  }

  toggleDettagli(riga: RigaMese): void {
    riga.aperta = !riga.aperta;

    if (riga.aperta && !riga.giorniCaricati && !riga.caricamentoGiorni) {
      riga.caricamentoGiorni = true;
      this.api.getRicevutaDettagli(riga.idRicevuta).subscribe({
        next: (ris: IRispostaServer) => {
          const dati = ris.data || [];
          riga.giorni = dati.map((d: any) => {
  const data = new Date(d.data);

  return {
    data: d.data,
    giorno: data.getDate(),
    mese: this.chiaviMesi[data.getMonth()],
    anno: data.getFullYear(),
    importo: Number(d.importo),
    imposte: Number(d.imposte),
    valuta: riga.valuta,
    piano: d.piano,
  };
});
          riga.giorniCaricati = true;
          riga.caricamentoGiorni = false;
        },
        error: () => {
          riga.caricamentoGiorni = false;
        },
      });
    }
  }

  scarica(riga: RigaMese, event: Event): void {
    event.stopPropagation();
  }
tornaIndietro(): void {
    window.history.back();
  }
  private mappaRicevuta(r: any): RigaMese {
    const dataRif = new Date(r.periodo_fine);
    const mese = this.chiaviMesi[dataRif.getMonth()];
    const anno = dataRif.getFullYear();
    const giornoEmissione = r.data_emissione ? new Date(r.data_emissione).getDate() : dataRif.getDate();
    const stato: 'corrente' | 'saldato' = r.stato === 'saldato' ? 'saldato' : 'corrente';

    return {
      id: r.id_ricevuta,
      idRicevuta: r.id_ricevuta,
      mese,
      anno,
      giornoEmissione,
      totale: Number(r.importo_totale),
      valuta: r.valuta_simbolo || '€',
      stato,
      giorni: [],
      giorniCaricati: false,
      caricamentoGiorni: false,
      aperta: false,
    };
  }
}
