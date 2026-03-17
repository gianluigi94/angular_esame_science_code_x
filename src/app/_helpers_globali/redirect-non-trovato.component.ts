import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CambioLinguaService } from '../_servizi_globali/cambio-lingua.service';

@Component({ template: '' })
export class RedirectNonTrovatoComponent implements OnInit {
  constructor(
    private router: Router,
    private cambioLinguaService: CambioLinguaService
  ) {}

  ngOnInit(): void {
    const lang = this.cambioLinguaService.leggiCodiceLingua();
    const rotta = lang === 'it' ? '/it/non-trovato' : '/en/not-found';
    this.router.navigateByUrl(rotta, { replaceUrl: true });
  }
}
