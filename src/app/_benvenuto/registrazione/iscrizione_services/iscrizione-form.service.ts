import { Injectable }                                              from '@angular/core';
import { FormBuilder, FormGroup, Validators,
         AbstractControl, ValidationErrors }                      from '@angular/forms';
import { ApiService }                                             from 'src/app/_servizi_globali/api.service';
import { CambioLinguaService }                                    from 'src/app/_servizi_globali/cambio-lingua.service';

@Injectable()
export class IscrizioneFormService {

  // ─── Form groups ──────────────────────────────────────────────────────────
  reactiveForm!:      FormGroup;
  reactiveFormStep2!: FormGroup;
  reactiveFormStep3!: FormGroup;

  // ─── Dati condivisi tra step 1 e step 2 ───────────────────────────────────
  nazioni: any[] = [];
  comuni:  any[] = [];

  constructor(
    private fb:                 FormBuilder,
    private apiService:         ApiService,
    private cambioLinguaService: CambioLinguaService,
  ) {
    this.costruisciForms();
  }

  // ─── Caricamento dati da API ───────────────────────────────────────────────

  caricaNazioni(): void {
    this.apiService.getNazioni().subscribe(rit => {
      const lingua = this.cambioLinguaService.leggiCodiceLingua();
      this.nazioni = (rit.data ?? []).sort((a: any, b: any) =>
        (lingua === 'it' ? a.nazione_it : a.nazione_en ?? '')
          .localeCompare(lingua === 'it' ? b.nazione_it : b.nazione_en ?? '', lingua)
      );
    });
  }

  caricaComuni(): void {
    this.apiService.getComuni().subscribe(rit => {
      this.comuni = (rit.data ?? []).sort((a: any, b: any) =>
        (a.comune ?? '').localeCompare(b.comune ?? '', 'it')
      );
    });
  }

  // ─── Costruzione form ─────────────────────────────────────────────────────

  private costruisciForms(): void {
    this.reactiveForm = this.fb.group({
      nome:          ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50),
                           Validators.pattern(/^[A-Za-zÀ-ÿ\s'-]+$/)]],
      cognome:       ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50),
                           Validators.pattern(/^[A-Za-zÀ-ÿ\s'-]+$/)]],
      dataGg:        ['', [Validators.required, Validators.pattern(/^(0[1-9]|[12]\d|3[01])$/)]],
      dataMm:        ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])$/)]],
      dataAaaa:      ['', [Validators.required, Validators.pattern(/^\d{4}$/), this.validaAnnoNascita()]],
      sesso:         ['', Validators.required],
      paese:         ['IT', Validators.required],
      comune:        ['', Validators.required],
      citta:         [''],
      codiceFiscale: ['', [Validators.required,
                           Validators.pattern(/^[A-Za-z]{6}\d{2}[AaBbCcDdEeHhLlMmPpRrSsTt](0[1-9]|[12]\d|3[01]|4[1-9]|[56]\d|7[01])[A-Za-z]\d{3}[A-Za-z]$/)]],
    });

    this.reactiveFormStep2 = this.fb.group({
      nazioneD:   ['IT', Validators.required],
      comuneD:    ['', Validators.required],
      cittaD:     [''],
      via:        ['', [Validators.minLength(3), Validators.maxLength(100),
                        Validators.pattern(/^[A-Za-zÀ-ÿ0-9\s'.,°\/\-]+$/)]],
      civico:     ['', [Validators.maxLength(10),
                        Validators.pattern(/^\d+[A-Za-z0-9\/\-]*$/)]],
      dettagli:   ['', [Validators.minLength(3), Validators.maxLength(200)]],
      provinciaD: ['', [Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)]],
      cap:        ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
    });

    this.reactiveFormStep3 = this.fb.group({
      telefono:         ['', [Validators.minLength(6), Validators.maxLength(20),
                              Validators.pattern(/^\+?[\d\s\-().]{6,20}$/)]],
      emailSecondaria:  ['', [Validators.email,
                              Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/),
                              Validators.maxLength(40)]],
      password:         ['', [Validators.required, Validators.minLength(8), Validators.maxLength(30),
                              Validators.pattern(/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)]],
      confermaPassword: ['', Validators.required],
    });
  }

  // ─── Validatore custom ────────────────────────────────────────────────────

  private validaAnnoNascita() {
    return (control: AbstractControl): ValidationErrors | null => {
      const anno = parseInt(control.value, 10);
      if (isNaN(anno)) return null;
      const oggi = new Date().getFullYear();
      if (anno < oggi - 200) return { annoTroppoVecchio: true };
      if (anno > oggi - 5)   return { annoTroppoGiovane: true };
      return null;
    };
  }
}
