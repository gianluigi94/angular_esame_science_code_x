import { Component, AfterViewInit, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { take } from 'rxjs';
import gsap from 'gsap';
import { CambioProfiloAnimazioneService } from 'src/app/_servizi_globali/cambio-profilo-animazione.service';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { TranslateService } from '@ngx-translate/core';
import { ToastService } from 'src/app/_servizi_globali/toast.service';
import { SaturnoService } from 'src/app/_servizi_globali/animazioni_saturno/three/saturno.service';
import { UtilityService } from 'src/app/_benvenuto/login/_login_service/login_utility.service';
import { calcolaRobustezzaPassword } from 'src/app/_benvenuto/registrazione/iscrizione_helpers/password.helper';
@Component({
  selector: 'app-profilo',
  templateUrl: './profilo.component.html',
  styleUrls: ['./profilo.component.scss'],
})
export class ProfiloComponent implements AfterViewInit, OnInit {

  formEmail: FormGroup;
  formPassword: FormGroup;
  formInviato = false;
  vistaCorrente: 'scelta' | 'email' | 'password' = 'scelta';
  animazioneInCorso = false;
  stoVerificando = false;
  mostraPassword = false;
  mostraVecchiaPassword = false;
  mostraNuovaPassword = false;
  mostraConfermaNuovaPassword = false;

  passwordRobustezza: 0 | 1 | 2 | 3 = 0;
  passwordEntropyPerc = 0;
  private paroleComuni: string[] = [];
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
  }

  ngOnInit(): void {
    sessionStorage.setItem('vengo_da_profilo', 'true');
    this.cambioProfilo.spinnerVisibile$.next(false);
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

  ngAfterViewInit(): void {}
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

  tornaAScelta(): void {
    if (this.animazioneInCorso) return;

    this.animazioneInCorso = true;

    const formEmail = document.querySelector('.form-profilo') as HTMLElement | null;
    const bottoneIndietro = document.querySelector('.profilo-indietro-btn') as HTMLElement | null;

    if (formEmail) {
      gsap.killTweensOf(formEmail);
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

    if (formEmail) {
      timeline.to(formEmail, {
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

    if (this.vistaCorrente === 'email' || this.vistaCorrente === 'password') {
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
            next: () => {
              this.stoVerificando = false;
              this.toastService.chiudi('login_errore');
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
