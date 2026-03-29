import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SaturnoService } from 'src/app/_servizi_globali/animazioni_saturno/three/saturno.service';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import gsap from 'gsap';

@Component({
  selector: 'app-main-intro',
  templateUrl: './main-intro.component.html',
  styleUrls: ['./main-intro.component.scss'],
})
export class MainIntroComponent {
  reactiveForm: FormGroup; // tengo il form reattivo che contiene il campo email e le sue validazioni
  formInviato = false; // flag per sapere se l'utente ha gia' provato a inviare il form

  constructor(
    private fb: FormBuilder,
    private saturnoService: SaturnoService,
    private router: Router,
    private cambioLinguaService: CambioLinguaService,
  ) {
    this.reactiveForm = this.fb.group({
      //controlli form
      email: [
        '', // imposto il valore iniziale del campo email come stringa vuota
        [
          Validators.required, // richiedo che il campo sia obbligatorio
          Validators.email, // verifico che il valore abbia un formato email valido
          Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/), // applico un controllo aggiuntivo sul formato dell'email
          Validators.minLength(5),
          Validators.maxLength(40),
        ],
      ],
    });
  }

  /**
   * Gestisce l'invio del form iniziale.
   * - Imposta il flag formInviato per attivare la visualizzazione degli errori
   * - Se il form e' invalido: fa lampeggiare la luce di errore e interrompe il flusso
   * - Se il form e' valido: ricava lingua e percorso di destinazione
   * - Anima in uscita la call to action e il form con GSAP
   * - Al termine porta l'utente alla pagina di registrazione passando l'email nello state
   *
   * @returns void
   */
  invia(): void {
    this.formInviato = true; // segno che l'utente ha provato a inviare il form cosi' posso mostrare eventuali errori

    if (this.reactiveForm.invalid) {
      // controllo se il form non e' valido
      this.saturnoService.flashErrorLight(); // faccio lampeggiare la luce di errore per dare un feedback visivo immediato
      return; // interrompo il flusso e non proseguo con la navigazione
    }

    const codice = this.cambioLinguaService.leggiCodiceLingua(); // leggo il codice lingua corrente per costruire il percorso corretto
    const base = this.cambioLinguaService.baseBenvenutoDaLingua(codice); // ricavo il path base della sezione di benvenuto in base alla lingua
    const sottoPath = codice === 'it' ? 'registrazione' : 'registration'; // scelgo il sotto-percorso finale della pagina di registrazione

    const cta = document.querySelector('#cta') as HTMLElement | null; // cerco nel DOM il contenitore della call to action da animare in uscita
    const form = document.querySelector('#email_form') as HTMLElement | null; // cerco nel DOM il form email da animare in uscita
    const durata = 0.55; // definisco la durata base delle animazioni di uscita

    if (cta) {
      // controllo che l'elemento della call to action esista davvero
      gsap.to(cta, { opacity: 0, duration: durata, ease: 'power2.in' }); // porto gradualmente a zero l'opacita' della call to action
    }

    if (form) {
      // controllo che l'elemento del form esista davvero
      gsap.to(form, {
        opacity: 0,
        scaleX: 0,
        duration: durata,
        ease: 'power2.in',
      }); // animo il form facendolo sparire e chiudere orizzontalmente
    }

    setTimeout(
      () => {
        // aspetto la fine visiva dell'animazione prima di cambiare pagina
        this.router.navigateByUrl(`${base}/${sottoPath}`, {
          state: { email: this.reactiveForm.get('email')!.value }, // passo l'email inserita tramite state per ritrovarla nella pagina successiva
        });
      },
      durata * 1500 + 80, //decisione temporale
    );
  }
}
