import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { IndirizzoFormService } from 'src/app/_servizi_globali/indirizzo-form.service';
import { IscrizioneFormService } from './iscrizione-form.service';

@Injectable()
export class IscrizioneStep2Service extends IndirizzoFormService {

  prezzoBase    = '5€';
  prezzoPremium = '10€';

  constructor(
    private fs:         IscrizioneFormService,
    private apiService: ApiService,
    cambioLinguaService: CambioLinguaService,
    translateService:    TranslateService,
  ) {
    super(cambioLinguaService, translateService);
    this.inizializza(this.fs.reactiveFormStep2, this.fs.nazioni, this.fs.comuni, 'IT');
  }

  override get form() { return this.fs.reactiveFormStep2; }
  override get nazioni() { return this.fs.nazioni; }
  override get comuni() { return this.fs.comuni; }
  override set nazioni(_: any[]) {}
  override set comuni(_: any[]) {}

  aggiornaPrezzi(iso: string): void {
    this.apiService.getPrezziNazione(iso).subscribe({
      next: (rit) => {
        const d = rit.data;
        if (!d || !d.tasso || parseFloat(d.tasso) <= 0) {
          this.prezzoBase = '5€'; this.prezzoPremium = '10€'; return;
        }
        const tasso:    number = parseFloat(d.tasso);
        const aliquota: number = d.aliquota ? parseFloat(d.aliquota) / 100 : 0;
        const simbolo:  string = d.valuta_simbolo ?? '€';
        const prezzoBase    = d.prezzo_base_mensile    ? parseFloat(d.prezzo_base_mensile)    : 5;
        const prezzoPremium = d.prezzo_premium_mensile ? parseFloat(d.prezzo_premium_mensile) : 10;
        const calcola  = (base: number) =>
          `${(base * tasso * (1 + aliquota)).toFixed(2)}${simbolo}`;
        this.prezzoBase    = calcola(prezzoBase);
        this.prezzoPremium = calcola(prezzoPremium);
      },
      error: () => { this.prezzoBase = '5€'; this.prezzoPremium = '10€'; },
    });
  }

  override selezionaPaeseDom(valore: string): void {
    super.selezionaPaeseDom(valore);
    this.aggiornaPrezzi(valore);
  }
}
