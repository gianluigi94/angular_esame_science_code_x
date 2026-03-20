import { Component, OnInit, AfterViewInit } from '@angular/core';
import { UtilityService } from '../login/_login_service/login_utility.service';
import gsap from 'gsap';

const CHIAVE_PAGINA_REGISTRAZIONE = 'pagina_registrazione';

@Component({
  selector: 'app-iscrizione',
  templateUrl: './iscrizione.component.html',
  styleUrls: ['./iscrizione.component.scss']
})
export class IscrizioneComponent implements OnInit, AfterViewInit {

  saltaAnimazioneUscita: boolean = false;

  ngOnInit(): void {
    try { sessionStorage.setItem(CHIAVE_PAGINA_REGISTRAZIONE, '1'); } catch {}
  }

  ngAfterViewInit(): void {
    UtilityService.nascondiSottotitoloEScrol();
    this.animaEntrata();
  }

  private animaEntrata(): void {
    const titolo = document.querySelector('.titolo-animato') as HTMLElement;
    const labels = document.querySelectorAll('.label-sopra');
    const righe = document.querySelectorAll('.campo-animato');

    // setto tutto invisibile
    gsap.set(titolo, { opacity: 0 });
    gsap.set(labels, { opacity: 0 });
    gsap.set(righe, { opacity: 0, scaleX: 0, transformOrigin: 'center center' });

    // titolo: come la CTA, fade lento
   // titolo: come la CTA, fade lento
    gsap.to(titolo, {
      opacity: 1,
      delay: 0.35,
      duration: 2.2,
      ease: 'power2.out',
    });

    // labels: come la CTA, fade lento con stagger
    gsap.to(labels, {
      opacity: 1,
      duration: 2.2,
      ease: 'power2.out',
      stagger: 0.15,
    });

    // righe: come il form email, scaleX + fade
    gsap.to(righe, {
      opacity: 1,
      scaleX: 1,
      duration: 1,
      ease: 'power2.out',
      stagger: 0.15,
    });
  }

  animaUscita(): Promise<void> {
    return Promise.resolve();
  }
}
