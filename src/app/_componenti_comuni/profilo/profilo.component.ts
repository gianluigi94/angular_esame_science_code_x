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
import { SelectNazioniService, StatoSelectNazioni } from 'src/app/_servizi_globali/select-nazioni.service';
import { SelectIndirizzoItaliaService, StatoSelectComuneItalia, StatoSelectCapItalia } from 'src/app/_servizi_globali/select-indirizzo-italia.service';
import { SelectTipiIndirizziService,  StatoSelectTipoIndirizzo, TipoIndirizzo } from './select-tipi-indirizzi.service';
@Component({
  selector: 'app-profilo',
  templateUrl: './profilo.component.html',
  styleUrls: ['./profilo.component.scss'],
})
export class ProfiloComponent implements AfterViewInit, OnInit {

  formEmail: FormGroup;
  formPassword: FormGroup;
  formInviato = false;
  vistaCorrente: 'scelta' | 'email' | 'password' | 'indirizzi' = 'scelta';
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

    this.statoNazioneNuovo = this.selectNazioniService.creaStato('IT');
    this.statiNazioniModifica = [];

    this.statoComuneNuovo = this.selectIndirizzoItaliaService.creaStatoComune('');
    this.statiComuniModifica = [];

    this.statoCapNuovo = this.selectIndirizzoItaliaService.creaStatoCap('');
    this.statiCapModifica = [];

    this.statoTipoNuovo = this.selectTipiIndirizziService.creaStato(null, '');
    this.statiTipiModifica = [];
  }

  ngOnInit(): void {
    sessionStorage.setItem('vengo_da_profilo', 'true');
    this.cambioProfilo.spinnerVisibile$.next(false);
    this.selectNazioniService.caricaNazioni();
    this.selectIndirizzoItaliaService.caricaComuni();
    this.selectTipiIndirizziService.caricaTipiIndirizzi();
    this.caricaIndirizzi();
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

    const contenutoUscita = document.querySelector('.form-profilo, .indirizzi-contenuto') as HTMLElement | null;
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

  onClickIndietro(): void {
    if (this.animazioneInCorso) return;

    if (this.vistaCorrente === 'email' || this.vistaCorrente === 'password' || this.vistaCorrente === 'indirizzi') {
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
}
