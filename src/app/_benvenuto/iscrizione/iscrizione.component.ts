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
indiceSesso = -1;
cfValore = '';
cfFlash = false;
  paeseAperto = false;
  paeseValore = 'IT';
  comuneAperto = false;
  comuneValore = '';
  nazioni: any[] = [];
  comuni: any[] = [];
  filtroNazioni = '';
  filtroComuni = '';
  indiceNazione = -1;
  indiceComune = -1;

get nazioniFiltrate(): any[] {
    if (!this.filtroNazioni.trim()) return this.nazioni;
    const f = this.filtroNazioni.toLowerCase();
    return this.nazioni.filter(n =>
      (n.nazione_it ?? '').toLowerCase().startsWith(f) ||
      (n.nazione_en ?? '').toLowerCase().startsWith(f)
    );
  }

  get isItalia(): boolean {
    return this.paeseValore === 'IT';
  }

  get comuniFiltrati(): any[] {
    if (!this.filtroComuni.trim()) return [];
    const f = this.filtroComuni.toLowerCase();
    return this.comuni
      .filter(c => (c.comune ?? '').toLowerCase().startsWith(f))
      .slice(0, 50);
  }
  private datepicker: any;
private datepickerAperto = false;
private _sessoFocusDaTab = false;

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
      const lingua = this.cambioLinguaService.leggiCodiceLingua();
      this.nazioni = (rit.data ?? []).sort((a: any, b: any) =>
        (lingua === 'it' ? a.nazione_it : a.nazione_en ?? '')
          .localeCompare(lingua === 'it' ? b.nazione_it : b.nazione_en ?? '', lingua)
      );
    });

    this.apiService.getComuni().subscribe(rit => {
      this.comuni = (rit.data ?? []).sort((a: any, b: any) =>
        (a.comune ?? '').localeCompare(b.comune ?? '', 'it')
      );
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
  this.indiceSesso = -1;
  this.calcolaCodiceFiscale();
}
 paeseLabel(): string {
    if (!this.paeseValore) return 'Seleziona paese';
    const nazione = this.nazioni.find(n => n.iso === this.paeseValore);
    if (!nazione) return '';
    return this.cambioLinguaService.leggiCodiceLingua() === 'it' ? nazione.nazione_it : nazione.nazione_en;
  }
navigaSesso(event: KeyboardEvent): void {
  const opzioni = ['M', 'F', 'NS'];
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    if (!this.sessoAperto) { this.sessoAperto = true; this.paeseAperto = false; this.comuneAperto = false; }
    this.indiceSesso = Math.min(this.indiceSesso + 1, opzioni.length - 1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    this.indiceSesso = Math.max(this.indiceSesso - 1, 0);
  } else if (event.key === 'Enter' && this.sessoAperto && this.indiceSesso >= 0) {
    event.preventDefault();
    this.selezionaSesso(opzioni[this.indiceSesso]);
  } else if (event.key === 'Escape') {
    this.sessoAperto = false;
    this.indiceSesso = -1;
  }
}
selezionaPaese(valore: string): void {
  const cambiaTipo = (valore === 'IT') !== (this.paeseValore === 'IT');
  this.paeseValore = valore;
  this.paeseAperto = false;
  this.filtroNazioni = '';
  this.indiceNazione = -1;
  if (cambiaTipo) {
    this.comuneValore = '';
    this.filtroComuni = '';
  }
  this.calcolaCodiceFiscale();
}
  comuneLabel(): string {
    return this.comuneValore || 'Seleziona comune';
  }
onTabForm(event: KeyboardEvent): void {
  const target = event.target as HTMLElement;
  const precedente = document.getElementById('data_aaaa');
  if (target === precedente) {
    this._sessoFocusDaTab = true;
  }
}
 selezionaComune(valore: string): void {
  this.comuneValore = valore;
  this.comuneAperto = false;
  this.filtroComuni = '';
  this.indiceComune = -1;
  this.calcolaCodiceFiscale();
}

toggleSesso(event: Event): void {
  event.stopPropagation();
  console.log('🔴 toggleSesso — sessoAperto prima:', this.sessoAperto, '→ dopo:', !this.sessoAperto);
  this.sessoAperto = !this.sessoAperto;
  if (this.sessoAperto) { this.paeseAperto = false; this.comuneAperto = false; }
  if (!this.sessoAperto) { this.indiceSesso = -1; }
}

apriSessoSoloTastiera(_event: FocusEvent): void {
  console.log('🟡 apriSessoSoloTastiera — _sessoFocusDaTab:', this._sessoFocusDaTab);
  if (this._sessoFocusDaTab) {
    this._sessoFocusDaTab = false;
    this.sessoAperto = true;
    this.paeseAperto = false;
    this.comuneAperto = false;
    console.log('✅ sessoAperto = true via tastiera');
  }
}
togglePaese(event: Event): void {
    event.stopPropagation();
    this.paeseAperto = !this.paeseAperto;
    if (this.paeseAperto) {
      this.sessoAperto = false;
      this.comuneAperto = false;
      this.indiceNazione = -1;
      setTimeout(() => (document.querySelector('.paese-input') as HTMLInputElement)?.focus(), 0);
    }
    if (!this.paeseAperto) { this.filtroNazioni = ''; this.indiceNazione = -1; }
  }

  toggleComune(event: Event): void {
    event.stopPropagation();
    this.comuneAperto = !this.comuneAperto;
    if (this.comuneAperto) {
      this.sessoAperto = false;
      this.paeseAperto = false;
      this.indiceComune = -1;
      setTimeout(() => (document.querySelector('.comune-input') as HTMLInputElement)?.focus(), 0);
    }
    if (!this.comuneAperto) { this.filtroComuni = ''; this.indiceComune = -1; }
  }

  soloNumeri(event: KeyboardEvent, campo?: 'mm' | 'aaaa'): void {
  const tasti_permessi = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
  if (tasti_permessi.includes(event.key)) {
    if (event.key === 'Backspace' && campo) {
      const input = event.target as HTMLInputElement;
      if (input.value.length === 0) {
        event.preventDefault();
        const precedente = campo === 'mm'
          ? document.getElementById('data_gg')
          : document.getElementById('data_mm');
        precedente?.focus();
      }
    }
    return;
  }
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

focusData(event: Event): void {
  const target = event.target as HTMLElement;
  // Se ha cliccato su un input o sul bottone calendario, lascia fare normalmente
  if (target.tagName === 'INPUT' || target.closest('button')) return;

  const gg   = document.getElementById('data_gg')   as HTMLInputElement;
  const mm   = document.getElementById('data_mm')   as HTMLInputElement;
  const aaaa = document.getElementById('data_aaaa') as HTMLInputElement;

  if (!gg.value)                          { gg.focus();   return; }
  if (!mm.value)                          { mm.focus();   return; }
  if (!aaaa.value || aaaa.value.length < 4) { aaaa.focus(); return; }
  gg.focus(); // tutto già compilato → torna al primo per correggere
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

  navigaPaese(event: KeyboardEvent): void {
    if (!this.paeseAperto) return;
    const input = event.target as HTMLInputElement;
    const lista = this.nazioniFiltrate;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.filtroNazioni = input.value;
      this.indiceNazione = Math.min(this.indiceNazione + 1, lista.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.filtroNazioni = input.value;
      this.indiceNazione = Math.max(this.indiceNazione - 1, -1);
    } else if (event.key === 'Enter' && this.indiceNazione >= 0) {
      event.preventDefault();
      this.selezionaPaese(lista[this.indiceNazione].iso);
    } else if (event.key === 'Escape') {
      this.paeseAperto = false;
      this.filtroNazioni = '';
      this.indiceNazione = -1;
    }
  }
onInputPaese(event: Event): void {
    this.filtroNazioni = (event.target as HTMLInputElement).value;
    this.indiceNazione = -1;
    if (!this.paeseAperto) this.paeseAperto = true;
  }

  onInputComune(event: Event): void {
    this.filtroComuni = (event.target as HTMLInputElement).value;
    this.indiceComune = -1;
    if (!this.comuneAperto) this.comuneAperto = true;
  }
  navigaComune(event: KeyboardEvent): void {
    if (!this.comuneAperto) return;
    const input = event.target as HTMLInputElement;
    const lista = this.comuniFiltrati;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.filtroComuni = input.value;
      this.indiceComune = Math.min(this.indiceComune + 1, lista.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.filtroComuni = input.value;
      this.indiceComune = Math.max(this.indiceComune - 1, -1);
    } else if (event.key === 'Enter' && this.indiceComune >= 0) {
      event.preventDefault();
      this.selezionaComune(lista[this.indiceComune].comune);
    } else if (event.key === 'Escape') {
      this.comuneAperto = false;
      this.filtroComuni = '';
      this.indiceComune = -1;
    }
  }

  calcolaCodiceFiscale(): void {
  const nome    = (document.getElementById('nome')     as HTMLInputElement)?.value?.trim() ?? '';
  const cognome = (document.getElementById('cognome')  as HTMLInputElement)?.value?.trim() ?? '';
  const gg      = (document.getElementById('data_gg')  as HTMLInputElement)?.value ?? '';
  const mm      = (document.getElementById('data_mm')  as HTMLInputElement)?.value ?? '';
  const aaaa    = (document.getElementById('data_aaaa')as HTMLInputElement)?.value ?? '';
  const sesso   = this.sessoValore;

  // Controllo campi minimi
  if (!nome || !cognome || gg.length < 2 || mm.length < 2 || aaaa.length < 4 || !sesso) return;
  if (!this.paeseValore) return;
  if (this.isItalia && !this.comuneValore) return;

  // Codice catastale
  let codiceCatastale = '';
  if (this.isItalia) {
    const comune = this.comuni.find(c => c.comune === this.comuneValore);
    codiceCatastale = comune?.codice_belfiore ?? '';
  } else {
    const nazione = this.nazioni.find(n => n.iso === this.paeseValore);
    codiceCatastale = nazione?.codice_belfiore ?? '';
  }
  if (!codiceCatastale) return;

  const parteCognome   = this.cfLettere(cognome, false);
  const parteNome      = this.cfLettere(nome, true);
  const parteAnno      = aaaa.slice(-2);
  const meseCodici     = ['A','B','C','D','E','H','L','M','P','R','S','T'];
  const parteMese      = meseCodici[parseInt(mm, 10) - 1] ?? '';
  const giornoNum      = parseInt(gg, 10) + (sesso === 'F' ? 40 : 0);
  const parteGiorno    = String(giornoNum).padStart(2, '0');

  const parziale = (parteCognome + parteNome + parteAnno + parteMese + parteGiorno + codiceCatastale).toUpperCase();
  if (parziale.length !== 15) return;

  const cf = parziale + this.cfControllo(parziale);
this.cfValore = cf;
this.cfFlash = false;
setTimeout(() => { this.cfFlash = true; }, 10);
setTimeout(() => { this.cfFlash = false; }, 1510);
}
svuotaCF(): void {
  this.cfValore = '';
  this.cfFlash = false;
}
private cfLettere(str: string, isNome: boolean): string {
  // Normalizza: rimuove accenti e caratteri non alfabetici
  const pulita = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, '');
  const consonanti = pulita.replace(/[AEIOU]/g, '');
  const vocali     = pulita.replace(/[^AEIOU]/g, '');

  // Regola speciale per il nome: se ha 4+ consonanti si usano la 1ª, 3ª e 4ª
  if (isNome && consonanti.length >= 4) {
    return consonanti[0] + consonanti[2] + consonanti[3];
  }
  return (consonanti + vocali + 'XXX').slice(0, 3);
}

private cfControllo(codice15: string): string {
  const valoriDispari: Record<string, number> = {
    '0':1,'1':0,'2':5,'3':7,'4':9,'5':13,'6':15,'7':17,'8':19,'9':21,
    'A':1,'B':0,'C':5,'D':7,'E':9,'F':13,'G':15,'H':17,'I':19,'J':21,
    'K':2,'L':4,'M':18,'N':20,'O':11,'P':3,'Q':6,'R':8,'S':12,'T':14,
    'U':16,'V':10,'W':22,'X':25,'Y':24,'Z':23
  };
  let somma = 0;
  for (let i = 0; i < 15; i++) {
    const c = codice15[i];
    if (i % 2 === 0) {
      // Posizione dispari (1,3,5… in base 1 = indice 0,2,4… in base 0)
      somma += valoriDispari[c] ?? 0;
    } else {
      // Posizione pari
      somma += /\d/.test(c) ? parseInt(c, 10) : c.charCodeAt(0) - 65;
    }
  }
  return String.fromCharCode((somma % 26) + 65);
}
}
