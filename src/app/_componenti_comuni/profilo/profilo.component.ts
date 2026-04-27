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

@Component({
  selector: 'app-profilo',
  templateUrl: './profilo.component.html',
  styleUrls: ['./profilo.component.scss'],
})
export class ProfiloComponent implements AfterViewInit, OnInit {

  formEmail: FormGroup;
  formInviato = false;
  vistaCorrente: 'scelta' | 'email' | 'password' = 'scelta';
  animazioneInCorso = false;
  stoVerificando = false;
  mostraPassword = false;

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
  }

  ngOnInit(): void {
    sessionStorage.setItem('vengo_da_profilo', 'true');
    this.cambioProfilo.spinnerVisibile$.next(false);
    setTimeout(() => this.avviaAnimazioniIngresso(), 0);
  }

  ngAfterViewInit(): void {}

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
}
