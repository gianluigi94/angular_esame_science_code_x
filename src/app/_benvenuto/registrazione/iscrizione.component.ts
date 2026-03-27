import { Component, OnInit, AfterViewInit, OnDestroy,
         HostListener, ChangeDetectorRef }             from '@angular/core';
import { Subscription }                               from 'rxjs';
import gsap                                           from 'gsap';
import { UtilityService }                             from '../login/_login_service/login_utility.service';
import { CambioLinguaService }                        from 'src/app/_servizi_globali/cambio-lingua.service';
import { SaturnoService }                             from 'src/app/_servizi_globali/animazioni_saturno/three/saturno.service';
import { SaturnoRouteAnimazioniService }              from 'src/app/_servizi_globali/animazioni_saturno/gsap/saturno-route-animazioni.service';
import { SaturnoPosizioniService }                    from 'src/app/_servizi_globali/animazioni_saturno/saturno_posizioni.service';
import { IscrizioneFormService }                      from './iscrizione_services/iscrizione-form.service';
import { IscrizioneStep1Service }                     from './iscrizione_services/iscrizione-step1.service';
import { IscrizioneStep2Service }                     from './iscrizione_services/iscrizione-step2.service';
import { calcolaRobustezzaPassword }                  from './iscrizione_helpers/password.helper';
import { animaEntrata, animaEntrataStep2,
         animaUscita, animaSfocatura,
         resetElementiStep }                          from './iscrizione_helpers/animazioni.helper';
import { Datepicker }  from 'vanillajs-datepicker';
import it              from 'vanillajs-datepicker/locales/it';
(Datepicker as any).locales.it = (it as any).it;

const CHIAVE_PAGINA_REGISTRAZIONE = 'pagina_registrazione';

@Component({
  selector:    'app-iscrizione',
  templateUrl: './iscrizione.component.html',
  styleUrls:   ['./iscrizione.component.scss'],
  providers:   [IscrizioneFormService, IscrizioneStep1Service, IscrizioneStep2Service],
})
export class IscrizioneComponent implements OnInit, AfterViewInit, OnDestroy {

  // ─── Esposti al template come shorthand ───────────────────────────────────
  readonly s1 = this.step1;   // step1 state + metodi
  readonly s2 = this.step2;   // step2 state + metodi
  readonly sf = this.forms;   // form groups + nazioni/comuni

  // ─── Stato locale del componente ──────────────────────────────────────────
  stepAttuale       = 1;
  formInviato       = false;
  formInviatoStep2  = false;
  formInviatoStep3  = false;
  emailUtente       = '';
  pianoSelezionato: 'base' | 'pro' | null = null;

  mostraPassword        = false;
  mostraConfermaPassword = false;
  errorePasswordNonCombacia = false;
  passwordRobustezza: 0 | 1 | 2 | 3 = 0;
  passwordEntropyPerc = 0;

  private paroleComuni: string[] = [];
  private subLingua?: Subscription;

  // ─── Getter password ──────────────────────────────────────────────────────

  get pwdColore(): string {
    const p = this.passwordEntropyPerc;
    if (p < 50) return `rgb(255,${Math.round((p / 50) * 255)},0)`;
    return `rgb(${Math.round((1 - (p - 50) / 50) * 255)},180,0)`;
  }
  get pwdMancaMaiuscola(): boolean { return !/[A-Z]/.test(this.forms.reactiveFormStep3?.get('password')?.value ?? ''); }
  get pwdMancaNumero():    boolean { return !/\d/.test(this.forms.reactiveFormStep3?.get('password')?.value ?? '');    }
  get pwdMancaSimbolo():   boolean { return !/[^A-Za-z0-9]/.test(this.forms.reactiveFormStep3?.get('password')?.value ?? ''); }

  // ─── Constructor ──────────────────────────────────────────────────────────

  constructor(
    public  cambioLinguaService:          CambioLinguaService,
    private cdr:                          ChangeDetectorRef,
    private saturnoService:               SaturnoService,
    private saturnoRouteAnimazioniService: SaturnoRouteAnimazioniService,
    private saturnoPosizioniService:      SaturnoPosizioniService,
    public  forms:  IscrizioneFormService,
    public  step1:  IscrizioneStep1Service,
    public  step2:  IscrizioneStep2Service,
  ) {}

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  @HostListener('document:click')
  chiudiDropdown(): void {
    this.step1.chiudiDropdown();
    this.step2.chiudiDropdown();
  }

  ngOnInit(): void {
    try { sessionStorage.setItem(CHIAVE_PAGINA_REGISTRAZIONE, '1'); } catch {}
    this.emailUtente = history.state?.email ?? '';
    this.step2.aggiornaPrezzi(this.step2.paeseDomValore);

    fetch('assets/common_words.json')
      .then(r => r.json())
      .then((data: { commonWords: string[] }) => {
        this.paroleComuni = data.commonWords.map(w => w.toLowerCase());
      })
      .catch(() => { this.paroleComuni = []; });

    this.forms.caricaNazioni();
    this.forms.caricaComuni();

    this.subLingua = this.cambioLinguaService.cambioLinguaApplicata$.subscribe(({ codice }) => {
      this.step1.datepicker?.setOptions({ language: codice === 'it' ? 'it' : 'en' });
    });
  }

  ngAfterViewInit(): void {
    UtilityService.nascondiSottotitoloEScrol();
    animaEntrata();
    this.step1.inizializzaDatepicker(this.cambioLinguaService.leggiCodiceLingua());
    animaSfocatura(true);
  }

  ngOnDestroy(): void {
    this.subLingua?.unsubscribe();
  }

  // ─── Navigazione avanti ───────────────────────────────────────────────────

  avanti(): void {
    this.formInviato = true;
    if (this.forms.reactiveForm.invalid) { this.forms.reactiveForm.markAllAsTouched(); return; }
    animaUscita().then(() => {
      this.stepAttuale = 2;
      this.cdr.detectChanges();
      resetElementiStep();
      setTimeout(() => animaEntrataStep2(), 16);
    });
  }

  avanti2(): void {
    this.formInviatoStep2 = true;
    if (this.forms.reactiveFormStep2.invalid) { this.forms.reactiveFormStep2.markAllAsTouched(); return; }
    if (!this.step2.verificaCoerenzaIndirizzo()) {
      this.step2.erroreCoerenzaIndirizzo = true;
      this.saturnoService.flashErrorLight();
      return;
    }
    this.step2.erroreCoerenzaIndirizzo = false;
    animaUscita().then(() => {
      this.stepAttuale = 3;
      this.cdr.detectChanges();
      resetElementiStep();
      setTimeout(() => animaEntrataStep2(), 16);
    });
  }

  avanti3(): void {
    this.formInviatoStep3 = true;
    this.errorePasswordNonCombacia = false;
    if (this.forms.reactiveFormStep3.invalid) { this.forms.reactiveFormStep3.markAllAsTouched(); return; }
    const pwd  = this.forms.reactiveFormStep3.get('password')!.value;
    const conf = this.forms.reactiveFormStep3.get('confermaPassword')!.value;
    if (pwd !== conf) { this.errorePasswordNonCombacia = true; this.saturnoService.flashErrorLight(); return; }

    const scene = this.saturnoService.getScene();
    const light = this.saturnoService.getDirectionalLight();
    if (scene) this.saturnoRouteAnimazioniService.animaVerso(scene, 'LOGIN_LATERALE', 0.9, light ?? undefined);
    animaSfocatura(false);

    animaUscita().then(() => {
      this.stepAttuale = 4;
      this.cdr.detectChanges();
      const righe = document.querySelectorAll('.campo-animato');
      gsap.set(righe, { opacity: 0, scaleX: 0, transformOrigin: 'center center' });
      setTimeout(() => gsap.to(righe, { opacity: 1, scaleX: 1, duration: 0.9, ease: 'power2.out', stagger: 0.12 }), 16);
    });
  }

  avanti4(): void {
    const f1 = this.forms.reactiveForm.value;
    const f2 = this.forms.reactiveFormStep2.value;
    const f3 = this.forms.reactiveFormStep3.value;
    Promise.all([this.sha512(this.emailUtente), this.sha512(f3.password)])
      .then(([emailHash, passwordHash]) => {
        console.log('=== DATI REGISTRAZIONE ===', {
          nome: f1.nome, cognome: f1.cognome,
          dataNascita: `${f1.dataGg}/${f1.dataMm}/${f1.dataAaaa}`,
          sesso: f1.sesso, paeseNascita: f1.paese,
          comuneNascita: f1.comune || f1.citta, codiceFiscale: f1.codiceFiscale,
          paeseDomicilio: f2.nazioneD, comuneDomicilio: f2.comuneD || f2.cittaD,
          via: f2.via, civico: f2.civico, provinciaD: f2.provinciaD, cap: f2.cap, dettagli: f2.dettagli,
          telefono: f3.telefono, emailSecondaria: f3.emailSecondaria,
          piano: this.pianoSelezionato,
          email_sha512: emailHash, password_sha512: passwordHash,
        });
      });
  }

  // ─── Navigazione indietro ─────────────────────────────────────────────────

  indietro(): void {
    animaUscita().then(() => {
      this.stepAttuale = 1;
      this.cdr.detectChanges();
      resetElementiStep();
      setTimeout(() => animaEntrata(), 16);
    });
  }

  indietro2(): void {
    animaUscita().then(() => {
      this.stepAttuale = 2;
      this.cdr.detectChanges();
      resetElementiStep();
      setTimeout(() => animaEntrataStep2(), 16);
    });
  }

  indietro3(): void {
    const scene = this.saturnoService.getScene();
    const light = this.saturnoService.getDirectionalLight();
    if (scene) {
      const pose = this.saturnoPosizioniService.getPose('REGISTRAZIONE_BASSO');
      const dur  = 1.3;
      gsap.to(scene.position, { ...pose.position, duration: dur, ease: 'power2.inOut' });
      gsap.to(scene.scale,    { ...pose.scale,    duration: dur, ease: 'power2.inOut' });
      gsap.to(scene.rotation, {
        ...pose.rotation, y: pose.rotation.y + Math.PI * 2,
        duration: dur, ease: 'power1.inOut', overwrite: true,
        onComplete: () => { scene.rotation.y = pose.rotation.y; },
      });
      if (light) gsap.to(light.position, { z: 10.1001, duration: dur, ease: 'power2.inOut' });
    }
    animaSfocatura(true);
    animaUscita().then(() => {
      this.stepAttuale = 3;
      this.cdr.detectChanges();
      resetElementiStep();
      setTimeout(() => animaEntrataStep2(), 16);
    });
  }

  // ─── Password ─────────────────────────────────────────────────────────────

  onPasswordInput(pwd: string): void {
    const rit = calcolaRobustezzaPassword(pwd, this.paroleComuni);
    this.passwordRobustezza  = rit.robustezza;
    this.passwordEntropyPerc = rit.entropyPerc;
  }

  toggleVisibilitaPassword(campo: 'password' | 'conferma'): void {
    const id    = campo === 'password' ? 'password_reg' : 'conferma_password_reg';
    const input = document.getElementById(id) as HTMLInputElement;
    const start = input?.selectionStart ?? null;
    const end   = input?.selectionEnd   ?? null;
    if (campo === 'password') this.mostraPassword        = !this.mostraPassword;
    else                      this.mostraConfermaPassword = !this.mostraConfermaPassword;
    setTimeout(() => { input?.focus(); if (start !== null && end !== null) input?.setSelectionRange(start, end); }, 0);
  }

  // ─── Utility privata ──────────────────────────────────────────────────────

  private async sha512(testo: string): Promise<string> {
    const data       = new TextEncoder().encode(testo);
    const hashBuffer = await crypto.subtle.digest('SHA-512', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
