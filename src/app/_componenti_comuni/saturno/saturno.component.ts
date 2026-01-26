import { Component, OnInit, OnDestroy, Output, EventEmitter, Input} from '@angular/core';
import { SaturnoService } from '../../_servizi_globali/animazioni_saturno/three/saturno.service';
import { ScrollWelcomeService } from '../../_servizi_globali/animazioni_saturno/gsap/scroll-welcome.service';

@Component({
  selector: 'app-saturno',
  templateUrl: './saturno.component.html',
  styleUrls: ['./saturno.component.scss'],
})
export class SaturnoComponent implements OnInit, OnDestroy {
   @Output() saturnLoadDone = new EventEmitter<void>(); // espongo un evento verso l'esterno per segnalare quando Saturno ha finito di caricarsi

  @Input() usaAnimazioniIngresso: boolean = true; // mi faccio dire dall'esterno se devo usare le animazioni di ingresso, e di default le uso
  @Input() usaAnimazioniScroll: boolean = true; // mi faccio dire dall'esterno se devo usare le animazioni legate allo scroll, e di default le uso

  saturnoService: SaturnoService; // mi tengo un riferimento al servizio che gestisce scena, camera e ciclo di rendering
  scrollWelcomeService: ScrollWelcomeService; // mi tengo un riferimento al servizio che gestisce le animazioni di scroll nella pagina di benvenuto

  constructor( // ricevo i servizi necessari tramite iniezione delle dipendenze
    saturnoService: SaturnoService, // mi arriva il servizio che inizializza e gestisce Saturno
    scrollWelcomeService: ScrollWelcomeService // mi arriva il servizio che avvia e ferma le animazioni di scroll
  ) {
    this.saturnoService = saturnoService; // salvo il servizio di Saturno nella proprietà della classe
    this.scrollWelcomeService = scrollWelcomeService; // salvo il servizio delle animazioni di scroll nella proprietà della classe
  }

  /**
   * Metodo di inizializzazione del componente.
   *
   * Logica applicata:
   * - inizializza Saturno (con o senza animazioni di ingresso)
   * - emette l'evento di caricamento completato
   * - avvia le animazioni di scroll se abilitate e se la scena è pronta
   */
  ngOnInit(): void {
    this.saturnoService.initializeSaturn(this.usaAnimazioniIngresso).then(() => { // inizializzo Saturno e aspetto che abbia finito
      this.saturnLoadDone.emit(); // notifico all'esterno che il caricamento è completato

      const scene = this.saturnoService.getScene(); // recupero la scena pronta dal servizio
      const camera = this.saturnoService.getCamera(); // recupero la camera pronta dal servizio
      const light = this.saturnoService.getDirectionalLight(); // recupero la luce direzionale pronta dal servizio

      if (scene && camera && light && this.usaAnimazioniScroll) { // avvio le animazioni di scroll solo se ho tutto e sono abilitate
        this.scrollWelcomeService.runAllAnimations(scene, camera, light); // faccio partire tutte le animazioni di scroll sulla scena
      }
    });
  }

  /**
   * Metodo di distruzione del componente.
   *
   * Logica applicata:
   * - interrompe le animazioni di scroll se attive
   * - spegne il ciclo di rendering di Saturno
   * - rilascia listener e risorse legate alla scena
   *
   * La scena non viene distrutta, ma resa inattiva.
   */
  ngOnDestroy(): void { // ripulisco quando esco dalla pagina o il componente viene distrutto
    if (this.usaAnimazioniScroll) { // se avevo attivato le animazioni di scroll
      this.scrollWelcomeService.stopAllScrollAnimations(); // spengo completamente animazioni e agganci globali legati allo scroll
    }

    this.saturnoService.spegniSaturno(); // spengo il rendering e stacco il canvas senza distruggere la scena
  }

}
