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

  constructor(private animateService: AnimateService) {}

  ngAfterViewInit(): void {
  // 1) decido subito usando l’ultimo path “buono”
  this.vengoDaBenvenuto = vengoDaBenvenutoDaSessione();

  // 2) leggo lo stato del titolo in welcome (può essere '' se non esiste)
  const titoloStato = leggiWelcomeTitoloStatoDaSessione();
  const titoloEraCentrale = !titoloStato || titoloStato === 'CENTRO'; // <-- manca o è CENTRO

  const devoAnimareTitolo = this.vengoDaBenvenuto && titoloEraCentrale;

  requestAnimationFrame(() => {
    if (!devoAnimareTitolo) {
      // ✅ niente animazione: titolo già alto subito (comportamento vecchio)
      this.animateService.setXNormale();
      this.animateService.setTitoloAltoGlobal();
    } else {
      // ✅ animazione: titolo parte centrale e va su (senza scontro)
      this.animateService.setTitoloCentraleGlobal();
      this.animateService.setXGif();

      requestAnimationFrame(() => {
        this.animateService.setXNormale();
        this.animateService.animateTitoloVersoAltoGlobal(0.9, 0.05);
      });
    }

    // 3) DOPO che tutto è partito, aggiorno ultimo_path a "non-trovato"
    requestAnimationFrame(() => {
      setTimeout(() => {
        salvaPathNonTrovatoDopoCaricamento(window.location.pathname);
      }, 0);
    });
  });
}

}
