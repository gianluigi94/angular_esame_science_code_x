import { Component, AfterViewInit } from '@angular/core';
import { AnimateService } from 'src/app/_servizi_globali/animazioni_saturno/animate.service';
import {
  vengoDaBenvenutoDaSessione,
  salvaPathNonTrovatoDopoCaricamento,
  leggiWelcomeTitoloStatoDaSessione,
} from 'src/app/_helpers_globali/helpers';

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.scss']
})
export class NotFoundComponent implements AfterViewInit {

  public vengoDaBenvenuto: boolean = false;

  // ✅ controlla la classe .show della maschera
  public mostra404 = false;

  constructor(private animateService: AnimateService) {}

  ngAfterViewInit(): void {
    // --- la tua logica attuale ---
    this.vengoDaBenvenuto = vengoDaBenvenutoDaSessione();

    const titoloStato = leggiWelcomeTitoloStatoDaSessione();
    const titoloEraCentrale = !titoloStato || titoloStato === 'CENTRO';

    const devoAnimareTitolo = this.vengoDaBenvenuto && titoloEraCentrale;

    requestAnimationFrame(() => {
      if (!devoAnimareTitolo) {
        this.animateService.setXNormale();
        this.animateService.setTitoloAltoGlobal();
      } else {
        this.animateService.setTitoloCentraleGlobal();
        this.animateService.setXGif();

        requestAnimationFrame(() => {
          this.animateService.setXNormale();
          this.animateService.animateTitoloVersoAltoGlobal(0.9, 0.05);
        });
      }

      requestAnimationFrame(() => {
        setTimeout(() => {
          salvaPathNonTrovatoDopoCaricamento(window.location.pathname);
        }, 0);
      });
    });

    // ✅ avvio effetto wipe del 404 dopo qualche ms
    setTimeout(() => {
      this.mostra404 = true;
    }, 250);
  }
}
