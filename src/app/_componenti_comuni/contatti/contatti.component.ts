import { UtilityService } from 'src/app/_benvenuto/login/_login_service/login_utility.service';
import { ContattiAnimazioniService } from 'src/app/_servizi_globali/animazioni_saturno/gsap/contatti_animazioni.service';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { IRispostaServer } from 'src/app/_interfacce/IRispostaServer.interface';
import { Component, AfterViewInit, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { Subscription, take } from 'rxjs';
import gsap from 'gsap';
import { Authservice } from 'src/app/_benvenuto/login/_login_service/auth.service';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { Router } from '@angular/router';
@Component({
  selector: 'app-contatti',
  templateUrl: './contatti.component.html',
  styleUrls: ['./contatti.component.scss'],
})
export class ContattiComponent implements AfterViewInit, OnInit, OnDestroy {
  @ViewChild('contattiContenuto', { static: true })
  contattiContenuto!: ElementRef<HTMLElement>;
private subs = new Subscription();
  mail: string = '';           // Campo mail ricevuto dal server
  indirizzo: string = '';      // Campo indirizzo ricevuto dal server

    private viewReady = false;
  private datiReady = false;
public sonoLoggato = false;
  constructor(
    private authService: Authservice,
    private contattiAnimazioni: ContattiAnimazioniService,
    private apiService: ApiService,
    private cambioLingua: CambioLinguaService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.sonoLoggato = !!this.authService.leggiObsAuth().value?.tk;
    this.apiService.getDatiPersonali().pipe( // Chiamo l'endpoint /dati-personali
      take(1)                                // Prendo solo la prima risposta e chiudo
    ).subscribe((rit: IRispostaServer) => {  // Mi sottoscrivo alla risposta del server
      const dato = rit.data[0];             // Prendo il primo record dell'array
      this.mail = dato.mail;               // Salvo la mail
      this.indirizzo = dato.indirizzo;     // Salvo l'indirizzo
            this.datiReady = true;
      this.avviaAnimazioniSePronto();
    });
   this.subs.add(
      this.cambioLingua.cambioLinguaApplicata$.subscribe(() => {
        if (this.sonoLoggato) return;
        const el = this.contattiContenuto?.nativeElement;
        if (!el) return;
        gsap.killTweensOf(el.querySelectorAll('h2, .contact-list .row'));
        gsap.set(el.querySelectorAll('h2, .contact-list .row'), { opacity: 0, x: 26 });
        requestAnimationFrame(() => this.contattiAnimazioni.ingresso(el));
      })
    );
  }

    ngAfterViewInit(): void {
    sessionStorage.setItem('vengo_da_contatti', 'true');
    if (sessionStorage.getItem('pagina_registrazione')) {
      sessionStorage.setItem('vengo_da_registrazione', 'true');
    }
    UtilityService.nascondiSottotitoloEScrol();
        if (this.contattiContenuto?.nativeElement) {
           this.contattiAnimazioni.preparaStatoIniziale(
        this.contattiContenuto.nativeElement,
        this.sonoLoggato
      );
    }

    this.viewReady = true;
    this.avviaAnimazioniSePronto();

    // footer IN (come già funziona)
        const footer = document.querySelector('footer') as HTMLElement | null;
    if (footer) {
      gsap.killTweensOf(footer);
      gsap.set(footer, {
        scaleY: 0,
        transformOrigin: 'bottom center',
        opacity: 0,
      });

      gsap.to(footer, {
        scaleY: 1,
        opacity: 1,
        duration: 0.3,
        delay: 0.25,
        ease: 'power2.out',
      });
    }

    const footerP = document.querySelector('#footer-p') as HTMLElement | null;
    if (footerP) {
      gsap.killTweensOf(footerP);
      gsap.set(footerP, { opacity: 0 });
      gsap.to(footerP, {
        opacity: 1,
        duration: 0.6,
        delay: 0.55,
        ease: 'power2.out',
      });
    }
  }
ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
  private avviaAnimazioniSePronto(): void {
    if (!this.viewReady || !this.datiReady) return;
    if (!this.contattiContenuto?.nativeElement) return;
if (this.sonoLoggato) return;
    // ✅ parte solo quando dati  view sono pronti
    requestAnimationFrame(() => {
      this.contattiAnimazioni.animaIngresso(this.contattiContenuto.nativeElement);
    });
  }
   tornaIndietro(): void {
    if (sessionStorage.getItem('vengo_da_registrazione')) {
      this.router.navigate(['/']);
      return;
    }
    window.history.back();
  }

animaUscita(): Promise<void> {
  if (!this.contattiContenuto?.nativeElement) return Promise.resolve();
  return this.contattiAnimazioni.animaUscita(this.contattiContenuto.nativeElement);
}
}
