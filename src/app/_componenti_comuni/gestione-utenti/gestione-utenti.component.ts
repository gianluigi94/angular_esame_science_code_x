import { Component, OnInit, EventEmitter, Output, ChangeDetectorRef, NgZone } from '@angular/core';
import { take } from 'rxjs';
import gsap from 'gsap';
import { ApiService } from 'src/app/_servizi_globali/api.service';

interface AccessoUtente {
  id_contatto: number;
  nome: string;
  cognome: string;
  accessi: string[];
}

interface GiornoFattura {
  data: string;
  giorno: number;
  mese: string;
  anno: number;
  importo: number;
  imposte: number;
  valuta: string;
  piano: 'base' | 'premium';
}

interface FatturaUtente {
  id: number;
  idRicevuta: number;
  mese: string;
  anno: number;
  giornoEmissione: number;
  totale: number;
  valuta: string;
  stato: 'corrente' | 'saldato' | 'rifiutato';
  giorni: GiornoFattura[];
  giorniCaricati: boolean;
  caricamentoGiorni: boolean;
  aperta: boolean;
}

interface UtenteFatture {
  id_contatto: number;
  nome: string;
  cognome: string;
  fatture: FatturaUtente[];
  aperta: boolean;
}

@Component({
  selector: 'app-gestione-utenti',
  templateUrl: './gestione-utenti.component.html',
  styleUrls: ['./gestione-utenti.component.scss'],
})
export class GestioneUtentiComponent implements OnInit {
  @Output() chiudi = new EventEmitter<void>();

  vistaCorrente: 'accessi' | 'fatture' | 'profili' = 'accessi';
  animazioneInCorso = false;

  accessiUtenti: AccessoUtente[] = [];
  caricamentoAccessi = false;
  utenteEspanso: number | null = null;

  fattureUtenti: UtenteFatture[] = [];
  caricamentoFatture = false;
  fattureCaricate = false;

  profiliUtenti: { id_contatto: number; nome: string; cognome: string }[] = [];
  caricamentoProfili = false;
  profiliCaricati = false;
  utenteProfiloSelezionato: number | null = null;

  private mesiIt = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) {}

  ngOnInit(): void {
    this.caricaAccessi();
    setTimeout(() => this.avviaAnimazioniIngresso(), 0);
  }

  private caricaAccessi(): void {
    this.caricamentoAccessi = true;
    this.api.getAccessiUtenti().pipe(take(1)).subscribe({
      next: (rit) => {
        this.accessiUtenti = rit.data ?? [];
        this.caricamentoAccessi = false;
      },
      error: () => {
        this.accessiUtenti = [];
        this.caricamentoAccessi = false;
      },
    });
  }

  cambiaVista(vista: 'accessi' | 'fatture' | 'profili'): void {
    if (this.animazioneInCorso || this.vistaCorrente === vista) return;
    this.animazioneInCorso = true;

    const contenutoUscita = document.querySelector('.gu-campo-animato') as HTMLElement | null;
    if (contenutoUscita) gsap.killTweensOf(contenutoUscita);

    gsap.to(contenutoUscita, {
      opacity: 0,
      scaleX: 0,
      duration: 0.3,
      ease: 'power2.in',
      transformOrigin: 'center center',
      onComplete: () => {
        this.ngZone.run(() => {
          this.vistaCorrente = vista;
          this.utenteProfiloSelezionato = null;

          if (vista === 'fatture' && !this.fattureCaricate) {
            this.caricaFatture();
          }

          if (vista === 'profili' && !this.profiliCaricati) {
            this.caricaProfili();
          }

          this.cdr.detectChanges();

          setTimeout(() => {
            const contenutoEntrata = document.querySelector('.gu-campo-animato') as HTMLElement | null;
            if (contenutoEntrata) {
              gsap.set(contenutoEntrata, { opacity: 0, scaleX: 0, transformOrigin: 'center center' });
              gsap.to(contenutoEntrata, {
                opacity: 1,
                scaleX: 1,
                duration: 0.4,
                ease: 'power2.out',
                onComplete: () => {
                  this.animazioneInCorso = false;
                },
              });
            } else {
              this.animazioneInCorso = false;
            }
          }, 0);
        });
      },
    });
  }

  toggleUtente(idContatto: number): void {
    this.utenteEspanso = this.utenteEspanso === idContatto ? null : idContatto;
  }

  private caricaProfili(): void {
    if (this.profiliCaricati || this.caricamentoProfili) return;
    this.caricamentoProfili = true;
    this.api.getUtentiProfili().pipe(take(1)).subscribe({
      next: (rit) => {
        this.profiliUtenti = rit.data ?? [];
        this.profiliCaricati = true;
        this.caricamentoProfili = false;
      },
      error: () => {
        this.profiliUtenti = [];
        this.caricamentoProfili = false;
      },
    });
  }

  selezionaUtenteProfilo(idContatto: number): void {
    this.utenteProfiloSelezionato = this.utenteProfiloSelezionato === idContatto ? null : idContatto;
  }

  aggiornaProfiloNome(utente: { nome: string; cognome: string }, evento: { nome: string; cognome: string }): void {
    utente.nome = evento.nome;
    utente.cognome = evento.cognome;
  }

  private caricaFatture(): void {
    if (this.fattureCaricate || this.caricamentoFatture) return;
    this.caricamentoFatture = true;
    this.api.getFattureUtenti().pipe(take(1)).subscribe({
      next: (rit) => {
        this.fattureUtenti = (rit.data ?? []).map((u: any) => ({
          id_contatto: u.id_contatto,
          nome: u.nome,
          cognome: u.cognome,
          aperta: false,
          fatture: (u.ricevute ?? []).map((r: any) => this.mappaFattura(r)),
        }));
        this.fattureCaricate = true;
        this.caricamentoFatture = false;
      },
      error: () => {
        this.fattureUtenti = [];
        this.caricamentoFatture = false;
      },
    });
  }

  toggleUtenteFatture(utente: UtenteFatture): void {
    utente.aperta = !utente.aperta;
  }

  toggleDettagliFattura(fattura: FatturaUtente): void {
    fattura.aperta = !fattura.aperta;

    if (fattura.aperta && !fattura.giorniCaricati && !fattura.caricamentoGiorni) {
      fattura.caricamentoGiorni = true;
      this.api.getFatturaDettagli(fattura.idRicevuta).pipe(take(1)).subscribe({
        next: (rit) => {
          const dati = rit.data ?? [];
          fattura.giorni = dati.map((d: any) => {
            const data = new Date(d.data);
            return {
              data: d.data,
              giorno: data.getDate(),
              mese: this.mesiIt[data.getMonth()],
              anno: data.getFullYear(),
              importo: Number(d.importo),
              imposte: Number(d.imposte),
              valuta: d.valuta_simbolo || fattura.valuta,
              piano: d.piano,
            };
          });
          fattura.giorniCaricati = true;
          fattura.caricamentoGiorni = false;
        },
        error: () => {
          fattura.caricamentoGiorni = false;
        },
      });
    }
  }

  private mappaFattura(r: any): FatturaUtente {
    const dataRif = new Date(r.periodo_fine);
    const mese = this.mesiIt[dataRif.getMonth()];
    const anno = dataRif.getFullYear();
    const giornoEmissione = r.data_emissione ? new Date(r.data_emissione).getDate() : dataRif.getDate();
    const stato: 'corrente' | 'saldato' | 'rifiutato' = r.stato === 'saldato' ? 'saldato' : r.stato === 'rifiutato' ? 'rifiutato' : 'corrente';

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

  avviaAnimazioniIngresso(): void {
    const box = document.querySelector('.gu-box') as HTMLElement | null;
    const menu = document.querySelector('.gu-menu') as HTMLElement | null;
    const contenuto = document.querySelector('.gu-campo-animato') as HTMLElement | null;
    const sfocatura = document.querySelector('.gu-sfocatura') as HTMLElement | null;

    if (sfocatura) gsap.set(sfocatura, { opacity: 0 });
    if (box) gsap.set(box, { opacity: 0 });
    if (menu) gsap.set(menu, { opacity: 0, scaleX: 0, transformOrigin: 'left center' });
    if (contenuto) gsap.set(contenuto, { opacity: 0, scaleX: 0, transformOrigin: 'center center' });

    if (sfocatura) gsap.to(sfocatura, { opacity: 1, duration: 0.7, ease: 'power2.out' });
    if (box) gsap.to(box, { opacity: 1, duration: 0.4, ease: 'power2.out' });
    if (menu) gsap.to(menu, { opacity: 1, scaleX: 1, duration: 0.55, ease: 'power2.out' });
    if (contenuto) gsap.to(contenuto, { opacity: 1, scaleX: 1, duration: 0.55, delay: 0.12, ease: 'power2.out' });
  }

  chiudiPannello(): void {
    const box = document.querySelector('.gu-box') as HTMLElement | null;
    const menu = document.querySelector('.gu-menu') as HTMLElement | null;
    const contenuto = document.querySelector('.gu-campo-animato') as HTMLElement | null;
    const sfocatura = document.querySelector('.gu-sfocatura') as HTMLElement | null;

    if (menu) gsap.to(menu, { opacity: 0, scaleX: 0, duration: 0.3, ease: 'power2.in', transformOrigin: 'left center' });
    if (contenuto) gsap.to(contenuto, { opacity: 0, scaleX: 0, duration: 0.3, ease: 'power2.in', transformOrigin: 'center center' });
    if (sfocatura) gsap.to(sfocatura, { opacity: 0, duration: 0.4, ease: 'power2.in' });

    if (!box) {
      this.chiudi.emit();
      return;
    }

    gsap.to(box, {
      opacity: 0,
      scaleX: 0,
      duration: 0.4,
      ease: 'power2.in',
      transformOrigin: 'center center',
      onComplete: () => this.chiudi.emit(),
    });
  }
}
