import { Component, OnDestroy, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Subscription, take } from 'rxjs';
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

  mail: string = '';
  indirizzo: string = '';
  @ViewChild('datiPersonaliContenuto', { static: false })
  datiPersonaliContenuto?: ElementRef<HTMLElement>;
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
    private contattiAnimazioni: ContattiAnimazioniService
  ) {}

  ngOnInit(): void {
    window.addEventListener('apri-dati-personali', this.onApri);
    window.addEventListener('chiudi-dati-personali', this.onChiudi);
    // ✅ se durante la visualizzazione fai logout, chiudo
    this.sub.add(
      this.authService.leggiObsAuth().subscribe(() => {
       if (this.visibile && !this.isLoggato()) this.visibile = false;
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

    private onChiudi = () => {
    if (!this.visibile) return;
    const el = this.datiPersonaliContenuto?.nativeElement;
    if (!el) {
      this.visibile = false;
      return;
    }

    // ✅ anima uscita, poi nascondo
    this.contattiAnimazioni.uscita(el).then(() => {
      this.visibile = false;
      this.viewReady = false;
      this.datiReady = false;
    });
  };
}
