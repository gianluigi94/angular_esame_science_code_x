import { Component, AfterViewInit, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import gsap from 'gsap';
import { CambioProfiloAnimazioneService } from 'src/app/_servizi_globali/cambio-profilo-animazione.service';

@Component({
  selector: 'app-profilo',
  templateUrl: './profilo.component.html',
  styleUrls: ['./profilo.component.scss'],
})
export class ProfiloComponent implements AfterViewInit, OnInit {

  formEmail: FormGroup;
  formInviato = false;

  constructor(
    private cambioProfilo: CambioProfiloAnimazioneService,
    private fb: FormBuilder,
  ) {
    this.formEmail = this.fb.group({
      email: ['', [Validators.required, Validators.email, Validators.maxLength(40)]],
    });
  }

  ngOnInit(): void {
    sessionStorage.setItem('vengo_da_profilo', 'true');
    this.cambioProfilo.spinnerVisibile$.next(false);
    setTimeout(() => this.avviaAnimazioniIngresso(), 0);
  }

  ngAfterViewInit(): void {}

  private avviaAnimazioniIngresso(): void {
    const titolo = document.querySelector('.profilo-titolo') as HTMLElement | null;
    const box = document.querySelector('.profilo-box') as HTMLElement | null;
    const titoloSezione = document.querySelector('.titolo-sezione') as HTMLElement | null;
    const righe = document.querySelectorAll('.campo-animato');
    const sfocatura = document.querySelector('.sfocatura') as HTMLElement | null;
    const bottoneIndietro = document.querySelector('.profilo-indietro-btn') as HTMLElement | null;

    if (titolo) gsap.set(titolo, { opacity: 0 });
    if (box) gsap.set(box, { opacity: 0, scaleX: 0, transformOrigin: 'center center' });
    if (titoloSezione) gsap.set(titoloSezione, { opacity: 0 });
    if (sfocatura) gsap.set(sfocatura, { opacity: 0 });
    if (bottoneIndietro) gsap.set(bottoneIndietro, { opacity: 0 });
    if (righe.length) gsap.set(righe, { opacity: 0, scaleX: 0, transformOrigin: 'center center' });

    if (sfocatura) gsap.to(sfocatura, { opacity: 1, duration: 0.7, ease: 'power2.out' });
    if (titolo) gsap.to(titolo, { opacity: 1, duration: 0.6, ease: 'power2.out' });
    if (box) gsap.to(box, { opacity: 1, scaleX: 1, duration: 0.6, ease: 'power2.out' });
    if (titoloSezione) gsap.to(titoloSezione, { opacity: 1, duration: 0.6, ease: 'power2.out' });
    if (righe.length) gsap.to(righe, { opacity: 1, scaleX: 1, duration: 0.6, delay: 0.12, ease: 'power2.out' });
    if (bottoneIndietro) gsap.to(bottoneIndietro, { opacity: 1, duration: 0.6, ease: 'power2.out' });
  }

  inviaEmail(): void {
    this.formInviato = true;
    if (this.formEmail.invalid) {
      this.formEmail.markAllAsTouched();
      return;
    }
  }

  tornaIndietro(): void {
    window.history.back();
  }
}
