import { Component, AfterViewInit } from '@angular/core';
import { AnimateService } from 'src/app/_servizi_globali/animazioni_saturno/animate.service';
@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.scss']
})
export class NotFoundComponent implements AfterViewInit {
   constructor(private animateService: AnimateService) {}

   ngAfterViewInit(): void {
    requestAnimationFrame(() => {
      this.animateService.setXNormale();
      this.animateService.setTitoloAltoGlobal();
    });
   }


 }
