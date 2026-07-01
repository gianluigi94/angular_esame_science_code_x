import { Component, OnInit, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { take } from 'rxjs';
import gsap from 'gsap';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { ToastService } from 'src/app/_servizi_globali/toast.service';

interface Configurazione {
  id_configurazione: number;
  chiave: string;
  valore: number;
  valoreModifica: string;
  salvataggio: boolean;
  leggibile: string | null;
}

@Component({
  selector: 'app-configurazioni',
  templateUrl: './configurazioni.component.html',
  styleUrls: ['./configurazioni.component.scss'],
})
export class ConfigurazioniComponent implements OnInit {
  @Output() chiudi = new EventEmitter<void>();

  configurazioni: Configurazione[] = [];
  caricamento = false;

  formNuovaAperta = false;
  nuovaChiave = '';
  nuovoValore = '';
  salvataggioNuova = false;

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private toastService: ToastService,
  ) {}

  ngOnInit(): void {
    this.caricaConfigurazioni();
    setTimeout(() => this.avviaAnimazioniIngresso(), 0);
  }

  private haAbilitaSistemista(): boolean {
    const archivi = [localStorage, sessionStorage];
    for (const archivio of archivi) {
      for (let i = 0; i < archivio.length; i++) {
        const chiave = archivio.key(i);
        if (!chiave) continue;
        const valore = archivio.getItem(chiave);
        if (!valore || valore.split('.').length !== 3) continue;
        try {
          const payloadBase64 = valore.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(decodeURIComponent(escape(atob(payloadBase64))));
          const abilita = payload?.data?.abilita ?? [];
          return Array.isArray(abilita) && abilita.map(Number).includes(15);
        } catch {
          continue;
        }
      }
    }
    return false;
  }

  private eChiaveTempo(chiave: string): boolean {
    return /durata|termina|blocco/.test(chiave);
  }

  private formattaSecondi(secondi: number): string {
    if (secondi < 60) return `${secondi} s`;
    const minuti = secondi / 60;
    if (minuti < 60) return `≈ ${this.arrotonda(minuti)} min`;
    const ore = minuti / 60;
    if (ore < 24) return `≈ ${this.arrotonda(ore)} ore`;
    const giorni = ore / 24;
    if (giorni < 30) return `≈ ${this.arrotonda(giorni)} giorni`;
    const mesi = giorni / 30;
    if (mesi < 12) return `≈ ${this.arrotonda(mesi)} mesi`;
    const anni = giorni / 365;
    return `≈ ${this.arrotonda(anni)} anni`;
  }

  private arrotonda(n: number): number {
    return Math.round(n * 10) / 10;
  }

  private calcolaLeggibile(chiave: string, valore: number): string | null {
    return this.eChiaveTempo(chiave) ? this.formattaSecondi(valore) : null;
  }

  private caricaConfigurazioni(): void {
    this.caricamento = true;
    this.api.getConfigurazioni().pipe(take(1)).subscribe({
      next: (rit) => {
        this.configurazioni = (rit.data ?? []).map((c: any) => ({
          id_configurazione: c.id_configurazione,
          chiave: c.chiave,
          valore: c.valore,
          valoreModifica: String(c.valore),
          salvataggio: false,
          leggibile: this.calcolaLeggibile(c.chiave, c.valore),
        }));
        this.caricamento = false;
      },
      error: () => {
        this.configurazioni = [];
        this.caricamento = false;
      },
    });
  }

  salvaConfigurazione(config: Configurazione): void {
    if (config.salvataggio) return;

    const nuovoValore = Number(config.valoreModifica);
    if (!Number.isInteger(nuovoValore) || nuovoValore < 0) {
      alert('Il valore deve essere un intero maggiore o uguale a zero.');
      return;
    }

    if (!this.haAbilitaSistemista()) {
      alert("ATTENZIONE: ti manca l'abilità necessaria (sistemista).");
      return;
    }

    config.salvataggio = true;
    this.api.aggiornaConfigurazione(config.id_configurazione, nuovoValore).pipe(take(1)).subscribe({
      next: (rit) => {
        const aggiornata = rit.data;
        config.valore = aggiornata.valore;
        config.valoreModifica = String(aggiornata.valore);
        config.leggibile = this.calcolaLeggibile(config.chiave, aggiornata.valore);
        config.salvataggio = false;
        this.toastService.successo(`Configurazione "${config.chiave}" aggiornata.`);
      },
      error: () => {
        config.salvataggio = false;
        this.toastService.errore('Errore durante il salvataggio.');
      },
    });
  }

  apriFormNuova(): void {
    this.formNuovaAperta = !this.formNuovaAperta;
    if (this.formNuovaAperta) {
      this.nuovaChiave = '';
      this.nuovoValore = '';
    }
  }

  chiudiFormNuova(): void {
    this.formNuovaAperta = false;
  }

  salvaNuova(): void {
    if (this.salvataggioNuova) return;

    const chiave = this.nuovaChiave.trim();
    const valore = Number(this.nuovoValore);

    if (!chiave) {
      alert('La chiave è obbligatoria.');
      return;
    }
    if (!Number.isInteger(valore) || valore < 0) {
      alert('Il valore deve essere un intero maggiore o uguale a zero.');
      return;
    }

    if (!this.haAbilitaSistemista()) {
      alert("ATTENZIONE: ti manca l'abilità necessaria (sistemista).");
      return;
    }

    this.salvataggioNuova = true;
    this.api.creaConfigurazione({ chiave, valore }).pipe(take(1)).subscribe({
      next: (rit) => {
        const creata = rit.data;
        this.configurazioni = [...this.configurazioni, {
          id_configurazione: creata.id_configurazione,
          chiave: creata.chiave,
          valore: creata.valore,
          valoreModifica: String(creata.valore),
          salvataggio: false,
          leggibile: this.calcolaLeggibile(creata.chiave, creata.valore),
        }];
        this.formNuovaAperta = false;
        this.salvataggioNuova = false;
        this.toastService.successo(`Configurazione "${creata.chiave}" aggiunta.`);
      },
      error: (err) => {
        this.salvataggioNuova = false;
        if (err?.status === 422) {
          this.toastService.errore('Chiave già esistente o dati non validi.');
        } else {
          this.toastService.errore('Errore durante la creazione.');
        }
      },
    });
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
