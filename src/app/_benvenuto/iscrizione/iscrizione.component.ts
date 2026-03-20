import { Component, OnInit, AfterViewInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { UtilityService } from '../login/_login_service/login_utility.service';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { DateAdapter } from '@angular/material/core';
import { Subscription } from 'rxjs';
import gsap from 'gsap';

const CHIAVE_PAGINA_REGISTRAZIONE = 'pagina_registrazione';

@Component({
  selector: 'app-iscrizione',
  templateUrl: './iscrizione.component.html',
  styleUrls: ['./iscrizione.component.scss']
})
export class IscrizioneComponent implements OnInit, AfterViewInit, OnDestroy {

saltaAnimazioneUscita: boolean = false;
  private subLingua?: Subscription;
  sessoAperto = false;
  sessoValore = '';
  paeseAperto = false;
  paeseValore = '';
  comuneAperto = false;
  comuneValore = '';
  nazioni: any[] = [];
  comuni: any[] = [];
  constructor(
    private dateAdapter: DateAdapter<Date>,
    public cambioLinguaService: CambioLinguaService,
    private apiService: ApiService,
    private eRef: ElementRef
  ) {}

  @HostListener('document:click', ['$event'])
  chiudiDropdown(event: Event): void {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.sessoAperto = false;
      this.paeseAperto = false;
      this.comuneAperto = false;
    }
  }
  sessoLabel(): string {
    if (!this.sessoValore) return 'Seleziona sesso';
    const map: Record<string, string> = { M: 'Maschio', F: 'Femmina', NS: 'Non specificato' };
    return map[this.sessoValore] ?? '';
  }

 selezionaSesso(valore: string, label: string): void {
    this.sessoValore = valore;
    this.sessoAperto = false;
  }

  paeseLabel(): string {
    if (!this.paeseValore) return 'Seleziona paese';
    const nazione = this.nazioni.find(n => n.iso === this.paeseValore);
    if (!nazione) return this.paeseValore;
    const codice = this.cambioLinguaService.leggiCodiceLingua();
    return codice === 'it' ? nazione.nazione_it : nazione.nazione_en;
  }

  selezionaPaese(valore: string, label: string): void {
    this.paeseValore = valore;
    this.paeseAperto = false;
  }

  comuneLabel(): string {
    return this.comuneValore || 'Seleziona comune';
  }

  selezionaComune(valore: string): void {
    this.comuneValore = valore;
    this.comuneAperto = false;
  }



ngOnInit(): void {
    try { sessionStorage.setItem(CHIAVE_PAGINA_REGISTRAZIONE, '1'); } catch {}

    this.dateAdapter.setLocale(this.cambioLinguaService.leggiCodiceLingua() === 'it' ? 'it-IT' : 'en-GB');

    this.subLingua = this.cambioLinguaService.cambioLinguaApplicata$.subscribe(({ codice }) => {
      this.dateAdapter.setLocale(codice === 'it' ? 'it-IT' : 'en-GB');
    });

    this.apiService.getNazioni().subscribe(rit => {
      this.nazioni = rit.data ?? [];
    });

    this.apiService.getComuni().subscribe(rit => {
      this.comuni = rit.data ?? [];
    });
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

  soloNumeri(event: KeyboardEvent): void {
    const tasti_permessi = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
    if (tasti_permessi.includes(event.key)) return;
    if (!/^\d$/.test(event.key)) event.preventDefault();
  }

  avanzaData(event: Event, campo: 'gg' | 'mm'): void {
    const input = event.target as HTMLInputElement;
    const maxLen = campo === 'gg' ? 2 : 2;
    if (input.value.length >= maxLen) {
      const prossimo = campo === 'gg'
        ? document.getElementById('data_mm')
        : document.getElementById('data_aaaa');
      prossimo?.focus();
    }
  }

  ngOnDestroy(): void {
    this.subLingua?.unsubscribe();
  }
 dataCompilata(): boolean {
    const gg = (document.getElementById('data_gg') as HTMLInputElement)?.value;
    const mm = (document.getElementById('data_mm') as HTMLInputElement)?.value;
    const aaaa = (document.getElementById('data_aaaa') as HTMLInputElement)?.value;
    return !!(gg || mm || aaaa);
  }
  animaUscita(): Promise<void> {
    return Promise.resolve();
  }

   onDatePickerChange(event: any): void {
    const data: Date = event.value;
    if (!data) return;

    const gg = String(data.getDate()).padStart(2, '0');
    const mm = String(data.getMonth() + 1).padStart(2, '0');
    const aaaa = String(data.getFullYear());

    (document.getElementById('data_gg') as HTMLInputElement).value = gg;
    (document.getElementById('data_mm') as HTMLInputElement).value = mm;
    (document.getElementById('data_aaaa') as HTMLInputElement).value = aaaa;
  }
}
