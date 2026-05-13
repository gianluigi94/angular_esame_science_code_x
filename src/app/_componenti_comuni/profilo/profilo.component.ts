import { Component, AfterViewInit, OnInit, ChangeDetectorRef, NgZone, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { take } from 'rxjs';
import gsap from 'gsap';
import { CambioProfiloAnimazioneService } from 'src/app/_servizi_globali/cambio-profilo-animazione.service';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { TranslateService } from '@ngx-translate/core';
import { ToastService } from 'src/app/_servizi_globali/toast.service';
import { SaturnoService } from 'src/app/_servizi_globali/animazioni_saturno/three/saturno.service';
import { UtilityService } from 'src/app/_benvenuto/login/_login_service/login_utility.service';
import { Authservice } from 'src/app/_benvenuto/login/_login_service/auth.service';
import { Auth } from 'src/app/_type/auth.type';
import { calcolaRobustezzaPassword } from 'src/app/_benvenuto/registrazione/iscrizione_helpers/password.helper';
import { calcolaCodiceFiscaleAnagrafica } from 'src/app/_benvenuto/registrazione/iscrizione_helpers/anagrafica-codice-fiscale.helper';
import { SelectNazioniService, StatoSelectNazioni } from 'src/app/_servizi_globali/select-nazioni.service';
import { SelectIndirizzoItaliaService, StatoSelectComuneItalia, StatoSelectCapItalia } from 'src/app/_servizi_globali/select-indirizzo-italia.service';
import { SelectTipiIndirizziService,  StatoSelectTipoIndirizzo, TipoIndirizzo } from './select-tipi-indirizzi.service';
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
  selector: 'app-profilo',
  templateUrl: './profilo.component.html',
  styleUrls: ['./profilo.component.scss'],
})
export class ProfiloComponent implements AfterViewInit, OnInit {

  formEmail: FormGroup;
  formPassword: FormGroup;
  formInviato = false;
  vistaCorrente: 'scelta' | 'email' | 'password' | 'indirizzi' | 'contatti' | 'anagrafica' = 'scelta';
  animazioneInCorso = false;
  stoVerificando = false;
  mostraPassword = false;
  mostraVecchiaPassword = false;
  mostraNuovaPassword = false;
  mostraConfermaNuovaPassword = false;

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

formAnagrafica: FormGroup;
statoNazioneAnagrafica!: StatoSelectNazioni;
statoComuneAnagrafica!: StatoSelectComuneItalia;
sessoAnagAperto = false;
sessoAnagValore = '';
indiceSessoAnag = -1;
cfAnagValore = '';
cfAnagFlash = false;
cfAnagModificatoManualmente = false;
salvataggioAnagInCorso = false;

  passwordRobustezza: 0 | 1 | 2 | 3 = 0;
  passwordEntropyPerc = 0;
  private paroleComuni: string[] = [];

  get mostraIconaPreavvisoPassword(): boolean {
    return this.authService.leggiObsAuth().value?.preavvisoPsw === true;
  }

get pwdColore(): string {
    const p = this.passwordEntropyPerc;
    if (p < 50) return `rgb(255,${Math.round((p / 50) * 255)},0)`;
    return `rgb(${Math.round((1 - (p - 50) / 50) * 255)},180,0)`;
  }

  get pwdMancaMaiuscola(): boolean {
    return !/[A-Z]/.test(this.formPassword?.get('nuovaPassword')?.value ?? '');
  }

  get pwdMancaMinuscola(): boolean {
    return !/[a-z]/.test(this.formPassword?.get('nuovaPassword')?.value ?? '');
  }

  get pwdMancaNumero(): boolean {
    return !/\d/.test(this.formPassword?.get('nuovaPassword')?.value ?? '');
  }

  get pwdMancaSimbolo(): boolean {
    return !/[^A-Za-z0-9]/.test(this.formPassword?.get('nuovaPassword')?.value ?? '');
  }
  constructor(
    private cambioProfilo: CambioProfiloAnimazioneService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private api: ApiService,
    private translate: TranslateService,
    private toastService: ToastService,
    private saturnoService: SaturnoService,
    private authService: Authservice,
    public selectNazioniService: SelectNazioniService,
    public selectIndirizzoItaliaService: SelectIndirizzoItaliaService,
    public selectTipiIndirizziService: SelectTipiIndirizziService,
    public selectTipiRecapitiService: SelectTipiRecapitiService,
  ) {
    this.formEmail = this.fb.group({
      vecchiaEmail: ['', [Validators.required, Validators.email, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/), Validators.minLength(5), Validators.maxLength(40)]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(20)]],
      email: ['', [Validators.required, Validators.email, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/), Validators.minLength(5), Validators.maxLength(40)]],
    });

    this.formPassword = this.fb.group({
      email: ['', [Validators.required, Validators.email, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/), Validators.minLength(5), Validators.maxLength(40)]],
      vecchiaPassword: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(20)]],
      nuovaPassword: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(20), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)]],
      confermaNuovaPassword: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(20)]],
    }, { validators: this.confermaNuovaPasswordValidator });

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

    this.statoNazioneAnagrafica = this.selectNazioniService.creaStato('IT');
    this.statoComuneAnagrafica = this.selectIndirizzoItaliaService.creaStatoComune('');

    this.statoNazioneNuovo = this.selectNazioniService.creaStato('IT');
    this.statiNazioniModifica = [];

    this.statoComuneNuovo = this.selectIndirizzoItaliaService.creaStatoComune('');
    this.statiComuniModifica = [];

    this.statoCapNuovo = this.selectIndirizzoItaliaService.creaStatoCap('');
    this.statiCapModifica = [];

    this.statoTipoNuovo = this.selectTipiIndirizziService.creaStato(null, '');
    this.statiTipiModifica = [];

    this.statoTipoRecapitoNuovo = this.selectTipiRecapitiService.creaStato(null, '');
    this.statiTipiRecapitoModifica = [];
  }

  ngOnInit(): void {
    sessionStorage.setItem('vengo_da_profilo', 'true');
    this.cambioProfilo.spinnerVisibile$.next(false);
    this.selectNazioniService.caricaNazioni();
    this.selectIndirizzoItaliaService.caricaComuni();
    this.selectTipiIndirizziService.caricaTipiIndirizzi();
    this.selectTipiRecapitiService.caricaTipiRecapiti();
    this.caricaIndirizzi();
    this.caricaRecapiti();
    setTimeout(() => this.avviaAnimazioniIngresso(), 0);

    fetch('assets/common_words.json')
      .then((r) => r.json())
      .then((data: { commonWords: string[] }) => {
        this.paroleComuni = data.commonWords.map((w) => w.toLowerCase());
      })
      .catch(() => {
        this.paroleComuni = [];
      });
  }

  private caricaIndirizzi(): void {
    const lingua = this.translate.currentLang || 'it';
    this.api.getMieiIndirizzi(lingua).pipe(take(1)).subscribe({
      next: (rit) => {
        const dati = rit.data ?? [];
        this.indirizziMock = dati.map((ind: any) => ({ ...ind, aperta: false }));

        this.statiNazioniModifica = this.indirizziMock.map((ind) =>
          this.selectNazioniService.creaStato(ind.iso ?? 'IT'),
        );
        this.statiComuniModifica = this.indirizziMock.map((ind) =>
          this.selectIndirizzoItaliaService.creaStatoComune(ind.iso === 'IT' ? ind.citta : ''),
        );
        this.statiCapModifica = this.indirizziMock.map((ind) =>
          this.selectIndirizzoItaliaService.creaStatoCap(ind.iso === 'IT' ? ind.cap : ''),
        );
        this.statiTipiModifica = this.indirizziMock.map((ind) =>
          this.selectTipiIndirizziService.creaStato(ind.id_tipo_indirizzo ?? null, ind.tipo ?? ''),
        );

        this.cdr.detectChanges();
      },
      error: () => {
        this.indirizziMock = [];
      },
    });
  }

  ngAfterViewInit(): void {}

  @HostListener('document:click')
  onClickDocumentoProfilo(): void {
    this.chiudiSelectNazioni();
  }

  onNuovaPasswordInput(pwd: string): void {
    const rit = calcolaRobustezzaPassword(pwd, this.paroleComuni);
    this.passwordRobustezza = rit.robustezza;
    this.passwordEntropyPerc = rit.entropyPerc;
  }
  avviaAnimazioniIngresso(): void {
    const titolo = document.querySelector('.profilo-titolo') as HTMLElement | null;
    const box = document.querySelector('.profilo-box') as HTMLElement | null;
    const titoloSezione = document.querySelector('.titolo-sezione') as HTMLElement | null;
    const contenutoAttivo = document.querySelector('.campo-animato') as HTMLElement | null;
    const sfocatura = document.querySelector('.sfocatura') as HTMLElement | null;
    const bottoneIndietro = document.querySelector('.profilo-indietro-btn') as HTMLElement | null;

    if (titolo) gsap.set(titolo, { opacity: 0 });
    if (box) gsap.set(box, { opacity: 0, scaleX: 0, transformOrigin: 'center center' });
    if (titoloSezione) gsap.set(titoloSezione, { opacity: 0 });
    if (sfocatura) gsap.set(sfocatura, { opacity: 0 });
    if (bottoneIndietro) gsap.set(bottoneIndietro, { opacity: 0 });
    if (contenutoAttivo) gsap.set(contenutoAttivo, { opacity: 0, scaleX: 0, transformOrigin: 'center center' });

    if (sfocatura) gsap.to(sfocatura, { opacity: 1, duration: 0.7, ease: 'power2.out' });
    if (titolo) gsap.to(titolo, { opacity: 1, duration: 0.6, ease: 'power2.out' });
    if (box) gsap.to(box, { opacity: 1, scaleX: 1, duration: 0.6, ease: 'power2.out' });
    if (titoloSezione) gsap.to(titoloSezione, { opacity: 1, duration: 0.6, ease: 'power2.out' });
    if (contenutoAttivo) {
      gsap.to(contenutoAttivo, { opacity: 1, scaleX: 1, duration: 0.6, delay: 0.12, ease: 'power2.out' });
    }
    if (bottoneIndietro) gsap.to(bottoneIndietro, { opacity: 1, duration: 0.6, ease: 'power2.out' });
  }

  vaiAEmail(): void {
    if (this.animazioneInCorso) return;

    this.animazioneInCorso = true;

    const contenutoScelta = document.querySelector('.scelta-contenuto') as HTMLElement | null;
    const bottoneIndietro = document.querySelector('.profilo-indietro-btn') as HTMLElement | null;

    if (contenutoScelta) {
      gsap.killTweensOf(contenutoScelta);
    }
    if (bottoneIndietro) {
      gsap.killTweensOf(bottoneIndietro);
    }

    const timeline = gsap.timeline({
      onComplete: () => {
        this.ngZone.run(() => {
          this.vistaCorrente = 'email';
          this.formInviato = false;
          this.cdr.detectChanges();

          setTimeout(() => {
            const formEmail = document.querySelector('.form-profilo') as HTMLElement | null;
            const nuovoBottoneIndietro = document.querySelector('.profilo-indietro-btn') as HTMLElement | null;

            if (formEmail) {
              gsap.set(formEmail, { opacity: 0, scaleX: 0, transformOrigin: 'center center' });
              gsap.to(formEmail, {
                opacity: 1,
                scaleX: 1,
                duration: 0.45,
                ease: 'power2.out',
              });
            }

            if (nuovoBottoneIndietro) {
              gsap.set(nuovoBottoneIndietro, { opacity: 0 });
              gsap.to(nuovoBottoneIndietro, {
                opacity: 1,
                duration: 0.35,
                delay: 0.08,
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

    if (contenutoScelta) {
      timeline.to(contenutoScelta, {
        opacity: 0,
        scaleX: 0,
        duration: 0.35,
        ease: 'power2.in',
        transformOrigin: 'center center',
      }, 0);
    }

    if (bottoneIndietro) {
      timeline.to(bottoneIndietro, {
        opacity: 0,
        duration: 0.2,
        ease: 'power2.in',
      }, 0);
    }
  }

  vaiAPassword(): void {
    if (this.animazioneInCorso) return;

    this.animazioneInCorso = true;

    const contenutoScelta = document.querySelector('.scelta-contenuto') as HTMLElement | null;
    const bottoneIndietro = document.querySelector('.profilo-indietro-btn') as HTMLElement | null;

    if (contenutoScelta) {
      gsap.killTweensOf(contenutoScelta);
    }
    if (bottoneIndietro) {
      gsap.killTweensOf(bottoneIndietro);
    }

    const timeline = gsap.timeline({
      onComplete: () => {
        this.ngZone.run(() => {
          this.vistaCorrente = 'password';
          this.cdr.detectChanges();

          setTimeout(() => {
            const formPassword = document.querySelector('.form-profilo') as HTMLElement | null;
            const nuovoBottoneIndietro = document.querySelector('.profilo-indietro-btn') as HTMLElement | null;

            if (formPassword) {
              gsap.set(formPassword, { opacity: 0, scaleX: 0, transformOrigin: 'center center' });
              gsap.to(formPassword, {
                opacity: 1,
                scaleX: 1,
                duration: 0.45,
                ease: 'power2.out',
              });
            }

            if (nuovoBottoneIndietro) {
              gsap.set(nuovoBottoneIndietro, { opacity: 0 });
              gsap.to(nuovoBottoneIndietro, {
                opacity: 1,
                duration: 0.35,
                delay: 0.08,
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

    if (contenutoScelta) {
      timeline.to(contenutoScelta, {
        opacity: 0,
        scaleX: 0,
        duration: 0.35,
        ease: 'power2.in',
        transformOrigin: 'center center',
      }, 0);
    }

    if (bottoneIndietro) {
      timeline.to(bottoneIndietro, {
        opacity: 0,
        duration: 0.2,
        ease: 'power2.in',
      }, 0);
    }
  }

  vaiAIndirizzi(): void {
    if (this.animazioneInCorso) return;

    this.animazioneInCorso = true;

    const contenutoScelta = document.querySelector('.scelta-contenuto') as HTMLElement | null;
    const bottoneIndietro = document.querySelector('.profilo-indietro-btn') as HTMLElement | null;

    if (contenutoScelta) {
      gsap.killTweensOf(contenutoScelta);
    }
    if (bottoneIndietro) {
      gsap.killTweensOf(bottoneIndietro);
    }

    const timeline = gsap.timeline({
      onComplete: () => {
        this.ngZone.run(() => {
          this.vistaCorrente = 'indirizzi';
          this.cdr.detectChanges();

          setTimeout(() => {
            const contenutoIndirizzi = document.querySelector('.indirizzi-contenuto') as HTMLElement | null;
            const nuovoBottoneIndietro = document.querySelector('.profilo-indietro-btn') as HTMLElement | null;

            if (contenutoIndirizzi) {
              gsap.set(contenutoIndirizzi, { opacity: 0, scaleX: 0, transformOrigin: 'center center' });
              gsap.to(contenutoIndirizzi, {
                opacity: 1,
                scaleX: 1,
                duration: 0.45,
                ease: 'power2.out',
              });
            }

            if (nuovoBottoneIndietro) {
              gsap.set(nuovoBottoneIndietro, { opacity: 0 });
              gsap.to(nuovoBottoneIndietro, {
                opacity: 1,
                duration: 0.35,
                delay: 0.08,
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

    if (contenutoScelta) {
      timeline.to(contenutoScelta, {
        opacity: 0,
        scaleX: 0,
        duration: 0.35,
        ease: 'power2.in',
        transformOrigin: 'center center',
      }, 0);
    }

    if (bottoneIndietro) {
      timeline.to(bottoneIndietro, {
        opacity: 0,
        duration: 0.2,
        ease: 'power2.in',
      }, 0);
    }
  }

  apriFormModifica(i: number): void {
    this.indirizziMock.forEach((ind, idx) => {
      if (idx !== i) ind.aperta = false;
    });
    this.formNuovoAperto = false;
    this.indirizziMock[i].aperta = !this.indirizziMock[i].aperta;

    if (this.indirizziMock[i].aperta) {
      this.formsModifica[i] = this.creaFormModifica(this.indirizziMock[i]);
    } else {
      this.formsModifica[i] = null;
    }
  }

  private creaFormModifica(ind: any): FormGroup {
    const isIT = ind.iso === 'IT';

    const form = this.fb.group({
      idTipoIndirizzo: [ind.id_tipo_indirizzo ?? null, Validators.required],
      nazione: [ind.iso ?? 'IT', Validators.required],
      comune: [isIT ? (ind.citta ?? '') : '', isIT ? Validators.required : []],
      citta: [
        !isIT ? (ind.citta ?? '') : '',
        !isIT ? [Validators.required, Validators.minLength(2), Validators.maxLength(80)] : [],
      ],
      provincia: [
        ind.provincia ?? '',
        isIT ? [Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)] : [],
      ],
      cap: [
        ind.cap ?? '',
        isIT ? [Validators.required, Validators.pattern(/^\d{5}$/)] : [],
      ],
      via: [ind.via ?? '', [Validators.required, Validators.minLength(3), Validators.maxLength(100), Validators.pattern(/^[A-Za-zÀ-ÿ0-9\s'.,°\/\-]+$/)]],
      civico: [ind.civico ?? '', [Validators.required, Validators.maxLength(10), Validators.pattern(/^\d+[A-Za-z0-9\/\-]*$/)]],
      dettagli: [ind.dettagli ?? '', [Validators.minLength(3), Validators.maxLength(200)]],
    });

    return form;
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
    this.statiTipiModifica[i] = this.selectTipiIndirizziService.creaStato(
      this.indirizziMock[i]?.id_tipo_indirizzo ?? null,
      this.indirizziMock[i]?.tipo ?? '',
    );
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
      if (this.statoCapNuovo.valore) {
        this.formNuovoIndirizzo.get('cap')!.markAsTouched();
      }
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
        if (statoCap.valore) {
          form.get('cap')!.markAsTouched();
        }
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
      this.saturnoService.flashErrorLight();
      return;
    }

    const ind = this.indirizziMock[i];
    const isIT = form.get('nazione')!.value === 'IT';

    if (isIT) {
      const ok = this.selectIndirizzoItaliaService.verificaCoerenza(
        form.get('comune')!.value,
        form.get('provincia')!.value,
        form.get('cap')!.value,
      );
      if (!ok) {
        this.erroriCoerenzaModifica[i] = true;
        this.saturnoService.flashErrorLight();
        return;
      }
    }
    this.erroriCoerenzaModifica[i] = false;

    const idNazione = this.selectNazioniService.idDaIso(form.get('nazione')!.value);
    if (idNazione === null) {
      this.saturnoService.flashErrorLight();
      return;
    }
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
    this.api.updateIndirizzo(ind.id_indirizzo, dati).pipe(take(1)).subscribe({
      next: () => {
        this.salvataggioInCorso = false;
        this.toastService.successo(this.translate.instant('ui.profilo.indirizzi.salvataggio.successo'));
        this.formsModifica[i] = null;
        this.indirizziMock[i].aperta = false;
        this.caricaIndirizzi();
      },
      error: (err: any) => {
        this.salvataggioInCorso = false;
        if (err?.status === 429) {
          this.toastService.allarm(this.translate.instant('ui.toast.limite.cambio_domicilio'));
        }
        this.saturnoService.flashErrorLight();
      },
    });
  }

  salvaNuovoIndirizzo(): void {
    if (this.formNuovoIndirizzo.invalid) {
      this.formNuovoIndirizzo.markAllAsTouched();
      this.saturnoService.flashErrorLight();
      return;
    }

    const isIT = this.formNuovoIndirizzo.get('nazione')!.value === 'IT';

    if (isIT) {
      const ok = this.selectIndirizzoItaliaService.verificaCoerenza(
        this.formNuovoIndirizzo.get('comune')!.value,
        this.formNuovoIndirizzo.get('provincia')!.value,
        this.formNuovoIndirizzo.get('cap')!.value,
      );
      if (!ok) {
        this.erroreCoerenzaNuovo = true;
        this.saturnoService.flashErrorLight();
        return;
      }
    }
    this.erroreCoerenzaNuovo = false;

    const idNazione = this.selectNazioniService.idDaIso(this.formNuovoIndirizzo.get('nazione')!.value);
    if (idNazione === null) {
      this.saturnoService.flashErrorLight();
      return;
    }
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
    this.api.creaIndirizzo(dati).pipe(take(1)).subscribe({
      next: () => {
        this.salvataggioInCorso = false;
        this.toastService.successo(this.translate.instant('ui.profilo.indirizzi.creazione.successo'));
        this.formNuovoAperto = false;
        this.formNuovoIndirizzo.reset({ nazione: 'IT' });
        this.statoNazioneNuovo = this.selectNazioniService.creaStato('IT');
        this.statoComuneNuovo = this.selectIndirizzoItaliaService.creaStatoComune('');
        this.statoCapNuovo = this.selectIndirizzoItaliaService.creaStatoCap('');
        this.statoTipoNuovo = this.selectTipiIndirizziService.creaStato(null, '');
        this.caricaIndirizzi();
      },
      error: (err: any) => {
        this.salvataggioInCorso = false;
        if (err?.status === 429) {
          this.toastService.allarm(this.translate.instant('ui.toast.limite.cambio_domicilio'));
        }
        this.saturnoService.flashErrorLight();
      },
    });
  }

chiudiSelectNazioni(): void {
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

  this.sessoAnagAperto = false;
  this.indiceSessoAnag = -1;
  this.selectNazioniService.chiudi(this.statoNazioneAnagrafica);
  this.selectIndirizzoItaliaService.chiudiComune(this.statoComuneAnagrafica);
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
    this.api.eliminaIndirizzo(this.indirizzoDaEliminare.id_indirizzo).pipe(take(1)).subscribe({
      next: () => {
        this.eliminazioneInCorso = false;
        this.indirizzoDaEliminare = null;
        this.toastService.successo(this.translate.instant('ui.profilo.indirizzi.eliminazione.successo'));
        this.caricaIndirizzi();
      },
      error: () => {
        this.eliminazioneInCorso = false;
        this.saturnoService.flashErrorLight();
      },
    });
  }

  tornaAScelta(): void {
    if (this.animazioneInCorso) return;

    this.animazioneInCorso = true;

    const contenutoUscita = document.querySelector('.form-profilo, .indirizzi-contenuto, .contatti-contenuto, .anagrafica-contenuto') as HTMLElement | null;
    const bottoneIndietro = document.querySelector('.profilo-indietro-btn') as HTMLElement | null;

    if (contenutoUscita) {
      gsap.killTweensOf(contenutoUscita);
    }
    if (bottoneIndietro) {
      gsap.killTweensOf(bottoneIndietro);
    }

    const timeline = gsap.timeline({
      onComplete: () => {
        this.ngZone.run(() => {
          this.vistaCorrente = 'scelta';
          this.cdr.detectChanges();

          setTimeout(() => {
            const contenutoScelta = document.querySelector('.scelta-contenuto') as HTMLElement | null;
            const nuovoBottoneIndietro = document.querySelector('.profilo-indietro-btn') as HTMLElement | null;

            if (contenutoScelta) {
              gsap.set(contenutoScelta, { opacity: 0, scaleX: 0, transformOrigin: 'center center' });
              gsap.to(contenutoScelta, {
                opacity: 1,
                scaleX: 1,
                duration: 0.45,
                ease: 'power2.out',
              });
            }

            if (nuovoBottoneIndietro) {
              gsap.set(nuovoBottoneIndietro, { opacity: 0 });
              gsap.to(nuovoBottoneIndietro, {
                opacity: 1,
                duration: 0.35,
                delay: 0.08,
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

    if (contenutoUscita) {
      timeline.to(contenutoUscita, {
        opacity: 0,
        scaleX: 0,
        duration: 0.35,
        ease: 'power2.in',
        transformOrigin: 'center center',
      }, 0);
    }

    if (bottoneIndietro) {
      timeline.to(bottoneIndietro, {
        opacity: 0,
        duration: 0.2,
        ease: 'power2.in',
      }, 0);
    }
  }
private caricaRecapiti(): void {
    this.api.getMieiRecapiti().pipe(take(1)).subscribe({
      next: (rit) => {
        const dati = rit.data ?? [];
        this.recapitiMock = dati.map((rec: any) => ({ ...rec, aperta: false }));
        this.formsModificaRecapito = this.recapitiMock.map(() => null);
        this.statiTipiRecapitoModifica = this.recapitiMock.map((rec) =>
          this.selectTipiRecapitiService.creaStato(rec.id_tipo_recapito ?? null, rec.tipo ?? ''),
        );
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

  vaiAContatti(): void {
    if (this.animazioneInCorso) return;
    this.animazioneInCorso = true;

    const contenutoScelta = document.querySelector('.scelta-contenuto') as HTMLElement | null;
    const bottoneIndietro = document.querySelector('.profilo-indietro-btn') as HTMLElement | null;

    if (contenutoScelta) gsap.killTweensOf(contenutoScelta);
    if (bottoneIndietro) gsap.killTweensOf(bottoneIndietro);

    const timeline = gsap.timeline({
      onComplete: () => {
        this.ngZone.run(() => {
          this.vistaCorrente = 'contatti';
          this.cdr.detectChanges();

          setTimeout(() => {
            const contenutoContatti = document.querySelector('.contatti-contenuto') as HTMLElement | null;
            const nuovoBottoneIndietro = document.querySelector('.profilo-indietro-btn') as HTMLElement | null;

            if (contenutoContatti) {
              gsap.set(contenutoContatti, { opacity: 0, scaleX: 0, transformOrigin: 'center center' });
              gsap.to(contenutoContatti, { opacity: 1, scaleX: 1, duration: 0.45, ease: 'power2.out' });
            }

            if (nuovoBottoneIndietro) {
              gsap.set(nuovoBottoneIndietro, { opacity: 0 });
              gsap.to(nuovoBottoneIndietro, {
                opacity: 1, duration: 0.35, delay: 0.08, ease: 'power2.out',
                onComplete: () => { this.animazioneInCorso = false; },
              });
            } else {
              this.animazioneInCorso = false;
            }
          }, 0);
        });
      },
    });

    if (contenutoScelta) {
      timeline.to(contenutoScelta, { opacity: 0, scaleX: 0, duration: 0.35, ease: 'power2.in', transformOrigin: 'center center' }, 0);
    }
    if (bottoneIndietro) {
      timeline.to(bottoneIndietro, { opacity: 0, duration: 0.2, ease: 'power2.in' }, 0);
    }
  }

  apriFormModificaRecapito(i: number): void {
    this.recapitiMock.forEach((rec, idx) => {
      if (idx !== i) rec.aperta = false;
    });
    this.formNuovoRecapitoAperto = false;
    this.recapitiMock[i].aperta = !this.recapitiMock[i].aperta;

    if (this.recapitiMock[i].aperta) {
      this.formsModificaRecapito[i] = this.creaFormModificaRecapito(this.recapitiMock[i]);
    } else {
      this.formsModificaRecapito[i] = null;
    }
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
      this.statiTipiRecapitoModifica[i] = this.selectTipiRecapitiService.creaStato(
        this.recapitiMock[i]?.id_tipo_recapito ?? null,
        this.recapitiMock[i]?.tipo ?? '',
      );
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

    const valore = trovaPrefissoDaInput(
      this.selectNazioniService.nazioni,
      (event.target as HTMLInputElement).value,
      stato.valore,
    );

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
      this.saturnoService.flashErrorLight();
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

    const dati = {
      id_tipo_recapito: this.formNuovoRecapito.get('idTipoRecapito')!.value,
      recapito,
    };

    this.salvataggioRecapitoInCorso = true;
    this.api.creaRecapito(dati).pipe(take(1)).subscribe({
      next: () => {
        this.salvataggioRecapitoInCorso = false;
        this.toastService.successo(this.translate.instant('ui.profilo.contatti.creazione.successo'));
        this.formNuovoRecapitoAperto = false;
        this.formNuovoRecapito.reset({ idTipoRecapito: null, prefisso: this.leggiPrefissoConsigliato(), recapito: '' });
        this.statoTipoRecapitoNuovo = this.selectTipiRecapitiService.creaStato(null, '');
        this.caricaRecapiti();
      },
      error: () => {
        this.salvataggioRecapitoInCorso = false;
        this.saturnoService.flashErrorLight();
      },
    });
  }

  salvaModificaRecapito(i: number): void {
    const form = this.formsModificaRecapito[i];
    if (!form) return;

    if (form.invalid) {
      form.markAllAsTouched();
      this.saturnoService.flashErrorLight();
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

    const dati = {
      id_tipo_recapito: form.get('idTipoRecapito')!.value,
      recapito,
    };

    this.salvataggioRecapitoInCorso = true;
    this.api.updateRecapito(rec.id_recapito, dati).pipe(take(1)).subscribe({
      next: () => {
        this.salvataggioRecapitoInCorso = false;
        this.toastService.successo(this.translate.instant('ui.profilo.contatti.salvataggio.successo'));
        this.formsModificaRecapito[i] = null;
        this.recapitiMock[i].aperta = false;
        this.caricaRecapiti();
      },
      error: () => {
        this.salvataggioRecapitoInCorso = false;
        this.saturnoService.flashErrorLight();
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
    this.api.eliminaRecapito(this.recapitoDaEliminare.id_recapito).pipe(take(1)).subscribe({
      next: () => {
        this.eliminazioneRecapitoInCorso = false;
        this.recapitoDaEliminare = null;
        this.toastService.successo(this.translate.instant('ui.profilo.contatti.eliminazione.successo'));
        this.caricaRecapiti();
      },
      error: () => {
        this.eliminazioneRecapitoInCorso = false;
        this.saturnoService.flashErrorLight();
      },
    });
  }

  mostraPrefisso(tipo: string): boolean {
    return tipo === 'telefono' || tipo === 'fax';
  }

  get isItaliaNascitaAnag(): boolean {
    return this.statoNazioneAnagrafica.valore === 'IT';
}

sessoAnagLabel(): string {
    const map: Record<string, string> = {
      M: this.translate.instant('ui.registrazione.sesso.maschio'),
      F: this.translate.instant('ui.registrazione.sesso.femmina'),
      NS: this.translate.instant('ui.registrazione.sesso.non_specificato'),
    };
    return this.sessoAnagValore ? (map[this.sessoAnagValore] ?? '') : this.translate.instant('ui.registrazione.sesso.placeholder');
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
    this.calcolaCFAnag();
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
      this.cfAnagValore = '';
      this.cfAnagFlash = false;
      this.cfAnagModificatoManualmente = false;
      this.formAnagrafica.get('codiceFiscale')!.setValue('');

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
    this.calcolaCFAnag();
}

selezionaComuneAnagrafica(valore: string): void {
    this.selectIndirizzoItaliaService.selezionaComune(this.statoComuneAnagrafica, this.selectIndirizzoItaliaService.creaStatoCap(''), valore);
    this.statoComuneAnagrafica.valore = valore;
    this.formAnagrafica.get('comune')!.setValue(valore);
    this.formAnagrafica.get('comune')!.markAsTouched();
    this.calcolaCFAnag();
}

soloNumeriAnag(event: KeyboardEvent, campo: 'gg' | 'mm' | 'aaaa'): void {
    if (event.key === 'Tab' || event.key === 'Backspace' || event.key === 'Delete' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') return;
    if (!/^\d$/.test(event.key)) event.preventDefault();
}

avanzaDataAnag(event: Event, campo: 'gg' | 'mm'): void {
    const input = event.target as HTMLInputElement;
    if (input.value.length >= 2) {
      const prossimo = campo === 'gg'
        ? document.getElementById('anag_data_mm')
        : document.getElementById('anag_data_aaaa');
      prossimo?.focus();
    }
}

dataAnagCompilata(): boolean {
    return !!(this.formAnagrafica.get('dataGg')!.value || this.formAnagrafica.get('dataMm')!.value || this.formAnagrafica.get('dataAaaa')!.value);
}

focusDataAnag(event: Event): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT') return;
    const gg = document.getElementById('anag_data_gg') as HTMLInputElement;
    const mm = document.getElementById('anag_data_mm') as HTMLInputElement;
    const aaaa = document.getElementById('anag_data_aaaa') as HTMLInputElement;
    if (!gg?.value) { gg?.focus(); return; }
    if (!mm?.value) { mm?.focus(); return; }
    if (!aaaa?.value || aaaa.value.length < 4) { aaaa?.focus(); return; }
    gg?.focus();
}

onBlurAnagCF(): void {
    this.calcolaCFAnag();
}

calcolaCFAnag(): void {
    const cf = calcolaCodiceFiscaleAnagrafica(
      this.formAnagrafica.get('nome')!.value?.trim() ?? '',
      this.formAnagrafica.get('cognome')!.value?.trim() ?? '',
      this.formAnagrafica.get('dataGg')!.value ?? '',
      this.formAnagrafica.get('dataMm')!.value ?? '',
      this.formAnagrafica.get('dataAaaa')!.value ?? '',
      this.sessoAnagValore,
      this.statoNazioneAnagrafica.valore,
      this.formAnagrafica.get('comune')!.value ?? '',
      this.selectIndirizzoItaliaService.comuni,
      this.selectNazioniService.nazioni,
    );

    if (!cf) return;
    if (cf === this.cfAnagValore || this.cfAnagModificatoManualmente) return;

    this.cfAnagValore = cf;
    this.formAnagrafica.get('codiceFiscale')!.setValue(cf);
    this.formAnagrafica.get('codiceFiscale')!.markAsTouched();
    this.cfAnagFlash = false;
    setTimeout(() => { this.cfAnagFlash = true; }, 10);
    setTimeout(() => { this.cfAnagFlash = false; }, 1510);
}

svuotaCFAnag(): void {
    this.cfAnagValore = '';
    this.cfAnagFlash = false;
    this.cfAnagModificatoManualmente = false;
    this.formAnagrafica.get('codiceFiscale')!.setValue('');
    this.formAnagrafica.get('codiceFiscale')!.markAsTouched();
}

vaiAAnagrafica(): void {
    if (this.animazioneInCorso) return;
    this.animazioneInCorso = true;

    const contenutoScelta = document.querySelector('.scelta-contenuto') as HTMLElement | null;
    const bottoneIndietro = document.querySelector('.profilo-indietro-btn') as HTMLElement | null;

    if (contenutoScelta) gsap.killTweensOf(contenutoScelta);
    if (bottoneIndietro) gsap.killTweensOf(bottoneIndietro);

    const timeline = gsap.timeline({
      onComplete: () => {
        this.ngZone.run(() => {
          this.vistaCorrente = 'anagrafica';
          this.caricaDatiAnagrafici();
          this.cdr.detectChanges();

          setTimeout(() => {
            const contenuto = document.querySelector('.anagrafica-contenuto') as HTMLElement | null;
            const nuovoBottoneIndietro = document.querySelector('.profilo-indietro-btn') as HTMLElement | null;

            if (contenuto) {
              gsap.set(contenuto, { opacity: 0, scaleX: 0, transformOrigin: 'center center' });
              gsap.to(contenuto, { opacity: 1, scaleX: 1, duration: 0.45, ease: 'power2.out' });
            }

            if (nuovoBottoneIndietro) {
              gsap.set(nuovoBottoneIndietro, { opacity: 0 });
              gsap.to(nuovoBottoneIndietro, {
                opacity: 1, duration: 0.35, delay: 0.08, ease: 'power2.out',
                onComplete: () => { this.animazioneInCorso = false; },
              });
            } else {
              this.animazioneInCorso = false;
            }
          }, 0);
        });
      },
    });

    if (contenutoScelta) {
      timeline.to(contenutoScelta, { opacity: 0, scaleX: 0, duration: 0.35, ease: 'power2.in', transformOrigin: 'center center' }, 0);
    }
    if (bottoneIndietro) {
      timeline.to(bottoneIndietro, { opacity: 0, duration: 0.2, ease: 'power2.in' }, 0);
    }
}

caricaDatiAnagrafici(): void {
    this.api.getMieiDatiAnagrafici().pipe(take(1)).subscribe({
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
        this.cfAnagModificatoManualmente = !!d.codice_fiscale;
        this.formAnagrafica.get('codiceFiscale')!.setValue(d.codice_fiscale ?? '');

        this.cdr.detectChanges();
      },
    });
}

salvaAnagrafica(): void {
    if (this.formAnagrafica.invalid) {
      this.formAnagrafica.markAllAsTouched();
      this.saturnoService.flashErrorLight();
      return;
    }

    const f = this.formAnagrafica.value;
    const isIT = this.statoNazioneAnagrafica.valore === 'IT';

    this.salvataggioAnagInCorso = true;
    this.api.aggiornaDatiAnagrafici({
      nome:             f.nome,
      cognome:          f.cognome,
      sesso:            f.sesso,
      data_nascita:     `${f.dataGg}/${f.dataMm}/${f.dataAaaa}`,
      codice_fiscale:   f.codiceFiscale,
      iso_nascita:      this.statoNazioneAnagrafica.valore,
      comune_nascita:   isIT ? f.comune : null,
      citta_nascita:    !isIT ? f.citta : null,
    }).pipe(take(1)).subscribe({
      next: () => {
        this.salvataggioAnagInCorso = false;
        this.toastService.successo(this.translate.instant('ui.profilo.anagrafica.salvataggio.successo'));
      },
      error: () => {
        this.salvataggioAnagInCorso = false;
        this.saturnoService.flashErrorLight();
      },
    });
}
  onClickIndietro(): void {
    if (this.animazioneInCorso) return;

    if (this.vistaCorrente === 'email' || this.vistaCorrente === 'password' || this.vistaCorrente === 'indirizzi' || this.vistaCorrente === 'contatti' || this.vistaCorrente === 'anagrafica') {
      this.tornaAScelta();
      return;
    }

    this.tornaIndietro();
  }

  inviaEmail(): void {
    this.formInviato = true;
    if (this.formEmail.invalid) {
      this.formEmail.markAllAsTouched();
      return;
    }

    const vecchiaEmail = this.formEmail.controls['vecchiaEmail'].value;
    const password = this.formEmail.controls['password'].value;

    const nuovaEmail = this.formEmail.controls['email'].value;

    this.stoVerificando = true;
    this.api.verificaCredenziali(vecchiaEmail, password).pipe(take(1)).subscribe({
      next: (rit) => {
        if (rit.data !== null && rit.message !== null) {
          const nuovaEmailNorm = nuovaEmail.trim().toLowerCase();
          const userHash = UtilityService.hash(nuovaEmailNorm);
          const lingua = this.translate.currentLang || 'it';
          this.api.cambioEmail(userHash, nuovaEmailNorm, lingua).pipe(take(1)).subscribe({
            next: () => {
              this.stoVerificando = false;
              this.toastService.chiudi('login_errore');
              this.toastService.successo(this.translate.instant('ui.profilo.cambio_email.successo'));
              this.tornaAScelta();
            },
            error: () => {
              this.stoVerificando = false;
              this.saturnoService.flashErrorLight();
            },
          });
        } else {
          this.stoVerificando = false;
          this.saturnoService.flashErrorLight();
        }
      },
      error: (err) => {
        this.stoVerificando = false;
        const chiave = UtilityService.chiaveToastErroreDaBackend(err);
        const messaggio = this.translate.instant(chiave);
        if (chiave === 'ui.toast.error.login.max_acces' || chiave === 'ui.toast.error.login.in_attesa') {
          this.toastService.mostra(messaggio, 'allarm', false, undefined, 'login_errore');
        } else {
          this.toastService.mostra(messaggio, 'error', false, undefined, 'login_errore');
        }
        this.saturnoService.flashErrorLight();
      },
    });
  }

  tornaIndietro(): void {
    window.history.back();
  }

  toggleVisibilitaPassword(): void {
    const input = document.getElementById('profilo_password') as HTMLInputElement;
    const start = input?.selectionStart ?? null;
    const end = input?.selectionEnd ?? null;
    this.mostraPassword = !this.mostraPassword;
    setTimeout(() => {
      input?.focus();
      if (start !== null && end !== null) input?.setSelectionRange(start, end);
    }, 0);
  }

  toggleVisibilitaVecchiaPassword(): void {
    const input = document.getElementById('profilo_vecchia_password') as HTMLInputElement;
    const start = input?.selectionStart ?? null;
    const end = input?.selectionEnd ?? null;
    this.mostraVecchiaPassword = !this.mostraVecchiaPassword;
    setTimeout(() => {
      input?.focus();
      if (start !== null && end !== null) input?.setSelectionRange(start, end);
    }, 0);
  }

  toggleVisibilitaNuovaPassword(): void {
    const input = document.getElementById('profilo_nuova_password') as HTMLInputElement;
    const start = input?.selectionStart ?? null;
    const end = input?.selectionEnd ?? null;
    this.mostraNuovaPassword = !this.mostraNuovaPassword;
    setTimeout(() => {
      input?.focus();
      if (start !== null && end !== null) input?.setSelectionRange(start, end);
    }, 0);
  }

  toggleVisibilitaConfermaNuovaPassword(): void {
    const input = document.getElementById('profilo_conferma_nuova_password') as HTMLInputElement;
    const start = input?.selectionStart ?? null;
    const end = input?.selectionEnd ?? null;
    this.mostraConfermaNuovaPassword = !this.mostraConfermaNuovaPassword;
    setTimeout(() => {
      input?.focus();
      if (start !== null && end !== null) input?.setSelectionRange(start, end);
    }, 0);
  }
  private confermaNuovaPasswordValidator(group: any) {
    const nuova = group.get('nuovaPassword')?.value;
    const conferma = group.get('confermaNuovaPassword')?.value;
    if (!nuova || !conferma) return null;
    return nuova === conferma ? null : { mismatchNuova: true };
  }
  inviaPassword(): void {
    this.formInviato = true;
    if (this.formPassword.invalid) {
      this.formPassword.markAllAsTouched();
      return;
    }

    const email = this.formPassword.controls['email'].value;
    const vecchiaPassword = this.formPassword.controls['vecchiaPassword'].value;
    const nuovaPassword = this.formPassword.controls['nuovaPassword'].value;

    this.stoVerificando = true;
    this.api.verificaCredenziali(email, vecchiaPassword).pipe(take(1)).subscribe({
      next: (rit) => {
        if (rit.data !== null && rit.message !== null) {
          const nuovaPasswordHash = UtilityService.hash(nuovaPassword);
          this.api.cambioPassword(nuovaPasswordHash).subscribe({
            next: (rit: any) => {
              const nuovoTk = rit.data?.tk;

              if (nuovoTk) {
                const p = UtilityService.leggiToken(nuovoTk)?.data || {};
                const authCorrente = this.authService.leggiObsAuth().value;
                const restaCollegato = !!localStorage.getItem('auth');

                const nuovaAuth: Auth = {
                  ...authCorrente,
                  tk: nuovoTk,
                  preavvisoPsw: p.preavviso_psw ?? false,
                  giorniScadenzaPsw: p.giorni_scadenza_psw ?? null,
                };

                this.authService.settaObsAuth(nuovaAuth);
                this.authService.scriviAuthSuStorage(nuovaAuth, restaCollegato);
              }

              this.stoVerificando = false;
              this.toastService.chiudi('login_errore');
              this.toastService.chiudi('password_preavviso');
              this.toastService.successo(this.translate.instant('ui.profilo.cambio_password.successo'));
              this.tornaAScelta();
            },
            error: (err) => {
              this.stoVerificando = false;
              const chiave = UtilityService.chiaveToastErroreDaBackend(err);
              const messaggio = this.translate.instant(chiave);
              this.toastService.mostra(messaggio, 'error', false, undefined, 'login_errore');
              this.saturnoService.flashErrorLight();
            },
          });
        } else {
          this.stoVerificando = false;
          this.saturnoService.flashErrorLight();
        }
      },
      error: (err) => {
        this.stoVerificando = false;
        const chiave = UtilityService.chiaveToastErroreDaBackend(err);
        const messaggio = this.translate.instant(chiave);
        if (chiave === 'ui.toast.error.login.max_acces' || chiave === 'ui.toast.error.login.in_attesa') {
          this.toastService.mostra(messaggio, 'allarm', false, undefined, 'login_errore');
        } else {
          this.toastService.mostra(messaggio, 'error', false, undefined, 'login_errore');
        }
        this.saturnoService.flashErrorLight();
      },
    });
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

    const dataValida =
      data.getFullYear() === anno &&
      data.getMonth() === mese - 1 &&
      data.getDate() === giorno;

    return dataValida ? null : { dataNascitaNonValida: true };
}
}
