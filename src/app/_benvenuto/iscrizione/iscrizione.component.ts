// DOPO
import { Component, OnInit, AfterViewInit, OnDestroy, HostListener, ElementRef, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
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
reactiveForm: FormGroup;
reactiveFormStep2: FormGroup;
formInviato = false;
formInviatoStep2 = false;
stepAttuale = 1;

// ─── Step 1 ───────────────────────────────────────────────
sessoAperto = false;
sessoValore = '';
indiceSesso = -1;
cfValore = '';
cfFlash = false;
cfModificatoManualmente = false;
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

// ─── Step 2 ───────────────────────────────────────────────
paeseDomAperto = false;
paeseDomValore = 'IT';
comuneDomAperto = false;
comuneDomValore = '';
filtroNazioniDom = '';
filtroComuniDom = '';
indiceNazioneDom = -1;
indiceComuneDom = -1;
capDomAperto = false;
capValore = '';
filtroCapDom = '';
indiceCapDom = -1;
capIsMulti = false;
capMultiOpzioni: string[] = [];
capFlash = false;
provinciaFlash = false;

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

// ─── Step 2 getter ────────────────────────────────────────
get isItaliaDom(): boolean {
  return this.paeseDomValore === 'IT';
}

get nazioniFiltrateDom(): any[] {
  if (!this.filtroNazioniDom.trim()) return this.nazioni;
  const f = this.filtroNazioniDom.toLowerCase();
  return this.nazioni.filter(n =>
    (n.nazione_it ?? '').toLowerCase().startsWith(f) ||
    (n.nazione_en ?? '').toLowerCase().startsWith(f)
  );
}

get comuniFiltreatiDom(): any[] {
  if (!this.filtroComuniDom.trim()) return [];
  const f = this.filtroComuniDom.toLowerCase();
  return this.comuni
    .filter(c => (c.comune ?? '').toLowerCase().startsWith(f))
    .slice(0, 50);
}

get capFiltrate(): string[] {
  if (!this.filtroCapDom.trim()) return this.capMultiOpzioni;
  return this.capMultiOpzioni.filter(c => c.startsWith(this.filtroCapDom));
}
  private datepicker: any;
private datepickerAperto = false;
private _sessoFocusDaTab = false;

constructor(
  public cambioLinguaService: CambioLinguaService,
  private apiService: ApiService,
  private eRef: ElementRef,
  private fb: FormBuilder,
  private cdr: ChangeDetectorRef
) {
  this.reactiveForm = this.fb.group({
    nome:          ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50),
                         Validators.pattern(/^[A-Za-zÀ-ÿ\s'-]+$/)]],
    cognome:       ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50),
                         Validators.pattern(/^[A-Za-zÀ-ÿ\s'-]+$/)]],
    dataGg:        ['', [Validators.required, Validators.pattern(/^(0[1-9]|[12]\d|3[01])$/)]],
    dataMm:        ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])$/)]],
    dataAaaa:      ['', [Validators.required, Validators.pattern(/^\d{4}$/), this.validaAnnoNascita()]],
    sesso:         ['', Validators.required],
    paese:         ['IT', Validators.required],
    comune:        ['', Validators.required],
    citta:         [''],
    codiceFiscale: ['', [Validators.required,
                         Validators.pattern(/^[A-Za-z]{6}\d{2}[AaBbCcDdEeHhLlMmPpRrSsTt](0[1-9]|[12]\d|3[01]|4[1-9]|[56]\d|7[01])[A-Za-z]\d{3}[A-Za-z]$/)]],
  });

  this.reactiveFormStep2 = this.fb.group({
    nazioneD:   ['IT', Validators.required],
    comuneD:    ['', Validators.required],   // required di default: parte con IT
    cittaD:     [''],                         // required solo se estero
    via:        ['', [Validators.minLength(3), Validators.maxLength(100),
                      Validators.pattern(/^[A-Za-zÀ-ÿ0-9\s'.,°\/\-]+$/)]],
    civico:     ['', [Validators.maxLength(10),
                      Validators.pattern(/^\d+[A-Za-z0-9\/\-]*$/)]],
    dettagli:   ['', [Validators.minLength(3), Validators.maxLength(200)]],
    provinciaD: ['', [Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)]],
    cap:        ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
  });
}

 @HostListener('document:click')
chiudiDropdown(): void {
  this.sessoAperto = false;
  this.paeseAperto = false;
  this.comuneAperto = false;
  this.paeseDomAperto = false;
  this.comuneDomAperto = false;
  this.capDomAperto = false;
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
    this.animaSfocatura(true);
  }
private validaAnnoNascita() {
  return (control: import('@angular/forms').AbstractControl) => {
    const anno = parseInt(control.value, 10);
    if (isNaN(anno)) return null; // lascia fare a pattern
    const oggi = new Date().getFullYear();
    if (anno < oggi - 200) return { annoTroppoVecchio: true };
    if (anno > oggi - 5)   return { annoTroppoGiovane: true };
    return null;
  };
}
animaSfocatura(entra: boolean): Promise<void> {
    const sfocatura = document.querySelector('.sfocatura') as HTMLElement | null;
    if (!sfocatura) return Promise.resolve();
    return new Promise<void>((resolve) => {
      gsap.to(sfocatura, {
        opacity: entra ? 0.95 : 0,
        duration: 1.1,
        ease: 'power2.inOut',
        onComplete: resolve,
      });
    });
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
  this.reactiveForm.get('dataGg')!.setValue(gg);
  this.reactiveForm.get('dataMm')!.setValue(mm);
  this.reactiveForm.get('dataAaaa')!.setValue(aaaa);
  this.reactiveForm.get('dataGg')!.markAsTouched();
  this.reactiveForm.get('dataMm')!.markAsTouched();
  this.reactiveForm.get('dataAaaa')!.markAsTouched();
  this.calcolaCodiceFiscale();
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
  this.reactiveForm.get('sesso')!.setValue(valore);
  this.reactiveForm.get('sesso')!.markAsTouched();
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
  this.reactiveForm.get('paese')!.setValue(valore);
  this.reactiveForm.get('paese')!.markAsTouched();
if (cambiaTipo) {
    this.comuneValore = '';
    this.filtroComuni = '';
    this.reactiveForm.get('comune')!.setValue('');
    this.reactiveForm.get('citta')!.setValue('');
    this.cfValore = '';
    this.cfFlash = false;
    this.cfModificatoManualmente = false; // cambio paese = reset manuale
    this.reactiveForm.get('codiceFiscale')!.setValue('');
    if (valore === 'IT') {
      this.reactiveForm.get('comune')!.setValidators(Validators.required);
      this.reactiveForm.get('citta')!.clearValidators();
      this.reactiveForm.get('codiceFiscale')!.setValidators([Validators.required,
        Validators.pattern(/^[A-Za-z]{6}\d{2}[AaBbCcDdEeHhLlMmPpRrSsTt](0[1-9]|[12]\d|3[01]|4[1-9]|[56]\d|7[01])[A-Za-z]\d{3}[A-Za-z]$/)]);
    } else {
      this.reactiveForm.get('citta')!.setValidators([Validators.required, Validators.minLength(2), Validators.maxLength(80)]);
      this.reactiveForm.get('comune')!.clearValidators();
      this.reactiveForm.get('codiceFiscale')!.setValidators([
        Validators.pattern(/^[A-Za-z]{6}\d{2}[AaBbCcDdEeHhLlMmPpRrSsTt](0[1-9]|[12]\d|3[01]|4[1-9]|[56]\d|7[01])[A-Za-z]\d{3}[A-Za-z]$/)]);
    }
    this.reactiveForm.get('comune')!.updateValueAndValidity();
    this.reactiveForm.get('citta')!.updateValueAndValidity();
    this.reactiveForm.get('codiceFiscale')!.updateValueAndValidity();
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

onBlurAnag(event: FocusEvent): void {
  const destinazione = event.relatedTarget as HTMLElement | null;
  const vasuAvanti = destinazione?.classList.contains('avanti_btn') ?? false;
  if (vasuAvanti && !this.isItalia) return; // CF opzionale + click su Avanti: non ricalcolare
  this.calcolaCodiceFiscale();
}

onEnterForm(event: KeyboardEvent): void {
  const target = event.target as HTMLElement;
  if (target.tagName === 'BUTTON' && target.getAttribute('type') === 'submit') {
    return; // lascia passare Enter sul bottone submit
  }
  event.preventDefault();
}
 selezionaComune(valore: string): void {
  this.comuneValore = valore;
  this.comuneAperto = false;
  this.filtroComuni = '';
  this.indiceComune = -1;
  this.reactiveForm.get('comune')!.setValue(valore);
  this.reactiveForm.get('comune')!.markAsTouched();
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

soloNumeri(event: KeyboardEvent, campo?: 'gg' | 'mm' | 'aaaa'): void {
  const input = event.target as HTMLInputElement;

if (event.key === 'Backspace') {
  if (campo && campo !== 'gg' && input.selectionStart === 0 && input.selectionEnd === 0) {
    event.preventDefault();
    const precedente = campo === 'mm'
      ? document.getElementById('data_gg') as HTMLInputElement
      : document.getElementById('data_mm') as HTMLInputElement;
    if (precedente) {
      precedente.focus();
      precedente.value = precedente.value.slice(0, -1);
      const len = precedente.value.length;
      precedente.setSelectionRange(len, len);
    }
  }
  return;
}

if (event.key === 'Delete') {
  if (input.selectionStart === input.value.length && input.selectionEnd === input.value.length) {
    const successivo = campo === 'gg'
      ? document.getElementById('data_mm') as HTMLInputElement
      : campo === 'mm'
        ? document.getElementById('data_aaaa') as HTMLInputElement
        : null;
    if (successivo) {
      event.preventDefault();
      successivo.focus();
      successivo.value = successivo.value.slice(1);
      successivo.setSelectionRange(0, 0);
    }
  }
  return;
}

  if (event.key === 'ArrowLeft') {
    if (input.selectionStart === 0) {
      event.preventDefault();
      const precedente = campo === 'mm'
        ? document.getElementById('data_gg')
        : campo === 'aaaa'
          ? document.getElementById('data_mm')
          : null;
      if (precedente) {
        (precedente as HTMLInputElement).focus();
        const len = (precedente as HTMLInputElement).value.length;
        (precedente as HTMLInputElement).setSelectionRange(len, len);
      }
    }
    return;
  }

  if (event.key === 'ArrowRight') {
    if (input.selectionStart === input.value.length) {
      event.preventDefault();
      const successivo = campo === 'gg'
        ? document.getElementById('data_mm')
        : campo === 'mm'
          ? document.getElementById('data_aaaa')
          : null;
      if (successivo) {
        (successivo as HTMLInputElement).focus();
        (successivo as HTMLInputElement).setSelectionRange(0, 0);
      }
    }
    return;
  }

  if (['Tab'].includes(event.key)) return;

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

  onBlurPaese(event: FocusEvent): void {
    const destinazione = event.relatedTarget as HTMLElement | null;
    if (destinazione?.closest('.select-dropdown')) return; // sta cliccando un'opzione
    const val = (event.target as HTMLInputElement).value.trim().toLowerCase();
    if (!val) return;
    if (this.paeseValore && this.paeseLabel().toLowerCase() === val) return; // già ok
    const trovata = this.nazioni.find(n =>
      (n.nazione_it ?? '').toLowerCase() === val ||
      (n.nazione_en ?? '').toLowerCase() === val
    );
    if (trovata) this.selezionaPaese(trovata.iso);
  }

  onBlurComune(event: FocusEvent): void {
    const destinazione = event.relatedTarget as HTMLElement | null;
    if (destinazione?.closest('.select-dropdown')) return;
    const val = (event.target as HTMLInputElement).value.trim().toLowerCase();
    if (!val) return;
    if (this.comuneValore && this.comuneValore.toLowerCase() === val) return;
    const trovato = this.comuni.find(c =>
      (c.comune ?? '').toLowerCase() === val
    );
    if (trovato) this.selezionaComune(trovato.comune);
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
if (cf !== this.cfValore && !this.cfModificatoManualmente) {
  this.cfValore = cf;
  this.reactiveForm.get('codiceFiscale')!.setValue(cf);
  this.reactiveForm.get('codiceFiscale')!.markAsTouched();
  this.cfFlash = false;
  setTimeout(() => { this.cfFlash = true; }, 10);
  setTimeout(() => { this.cfFlash = false; }, 1510);
}
}
svuotaCF(): void {
  this.cfValore = '';
  this.cfFlash = false;
  this.cfModificatoManualmente = false; // reset: torna ad auto-calcolare
  this.reactiveForm.get('codiceFiscale')!.setValue('');
  this.reactiveForm.get('codiceFiscale')!.markAsTouched();
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

avanti(): void {
  this.formInviato = true;
  if (this.reactiveForm.invalid) {
    this.reactiveForm.markAllAsTouched();
    return;
  }
  this.animaUscitaStep1().then(() => {
    this.stepAttuale = 2;
    this.cdr.detectChanges();

    const titolo = document.querySelector('.titolo-animato') as HTMLElement;
    const labels = document.querySelectorAll('.label-sopra');
    const righe  = document.querySelectorAll('.campo-animato');
    gsap.set(titolo, { opacity: 0 });
    gsap.set(labels, { opacity: 0 });
    gsap.set(righe,  { opacity: 0, scaleX: 0, transformOrigin: 'center center' });

    setTimeout(() => this.animaEntrataStep2(), 16);
  });
}

avanti2(): void {
  this.formInviatoStep2 = true;
  if (this.reactiveFormStep2.invalid) {
    this.reactiveFormStep2.markAllAsTouched();
    return;
  }
  // qui metti la navigazione al passo 3
}

private animaUscitaStep1(): Promise<void> {
  const titolo = document.querySelector('.titolo-animato') as HTMLElement | null;
  const labels = document.querySelectorAll('.label-sopra');
  const righe  = document.querySelectorAll('.campo-animato');
  return new Promise<void>((resolve) => {
    if (titolo) gsap.to(titolo, { opacity: 0, duration: 0.3, ease: 'power2.in' });
    gsap.to(labels, { opacity: 0, duration: 0.3, ease: 'power2.in' });
    gsap.to(righe,  { opacity: 0, scaleX: 0, duration: 0.35, ease: 'power2.in', stagger: 0.05 });
    setTimeout(() => resolve(), 550);
  });
}

private animaEntrataStep2(): void {
  const titolo = document.querySelector('.titolo-animato') as HTMLElement;
  const labels = document.querySelectorAll('.label-sopra');
  const righe  = document.querySelectorAll('.campo-animato');
  gsap.to(titolo, { opacity: 1, delay: 0.1, duration: 2.0, ease: 'power2.out' });
  gsap.to(labels, { opacity: 1, duration: 1.8, ease: 'power2.out', stagger: 0.12 });
  gsap.to(righe,  { opacity: 1, scaleX: 1, duration: 0.9, ease: 'power2.out', stagger: 0.12 });
}

// ════════════════════════════════════════════════════════════
//  STEP 2 — metodi paese domicilio
// ════════════════════════════════════════════════════════════

paeseDomLabel(): string {
  if (!this.paeseDomValore) return 'Seleziona paese';
  const nazione = this.nazioni.find(n => n.iso === this.paeseDomValore);
  if (!nazione) return '';
  return this.cambioLinguaService.leggiCodiceLingua() === 'it' ? nazione.nazione_it : nazione.nazione_en;
}

togglePaeseDom(event: Event): void {
  event.stopPropagation();
  this.paeseDomAperto = !this.paeseDomAperto;
  if (this.paeseDomAperto) {
    this.comuneDomAperto = false;
    this.capDomAperto = false;
    this.indiceNazioneDom = -1;
    setTimeout(() => (document.querySelector('.paese-dom-input') as HTMLInputElement)?.focus(), 0);
  }
  if (!this.paeseDomAperto) { this.filtroNazioniDom = ''; this.indiceNazioneDom = -1; }
}

onInputPaeseDom(event: Event): void {
  this.filtroNazioniDom = (event.target as HTMLInputElement).value;
  this.indiceNazioneDom = -1;
  if (!this.paeseDomAperto) this.paeseDomAperto = true;
}

navigaPaeseDom(event: KeyboardEvent): void {
  if (!this.paeseDomAperto) return;
  const input = event.target as HTMLInputElement;
  const lista = this.nazioniFiltrateDom;
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    this.filtroNazioniDom = input.value;
    this.indiceNazioneDom = Math.min(this.indiceNazioneDom + 1, lista.length - 1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    this.filtroNazioniDom = input.value;
    this.indiceNazioneDom = Math.max(this.indiceNazioneDom - 1, -1);
  } else if (event.key === 'Enter' && this.indiceNazioneDom >= 0) {
    event.preventDefault();
    this.selezionaPaeseDom(lista[this.indiceNazioneDom].iso);
  } else if (event.key === 'Escape') {
    this.paeseDomAperto = false;
    this.filtroNazioniDom = '';
    this.indiceNazioneDom = -1;
  }
}

selezionaPaeseDom(valore: string): void {
  const cambiaTipo = (valore === 'IT') !== (this.paeseDomValore === 'IT');
  this.paeseDomValore = valore;
  this.paeseDomAperto = false;
  this.filtroNazioniDom = '';
  this.indiceNazioneDom = -1;
  this.reactiveFormStep2.get('nazioneD')!.setValue(valore);
  this.reactiveFormStep2.get('nazioneD')!.markAsTouched();

  if (cambiaTipo) {
    this.comuneDomValore = '';
    this.filtroComuniDom = '';
    this.capValore = '';
    this.capIsMulti = false;
    this.capMultiOpzioni = [];
    this.reactiveFormStep2.get('comuneD')!.setValue('');
    this.reactiveFormStep2.get('cittaD')!.setValue('');
    this.reactiveFormStep2.get('provinciaD')!.setValue('');
    this.reactiveFormStep2.get('cap')!.setValue('');

    if (valore === 'IT') {
      this.reactiveFormStep2.get('comuneD')!.setValidators(Validators.required);
      this.reactiveFormStep2.get('cittaD')!.clearValidators();
      this.reactiveFormStep2.get('provinciaD')!.setValidators([Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)]);
      this.reactiveFormStep2.get('cap')!.setValidators([Validators.required, Validators.pattern(/^\d{5}$/)]);
    } else {
      this.reactiveFormStep2.get('cittaD')!.setValidators([Validators.required, Validators.minLength(2), Validators.maxLength(80)]);
      this.reactiveFormStep2.get('comuneD')!.clearValidators();
      this.reactiveFormStep2.get('provinciaD')!.clearValidators();
      this.reactiveFormStep2.get('cap')!.clearValidators();
    }
    this.reactiveFormStep2.get('comuneD')!.updateValueAndValidity();
    this.reactiveFormStep2.get('cittaD')!.updateValueAndValidity();
    this.reactiveFormStep2.get('provinciaD')!.updateValueAndValidity();
    this.reactiveFormStep2.get('cap')!.updateValueAndValidity();
  }
}

// ════════════════════════════════════════════════════════════
//  STEP 2 — metodi comune domicilio
// ════════════════════════════════════════════════════════════

toggleComuneDom(event: Event): void {
  event.stopPropagation();
  this.comuneDomAperto = !this.comuneDomAperto;
  if (this.comuneDomAperto) {
    this.paeseDomAperto = false;
    this.capDomAperto = false;
    this.indiceComuneDom = -1;
    setTimeout(() => (document.querySelector('.comune-dom-input') as HTMLInputElement)?.focus(), 0);
  }
  if (!this.comuneDomAperto) { this.filtroComuniDom = ''; this.indiceComuneDom = -1; }
}

onInputComuneDom(event: Event): void {
  this.filtroComuniDom = (event.target as HTMLInputElement).value;
  this.indiceComuneDom = -1;
  if (!this.comuneDomAperto) this.comuneDomAperto = true;
}

onBlurPaeseDom(event: FocusEvent): void {
  const destinazione = event.relatedTarget as HTMLElement | null;
  if (destinazione?.closest('.select-dropdown')) return;
  const val = (event.target as HTMLInputElement).value.trim().toLowerCase();
  if (!val) return;
  if (this.paeseDomValore && this.paeseDomLabel().toLowerCase() === val) return;
  const trovata = this.nazioni.find(n =>
    (n.nazione_it ?? '').toLowerCase() === val ||
    (n.nazione_en ?? '').toLowerCase() === val
  );
  if (trovata) this.selezionaPaeseDom(trovata.iso);
}

onBlurComuneDom(event: FocusEvent): void {
  const destinazione = event.relatedTarget as HTMLElement | null;
  if (destinazione?.closest('.select-dropdown')) return;
  const val = (event.target as HTMLInputElement).value.trim().toLowerCase();
  if (!val) return;
  if (this.comuneDomValore && this.comuneDomValore.toLowerCase() === val) return;
  const trovato = this.comuni.find(c =>
    (c.comune ?? '').toLowerCase() === val
  );
  if (trovato) this.selezionaComuneDom(trovato.comune);
}

navigaComuneDom(event: KeyboardEvent): void {
  if (!this.comuneDomAperto) return;
  const input = event.target as HTMLInputElement;
  const lista = this.comuniFiltreatiDom;
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    this.filtroComuniDom = input.value;
    this.indiceComuneDom = Math.min(this.indiceComuneDom + 1, lista.length - 1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    this.filtroComuniDom = input.value;
    this.indiceComuneDom = Math.max(this.indiceComuneDom - 1, -1);
  } else if (event.key === 'Enter' && this.indiceComuneDom >= 0) {
    event.preventDefault();
    this.selezionaComuneDom(lista[this.indiceComuneDom].comune);
  } else if (event.key === 'Escape') {
    this.comuneDomAperto = false;
    this.filtroComuniDom = '';
    this.indiceComuneDom = -1;
  }
}

selezionaComuneDom(valore: string): void {
  this.comuneDomValore = valore;
  this.comuneDomAperto = false;
  this.filtroComuniDom = '';
  this.indiceComuneDom = -1;
  this.reactiveFormStep2.get('comuneD')!.setValue(valore);
  this.reactiveFormStep2.get('comuneD')!.markAsTouched();

  // Auto-fill provincia e CAP dal modello comune
  const comune = this.comuni.find(c => c.comune === valore);
  if (!comune) return;
  console.log('🏙️ comune trovato:', JSON.stringify(comune));

  // Provincia: sigla automobilistica
 const sigla = (comune.sigla_automobilistica ?? '').toUpperCase();
  this.reactiveFormStep2.get('provinciaD')!.setValue(sigla);
  this.reactiveFormStep2.get('provinciaD')!.markAsTouched();
  this.provinciaFlash = false;
  setTimeout(() => { this.provinciaFlash = true; }, 10);
  setTimeout(() => { this.provinciaFlash = false; }, 1510);

  // CAP: singolo o multi
  this.capValore = '';
  this.capIsMulti = false;
  this.capMultiOpzioni = [];
  this.capFlash = false;
  this.reactiveFormStep2.get('cap')!.setValue('');
  if (comune.cap_inizio && comune.cap_fine && String(comune.cap_inizio) !== String(comune.cap_fine)) {
    const inizio = parseInt(String(comune.cap_inizio), 10);
    const fine   = parseInt(String(comune.cap_fine), 10);
    if (!isNaN(inizio) && !isNaN(fine) && fine > inizio) {
      const opzioni: string[] = [];
      for (let n = inizio; n <= fine; n++) {
        opzioni.push(String(n).padStart(5, '0'));
      }
      this.capIsMulti = true;
      this.capMultiOpzioni = opzioni;
      this.reactiveFormStep2.get('cap')!.clearValidators();
      this.reactiveFormStep2.get('cap')!.updateValueAndValidity();
      setTimeout(() => {
        this.capFlash = true;
        setTimeout(() => { this.capFlash = false; }, 1510);
      }, 30); // aspetta che Angular renderizzi il select
      return;
    }
  }

  // CAP singolo: auto-compila
  if (comune.cap) {
    this.capValore = String(comune.cap).padStart(5, '0');
    this.reactiveFormStep2.get('cap')!.setValue(this.capValore);
    this.reactiveFormStep2.get('cap')!.markAsTouched();
    this.capFlash = false;
    setTimeout(() => { this.capFlash = true; }, 10);
    setTimeout(() => { this.capFlash = false; }, 1510);
  }
}

// ════════════════════════════════════════════════════════════
//  STEP 2 — metodi CAP domicilio (multi-cap)
// ════════════════════════════════════════════════════════════

toggleCapDom(event: Event): void {
  event.stopPropagation();
  this.capDomAperto = !this.capDomAperto;
  if (this.capDomAperto) {
    this.paeseDomAperto = false;
    this.comuneDomAperto = false;
    this.indiceCapDom = -1;
    setTimeout(() => (document.querySelector('.cap-dom-input') as HTMLInputElement)?.focus(), 0);
  }
  if (!this.capDomAperto) { this.filtroCapDom = ''; this.indiceCapDom = -1; }
}

onInputCapDom(event: Event): void {
  this.filtroCapDom = (event.target as HTMLInputElement).value;
  this.indiceCapDom = -1;
  if (!this.capDomAperto) this.capDomAperto = true;
}

navigaCapDom(event: KeyboardEvent): void {
  if (!this.capDomAperto) return;
  const lista = this.capFiltrate;
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    this.indiceCapDom = Math.min(this.indiceCapDom + 1, lista.length - 1);
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    this.indiceCapDom = Math.max(this.indiceCapDom - 1, -1);
  } else if (event.key === 'Enter' && this.indiceCapDom >= 0) {
    event.preventDefault();
    this.selezionaCapDom(lista[this.indiceCapDom]);
  } else if (event.key === 'Escape') {
    this.capDomAperto = false;
    this.filtroCapDom = '';
    this.indiceCapDom = -1;
  }
}

selezionaCapDom(valore: string): void {
  this.capValore = valore;
  this.capDomAperto = false;
  this.filtroCapDom = '';
  this.indiceCapDom = -1;
  this.reactiveFormStep2.get('cap')!.setValidators([Validators.required, Validators.pattern(/^\d{5}$/)]);
  this.reactiveFormStep2.get('cap')!.setValue(valore);
  this.reactiveFormStep2.get('cap')!.markAsTouched();
  this.reactiveFormStep2.get('cap')!.updateValueAndValidity();
  this.capFlash = false;
  setTimeout(() => { this.capFlash = true; }, 10);
  setTimeout(() => { this.capFlash = false; }, 1510);
}

// ════════════════════════════════════════════════════════════
//  STEP 2 — provincia: forza maiuscolo e solo lettere
// ════════════════════════════════════════════════════════════

onInputProvincia(event: Event): void {
  const input = event.target as HTMLInputElement;
  const val = input.value.toUpperCase().replace(/[^A-Z]/g, '');
  input.value = val;
  this.reactiveFormStep2.get('provinciaD')!.setValue(val);
}
}
