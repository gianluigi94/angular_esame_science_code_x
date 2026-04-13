import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { take } from 'rxjs';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { ToastService } from 'src/app/_servizi_globali/toast.service';
import { TranslateService } from '@ngx-translate/core';
import { UtilityService } from 'src/app/_benvenuto/login/_login_service/login_utility.service';
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

  get errorePasswordNonCombacia(): boolean {
    const p = this.resetForm.controls['password'].value;
    const c = this.resetForm.controls['conferma'].value;
    return !!p && !!c && p !== c;
  }

 visibile = false;
  private deveAnimare = false;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private toastService: ToastService,
    private translate: TranslateService,
  ) {
    this.resetForm = this.fb.group({
      email:    ['', [Validators.required, Validators.email, Validators.minLength(5), Validators.maxLength(40)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(20)]],
      conferma: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    const pending = sessionStorage.getItem('reset_pw_pending');
    if (pending === '1') {
      this.visibile = true;
      this.deveAnimare = true;
      sessionStorage.removeItem('reset_pw_pending');
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
    this.invioInCorso = true;
    const email = this.resetForm.controls['email'].value;
    const passwordHash = UtilityService.hash(this.resetForm.controls['password'].value);
    this.apiService.resetPassword(email, passwordHash).pipe(take(1)).subscribe({
      next: () => {
        this.invioInCorso = false;
        this.translate.get('ui.login.reset.successo').pipe(take(1)).subscribe(t => this.toastService.successo(t));
        this.chiudi();
      },
      error: () => {
        this.invioInCorso = false;
        this.translate.get('ui.login.reset.errore').pipe(take(1)).subscribe(t => this.toastService.errore(t));
      },
    });
  }
}
