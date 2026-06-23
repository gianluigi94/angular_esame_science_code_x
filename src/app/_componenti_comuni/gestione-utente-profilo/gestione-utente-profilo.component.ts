import { Component, Input, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { take } from 'rxjs';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { ToastService } from 'src/app/_servizi_globali/toast.service';
import { SelectNazioniService, StatoSelectNazioni } from 'src/app/_servizi_globali/select-nazioni.service';
import { SelectIndirizzoItaliaService, StatoSelectComuneItalia, StatoSelectCapItalia } from 'src/app/_servizi_globali/select-indirizzo-italia.service';
import { SelectTipiIndirizziService, StatoSelectTipoIndirizzo, TipoIndirizzo } from 'src/app/_componenti_comuni/profilo/select-tipi-indirizzi.service';
import { SelectTipiRecapitiService, StatoSelectTipoRecapito, TipoRecapito } from 'src/app/_servizi_globali/select-tipi-recapiti.service';
import {
  StatoPrefissoRecapito,
  chiudiStatoPrefisso,
  prefissiFiltratiCondivisi,
  primoPrefissoDaIso,
  trackByPrefissoCondiviso,
  trovaPrefissoDaInput,
} from 'src/app/_benvenuto/registrazione/iscrizione_helpers/prefissi.helper';

@Component({
  selector: 'app-gestione-utente-profilo',
  templateUrl: './gestione-utente-profilo.component.html',
  styleUrls: ['./gestione-utente-profilo.component.scss'],
})
export class GestioneUtenteProfiloComponent implements OnInit {
  @Input() idContatto!: number;

  formAnagrafica: FormGroup;
  statoNazioneAnagrafica!: StatoSelectNazioni;
  statoComuneAnagrafica!: StatoSelectComuneItalia;
  sessoAnagAperto = false;
  sessoAnagValore = '';
  indiceSessoAnag = -1;
  cfAnagValore = '';
  salvataggioAnagInCorso = false;

  indirizziMock: any[] = [];
  formNuovoAperto = false;
  indirizzoDaEliminare: any | null = null;
  eliminazioneInCorso = false;
  statoNazioneNuovo!: StatoSelectNazioni;
  statiNazioniModifica: StatoSelectNazioni[] = [];
  statoComuneNuovo!: StatoSelectComuneItalia;
  statiComuniModifica: StatoSelectComuneItalia[] = [];
  statoCapNuovo!: StatoSelectCapItalia;
  statiCapModifica: StatoSelectCapItalia[] = [];
  statoTipoNuovo!: StatoSelectTipoIndirizzo;
  statiTipiModifica: StatoSelectTipoIndirizzo[] = [];
  formNuovoIndirizzo: FormGroup;
  formsModifica: (FormGroup | null)[] = [];
  salvataggioInCorso = false;
  erroriCoerenzaModifica: boolean[] = [];
  erroreCoerenzaNuovo = false;

  recapitiMock: any[] = [];
  formNuovoRecapitoAperto = false;
  recapitoDaEliminare: any | null = null;
  eliminazioneRecapitoInCorso = false;
  salvataggioRecapitoInCorso = false;
  statoTipoRecapitoNuovo!: StatoSelectTipoRecapito;
  statiTipiRecapitoModifica: StatoSelectTipoRecapito[] = [];
  statoPrefissoNuovo: StatoPrefissoRecapito = { aperto: false, valore: '+39', filtro: '', indice: -1, modificatoManualmente: false };
  statiPrefissoModifica: StatoPrefissoRecapito[] = [];
  formNuovoRecapito: FormGroup;
  formsModificaRecapito: (FormGroup | null)[] = [];

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private api: ApiService,
    private toastService: ToastService,
    public selectNazioniService: SelectNazioniService,
    public selectIndirizzoItaliaService: SelectIndirizzoItaliaService,
    public selectTipiIndirizziService: SelectTipiIndirizziService,
    public selectTipiRecapitiService: SelectTipiRecapitiService,
  ) {
    this.formAnagrafica = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50), Validators.pattern(/^[A-Za-zÀ-ÿ\s'-]+$/)]],
      cognome: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50), Validators.pattern(/^[A-Za-zÀ-ÿ\s'-]+$/)]],
      sesso: ['', Validators.required],
      dataGg: ['', [Validators.required, Validators.pattern(/^(0[1-9]|[12]\d|3[01])$/)]],
      dataMm: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])$/)]],
      dataAaaa: ['', [Validators.required, Validators.pattern(/^\d{4}$/), this.validaAnnoNascita()]],
      paese: ['IT', Validators.required],
      comune: [''],
      citta: [''],
      codiceFiscale: [''],
    }, { validators: this.validaDataNascitaProfilo });

    this.formNuovoIndirizzo = this.fb.group({
      idTipoIndirizzo: [null, Validators.required],
      nazione: ['IT', Validators.required],
      comune: ['', Validators.required],
      citta: [''],
      provincia: ['', [Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)]],
      cap: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
      via: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100), Validators.pattern(/^[A-Za-zÀ-ÿ0-9\s'.,°\/\-]+$/)]],
      civico: ['', [Validators.required, Validators.maxLength(10), Validators.pattern(/^\d+[A-Za-z0-9\/\-]*$/)]],
      dettagli: ['', [Validators.minLength(3), Validators.maxLength(200)]],
    });

    this.formNuovoRecapito = this.fb.group({
      idTipoRecapito: [null, Validators.required],
      prefisso: ['+39'],
      recapito: ['', Validators.required],
    });

    this.statoNazioneAnagrafica = this.selectNazioniService.creaStato('IT');
    this.statoComuneAnagrafica = this.selectIndirizzoItaliaService.creaStatoComune('');

    this.statoNazioneNuovo = this.selectNazioniService.creaStato('IT');
    this.statoComuneNuovo = this.selectIndirizzoItaliaService.creaStatoComune('');
    this.statoCapNuovo = this.selectIndirizzoItaliaService.creaStatoCap('');
    this.statoTipoNuovo = this.selectTipiIndirizziService.creaStato(null, '');
    this.statoTipoRecapitoNuovo = this.selectTipiRecapitiService.creaStato(null, '');
  }

  ngOnInit(): void {
    this.selectNazioniService.caricaNazioni();
    this.selectIndirizzoItaliaService.caricaComuni();
    this.selectTipiIndirizziService.caricaTipiIndirizzi();
    this.selectTipiRecapitiService.caricaTipiRecapiti();
    this.caricaDatiAnagrafici();
    this.caricaIndirizzi();
    this.caricaRecapiti();
  }

  @HostListener('document:click')
  onClickDocumento(): void {
    this.chiudiSelect();
  }

  chiudiSelect(): void {
    this.sessoAnagAperto = false;
    this.indiceSessoAnag = -1;
    this.selectNazioniService.chiudi(this.statoNazioneAnagrafica);
    this.selectIndirizzoItaliaService.chiudiComune(this.statoComuneAnagrafica);

    this.selectNazioniService.chiudi(this.statoNazioneNuovo);
    this.statiNazioniModifica.forEach((stato) => this.selectNazioniService.chiudi(stato));
    this.selectIndirizzoItaliaService.chiudiComune(this.statoComuneNuovo);
    this.statiComuniModifica.forEach((stato) => this.selectIndirizzoItaliaService.chiudiComune(stato));
    this.selectIndirizzoItaliaService.chiudiCap(this.statoCapNuovo);
    this.statiCapModifica.forEach((stato) => this.selectIndirizzoItaliaService.chiudiCap(stato));
    this.selectTipiIndirizziService.chiudi(this.statoTipoNuovo);
    this.statiTipiModifica.forEach((stato) => this.selectTipiIndirizziService.chiudi(stato));

    this.selectTipiRecapitiService.chiudi(this.statoTipoRecapitoNuovo);
    this.statiTipiRecapitoModifica.forEach((stato) => this.selectTipiRecapitiService.chiudi(stato));
    chiudiStatoPrefisso(this.statoPrefissoNuovo);
    this.statiPrefissoModifica.forEach((stato) => chiudiStatoPrefisso(stato));
  }

  get isItaliaNascitaAnag(): boolean {
    return this.statoNazioneAnagrafica.valore === 'IT';
  }

  sessoAnagLabel(): string {
    const map: Record<string, string> = { M: 'Maschio', F: 'Femmina', NS: 'Non specificato' };
    return this.sessoAnagValore ? (map[this.sessoAnagValore] ?? '') : 'Seleziona';
  }

  toggleSessoAnag(event: Event): void {
    event.stopPropagation();
    this.sessoAnagAperto = !this.sessoAnagAperto;
    if (!this.sessoAnagAperto) this.indiceSessoAnag = -1;
  }

  selezionaSessoAnag(valore: string): void {
    this.sessoAnagValore = valore;
    this.sessoAnagAperto = false;
    this.indiceSessoAnag = -1;
    this.formAnagrafica.get('sesso')!.setValue(valore);
    this.formAnagrafica.get('sesso')!.markAsTouched();
  }

  navigaSessoAnag(event: KeyboardEvent): void {
    const opzioni = ['M', 'F', 'NS'];
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!this.sessoAnagAperto) this.sessoAnagAperto = true;
      this.indiceSessoAnag = Math.min(this.indiceSessoAnag + 1, opzioni.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.indiceSessoAnag = Math.max(this.indiceSessoAnag - 1, 0);
    } else if (event.key === 'Enter' && this.sessoAnagAperto && this.indiceSessoAnag >= 0) {
      event.preventDefault();
      this.selezionaSessoAnag(opzioni[this.indiceSessoAnag]);
    } else if (event.key === 'Escape') {
      this.sessoAnagAperto = false;
      this.indiceSessoAnag = -1;
    }
  }

  selezionaNazioneAnagrafica(valore: string): void {
    const cambiaTipo = (valore === 'IT') !== (this.statoNazioneAnagrafica.valore === 'IT');
    this.selectNazioniService.seleziona(this.statoNazioneAnagrafica, valore);
    this.formAnagrafica.get('paese')!.setValue(valore);
    this.formAnagrafica.get('paese')!.markAsTouched();

    if (cambiaTipo) {
      this.statoComuneAnagrafica = this.selectIndirizzoItaliaService.creaStatoComune('');
      this.formAnagrafica.get('comune')!.setValue('');
      this.formAnagrafica.get('citta')!.setValue('');

      if (valore === 'IT') {
        this.formAnagrafica.get('comune')!.setValidators(Validators.required);
        this.formAnagrafica.get('citta')!.clearValidators();
        this.formAnagrafica.get('codiceFiscale')!.setValidators([Validators.required, Validators.pattern(/^[A-Za-z]{6}\d{2}[AaBbCcDdEeHhLlMmPpRrSsTt](0[1-9]|[12]\d|3[01]|4[1-9]|[56]\d|7[01])[A-Za-z]\d{3}[A-Za-z]$/)]);
      } else {
        this.formAnagrafica.get('citta')!.setValidators([Validators.required, Validators.minLength(2), Validators.maxLength(80)]);
        this.formAnagrafica.get('comune')!.clearValidators();
        this.formAnagrafica.get('codiceFiscale')!.setValidators([Validators.pattern(/^[A-Za-z]{6}\d{2}[AaBbCcDdEeHhLlMmPpRrSsTt](0[1-9]|[12]\d|3[01]|4[1-9]|[56]\d|7[01])[A-Za-z]\d{3}[A-Za-z]$/)]);
      }
      this.formAnagrafica.get('comune')!.updateValueAndValidity();
      this.formAnagrafica.get('citta')!.updateValueAndValidity();
      this.formAnagrafica.get('codiceFiscale')!.updateValueAndValidity();
    }
  }

  selezionaComuneAnagrafica(valore: string): void {
    this.selectIndirizzoItaliaService.selezionaComune(this.statoComuneAnagrafica, this.selectIndirizzoItaliaService.creaStatoCap(''), valore);
    this.statoComuneAnagrafica.valore = valore;
    this.formAnagrafica.get('comune')!.setValue(valore);
    this.formAnagrafica.get('comune')!.markAsTouched();
  }

  soloNumeriAnag(event: KeyboardEvent, campo: 'gg' | 'mm' | 'aaaa'): void {
    if (event.key === 'Tab' || event.key === 'Backspace' || event.key === 'Delete' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') return;
    if (!/^\d$/.test(event.key)) event.preventDefault();
  }

  avanzaDataAnag(event: Event, campo: 'gg' | 'mm'): void {
    const input = event.target as HTMLInputElement;
    if (input.value.length >= 2) {
      const prossimo = campo === 'gg'
        ? document.getElementById('anag_admin_data_mm')
        : document.getElementById('anag_admin_data_aaaa');
      prossimo?.focus();
    }
  }

  dataAnagCompilata(): boolean {
    return !!(this.formAnagrafica.get('dataGg')!.value || this.formAnagrafica.get('dataMm')!.value || this.formAnagrafica.get('dataAaaa')!.value);
  }

  focusDataAnag(event: Event): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT') return;
    const gg = document.getElementById('anag_admin_data_gg') as HTMLInputElement;
    const mm = document.getElementById('anag_admin_data_mm') as HTMLInputElement;
    const aaaa = document.getElementById('anag_admin_data_aaaa') as HTMLInputElement;
    if (!gg?.value) { gg?.focus(); return; }
    if (!mm?.value) { mm?.focus(); return; }
    if (!aaaa?.value || aaaa.value.length < 4) { aaaa?.focus(); return; }
    gg?.focus();
  }

  svuotaCFAnag(): void {
    this.cfAnagValore = '';
    this.formAnagrafica.get('codiceFiscale')!.setValue('');
    this.formAnagrafica.get('codiceFiscale')!.markAsTouched();
  }

  caricaDatiAnagrafici(): void {
    this.api.getUtenteAnagrafica(this.idContatto).pipe(take(1)).subscribe({
      next: (rit) => {
        const d = rit.data;
        this.formAnagrafica.get('nome')!.setValue(d.nome ?? '');
        this.formAnagrafica.get('cognome')!.setValue(d.cognome ?? '');

        this.sessoAnagValore = d.sesso ?? '';
        this.formAnagrafica.get('sesso')!.setValue(d.sesso ?? '');

        if (d.data_nascita) {
          const parti = d.data_nascita.split('/');
          this.formAnagrafica.get('dataGg')!.setValue(parti[0] ?? '');
          this.formAnagrafica.get('dataMm')!.setValue(parti[1] ?? '');
          this.formAnagrafica.get('dataAaaa')!.setValue(parti[2] ?? '');
        }

        const iso = d.iso_nascita || 'IT';
        this.statoNazioneAnagrafica = this.selectNazioniService.creaStato(iso);
        this.formAnagrafica.get('paese')!.setValue(iso);

        if (iso === 'IT') {
          this.statoComuneAnagrafica = this.selectIndirizzoItaliaService.creaStatoComune(d.comune_nascita ?? '');
          this.formAnagrafica.get('comune')!.setValue(d.comune_nascita ?? '');
          this.formAnagrafica.get('comune')!.setValidators(Validators.required);
          this.formAnagrafica.get('citta')!.clearValidators();
          this.formAnagrafica.get('codiceFiscale')!.setValidators([Validators.required, Validators.pattern(/^[A-Za-z]{6}\d{2}[AaBbCcDdEeHhLlMmPpRrSsTt](0[1-9]|[12]\d|3[01]|4[1-9]|[56]\d|7[01])[A-Za-z]\d{3}[A-Za-z]$/)]);
        } else {
          this.statoComuneAnagrafica = this.selectIndirizzoItaliaService.creaStatoComune('');
          this.formAnagrafica.get('citta')!.setValue(d.citta_nascita ?? '');
          this.formAnagrafica.get('citta')!.setValidators([Validators.required, Validators.minLength(2), Validators.maxLength(80)]);
          this.formAnagrafica.get('comune')!.clearValidators();
          this.formAnagrafica.get('codiceFiscale')!.setValidators([Validators.pattern(/^[A-Za-z]{6}\d{2}[AaBbCcDdEeHhLlMmPpRrSsTt](0[1-9]|[12]\d|3[01]|4[1-9]|[56]\d|7[01])[A-Za-z]\d{3}[A-Za-z]$/)]);
        }
        this.formAnagrafica.get('comune')!.updateValueAndValidity();
        this.formAnagrafica.get('citta')!.updateValueAndValidity();
        this.formAnagrafica.get('codiceFiscale')!.updateValueAndValidity();

        this.cfAnagValore = d.codice_fiscale ?? '';
        this.formAnagrafica.get('codiceFiscale')!.setValue(d.codice_fiscale ?? '');

        this.cdr.detectChanges();
      },
    });
  }

  salvaAnagrafica(): void {
    if (this.formAnagrafica.invalid) {
      this.formAnagrafica.markAllAsTouched();
      return;
    }

    const f = this.formAnagrafica.value;
    const isIT = this.statoNazioneAnagrafica.valore === 'IT';

    this.salvataggioAnagInCorso = true;
    this.api.aggiornaUtenteAnagrafica(this.idContatto, {
      nome: f.nome,
      cognome: f.cognome,
      sesso: f.sesso,
      data_nascita: `${f.dataGg}/${f.dataMm}/${f.dataAaaa}`,
      codice_fiscale: f.codiceFiscale,
      iso_nascita: this.statoNazioneAnagrafica.valore,
      comune_nascita: isIT ? f.comune : null,
      citta_nascita: !isIT ? f.citta : null,
    }).pipe(take(1)).subscribe({
      next: () => {
        this.salvataggioAnagInCorso = false;
        this.toastService.successo('Dati anagrafici aggiornati.');
      },
      error: () => {
        this.salvataggioAnagInCorso = false;
      },
    });
  }

  private caricaIndirizzi(): void {
    this.api.getUtenteIndirizzi(this.idContatto).pipe(take(1)).subscribe({
      next: (rit) => {
        const dati = rit.data ?? [];
        this.indirizziMock = dati.map((ind: any) => ({ ...ind, aperta: false }));
        this.statiNazioniModifica = this.indirizziMock.map((ind) => this.selectNazioniService.creaStato(ind.iso ?? 'IT'));
        this.statiComuniModifica = this.indirizziMock.map((ind) => this.selectIndirizzoItaliaService.creaStatoComune(ind.iso === 'IT' ? ind.citta : ''));
        this.statiCapModifica = this.indirizziMock.map((ind) => this.selectIndirizzoItaliaService.creaStatoCap(ind.iso === 'IT' ? ind.cap : ''));
        this.statiTipiModifica = this.indirizziMock.map((ind) => this.selectTipiIndirizziService.creaStato(ind.id_tipo_indirizzo ?? null, ind.tipo ?? ''));
        this.formsModifica = this.indirizziMock.map(() => null);
        this.cdr.detectChanges();
      },
      error: () => {
        this.indirizziMock = [];
      },
    });
  }

  apriFormModifica(i: number): void {
    this.indirizziMock.forEach((ind, idx) => { if (idx !== i) ind.aperta = false; });
    this.formNuovoAperto = false;
    this.indirizziMock[i].aperta = !this.indirizziMock[i].aperta;
    this.formsModifica[i] = this.indirizziMock[i].aperta ? this.creaFormModifica(this.indirizziMock[i]) : null;
  }

  private creaFormModifica(ind: any): FormGroup {
    const isIT = ind.iso === 'IT';
    return this.fb.group({
      idTipoIndirizzo: [ind.id_tipo_indirizzo ?? null, Validators.required],
      nazione: [ind.iso ?? 'IT', Validators.required],
      comune: [isIT ? (ind.citta ?? '') : '', isIT ? Validators.required : []],
      citta: [!isIT ? (ind.citta ?? '') : '', !isIT ? [Validators.required, Validators.minLength(2), Validators.maxLength(80)] : []],
      provincia: [ind.provincia ?? '', isIT ? [Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)] : []],
      cap: [ind.cap ?? '', isIT ? [Validators.required, Validators.pattern(/^\d{5}$/)] : []],
      via: [ind.via ?? '', [Validators.required, Validators.minLength(3), Validators.maxLength(100), Validators.pattern(/^[A-Za-zÀ-ÿ0-9\s'.,°\/\-]+$/)]],
      civico: [ind.civico ?? '', [Validators.required, Validators.maxLength(10), Validators.pattern(/^\d+[A-Za-z0-9\/\-]*$/)]],
      dettagli: [ind.dettagli ?? '', [Validators.minLength(3), Validators.maxLength(200)]],
    });
  }

  chiudiForm(i: number): void {
    this.indirizziMock[i].aperta = false;
    this.formsModifica[i] = null;
  }

  apriFormNuovo(): void {
    this.indirizziMock.forEach((ind) => ind.aperta = false);
    this.formNuovoAperto = !this.formNuovoAperto;
  }

  chiudiFormNuovo(): void {
    this.formNuovoAperto = false;
  }

  tipiFiltrati(indiceModifica?: number): any[] {
    return this.selectTipiIndirizziService.tipi.filter((tipo: any) => {
      if (tipo.tipo === 'domicilio') return false;
      if (tipo.tipo === 'fatturazione') {
        if (indiceModifica !== undefined && this.indirizziMock[indiceModifica]?.tipo === 'fatturazione') return true;
        return !this.indirizziMock.some((ind: any) => ind.tipo === 'fatturazione');
      }
      return true;
    });
  }

  labelPaese(iso: string): string {
    const n = this.selectNazioniService.nazioni.find((x: any) => x.iso === iso);
    if (!n) return '';
    return this.selectNazioniService.cambioLinguaService.leggiCodiceLingua() === 'it' ? n.nazione_it : n.nazione_en;
  }

  statoNazioneModifica(i: number): StatoSelectNazioni {
    if (!this.statiNazioniModifica[i]) {
      this.statiNazioniModifica[i] = this.selectNazioniService.creaStato(this.indirizziMock[i]?.iso ?? 'IT');
    }
    return this.statiNazioniModifica[i];
  }

  statoTipoModifica(i: number): StatoSelectTipoIndirizzo {
    if (!this.statiTipiModifica[i]) {
      this.statiTipiModifica[i] = this.selectTipiIndirizziService.creaStato(this.indirizziMock[i]?.id_tipo_indirizzo ?? null, this.indirizziMock[i]?.tipo ?? '');
    }
    return this.statiTipiModifica[i];
  }

  selezionaTipoNuovo(tipo: TipoIndirizzo): void {
    this.selectTipiIndirizziService.seleziona(this.statoTipoNuovo, tipo);
    this.formNuovoIndirizzo.get('idTipoIndirizzo')!.setValue(tipo.id_tipo_indirizzo);
    this.formNuovoIndirizzo.get('idTipoIndirizzo')!.markAsTouched();
  }

  selezionaTipoModifica(i: number, tipo: TipoIndirizzo): void {
    const stato = this.statoTipoModifica(i);
    this.selectTipiIndirizziService.seleziona(stato, tipo);
    const form = this.formsModifica[i];
    if (form) {
      form.get('idTipoIndirizzo')!.setValue(tipo.id_tipo_indirizzo);
      form.get('idTipoIndirizzo')!.markAsTouched();
    }
  }

  statoComuneModifica(i: number): StatoSelectComuneItalia {
    if (!this.statiComuniModifica[i]) {
      this.statiComuniModifica[i] = this.selectIndirizzoItaliaService.creaStatoComune(this.indirizziMock[i]?.iso === 'IT' ? this.indirizziMock[i]?.citta ?? '' : '');
    }
    return this.statiComuniModifica[i];
  }

  statoCapModifica(i: number): StatoSelectCapItalia {
    if (!this.statiCapModifica[i]) {
      this.statiCapModifica[i] = this.selectIndirizzoItaliaService.creaStatoCap(this.indirizziMock[i]?.iso === 'IT' ? this.indirizziMock[i]?.cap ?? '' : '');
    }
    return this.statiCapModifica[i];
  }

  selezionaNazioneNuovo(valore: string): void {
    this.selectNazioniService.seleziona(this.statoNazioneNuovo, valore);
    this.formNuovoIndirizzo.get('nazione')!.setValue(valore);
    this.formNuovoIndirizzo.get('nazione')!.markAsTouched();

    this.statoComuneNuovo = this.selectIndirizzoItaliaService.creaStatoComune('');
    this.statoCapNuovo = this.selectIndirizzoItaliaService.creaStatoCap('');

    this.formNuovoIndirizzo.get('comune')!.setValue('');
    this.formNuovoIndirizzo.get('citta')!.setValue('');
    this.formNuovoIndirizzo.get('provincia')!.setValue('');
    this.formNuovoIndirizzo.get('cap')!.setValue('');

    if (valore === 'IT') {
      this.formNuovoIndirizzo.get('comune')!.setValidators(Validators.required);
      this.formNuovoIndirizzo.get('citta')!.clearValidators();
      this.formNuovoIndirizzo.get('provincia')!.setValidators([Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)]);
      this.formNuovoIndirizzo.get('cap')!.setValidators([Validators.required, Validators.pattern(/^\d{5}$/)]);
    } else {
      this.formNuovoIndirizzo.get('citta')!.setValidators([Validators.required, Validators.minLength(2), Validators.maxLength(80)]);
      this.formNuovoIndirizzo.get('comune')!.clearValidators();
      this.formNuovoIndirizzo.get('provincia')!.clearValidators();
      this.formNuovoIndirizzo.get('cap')!.clearValidators();
    }

    this.formNuovoIndirizzo.get('comune')!.updateValueAndValidity();
    this.formNuovoIndirizzo.get('citta')!.updateValueAndValidity();
    this.formNuovoIndirizzo.get('provincia')!.updateValueAndValidity();
    this.formNuovoIndirizzo.get('cap')!.updateValueAndValidity();
  }

  selezionaNazioneModifica(i: number, valore: string): void {
    const stato = this.statoNazioneModifica(i);
    this.selectNazioniService.seleziona(stato, valore);
    this.statiComuniModifica[i] = this.selectIndirizzoItaliaService.creaStatoComune('');
    this.statiCapModifica[i] = this.selectIndirizzoItaliaService.creaStatoCap('');

    const form = this.formsModifica[i];
    if (form) {
      form.get('nazione')!.setValue(valore);
      form.get('nazione')!.markAsTouched();
      form.get('comune')!.setValue('');
      form.get('citta')!.setValue('');
      form.get('provincia')!.setValue('');
      form.get('cap')!.setValue('');

      if (valore === 'IT') {
        form.get('comune')!.setValidators(Validators.required);
        form.get('citta')!.clearValidators();
        form.get('provincia')!.setValidators([Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)]);
        form.get('cap')!.setValidators([Validators.required, Validators.pattern(/^\d{5}$/)]);
      } else {
        form.get('citta')!.setValidators([Validators.required, Validators.minLength(2), Validators.maxLength(80)]);
        form.get('comune')!.clearValidators();
        form.get('provincia')!.clearValidators();
        form.get('cap')!.clearValidators();
      }

      form.get('comune')!.updateValueAndValidity();
      form.get('citta')!.updateValueAndValidity();
      form.get('provincia')!.updateValueAndValidity();
      form.get('cap')!.updateValueAndValidity();
    }
  }

  selezionaComuneNuovo(valore: string): void {
    const comune = this.selectIndirizzoItaliaService.selezionaComune(this.statoComuneNuovo, this.statoCapNuovo, valore);
    this.formNuovoIndirizzo.get('comune')!.setValue(valore);
    this.formNuovoIndirizzo.get('comune')!.markAsTouched();
    if (comune) {
      this.formNuovoIndirizzo.get('provincia')!.setValue((comune.sigla_automobilistica ?? '').toUpperCase());
      this.formNuovoIndirizzo.get('provincia')!.markAsTouched();
      this.formNuovoIndirizzo.get('cap')!.setValue(this.statoCapNuovo.valore);
      if (this.statoCapNuovo.valore) this.formNuovoIndirizzo.get('cap')!.markAsTouched();
    }
    this.erroreCoerenzaNuovo = false;
  }

  selezionaComuneModifica(i: number, valore: string): void {
    const statoComune = this.statoComuneModifica(i);
    const statoCap = this.statoCapModifica(i);
    const comune = this.selectIndirizzoItaliaService.selezionaComune(statoComune, statoCap, valore);
    this.erroriCoerenzaModifica[i] = false;
    const form = this.formsModifica[i];
    if (form) {
      form.get('comune')!.setValue(valore);
      form.get('comune')!.markAsTouched();
      if (comune) {
        form.get('provincia')!.setValue((comune.sigla_automobilistica ?? '').toUpperCase());
        form.get('provincia')!.markAsTouched();
        form.get('cap')!.setValue(statoCap.valore);
        if (statoCap.valore) form.get('cap')!.markAsTouched();
      }
    }
  }

  selezionaCapNuovo(valore: string): void {
    this.selectIndirizzoItaliaService.selezionaCap(this.statoCapNuovo, valore);
    this.formNuovoIndirizzo.get('cap')!.setValue(valore);
    this.formNuovoIndirizzo.get('cap')!.markAsTouched();
  }

  selezionaCapModifica(i: number, valore: string): void {
    const statoCap = this.statoCapModifica(i);
    this.selectIndirizzoItaliaService.selezionaCap(statoCap, valore);
    const form = this.formsModifica[i];
    if (form) {
      form.get('cap')!.setValue(valore);
      form.get('cap')!.markAsTouched();
    }
  }

  salvaModificaIndirizzo(i: number): void {
    const form = this.formsModifica[i];
    if (!form) return;
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }

    const ind = this.indirizziMock[i];
    const isIT = form.get('nazione')!.value === 'IT';

    if (isIT) {
      const ok = this.selectIndirizzoItaliaService.verificaCoerenza(form.get('comune')!.value, form.get('provincia')!.value, form.get('cap')!.value);
      if (!ok) { this.erroriCoerenzaModifica[i] = true; return; }
    }
    this.erroriCoerenzaModifica[i] = false;

    const idNazione = this.selectNazioniService.idDaIso(form.get('nazione')!.value);
    if (idNazione === null) return;
    const idComune = isIT ? this.selectIndirizzoItaliaService.idDaNomeComune(form.get('comune')!.value) : null;

    const dati = {
      id_tipo_indirizzo: form.get('idTipoIndirizzo')!.value,
      id_nazione: idNazione,
      id_comune: idComune,
      citta: isIT ? null : (form.get('citta')!.value || null),
      cap: isIT ? (form.get('cap')!.value || null) : null,
      indirizzo: form.get('via')!.value || null,
      civico: form.get('civico')!.value || null,
      dettagli: form.get('dettagli')!.value || null,
    };

    this.salvataggioInCorso = true;
    this.api.updateUtenteIndirizzo(this.idContatto, ind.id_indirizzo, dati).pipe(take(1)).subscribe({
      next: () => {
        this.salvataggioInCorso = false;
        this.toastService.successo('Indirizzo aggiornato.');
        this.formsModifica[i] = null;
        this.indirizziMock[i].aperta = false;
        this.caricaIndirizzi();
      },
      error: () => {
        this.salvataggioInCorso = false;
      },
    });
  }

  salvaNuovoIndirizzo(): void {
    if (this.formNuovoIndirizzo.invalid) {
      this.formNuovoIndirizzo.markAllAsTouched();
      return;
    }

    const isIT = this.formNuovoIndirizzo.get('nazione')!.value === 'IT';
    if (isIT) {
      const ok = this.selectIndirizzoItaliaService.verificaCoerenza(this.formNuovoIndirizzo.get('comune')!.value, this.formNuovoIndirizzo.get('provincia')!.value, this.formNuovoIndirizzo.get('cap')!.value);
      if (!ok) { this.erroreCoerenzaNuovo = true; return; }
    }
    this.erroreCoerenzaNuovo = false;

    const idNazione = this.selectNazioniService.idDaIso(this.formNuovoIndirizzo.get('nazione')!.value);
    if (idNazione === null) return;
    const idComune = isIT ? this.selectIndirizzoItaliaService.idDaNomeComune(this.formNuovoIndirizzo.get('comune')!.value) : null;

    const dati = {
      id_tipo_indirizzo: this.formNuovoIndirizzo.get('idTipoIndirizzo')!.value,
      id_nazione: idNazione,
      id_comune: idComune,
      citta: isIT ? null : (this.formNuovoIndirizzo.get('citta')!.value || null),
      cap: isIT ? (this.formNuovoIndirizzo.get('cap')!.value || null) : null,
      indirizzo: this.formNuovoIndirizzo.get('via')!.value || null,
      civico: this.formNuovoIndirizzo.get('civico')!.value || null,
      dettagli: this.formNuovoIndirizzo.get('dettagli')!.value || null,
    };

    this.salvataggioInCorso = true;
    this.api.creaUtenteIndirizzo(this.idContatto, dati).pipe(take(1)).subscribe({
      next: () => {
        this.salvataggioInCorso = false;
        this.toastService.successo('Indirizzo aggiunto.');
        this.formNuovoAperto = false;
        this.formNuovoIndirizzo.reset({ nazione: 'IT' });
        this.statoNazioneNuovo = this.selectNazioniService.creaStato('IT');
        this.statoComuneNuovo = this.selectIndirizzoItaliaService.creaStatoComune('');
        this.statoCapNuovo = this.selectIndirizzoItaliaService.creaStatoCap('');
        this.statoTipoNuovo = this.selectTipiIndirizziService.creaStato(null, '');
        this.caricaIndirizzi();
      },
      error: () => {
        this.salvataggioInCorso = false;
      },
    });
  }

  apriModaleEliminazione(ind: any): void {
    this.indirizzoDaEliminare = ind;
  }

  chiudiModaleEliminazione(): void {
    if (this.eliminazioneInCorso) return;
    this.indirizzoDaEliminare = null;
  }

  confermaEliminazione(): void {
    if (!this.indirizzoDaEliminare) return;
    this.eliminazioneInCorso = true;
    this.api.eliminaUtenteIndirizzo(this.idContatto, this.indirizzoDaEliminare.id_indirizzo).pipe(take(1)).subscribe({
      next: () => {
        this.eliminazioneInCorso = false;
        this.indirizzoDaEliminare = null;
        this.toastService.successo('Indirizzo eliminato.');
        this.caricaIndirizzi();
      },
      error: () => {
        this.eliminazioneInCorso = false;
      },
    });
  }

  private caricaRecapiti(): void {
    this.api.getUtenteRecapiti(this.idContatto).pipe(take(1)).subscribe({
      next: (rit) => {
        const dati = rit.data ?? [];
        this.recapitiMock = dati.map((rec: any) => ({ ...rec, aperta: false }));
        this.formsModificaRecapito = this.recapitiMock.map(() => null);
        this.statiTipiRecapitoModifica = this.recapitiMock.map((rec) => this.selectTipiRecapitiService.creaStato(rec.id_tipo_recapito ?? null, rec.tipo ?? ''));
        this.statiPrefissoModifica = this.recapitiMock.map((rec) => {
          const parti = (rec.tipo === 'email' ? '' : (rec.recapito ?? '')).split(' ');
          const prefisso = parti[0]?.startsWith('+') ? parti[0] : this.leggiPrefissoConsigliato();
          return { aperto: false, valore: prefisso, filtro: '', indice: -1, modificatoManualmente: true };
        });
        this.cdr.detectChanges();
      },
      error: () => {
        this.recapitiMock = [];
      },
    });
  }

  leggiPrefissoConsigliato(): string {
    const domicilio = this.indirizziMock.find((i) => i.tipo === 'domicilio');
    return primoPrefissoDaIso(this.selectNazioniService.nazioni, domicilio?.iso ?? 'IT');
  }

  apriFormModificaRecapito(i: number): void {
    this.recapitiMock.forEach((rec, idx) => { if (idx !== i) rec.aperta = false; });
    this.formNuovoRecapitoAperto = false;
    this.recapitiMock[i].aperta = !this.recapitiMock[i].aperta;
    this.formsModificaRecapito[i] = this.recapitiMock[i].aperta ? this.creaFormModificaRecapito(this.recapitiMock[i]) : null;
  }

  private creaFormModificaRecapito(rec: any): FormGroup {
    const tipo = rec.tipo;
    let valore = '';
    if (tipo === 'email') {
      valore = rec.recapito ?? '';
    } else {
      const parti = (rec.recapito ?? '').split(' ');
      if (parti.length >= 2 && parti[0].startsWith('+')) {
        valore = parti.slice(1).join(' ').replace(/[^0-9]/g, '');
      } else {
        valore = (rec.recapito ?? '').replace(/[^0-9]/g, '');
      }
    }

    const validatori = tipo === 'email'
      ? [Validators.required, Validators.email, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/), Validators.maxLength(40)]
      : [Validators.required, Validators.pattern(/^\d{6,20}$/)];

    return this.fb.group({
      idTipoRecapito: [rec.id_tipo_recapito, Validators.required],
      prefisso: [this.statiPrefissoModifica[this.recapitiMock.indexOf(rec)]?.valore ?? '+39'],
      recapito: [valore, validatori],
    });
  }

  chiudiFormRecapito(i: number): void {
    this.recapitiMock[i].aperta = false;
    this.formsModificaRecapito[i] = null;
  }

  apriFormNuovoRecapito(): void {
    this.recapitiMock.forEach((rec) => (rec.aperta = false));
    this.formNuovoRecapitoAperto = !this.formNuovoRecapitoAperto;
    if (this.formNuovoRecapitoAperto) {
      this.formNuovoRecapito.reset({ idTipoRecapito: null, prefisso: this.leggiPrefissoConsigliato(), recapito: '' });
      this.statoTipoRecapitoNuovo = this.selectTipiRecapitiService.creaStato(null, '');
      this.statoPrefissoNuovo = { aperto: false, valore: this.leggiPrefissoConsigliato(), filtro: '', indice: -1, modificatoManualmente: false };
      this.formNuovoRecapito.get('recapito')!.clearValidators();
      this.formNuovoRecapito.get('recapito')!.setValidators(Validators.required);
      this.formNuovoRecapito.get('recapito')!.updateValueAndValidity();
    }
  }

  chiudiFormNuovoRecapito(): void {
    this.formNuovoRecapitoAperto = false;
  }

  statoTipoRecapitoMod(i: number): StatoSelectTipoRecapito {
    if (!this.statiTipiRecapitoModifica[i]) {
      this.statiTipiRecapitoModifica[i] = this.selectTipiRecapitiService.creaStato(this.recapitiMock[i]?.id_tipo_recapito ?? null, this.recapitiMock[i]?.tipo ?? '');
    }
    return this.statiTipiRecapitoModifica[i];
  }

  statoPrefissoMod(i: number): StatoPrefissoRecapito {
    if (!this.statiPrefissoModifica[i]) {
      this.statiPrefissoModifica[i] = { aperto: false, valore: this.leggiPrefissoConsigliato(), filtro: '', indice: -1, modificatoManualmente: false };
    }
    return this.statiPrefissoModifica[i];
  }

  selezionaTipoRecapitoNuovo(tipo: TipoRecapito): void {
    this.selectTipiRecapitiService.seleziona(this.statoTipoRecapitoNuovo, tipo);
    this.formNuovoRecapito.get('idTipoRecapito')!.setValue(tipo.id_tipo_recapito);
    this.formNuovoRecapito.get('idTipoRecapito')!.markAsTouched();
    this.aggiornaValidatoriRecapito(this.formNuovoRecapito, tipo.tipo);
    this.formNuovoRecapito.get('recapito')!.setValue('');
  }

  selezionaTipoRecapitoModifica(i: number, tipo: TipoRecapito): void {
    const stato = this.statoTipoRecapitoMod(i);
    this.selectTipiRecapitiService.seleziona(stato, tipo);
    const form = this.formsModificaRecapito[i];
    if (form) {
      form.get('idTipoRecapito')!.setValue(tipo.id_tipo_recapito);
      form.get('idTipoRecapito')!.markAsTouched();
      this.aggiornaValidatoriRecapito(form, tipo.tipo);
      form.get('recapito')!.setValue('');
    }
  }

  private aggiornaValidatoriRecapito(form: FormGroup, tipo: string): void {
    const ctrl = form.get('recapito')!;
    ctrl.clearValidators();
    if (tipo === 'email') {
      ctrl.setValidators([Validators.required, Validators.email, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/), Validators.maxLength(40)]);
    } else {
      ctrl.setValidators([Validators.required, Validators.pattern(/^\d{6,20}$/)]);
    }
    ctrl.updateValueAndValidity();
  }

  prefissiFiltrati(stato: StatoPrefissoRecapito): any[] {
    return prefissiFiltratiCondivisi(this.selectNazioniService.nazioni, stato.filtro);
  }

  togglePrefissoRecapito(stato: StatoPrefissoRecapito, event: Event, classeInput: string): void {
    event.stopPropagation();
    stato.aperto = !stato.aperto;
    if (stato.aperto) {
      stato.indice = -1;
      stato.filtro = '';
      setTimeout(() => {
        const i = document.querySelector(classeInput) as HTMLInputElement;
        if (i) { i.focus(); i.select(); }
      }, 0);
    } else {
      stato.filtro = '';
      stato.indice = -1;
    }
  }

  onInputPrefissoRecapito(stato: StatoPrefissoRecapito, event: Event): void {
    stato.filtro = (event.target as HTMLInputElement).value;
    stato.indice = -1;
    if (!stato.aperto) stato.aperto = true;
  }

  navigaPrefissoRecapito(stato: StatoPrefissoRecapito, event: KeyboardEvent, form: FormGroup): void {
    if (!stato.aperto) return;
    const lista = this.prefissiFiltrati(stato);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      stato.indice = Math.min(stato.indice + 1, lista.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      stato.indice = Math.max(stato.indice - 1, -1);
    } else if (event.key === 'Enter' && stato.indice >= 0) {
      event.preventDefault();
      this.selezionaPrefissoRecapito(stato, lista[stato.indice].prefisso_tel, form);
    } else if (event.key === 'Escape') {
      stato.aperto = false;
      stato.filtro = '';
      stato.indice = -1;
    }
  }

  onBlurPrefissoRecapito(stato: StatoPrefissoRecapito, event: FocusEvent, form: FormGroup): void {
    const dest = event.relatedTarget as HTMLElement | null;
    if (dest?.closest('.select-dropdown-profilo')) return;
    const valore = trovaPrefissoDaInput(this.selectNazioniService.nazioni, (event.target as HTMLInputElement).value, stato.valore);
    if (valore) this.selezionaPrefissoRecapito(stato, valore, form);
  }

  selezionaPrefissoRecapito(stato: StatoPrefissoRecapito, valore: string, form: FormGroup): void {
    stato.valore = valore;
    stato.aperto = false;
    stato.filtro = '';
    stato.indice = -1;
    stato.modificatoManualmente = true;
    form.get('prefisso')!.setValue(valore);
  }

  trackByPrefisso(_index: number, n: any): string {
    return trackByPrefissoCondiviso(_index, n);
  }

  salvaNuovoRecapito(): void {
    if (this.formNuovoRecapito.invalid) {
      this.formNuovoRecapito.markAllAsTouched();
      return;
    }

    const tipo = this.statoTipoRecapitoNuovo.tipo;
    let recapito: string;
    if (tipo === 'email') {
      recapito = this.formNuovoRecapito.get('recapito')!.value;
    } else {
      const prefisso = this.formNuovoRecapito.get('prefisso')!.value;
      const numero = this.formNuovoRecapito.get('recapito')!.value;
      recapito = `${prefisso} ${numero}`;
    }

    const dati = { id_tipo_recapito: this.formNuovoRecapito.get('idTipoRecapito')!.value, recapito };

    this.salvataggioRecapitoInCorso = true;
    this.api.creaUtenteRecapito(this.idContatto, dati).pipe(take(1)).subscribe({
      next: () => {
        this.salvataggioRecapitoInCorso = false;
        this.toastService.successo('Recapito aggiunto.');
        this.formNuovoRecapitoAperto = false;
        this.formNuovoRecapito.reset({ idTipoRecapito: null, prefisso: this.leggiPrefissoConsigliato(), recapito: '' });
        this.statoTipoRecapitoNuovo = this.selectTipiRecapitiService.creaStato(null, '');
        this.caricaRecapiti();
      },
      error: () => {
        this.salvataggioRecapitoInCorso = false;
      },
    });
  }

  salvaModificaRecapito(i: number): void {
    const form = this.formsModificaRecapito[i];
    if (!form) return;
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }

    const stato = this.statoTipoRecapitoMod(i);
    const tipo = stato.tipo;
    const rec = this.recapitiMock[i];

    let recapito: string;
    if (tipo === 'email') {
      recapito = form.get('recapito')!.value;
    } else {
      const prefisso = form.get('prefisso')!.value;
      const numero = form.get('recapito')!.value;
      recapito = `${prefisso} ${numero}`;
    }

    const dati = { id_tipo_recapito: form.get('idTipoRecapito')!.value, recapito };

    this.salvataggioRecapitoInCorso = true;
    this.api.updateUtenteRecapito(this.idContatto, rec.id_recapito, dati).pipe(take(1)).subscribe({
      next: () => {
        this.salvataggioRecapitoInCorso = false;
        this.toastService.successo('Recapito aggiornato.');
        this.formsModificaRecapito[i] = null;
        this.recapitiMock[i].aperta = false;
        this.caricaRecapiti();
      },
      error: () => {
        this.salvataggioRecapitoInCorso = false;
      },
    });
  }

  apriModaleEliminazioneRecapito(rec: any): void {
    this.recapitoDaEliminare = rec;
  }

  chiudiModaleEliminazioneRecapito(): void {
    if (this.eliminazioneRecapitoInCorso) return;
    this.recapitoDaEliminare = null;
  }

  confermaEliminazioneRecapito(): void {
    if (!this.recapitoDaEliminare) return;
    this.eliminazioneRecapitoInCorso = true;
    this.api.eliminaUtenteRecapito(this.idContatto, this.recapitoDaEliminare.id_recapito).pipe(take(1)).subscribe({
      next: () => {
        this.eliminazioneRecapitoInCorso = false;
        this.recapitoDaEliminare = null;
        this.toastService.successo('Recapito eliminato.');
        this.caricaRecapiti();
      },
      error: () => {
        this.eliminazioneRecapitoInCorso = false;
      },
    });
  }

  mostraPrefisso(tipo: string): boolean {
    return tipo === 'telefono' || tipo === 'fax';
  }

  validaAnnoNascita() {
    return (control: any) => {
      const anno = parseInt(control.value, 10);
      if (isNaN(anno)) return null;
      const oggi = new Date().getFullYear();
      if (anno < oggi - 200) return { annoTroppoVecchio: true };
      if (anno > oggi - 5) return { annoTroppoGiovane: true };
      return null;
    };
  }

  validaDataNascitaProfilo(group: any) {
    const gg = group.get('dataGg')?.value;
    const mm = group.get('dataMm')?.value;
    const aaaa = group.get('dataAaaa')?.value;
    if (!gg || !mm || !aaaa) return null;
    const giorno = parseInt(gg, 10);
    const mese = parseInt(mm, 10);
    const anno = parseInt(aaaa, 10);
    const data = new Date(anno, mese - 1, giorno);
    const dataValida = data.getFullYear() === anno && data.getMonth() === mese - 1 && data.getDate() === giorno;
    return dataValida ? null : { dataNascitaNonValida: true };
  }
}
