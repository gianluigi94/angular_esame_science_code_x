import { AnimateService } from 'src/app/_servizi_globali/animazioni_saturno/animate.service';
import {
  vengoDaBenvenutoDaSessione,
  salvaPathNonTrovatoDopoCaricamento,
} from 'src/app/_helpers_globali/helpers';
import { Component, AfterViewInit, OnInit, OnDestroy } from '@angular/core';
import { Authservice } from 'src/app/_benvenuto/login/_login_service/auth.service';
import { Router } from '@angular/router';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { Subscription } from 'rxjs';
import { NotFoundCloseService } from '../titles-main/not-found-close.service';
import { TraduzioniService } from 'src/app/_servizi_globali/traduzioni.service';
@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.scss']
})
export class NotFoundComponent implements AfterViewInit, OnInit, OnDestroy {
  private subClose404?: Subscription;


  public vengoDaBenvenuto: boolean = false;

  // ✅ controlla la classe .show della maschera
  public mostra404 = false;
  public animazione404InCorso = false;
  traduzioniPronte = false;
  public navigazioneInCorso = false;
  private deveRicaricare = false;
  public timerFallbackNavigazione: any = 0;
    constructor(
    private animateService: AnimateService,
    private notFoundClose: NotFoundCloseService,
    private authService: Authservice,
    private router: Router,
    private traduzioniService: TraduzioniService,
    public cambioLinguaService: CambioLinguaService
  ) {}

ngAfterViewInit(): void {
    this.vengoDaBenvenuto = vengoDaBenvenutoDaSessione();

    requestAnimationFrame(() => {
      this.animateService.setXNormale();
      this.animateService.setTitoloAltoGlobal();

      requestAnimationFrame(() => {
        setTimeout(() => {
          salvaPathNonTrovatoDopoCaricamento(window.location.pathname);
        }, 0);
      });
    });

    setTimeout(() => { this.mostra404 = true; }, 600);
}

    chiudi404DaClick(): void {
    const auth = this.authService.leggiObsAuth().value;
    const autenticato = auth && auth.tk !== null;
    this.deveRicaricare = !autenticato;
    this.chiudi404();
  }

  chiudi404(): void {
    if (this.animazione404InCorso) return;
    if (this.navigazioneInCorso) return;
    if (!this.mostra404) return; // e' gia' chiuso

    this.animazione404InCorso = true;
    this.mostra404 = false;

    // fallback: se transitionend non parte, navigo lo stesso
    if (this.timerFallbackNavigazione) {
      clearTimeout(this.timerFallbackNavigazione);
      this.timerFallbackNavigazione = 0;
    }
    this.timerFallbackNavigazione = setTimeout(() => {
      this.eseguiNavigazioneCatalogo();
    }, 420); // metti poco sopra la durata reale css (es. 380ms)
  }


  onMaskTransitionEnd(event: TransitionEvent): void {
       if (!this.animazione404InCorso) return;
    // niente filtri stretti su propertyName/target: spesso bloccano tutto
    this.eseguiNavigazioneCatalogo();
   }

  eseguiNavigazioneCatalogo(): void {
    if (this.navigazioneInCorso) return;

    this.navigazioneInCorso = true;
    this.animazione404InCorso = false;

    if (this.timerFallbackNavigazione) {
      clearTimeout(this.timerFallbackNavigazione);
      this.timerFallbackNavigazione = 0;
    }

     try {
      sessionStorage.setItem('transizione_404_catalogo', '1');
    } catch {}

    if (this.deveRicaricare) {
      setTimeout(() => {
        window.location.href = '/';
      }, 600);
      return;
    }

    const lingua = this.cambioLinguaService.leggiCodiceLingua();
    const baseCatalogo =
      lingua === 'it'
        ? '/it/catalogo/film-serie'
        : '/en/catalog/movies-series';

        setTimeout(() => {
      this.router.navigateByUrl(baseCatalogo);
    }, 600);

  }


ngOnInit(): void {
  this.traduzioniService.traduzioniInizialiCaricate$.subscribe(v => {
    this.traduzioniPronte = v;
  });

   this.subClose404 = this.notFoundClose.close404$.subscribe((reload) => {
    this.deveRicaricare = reload;
    this.chiudi404();
  });
}

ngOnDestroy(): void {
  this.subClose404?.unsubscribe();
}

}
