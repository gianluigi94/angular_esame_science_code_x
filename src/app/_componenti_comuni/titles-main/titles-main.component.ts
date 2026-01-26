//logica dell'elemento che funge da titolo/logo che fa riferimento anche alla scena 3D in cui spesso si relaziona

import { Component, ElementRef, AfterViewInit, ViewEncapsulation} from '@angular/core';
import { Router } from '@angular/router';
import { PerformanceService } from '../../_servizi_globali/performance.service';
import { AnimateService } from '../../_servizi_globali/animazioni_saturno/animate.service';
import * as THREE from 'three';
import { isMobileOrTablet } from 'src/app/_helpers_globali/helpers';

@Component({
  selector: 'app-titles-main',
  templateUrl: './titles-main.component.html',
  styleUrls: ['./titles-main.component.scss'],
  encapsulation: ViewEncapsulation.None, //permette al CSS del componente di "uscire" e influenzare anche elementi esterni
})
export class TitlesMainComponent implements AfterViewInit {
  private light: THREE.DirectionalLight | null = null; // mi tengo un riferimento alla luce direzionale da animare (inizio con null)
  private particleGroups: THREE.Group[] = []; // mi tengo una lista di gruppi di particelle da animare (inizio vuota)

  constructor(
    private elementRef: ElementRef,
    private performanceService: PerformanceService,
    private animateService: AnimateService,
    private router: Router
  ) {}

  public isLowPerf: boolean = false; // espongo un flag pubblico per sapere se devo usare modalità “low performance”

  /**
   * Hook del ciclo di vita che viene eseguito dopo il rendering della view.
   *
   * Logica applicata:
   * - recupera gli elementi DOM necessari alle animazioni
   * - determina se il dispositivo è a basse prestazioni o mobile
   * - avvia le animazioni del titolo e degli elementi collegati
   *
   * Le animazioni vengono avviate solo quando la view è stabile
   * per evitare problemi di sincronizzazione.
   */
  ngAfterViewInit(): void {
    // entro nell’hook che scatta quando la view è stata renderizzata e gli elementi DOM esistono
    const firstElement = this.elementRef.nativeElement.querySelector(
      '.first'
    ) as HTMLElement; // recupero l’elemento .first dal DOM del componente

    this.performanceService.isLowEndPC$.subscribe((isLowEnd) => {
      // mi sottoscrivo allo stream che mi dice se il pc è di fascia bassa
      setTimeout(() => {
        // rimando al tick successivo per essere sicuro che la view sia stabile prima di animare
        this.isLowPerf = isLowEnd || isMobileOrTablet(); // imposto lowPerf se il device è low-end oppure se è mobile/tablet

        const xElement = this.elementRef.nativeElement.querySelector(
          '[data-titolo-x]'
        ) as HTMLElement; // recupero l’elemento con attributo data-titolo-x

        this.animateService.animateAll(
          // chiamo il servizio per avviare tutte le animazioni
          firstElement, // passo l'elemento principale da animare
          xElement, // passo l'elemento X/titolo da animare
          this.light, // passo la luce da animare se esiste
          this.particleGroups // passo i gruppi di particelle da animare
        );
      }, 0);
    });
  }
}
