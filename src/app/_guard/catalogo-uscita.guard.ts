// Guard che gestisce l'uscita dal catalogo verso contatti ripristinando sfondo e Saturno se necessario.
import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';
import { SaturnoService } from 'src/app/_servizi_globali/animazioni_saturno/three/saturno.service';
import { SaturnoRouteAnimazioniService } from 'src/app/_servizi_globali/animazioni_saturno/gsap/saturno-route-animazioni.service';
import { AnimateService } from 'src/app/_servizi_globali/animazioni_saturno/animate.service';
import { Authservice } from 'src/app/_benvenuto/login/_login_service/auth.service';
import gsap from 'gsap';

@Injectable({ providedIn: 'root' })
export class CatalogoUscitaGuard implements CanDeactivate<any> {

  constructor(
    private saturnoService: SaturnoService,
    private saturnoRouteAnimazioniService: SaturnoRouteAnimazioniService,
    private animateService: AnimateService,
    private authService: Authservice,
  ) {}

  /**
   * Determina se l'uscita dalla rotta corrente puo' proseguire subito
   * oppure se deve attendere il ripristino visivo di sfondo e Saturno.
   *
   * Applica la logica solo quando la destinazione e' la pagina contatti.
   * @link https://v17.angular.io/guide/router#router-guards
   * @link https://v17.angular.io/api/router/CanDeactivate (forse deprecato, ma funzionante)
   * @param _component Componente corrente in uscita.
   * @param _currentRoute Snapshot della route corrente.
   * @param _currentState Stato corrente del router.
   * @param nextState Stato di destinazione del router.
   * @returns boolean | Promise<boolean>
   */
  canDeactivate(
    _component: any,
    _currentRoute: any,
    _currentState: any,
    nextState?: any
  ): boolean | Promise<boolean> {
    const targetUrl = String(nextState?.url || ''); // leggo l'URL di destinazione o uso stringa vuota
    const pathPulito = targetUrl.split('?')[0].split('#')[0]; // pulisco l'URL da query string e fragment

    const vaInContatti = /^\/(it|en)\/(contatti|contact)(\/|$)/.test(pathPulito); // verifico se la navigazione va verso contatti
    if (!vaInContatti) return true; // lascio passare subito se non sto andando verso contatti

    const sonoLoggato = !!this.authService.leggiObsAuth().value?.tk; // controllo se l'utente risulta autenticato
    if (sonoLoggato) { // verifico se l'utente e' loggato
      window.dispatchEvent(new CustomEvent('apri-dati-personali')); // apro subito i dati personali come nel footer
    }

    const saturnoEl = document.querySelector('app-saturno') as HTMLElement | null; // recupero l'elemento Saturno dal DOM
    const sfondoEl = document.querySelector('app-sfondo') as HTMLElement | null; // recupero l'elemento sfondo dal DOM

    const opacitaSaturno = saturnoEl ? parseFloat(getComputedStyle(saturnoEl).opacity) : 1; // leggo l'opacita' attuale di Saturno
    const opacitaSfondo = sfondoEl ? parseFloat(getComputedStyle(sfondoEl).opacity) : 1; // leggo l'opacita' attuale dello sfondo

    const saturnoNascosto = opacitaSaturno < 0.1; // verifico se Saturno e' di fatto nascosto
    const sfondoNascosto = sfondoEl ? opacitaSfondo < 0.1 : false; // verifico se lo sfondo e' di fatto nascosto

    if (!saturnoNascosto && !sfondoNascosto) return true; // lascio passare subito se sono gia' entrambi visibili

    return new Promise<boolean>((resolve) => { // aspetto il ripristino visivo prima di permettere la navigazione
      const scena = this.saturnoService.getScene(); // recupero la scena 3D corrente
      const luce = this.saturnoService.getDirectionalLight(); // recupero la luce direzionale corrente

      this.saturnoService.riaccendiSaturno(); // riaccendo lo stato visivo di Saturno

      if (saturnoEl) { // controllo se l'elemento Saturno esiste nel DOM
        gsap.killTweensOf(saturnoEl); // fermo eventuali tween attivi su Saturno
        saturnoEl.style.opacity = '1'; // porto subito visibile l'elemento Saturno
      }

      const tl = gsap.timeline(); // preparo una timeline GSAP per il ripristino visivo

      if (sfondoEl) { // controllo se l'elemento sfondo esiste nel DOM
        gsap.killTweensOf(sfondoEl); // fermo eventuali tween attivi sullo sfondo
        sfondoEl.style.opacity = '0'; // parto da sfondo invisibile
        tl.fromTo(
          sfondoEl,
          { opacity: 0 }, // imposto l'opacita' iniziale dello sfondo
          { opacity: 1, duration: 1.05, ease: 'power2.out' }, // animo lo sfondo fino a farlo riapparire
          0 // faccio partire l'animazione all'inizio della timeline
        );
      }

      if (scena) { // controllo se la scena 3D e' disponibile
        this.saturnoRouteAnimazioniService.animaVerso(
          scena, 'LOGIN_LATERALE', 0.75, luce || undefined // animo la scena verso l'assetto laterale usando la luce se presente
        );
      }

      setTimeout(() => resolve(true), 1050); // sblocco la navigazione quando il ripristino visivo e' terminato
    });
  }
}
