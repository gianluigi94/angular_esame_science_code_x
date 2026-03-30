// Componente footer che gestisce il ritorno indietro, il click verso contatti e alcuni controlli legati alla route corrente e allo stato di login.
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Authservice } from 'src/app/_benvenuto/login/_login_service/auth.service';
import { ContattiNavigazioneService } from 'src/app/_servizi_globali/contatti-navigazione.service';

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

  /**
   * Verifica se la route corrente corrisponde alla pagina contatti.
   *
   * Rimuove eventuali query string e fragment prima del controllo.
   *
   * @returns boolean True se la route corrente e' la pagina contatti, false altrimenti.
   */
  get isContactRoute(): boolean {
    const url = this.router.url.split('?')[0].split('#')[0]; // pulisco la route corrente da query string e fragment
    return /^\/(it\/contatti|en\/contact)(\/|$)/.test(url); // verifico se la route punta alla pagina contatti
  }

  /**
   * Verifica se l'utente corrente risulta autenticato.
   *
   * @returns boolean True se esiste un token valido nello stato auth, false altrimenti.
   */
  get sonoLoggato(): boolean {
    return !!this.authService.leggiObsAuth().value?.tk; // controllo se nello stato auth e' presente un token
  }

  /**
   * Gestisce il ritorno alla schermata precedente.
   *
   * Se la route e' una pagina 404 torna alla home e ricarica,
   * se la provenienza e' dalla registrazione torna alla home,
   * altrimenti usa la cronologia del browser.
   *
   * @param event Evento del click da intercettare.
   * @returns void
   */
  tornaIndietro(event: Event): void {
    event.preventDefault(); // blocco il comportamento predefinito del click

    if (this.is404Route) {
      this.router.navigate(['/']).then(() => window.location.reload()); // torno alla home e ricarico se sono sulla pagina 404
    } else if (sessionStorage.getItem('vengo_da_registrazione')) {
      this.router.navigate(['/']); // torno alla home se arrivo dalla registrazione
    } else {
      window.history.back(); // torno indietro nella cronologia del browser
    }
  }

  /**
   * Gestisce il click sul link contatti nel footer.
   *
   * Intercetta il click e delega la navigazione
   * al servizio dedicato.
   *
   * @param event Evento del click da intercettare.
   * @returns void
   */
  onContattiClick(event: Event): void {
    event.preventDefault(); // blocco il comportamento predefinito del click
    this.contattiNav.vai(); // delego la navigazione al servizio dedicato
  }

  /**
   * Verifica se la route corrente corrisponde alla pagina 404.
   *
   * Rimuove eventuali query string e fragment prima del controllo.
   *
   * @returns boolean True se la route corrente e' la pagina 404, false altrimenti.
   */
  get is404Route(): boolean {
    const url = this.router.url.split('?')[0].split('#')[0]; // pulisco la route corrente da query string e fragment
    return /^\/(it\/non-trovato|en\/not-found)(\/|$)/.test(url); // verifico se la route punta alla pagina 404
  }

}
