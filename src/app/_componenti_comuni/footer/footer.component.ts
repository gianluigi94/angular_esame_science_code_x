import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Authservice } from 'src/app/_benvenuto/login/_login_service/auth.service';
import { ContattiNavigazioneService } from 'src/app/_helpers_globali/contatti-navigazione.service';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
})
export class FooterComponent {

  constructor(
    private router: Router,
    private authService: Authservice,
    private contattiNav: ContattiNavigazioneService,
  ) {}

  get isContactRoute(): boolean {
    const url = this.router.url.split('?')[0].split('#')[0];
    return /^\/(it\/contatti|en\/contact)(\/|$)/.test(url);
  }

  get sonoLoggato(): boolean {
    return !!this.authService.leggiObsAuth().value?.tk;
  }

  tornaIndietro(event: Event): void {
    event.preventDefault();
    window.history.back();
  }

  onContattiClick(event: Event): void {
    event.preventDefault();
    this.contattiNav.vai();
  }
}
