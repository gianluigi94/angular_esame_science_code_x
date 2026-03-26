import { Component, OnDestroy, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription, take } from 'rxjs';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import gsap from 'gsap';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { IRispostaServer } from 'src/app/_interfacce/IRispostaServer.interface';
import { Authservice } from 'src/app/_benvenuto/login/_login_service/auth.service';
import { ContattiAnimazioniService } from 'src/app/_servizi_globali/animazioni_saturno/gsap/contatti_animazioni.service';
@Component({
  selector: 'app-dati-personali',
  templateUrl: './dati-personali.component.html',
  styleUrls: ['./dati-personali.component.scss'],
})
export class DatiPersonaliComponent implements OnInit, AfterViewInit, OnDestroy {
  visibile = false;
  mostraForm = false;
  messaggioForm: FormGroup;
  formInviatoMsg = false;

  mail: string = '';
  indirizzo: string = '';
  @ViewChild('datiPersonaliContenuto', { static: false })
  datiPersonaliContenuto?: ElementRef<HTMLElement>;
  @ViewChild('formContenuto', { static: false })
  formContenuto?: ElementRef<HTMLElement>;
  private sub = new Subscription();
  private viewReady = false;
  private datiReady = false;
  private onApri = () => {
    if (!this.isLoggato()) return;
    if (this.visibile) return;
    this.visibile = true;
        this.viewReady = false;
    this.datiReady = false;
    // preparo appena il DOM esiste
    requestAnimationFrame(() => {
      if (this.datiPersonaliContenuto?.nativeElement) {
        this.contattiAnimazioni.prepara(this.datiPersonaliContenuto.nativeElement);
        this.viewReady = true;
        this.avviaAnimazioniSePronto();
      }
    });
    this.caricaDati();
  };
  constructor(
    private authService: Authservice,
    private apiService: ApiService,
    private contattiAnimazioni: ContattiAnimazioniService,
    private cambioLingua: CambioLinguaService,
    private fb: FormBuilder,
  ) {
    this.messaggioForm = this.fb.group({
      nome:      ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50), Validators.pattern(/^[A-Za-zÀ-ÿ\s'-]+$/)]],
      cognome:   ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50), Validators.pattern(/^[A-Za-zÀ-ÿ\s'-]+$/)]],
      tipologia: ['', Validators.required],
      messaggio: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
    });
  }

  ngOnInit(): void {
    window.addEventListener('apri-dati-personali', this.onApri);
    window.addEventListener('chiudi-dati-personali', this.onChiudi);
    this.sub.add(
      this.authService.leggiObsAuth().subscribe(() => {
       if (this.visibile && !this.isLoggato()) this.visibile = false;
      })
    );
    this.sub.add(
      this.cambioLingua.cambioLinguaApplicata$.subscribe(() => {
        if (!this.visibile) return;
        const el = this.datiPersonaliContenuto?.nativeElement;
        if (!el) return;
        gsap.killTweensOf(el.querySelectorAll('h2, .contact-list .row'));
        gsap.set(el.querySelectorAll('h2, .contact-list .row'), { opacity: 0, x: 26 });
        requestAnimationFrame(() => this.contattiAnimazioni.ingresso(el));
      })
    );
  }

  ngOnDestroy(): void {
    window.removeEventListener('apri-dati-personali', this.onApri);
    window.removeEventListener('chiudi-dati-personali', this.onChiudi);
    this.sub.unsubscribe();
  }



  private isLoggato(): boolean {
    return !!this.authService.leggiObsAuth().value?.tk;
  }

  private caricaDati(): void {
    this.apiService.getDatiPersonali()
      .pipe(take(1))
      .subscribe((rit: IRispostaServer) => {
        const dato = rit?.data?.[0];
        this.mail = dato?.mail || '';
        this.indirizzo = dato?.indirizzo || '';
                this.datiReady = true;
        this.avviaAnimazioniSePronto();
      });
  }


  ngAfterViewInit(): void {
    // se già visibile quando view init (rare), preparo
    if (this.visibile && this.datiPersonaliContenuto?.nativeElement) {
      this.contattiAnimazioni.prepara(this.datiPersonaliContenuto.nativeElement);
      this.viewReady = true;
      this.avviaAnimazioniSePronto();
    }
  }

  private avviaAnimazioniSePronto(): void {
    if (!this.visibile) return;
    if (!this.viewReady || !this.datiReady) return;
    if (!this.datiPersonaliContenuto?.nativeElement) return;
    requestAnimationFrame(() => {
      this.contattiAnimazioni.ingresso(this.datiPersonaliContenuto!.nativeElement);
    });
  }
apriForm(): void {
    if (!this.datiPersonaliContenuto?.nativeElement) return;
    this.contattiAnimazioni.uscita(this.datiPersonaliContenuto.nativeElement).then(() => {
      gsap.set(this.datiPersonaliContenuto!.nativeElement, { display: 'none' });
      this.mostraForm = true;
      requestAnimationFrame(() => {
        if (!this.formContenuto?.nativeElement) return;
        gsap.set(this.formContenuto.nativeElement, { opacity: 1, x: 0, pointerEvents: 'auto' });
        this.contattiAnimazioni.prepara(this.formContenuto.nativeElement, {
          titleSelector: 'h2',
          rowSelector: '.campo-wrapper, .form-riga-doppia, .form-bottoni',
        });
        requestAnimationFrame(() => {
          this.contattiAnimazioni.ingresso(this.formContenuto!.nativeElement, {
            titleSelector: 'h2',
            rowSelector: '.campo-wrapper, .form-riga-doppia, .form-bottoni',
          });
        });
      });
    });
  }

  chiudiForm(): void {
    if (!this.formContenuto?.nativeElement) return;
    this.contattiAnimazioni.uscita(this.formContenuto.nativeElement, {
      titleSelector: 'h2',
      rowSelector: '.campo-wrapper, .form-riga-doppia, .form-bottoni',
    }).then(() => {
      this.formInviatoMsg = false;
      this.messaggioForm.reset();
      gsap.set(this.formContenuto!.nativeElement, { pointerEvents: 'none' });
      this.mostraForm = false;
      if (!this.datiPersonaliContenuto?.nativeElement) return;
      gsap.set(this.datiPersonaliContenuto.nativeElement, { display: 'block', opacity: 1 });
      this.contattiAnimazioni.prepara(this.datiPersonaliContenuto.nativeElement);
      requestAnimationFrame(() => {
        this.contattiAnimazioni.ingresso(this.datiPersonaliContenuto!.nativeElement);
      });
    });
  }

  inviaMessaggio(): void {
    this.formInviatoMsg = true;
    if (this.messaggioForm.invalid) return;
    console.log('Messaggio da inviare:', this.messaggioForm.value);
    // qui in futuro chiamerai il backend
  }

chiudi(): void {
  const el = this.datiPersonaliContenuto?.nativeElement;
  if (!el) {
    this.visibile = false;
    window.history.back();
    return;
  }
  this.contattiAnimazioni.uscita(el).then(() => {
    this.visibile = false;
    this.viewReady = false;
    this.datiReady = false;
    window.history.back();
  });
}
   private onChiudi = () => {
  if (!this.visibile) return;

  const animaEPoi = (el: HTMLElement, cfg?: any): Promise<void> => {
    return this.contattiAnimazioni.uscita(el, cfg).then(() => {
      this.visibile = false;
      this.mostraForm = false;
      this.viewReady = false;
      this.datiReady = false;
    });
  };

  if (this.mostraForm && this.formContenuto?.nativeElement) {
    animaEPoi(this.formContenuto.nativeElement, {
      titleSelector: 'h2',
      rowSelector: '.campo-wrapper, .form-riga-doppia, .form-bottoni',
    });
    return;
  }

  const el = this.datiPersonaliContenuto?.nativeElement;
  if (!el) { this.visibile = false; return; }
  animaEPoi(el);
};
}
