import { Component, OnInit, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { take } from 'rxjs';
import gsap from 'gsap';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { ToastService } from 'src/app/_servizi_globali/toast.service';

interface Configurazione {
  id_configurazione: number;
  chiave: string;
  valore: number;
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
  formsConfig: FormGroup[] = [];
  caricamento = false;

  formNuovaAperta = false;
  formNuova: FormGroup;
  salvataggioNuova = false;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private toastService: ToastService,
  ) {
    this.formNuova = this.fb.group({
      chiave: ['', [Validators.required, Validators.pattern(/\S/)]],
      valore: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
    });
  }

  ngOnInit(): void {
    this.caricaConfigurazioni();
    setTimeout(() => this.avviaAnimazioniIngresso(), 0);
  }



   private eChiaveTempo(chiave: string): boolean {
    return /durata|termina|blocco|preavviso|attesa/.test(chiave);
  }

  private formattaSecondi(secondi: number): string {
    if (secondi < 60) return `${secondi} s`;
    const minuti = secondi / 60;
    if (minuti < 60) return `≈ ${this.arrotonda(minuti)} min`;
    const ore = minuti / 60;
    if (ore < 24) return `≈ ${this.arrotonda(ore)} ${this.plurale(this.arrotonda(ore), 'ora', 'ore')}`;
    const giorni = ore / 24;
    if (giorni < 30) return `≈ ${this.arrotonda(giorni)} ${this.plurale(this.arrotonda(giorni), 'giorno', 'giorni')}`;
    const mesi = giorni / 30;
    if (mesi < 12) return `≈ ${this.arrotonda(mesi)} ${this.plurale(this.arrotonda(mesi), 'mese', 'mesi')}`;
    const anni = giorni / 365;
    return `≈ ${this.arrotonda(anni)} ${this.plurale(this.arrotonda(anni), 'anno', 'anni')}`;
  }

  private plurale(valore: number, sing: string, plur: string): string {
    return valore === 1 ? sing : plur;
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
          salvataggio: false,
          leggibile: this.calcolaLeggibile(c.chiave, c.valore),
        }));
        this.formsConfig = this.configurazioni.map((c) =>
          this.fb.group({
            valore: [String(c.valore), [Validators.required, Validators.pattern(/^\d+$/)]],
          }),
        );
        this.caricamento = false;
      },
      error: () => {
        this.configurazioni = [];
        this.formsConfig = [];
        this.caricamento = false;
      },
    });
  }

  salvaConfigurazione(config: Configurazione, i: number): void {
    if (config.salvataggio) return;

    const form = this.formsConfig[i];
    if (!form || form.invalid) return;

    const nuovoValore = Number(form.get('valore')!.value);

    config.salvataggio = true;
    this.api.aggiornaConfigurazione(config.id_configurazione, nuovoValore).pipe(take(1)).subscribe({
      next: (rit) => {
        const aggiornata = rit.data;
        config.valore = aggiornata.valore;
        form.get('valore')!.setValue(String(aggiornata.valore));
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
      this.formNuova.reset({ chiave: '', valore: '' });
    }
  }

  chiudiFormNuova(): void {
    this.formNuovaAperta = false;
  }

  salvaNuova(): void {
    if (this.salvataggioNuova) return;

    if (this.formNuova.invalid) return;

    const chiave = this.formNuova.get('chiave')!.value.trim();
    const valore = Number(this.formNuova.get('valore')!.value);

    this.salvataggioNuova = true;
    this.api.creaConfigurazione({ chiave, valore }).pipe(take(1)).subscribe({
      next: (rit) => {
        const creata = rit.data;
        this.configurazioni = [...this.configurazioni, {
          id_configurazione: creata.id_configurazione,
          chiave: creata.chiave,
          valore: creata.valore,
          salvataggio: false,
          leggibile: this.calcolaLeggibile(creata.chiave, creata.valore),
        }];
        this.formsConfig = [...this.formsConfig, this.fb.group({
          valore: [String(creata.valore), [Validators.required, Validators.pattern(/^\d+$/)]],
        })];
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
