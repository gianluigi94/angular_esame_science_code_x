import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SaturnoService } from 'src/app/_servizi_globali/animazioni_saturno/three/saturno.service';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import gsap from 'gsap';
@Component({
  selector: 'app-main-intro',
  templateUrl: './main-intro.component.html',
  styleUrls: ['./main-intro.component.scss']
})
export class MainIntroComponent {
  reactiveForm: FormGroup;
  formInviato = false;

  constructor(
    private fb: FormBuilder,
    private saturnoService: SaturnoService,
    private router: Router,
    private cambioLinguaService: CambioLinguaService
  ) {
    this.reactiveForm = this.fb.group({
      email: ['', [Validators.required, Validators.email, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/), Validators.minLength(5), Validators.maxLength(40)]]
    });
  }

  invia(): void {
    this.formInviato = true;
    if (this.reactiveForm.invalid) {
      this.saturnoService.flashErrorLight();
      return;
    }

    const codice = this.cambioLinguaService.leggiCodiceLingua();
    const base = this.cambioLinguaService.baseBenvenutoDaLingua(codice);
    const sottoPath = codice === 'it' ? 'registrazione' : 'registration';

    const cta = document.querySelector('#cta') as HTMLElement | null;
    const form = document.querySelector('#email_form') as HTMLElement | null;
    const durata = 0.55;

   if (cta) {
      gsap.to(cta, { opacity: 0, duration: durata, ease: 'power2.in' });
    }
    if (form) {
      gsap.to(form, { opacity: 0, scaleX: 0, duration: durata, ease: 'power2.in' });
    }

    setTimeout(() => {
      this.router.navigateByUrl(`${base}/${sottoPath}`, {
        state: { email: this.reactiveForm.get('email')!.value }
      });
    }, durata * 1500 + 80);
  }
}
