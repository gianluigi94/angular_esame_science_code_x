import { Component, OnInit, AfterViewInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { UtilityService } from '../login/_login_service/login_utility.service';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { Subscription } from 'rxjs';
import gsap from 'gsap';
import { Datepicker } from 'vanillajs-datepicker';
import it from 'vanillajs-datepicker/locales/it';
(Datepicker as any).locales.it = (it as any).it;
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
  private datepicker: any;
  private datepickerAperto = false;

  constructor(
    public cambioLinguaService: CambioLinguaService,
    private apiService: ApiService,
    private eRef: ElementRef
  ) {}

 @HostListener('document:click')
  chiudiDropdown(): void {
    this.sessoAperto = false;
    this.paeseAperto = false;
    this.comuneAperto = false;
  }

  ngOnInit(): void {
    try { sessionStorage.setItem(CHIAVE_PAGINA_REGISTRAZIONE, '1'); } catch {}

    this.apiService.getNazioni().subscribe(rit => {
      this.nazioni = rit.data ?? [];
    });

    this.apiService.getComuni().subscribe(rit => {
      this.comuni = rit.data ?? [];
    });

    this.subLingua = this.cambioLinguaService.cambioLinguaApplicata$.subscribe(({ codice }) => {
      if (this.datepicker) {
        this.datepicker.setOptions({
          language: codice === 'it' ? 'it' : 'en',
        });
      }
    });
  }

  ngAfterViewInit(): void {
    UtilityService.nascondiSottotitoloEScrol();
    this.animaEntrata();
    this.inizializzaDatepicker();
  }

  private inizializzaDatepicker(): void {
    const input = document.getElementById('datepicker-input') as HTMLInputElement;
    if (!input) return;

  const lingua = this.cambioLinguaService.leggiCodiceLingua();
    this.datepicker = new Datepicker(input, {
      format: 'dd/mm/yyyy',
      autohide: true,
      language: lingua === 'it' ? 'it' : 'en',
      weekStart: 1,
    });

    input.addEventListener('show', () => { console.log('📅 datepicker SHOW'); this.datepickerAperto = true; });
    input.addEventListener('hide', () => { console.log('📅 datepicker HIDE'); this.datepickerAperto = false; });

    input.addEventListener('changeDate', (e: any) => {
      const data: Date = e.detail.date;
      if (!data) return;
      const gg = String(data.getDate()).padStart(2, '0');
      const mm = String(data.getMonth() + 1).padStart(2, '0');
      const aaaa = String(data.getFullYear());
      (document.getElementById('data_gg') as HTMLInputElement).value = gg;
      (document.getElementById('data_mm') as HTMLInputElement).value = mm;
      (document.getElementById('data_aaaa') as HTMLInputElement).value = aaaa;
    });
  }

 apriDatepicker(event: Event): void {
    if (!this.datepicker) return;
    event.stopPropagation();
    console.log('🖱️ click bottone — datepickerAperto:', this.datepickerAperto, '| .active:', this.datepicker.active);
    this.datepickerAperto ? this.datepicker.hide() : this.datepicker.show();
  }
  private animaEntrata(): void {
    const titolo = document.querySelector('.titolo-animato') as HTMLElement;
    const labels = document.querySelectorAll('.label-sopra');
    const righe = document.querySelectorAll('.campo-animato');

    gsap.set(titolo, { opacity: 0 });
    gsap.set(labels, { opacity: 0 });
    gsap.set(righe, { opacity: 0, scaleX: 0, transformOrigin: 'center center' });

    gsap.to(titolo, { opacity: 1, delay: 0.35, duration: 2.2, ease: 'power2.out' });
    gsap.to(labels, { opacity: 1, duration: 2.2, ease: 'power2.out', stagger: 0.15 });
    gsap.to(righe, { opacity: 1, scaleX: 1, duration: 1, ease: 'power2.out', stagger: 0.15 });
  }

  sessoLabel(): string {
    if (!this.sessoValore) return 'Seleziona sesso';
    const map: Record<string, string> = { M: 'Maschio', F: 'Femmina', NS: 'Non specificato' };
    return map[this.sessoValore] ?? '';
  }

  selezionaSesso(valore: string): void {
    this.sessoValore = valore;
    this.sessoAperto = false;
  }

  paeseLabel(): string {
    if (!this.paeseValore) return 'Seleziona paese';
    const nazione = this.nazioni.find(n => n.iso === this.paeseValore);
    if (!nazione) return this.paeseValore;
    return this.cambioLinguaService.leggiCodiceLingua() === 'it' ? nazione.nazione_it : nazione.nazione_en;
  }

  selezionaPaese(valore: string): void {
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

toggleSesso(event: Event): void {
    event.stopPropagation();
    this.sessoAperto = !this.sessoAperto;
    if (this.sessoAperto) { this.paeseAperto = false; this.comuneAperto = false; }
  }

  togglePaese(event: Event): void {
    event.stopPropagation();
    this.paeseAperto = !this.paeseAperto;
    if (this.paeseAperto) { this.sessoAperto = false; this.comuneAperto = false; }
  }

  toggleComune(event: Event): void {
    event.stopPropagation();
    this.comuneAperto = !this.comuneAperto;
    if (this.comuneAperto) { this.sessoAperto = false; this.paeseAperto = false; }
  }

  soloNumeri(event: KeyboardEvent): void {
    const tasti_permessi = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
    if (tasti_permessi.includes(event.key)) return;
    if (!/^\d$/.test(event.key)) event.preventDefault();
  }

  avanzaData(event: Event, campo: 'gg' | 'mm'): void {
    const input = event.target as HTMLInputElement;
    if (input.value.length >= 2) {
      const prossimo = campo === 'gg'
        ? document.getElementById('data_mm')
        : document.getElementById('data_aaaa');
      prossimo?.focus();
    }
  }

  dataCompilata(): boolean {
    const gg = (document.getElementById('data_gg') as HTMLInputElement)?.value;
    const mm = (document.getElementById('data_mm') as HTMLInputElement)?.value;
    const aaaa = (document.getElementById('data_aaaa') as HTMLInputElement)?.value;
    return !!(gg || mm || aaaa);
  }

  ngOnDestroy(): void {
    this.subLingua?.unsubscribe();
  }

  animaUscita(): Promise<void> {
    return Promise.resolve();
  }
}
