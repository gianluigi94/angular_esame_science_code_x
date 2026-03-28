import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
@Component({
  selector: 'app-redirect-vuoto',
  template: '',
})
export class RedirectVuotoComponent implements OnInit {
    constructor(
    private router: Router,
    private cambioLingua: CambioLinguaService,
  ) {}

  ngOnInit(): void {
    // se sono gia' sotto /it o /en, non faccio nulla: ci pensa AvvioGuard sul path figlio ''
    const path = (this.router.url || '').split('?')[0].split('#')[0];
    if (/^\/(it|en)(\/|$)/.test(path)) return;

    const salvata = localStorage.getItem('lingua_utente') || '';
    const codice = salvata === 'italiano' ? 'it' : salvata === 'inglese' ? 'en' : this.codiceDaBrowser();
    const prefisso = codice === 'it' ? '/it' : '/en';
    this.cambioLingua.impostaLinguaDaCodice(codice, false);
    this.router.navigateByUrl(prefisso, { replaceUrl: true });
  }

  codiceDaBrowser(): string {
    const primaria = (navigator.languages?.[0] || navigator.language || '').toLowerCase().trim();
    return primaria === 'it' || primaria.startsWith('it-') ? 'it' : 'en';
  }
}

