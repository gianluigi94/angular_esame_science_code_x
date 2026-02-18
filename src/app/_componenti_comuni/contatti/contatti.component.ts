import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { UtilityService } from 'src/app/_benvenuto/login/_login_service/login_utility.service';
import { LoginAnimazioniService } from 'src/app/_servizi_globali/animazioni_saturno/gsap/login_animazioni.service';

@Component({
  selector: 'app-contatti',
  templateUrl: './contatti.component.html',
  styles: [`:host { display: block; }`],
})
export class ContattiComponent implements AfterViewInit {
  @ViewChild('contattiContenuto', { static: true })
  contattiContenuto!: ElementRef<HTMLElement>;

  constructor(private loginAnimazioniService: LoginAnimazioniService) {}

 ngAfterViewInit(): void {
  sessionStorage.setItem('vengo_da_contatti', 'true');
  UtilityService.nascondiSottotitoloEScrol();
}


  animaUscita(): Promise<void> {
    if (!this.contattiContenuto?.nativeElement) {
      return Promise.resolve();
    }
    return this.loginAnimazioniService.animaUscita(
      this.contattiContenuto.nativeElement
    );
  }
}
