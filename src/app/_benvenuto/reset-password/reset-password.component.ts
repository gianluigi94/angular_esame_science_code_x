import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { take } from 'rxjs';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { ToastService } from 'src/app/_servizi_globali/toast.service';
import { TranslateService } from '@ngx-translate/core';
import { UtilityService } from 'src/app/_benvenuto/login/_login_service/login_utility.service';
import { calcolaRobustezzaPassword } from 'src/app/_benvenuto/registrazione/iscrizione_helpers/password.helper';
import gsap from 'gsap';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
})
export class ResetPasswordComponent implements OnInit, AfterViewInit {
  @ViewChild('sfocatura') sfocatura!: ElementRef<HTMLElement>;
  @ViewChild('resetPwContenuto') resetPwContenuto!: ElementRef<HTMLElement>;

  resetForm: FormGroup;
  formInviato = false;
  invioInCorso = false;
  mostraPassword = false;
  mostraConferma = false;

  passwordRobustezza: 0 | 1 | 2 | 3 = 0;
  passwordEntropyPerc = 0;
  private paroleComuni: string[] = [];

  get pwdColore(): string {
    const p = this.passwordEntropyPerc;
    if (p < 50) return `rgb(255,${Math.round((p / 50) * 255)},0)`;
    return `rgb(${Math.round((1 - (p - 50) / 50) * 255)},180,0)`;
  }

  get pwdMancaMaiuscola(): boolean {
    return !/[A-Z]/.test(this.resetForm?.get('password')?.value ?? '');
  }

  get pwdMancaMinuscola(): boolean {
    return !/[a-z]/.test(this.resetForm?.get('password')?.value ?? '');
  }

  get pwdMancaNumero(): boolean {
    return !/\d/.test(this.resetForm?.get('password')?.value ?? '');
  }

  get pwdMancaSimbolo(): boolean {
    return !/[^A-Za-z0-9]/.test(this.resetForm?.get('password')?.value ?? '');
  }

 visibile = false;
  private deveAnimare = false;
  private rid: string | null = null;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private toastService: ToastService,
    private translate: TranslateService,
  ) {
    this.resetForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(20), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)]],
      conferma: ['', [Validators.required]],
    }, { validators: this.confermaPasswordValidator });
  }

  private confermaPasswordValidator(group: any) {
    const pwd = group.get('password')?.value;
    const conf = group.get('conferma')?.value;
    if (!pwd || !conf) return null;
    return pwd === conf ? null : { mismatch: true };
  }

  get errorePasswordNonCombacia(): boolean {
    return !!this.resetForm?.errors?.['mismatch'];
  }

  onPasswordInput(pwd: string): void {
    const rit = calcolaRobustezzaPassword(pwd, this.paroleComuni);
    this.passwordRobustezza = rit.robustezza;
    this.passwordEntropyPerc = rit.entropyPerc;
  }

  ngOnInit(): void {
    fetch('assets/common_words.json')
      .then((r) => r.json())
      .then((data: { commonWords: string[] }) => {
        this.paroleComuni = data.commonWords.map((w) => w.toLowerCase());
      })
      .catch(() => {
        this.paroleComuni = [];
      });

    const ridSalvato = localStorage.getItem('reset_pw_rid');
    if (ridSalvato) {
      this.rid = ridSalvato;
      this.visibile = true;
      this.deveAnimare = true;
    }
  }

  ngAfterViewInit(): void {
    if (!this.deveAnimare) return;
    const campi = this.resetPwContenuto.nativeElement.querySelectorAll('.campo-animato');
    gsap.set(this.sfocatura.nativeElement, { opacity: 0 });
    gsap.set(campi, { opacity: 0, x: 26 });
    setTimeout(() => {
      gsap.to(this.sfocatura.nativeElement, { opacity: 1, duration: 1, ease: 'power2.out' });
      gsap.to(campi, {
        opacity: 1,
        x: 0,
        duration: 0.6,
        stagger: 0.15,
        delay: 0.3,
        ease: 'power2.out',
      });
    }, 1500);
  }

  chiudi(): void {
    const campi = this.resetPwContenuto.nativeElement.querySelectorAll('.campo-animato');
    gsap.to(campi, { opacity: 0, x: 26, duration: 0.4, stagger: 0.1, ease: 'power2.in' });
    gsap.to(this.sfocatura.nativeElement, { opacity: 0, duration: 0.6, delay: 0.3, ease: 'power2.in', onComplete: () => {
      this.visibile = false;
    }});
  }

  invia(): void {
    this.formInviato = true;
    if (this.resetForm.invalid || this.errorePasswordNonCombacia) return;
    if (!this.rid) {
      this.translate.get('ui.login.reset.errore').pipe(take(1)).subscribe(t => this.toastService.errore(t));
      return;
    }
    this.invioInCorso = true;
    const passwordHash = UtilityService.hash(this.resetForm.controls['password'].value);
    this.apiService.resetPassword(this.rid, passwordHash).pipe(take(1)).subscribe({
      next: () => {
        this.invioInCorso = false;
        localStorage.removeItem('reset_pw_rid');
        this.rid = null;
        this.translate.get('ui.login.reset.successo').pipe(take(1)).subscribe(t => this.toastService.successo(t));
        this.chiudi();
      },
      error: () => {
        this.invioInCorso = false;
        localStorage.removeItem('reset_pw_rid');
        this.rid = null;
        this.translate.get('ui.login.reset.errore').pipe(take(1)).subscribe(t => this.toastService.errore(t));
        this.chiudi();
      },
    });
  }
}
