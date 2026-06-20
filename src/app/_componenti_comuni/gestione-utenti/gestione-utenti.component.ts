import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { take } from 'rxjs';
import gsap from 'gsap';
import { ApiService } from 'src/app/_servizi_globali/api.service';

interface AccessoUtente {
  id_contatto: number;
  nome: string;
  cognome: string;
  accessi: string[];
}

@Component({
  selector: 'app-gestione-utenti',
  templateUrl: './gestione-utenti.component.html',
  styleUrls: ['./gestione-utenti.component.scss'],
})
export class GestioneUtentiComponent implements OnInit {
  @Output() chiudi = new EventEmitter<void>();

  vistaCorrente: 'accessi' = 'accessi';

  accessiUtenti: AccessoUtente[] = [];
  caricamentoAccessi = false;
  utenteEspanso: number | null = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.caricaAccessi();
    setTimeout(() => this.avviaAnimazioniIngresso(), 0);
  }

  private caricaAccessi(): void {
    this.caricamentoAccessi = true;
    this.api.getAccessiUtenti().pipe(take(1)).subscribe({
      next: (rit) => {
        this.accessiUtenti = rit.data ?? [];
        this.caricamentoAccessi = false;
      },
      error: () => {
        this.accessiUtenti = [];
        this.caricamentoAccessi = false;
      },
    });
  }

  cambiaVista(vista: 'accessi'): void {
    if (this.vistaCorrente === vista) return;
    this.vistaCorrente = vista;
  }

  toggleUtente(idContatto: number): void {
    this.utenteEspanso = this.utenteEspanso === idContatto ? null : idContatto;
  }

  avviaAnimazioniIngresso(): void {
    const box = document.querySelector('.gu-box') as HTMLElement | null;
    const menu = document.querySelector('.gu-menu') as HTMLElement | null;
    const contenuto = document.querySelector('.gu-campo-animato') as HTMLElement | null;
    const sfocatura = document.querySelector('.gu-sfocatura') as HTMLElement | null;

    if (sfocatura) gsap.set(sfocatura, { opacity: 0 });
    if (box) gsap.set(box, { opacity: 0 });
    if (menu) gsap.set(menu, { opacity: 0, scaleX: 0, transformOrigin: 'left center' });
    if (contenuto) gsap.set(contenuto, { opacity: 0, scaleX: 0, transformOrigin: 'center center' });

    if (sfocatura) gsap.to(sfocatura, { opacity: 1, duration: 0.7, ease: 'power2.out' });
    if (box) gsap.to(box, { opacity: 1, duration: 0.4, ease: 'power2.out' });
    if (menu) gsap.to(menu, { opacity: 1, scaleX: 1, duration: 0.55, ease: 'power2.out' });
    if (contenuto) gsap.to(contenuto, { opacity: 1, scaleX: 1, duration: 0.55, delay: 0.12, ease: 'power2.out' });
  }

  chiudiPannello(): void {
    const box = document.querySelector('.gu-box') as HTMLElement | null;
    const menu = document.querySelector('.gu-menu') as HTMLElement | null;
    const contenuto = document.querySelector('.gu-campo-animato') as HTMLElement | null;
    const sfocatura = document.querySelector('.gu-sfocatura') as HTMLElement | null;

    if (menu) gsap.to(menu, { opacity: 0, scaleX: 0, duration: 0.3, ease: 'power2.in', transformOrigin: 'left center' });
    if (contenuto) gsap.to(contenuto, { opacity: 0, scaleX: 0, duration: 0.3, ease: 'power2.in', transformOrigin: 'center center' });
    if (sfocatura) gsap.to(sfocatura, { opacity: 0, duration: 0.4, ease: 'power2.in' });

    if (!box) {
      this.chiudi.emit();
      return;
    }

    gsap.to(box, {
      opacity: 0,
      scaleX: 0,
      duration: 0.4,
      ease: 'power2.in',
      transformOrigin: 'center center',
      onComplete: () => this.chiudi.emit(),
    });
  }
}
