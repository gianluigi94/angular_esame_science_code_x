// reindirizza la root vuota verso il prefisso lingua corretto.
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

  /**
   * Gestisce il reindirizzamento iniziale dalla root vuota.
   *
   * Se l'URL e' gia' sotto un prefisso lingua non interviene.
   * Altrimenti determina la lingua corretta e naviga verso /it o /en.
   *
   * @returns void
   */
  ngOnInit(): void {
    const path = (this.router.url || '').split('?')[0].split('#')[0]; // pulisco l'URL corrente da query string e fragment
    if (/^\/(it|en)(\/|$)/.test(path)) return; // non faccio nulla se sono gia' sotto un prefisso lingua

    const salvata = localStorage.getItem('lingua_utente') || ''; // leggo l'eventuale lingua salvata
    const codice = salvata === 'italiano' ? 'it' : salvata === 'inglese' ? 'en' : this.codiceDaBrowser(); // ricavo il codice lingua da storage o browser
    const prefisso = codice === 'it' ? '/it' : '/en'; // costruisco il prefisso lingua corretto
    this.cambioLingua.impostaLinguaDaCodice(codice, false); // allineo lo stato globale della lingua senza salvarla forzatamente da URL
    this.router.navigateByUrl(prefisso, { replaceUrl: true }); // navigo al prefisso lingua sostituendo la voce corrente nella cronologia
  }

  /**
   * Determina il codice lingua a partire dalla configurazione del browser.
   *
   * Considera italiana qualsiasi lingua primaria uguale a 'it'
   * o che inizi con 'it-'; in tutti gli altri casi usa 'en'.
   *
   * @returns string Il codice lingua ricavato dal browser.
   */
  codiceDaBrowser(): string {
    const primaria = (navigator.languages?.[0] || navigator.language || '').toLowerCase().trim(); // leggo e normalizzo la lingua primaria del browser
    return primaria === 'it' || primaria.startsWith('it-') ? 'it' : 'en'; // restituisco il codice lingua coerente
  }
}
