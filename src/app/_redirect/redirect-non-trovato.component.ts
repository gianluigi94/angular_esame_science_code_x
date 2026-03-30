// reindirizza subito alla pagina 404 coerente con la lingua corrente.
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CambioLinguaService } from '../_servizi_globali/cambio-lingua.service';

@Component({ template: '' })
export class RedirectNonTrovatoComponent implements OnInit {
  constructor(
    private router: Router,
    private cambioLinguaService: CambioLinguaService
  ) {}

  /**
   * Gestisce il reindirizzamento iniziale verso la pagina 404 localizzata.
   *
   * Legge la lingua corrente e costruisce la rotta corretta
   * prima di eseguire la navigazione sostitutiva.
   *
   * @returns void
   */
  ngOnInit(): void {
    const lang = this.cambioLinguaService.leggiCodiceLingua(); // leggo il codice lingua corrente
    const rotta = lang === 'it' ? '/it/non-trovato' : '/en/not-found'; // costruisco la rotta 404 coerente con la lingua
    this.router.navigateByUrl(rotta, { replaceUrl: true }); // navigo alla 404 sostituendo la voce corrente nella cronologia
  }
}
