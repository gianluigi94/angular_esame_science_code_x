import { Injectable }    from '@angular/core';
import { Validators }    from '@angular/forms';
import { Datepicker }    from 'vanillajs-datepicker';
import { TranslateService }    from '@ngx-translate/core';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { IscrizioneFormService } from './iscrizione-form.service';
import { cfLettere, cfControllo } from '../iscrizione_helpers/codice-fiscale.helper';

@Injectable()
export class IscrizioneStep1Service {

  // ─── Sesso ────────────────────────────────────────────────────────────────
  sessoAperto  = false;
  sessoValore  = '';
  indiceSesso  = -1;

  // ─── Codice fiscale ───────────────────────────────────────────────────────
  cfValore               = '';
  cfFlash                = false;
  cfModificatoManualmente = false;

  // ─── Paese nascita ────────────────────────────────────────────────────────
  paeseAperto   = false;
  paeseValore   = 'IT';
  filtroNazioni = '';
  indiceNazione = -1;

  // ─── Comune nascita ───────────────────────────────────────────────────────
  comuneAperto  = false;
  comuneValore  = '';
  filtroComuni  = '';
  indiceComune  = -1;

  // ─── Datepicker ───────────────────────────────────────────────────────────
  datepicker:        any;
  datepickerAperto = false;

  private _sessoFocusDaTab = false;

  // ─── Getter ───────────────────────────────────────────────────────────────

  get form() { return this.fs.reactiveForm; }

  get isItalia(): boolean { return this.paeseValore === 'IT'; }

  get nazioniFiltrate(): any[] {
    if (!this.filtroNazioni.trim()) return this.fs.nazioni;
    const f = this.filtroNazioni.toLowerCase();
    return this.fs.nazioni.filter(n =>
      (n.nazione_it ?? '').toLowerCase().startsWith(f) ||
      (n.nazione_en ?? '').toLowerCase().startsWith(f)
    );
  }

  get comuniFiltrati(): any[] {
    if (!this.filtroComuni.trim()) return [];
    const f = this.filtroComuni.toLowerCase();
    return this.fs.comuni
      .filter(c => (c.comune ?? '').toLowerCase().startsWith(f))
      .slice(0, 50);
  }

  constructor(
    private fs:                  IscrizioneFormService,
    private cambioLinguaService: CambioLinguaService,
    private translateService:    TranslateService,
  ) {}

  // ─── Label ────────────────────────────────────────────────────────────────

  sessoLabel(): string {
    if (!this.sessoValore)
      return this.translateService.instant('ui.registrazione.sesso.placeholder');
    const map: Record<string, string> = {
      M:  this.translateService.instant('ui.registrazione.sesso.maschio'),
      F:  this.translateService.instant('ui.registrazione.sesso.femmina'),
      NS: this.translateService.instant('ui.registrazione.sesso.non_specificato'),
    };
    return map[this.sessoValore] ?? '';
  }

  paeseLabel(): string {
    if (!this.paeseValore)
      return this.translateService.instant('ui.registrazione.placeholder.seleziona_paese');
    const nazione = this.fs.nazioni.find(n => n.iso === this.paeseValore);
    if (!nazione) return '';
    return this.cambioLinguaService.leggiCodiceLingua() === 'it'
      ? nazione.nazione_it
      : nazione.nazione_en;
  }

  comuneLabel(): string {
    return this.comuneValore ||
      this.translateService.instant('ui.registrazione.comune.piccola');
  }

  // ─── Sesso ────────────────────────────────────────────────────────────────

  toggleSesso(event: Event): void {
    event.stopPropagation();
    this.sessoAperto = !this.sessoAperto;
    if (this.sessoAperto)  { this.paeseAperto = false; this.comuneAperto = false; }
    if (!this.sessoAperto) { this.indiceSesso = -1; }
  }

  apriSessoSoloTastiera(_event: FocusEvent): void {
    if (!this._sessoFocusDaTab) return;
    this._sessoFocusDaTab = false;
    this.sessoAperto  = true;
    this.paeseAperto  = false;
    this.comuneAperto = false;
  }

  selezionaSesso(valore: string): void {
    this.sessoValore  = valore;
    this.sessoAperto  = false;
    this.indiceSesso  = -1;
    this.form.get('sesso')!.setValue(valore);
    this.form.get('sesso')!.markAsTouched();
    this.calcolaCodiceFiscale();
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

  // ─── Paese ────────────────────────────────────────────────────────────────

  togglePaese(event: Event): void {
    event.stopPropagation();
    this.paeseAperto = !this.paeseAperto;
    if (this.paeseAperto) {
      this.sessoAperto  = false;
      this.comuneAperto = false;
      this.indiceNazione = -1;
      this.filtroNazioni = this.paeseValore ? this.paeseLabel() : '';
      setTimeout(() => {
        const i = document.querySelector('.paese-input') as HTMLInputElement;
        if (i) { i.focus(); i.select(); }
      }, 0);
    }
    if (!this.paeseAperto) { this.filtroNazioni = ''; this.indiceNazione = -1; }
  }

  onInputPaese(event: Event): void {
    this.filtroNazioni = (event.target as HTMLInputElement).value;
    this.indiceNazione = -1;
    if (!this.paeseAperto) this.paeseAperto = true;
  }

  navigaPaese(event: KeyboardEvent): void {
    if (!this.paeseAperto) return;
    const lista = this.nazioniFiltrate;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.filtroNazioni = (event.target as HTMLInputElement).value;
      this.indiceNazione = Math.min(this.indiceNazione + 1, lista.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.filtroNazioni = (event.target as HTMLInputElement).value;
      this.indiceNazione = Math.max(this.indiceNazione - 1, -1);
    } else if (event.key === 'Enter' && this.indiceNazione >= 0) {
      event.preventDefault();
      this.selezionaPaese(lista[this.indiceNazione].iso);
    } else if (event.key === 'Escape') {
      this.paeseAperto  = false;
      this.filtroNazioni = '';
      this.indiceNazione = -1;
    }
  }

  onBlurPaese(event: FocusEvent): void {
    const dest = event.relatedTarget as HTMLElement | null;
    if (dest?.closest('.select-dropdown')) return;
    const val = (event.target as HTMLInputElement).value.trim().toLowerCase();
    if (!val) return;
    if (this.paeseValore && this.paeseLabel().toLowerCase() === val) return;
    const trovata = this.fs.nazioni.find(n =>
      (n.nazione_it ?? '').toLowerCase() === val ||
      (n.nazione_en ?? '').toLowerCase() === val
    );
    if (trovata) this.selezionaPaese(trovata.iso);
  }

  selezionaPaese(valore: string): void {
    const cambiaTipo = (valore === 'IT') !== (this.paeseValore === 'IT');
    this.paeseValore   = valore;
    this.paeseAperto   = false;
    this.filtroNazioni = '';
    this.indiceNazione = -1;
    this.form.get('paese')!.setValue(valore);
    this.form.get('paese')!.markAsTouched();

    if (cambiaTipo) {
      this.comuneValore = '';
      this.filtroComuni = '';
      this.cfValore = '';
      this.cfFlash  = false;
      this.cfModificatoManualmente = false;
      this.form.get('comune')!.setValue('');
      this.form.get('citta')!.setValue('');
      this.form.get('codiceFiscale')!.setValue('');

      if (valore === 'IT') {
        this.form.get('comune')!.setValidators(Validators.required);
        this.form.get('citta')!.clearValidators();
        this.form.get('codiceFiscale')!.setValidators([Validators.required,
          Validators.pattern(/^[A-Za-z]{6}\d{2}[AaBbCcDdEeHhLlMmPpRrSsTt](0[1-9]|[12]\d|3[01]|4[1-9]|[56]\d|7[01])[A-Za-z]\d{3}[A-Za-z]$/)]);
      } else {
        this.form.get('citta')!.setValidators([Validators.required, Validators.minLength(2), Validators.maxLength(80)]);
        this.form.get('comune')!.clearValidators();
        this.form.get('codiceFiscale')!.setValidators([
          Validators.pattern(/^[A-Za-z]{6}\d{2}[AaBbCcDdEeHhLlMmPpRrSsTt](0[1-9]|[12]\d|3[01]|4[1-9]|[56]\d|7[01])[A-Za-z]\d{3}[A-Za-z]$/)]);
      }
      this.form.get('comune')!.updateValueAndValidity();
      this.form.get('citta')!.updateValueAndValidity();
      this.form.get('codiceFiscale')!.updateValueAndValidity();
    }
    this.calcolaCodiceFiscale();
  }

  // ─── Comune ───────────────────────────────────────────────────────────────

  toggleComune(event: Event): void {
    event.stopPropagation();
    this.comuneAperto = !this.comuneAperto;
    if (this.comuneAperto) {
      this.sessoAperto  = false;
      this.paeseAperto  = false;
      this.indiceComune = -1;
      this.filtroComuni = this.comuneValore ?? '';
      setTimeout(() => {
        const i = document.querySelector('.comune-input') as HTMLInputElement;
        if (i) { i.focus(); i.select(); }
      }, 0);
    }
    if (!this.comuneAperto) { this.filtroComuni = ''; this.indiceComune = -1; }
  }

  onInputComune(event: Event): void {
    this.filtroComuni = (event.target as HTMLInputElement).value;
    this.indiceComune = -1;
    if (!this.comuneAperto) this.comuneAperto = true;
  }

  navigaComune(event: KeyboardEvent): void {
    if (!this.comuneAperto) return;
    const lista = this.comuniFiltrati;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.filtroComuni = (event.target as HTMLInputElement).value;
      this.indiceComune = Math.min(this.indiceComune + 1, lista.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.filtroComuni = (event.target as HTMLInputElement).value;
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

  onBlurComune(event: FocusEvent): void {
    const dest = event.relatedTarget as HTMLElement | null;
    if (dest?.closest('.select-dropdown')) return;
    const val = (event.target as HTMLInputElement).value.trim().toLowerCase();
    if (!val) return;
    if (this.comuneValore && this.comuneValore.toLowerCase() === val) return;
    const trovato = this.fs.comuni.find(c => (c.comune ?? '').toLowerCase() === val);
    if (trovato) this.selezionaComune(trovato.comune);
  }

  selezionaComune(valore: string): void {
    this.comuneValore = valore;
    this.comuneAperto = false;
    this.filtroComuni = '';
    this.indiceComune = -1;
    this.form.get('comune')!.setValue(valore);
    this.form.get('comune')!.markAsTouched();
    this.calcolaCodiceFiscale();
  }

  // ─── Codice fiscale ───────────────────────────────────────────────────────

  svuotaCF(): void {
    this.cfValore = '';
    this.cfFlash  = false;
    this.cfModificatoManualmente = false;
    this.form.get('codiceFiscale')!.setValue('');
    this.form.get('codiceFiscale')!.markAsTouched();
  }

  calcolaCodiceFiscale(): void {
    const nome    = (document.getElementById('nome')    as HTMLInputElement)?.value?.trim() ?? '';
    const cognome = (document.getElementById('cognome') as HTMLInputElement)?.value?.trim() ?? '';
    const gg      = (document.getElementById('data_gg')   as HTMLInputElement)?.value ?? '';
    const mm      = (document.getElementById('data_mm')   as HTMLInputElement)?.value ?? '';
    const aaaa    = (document.getElementById('data_aaaa') as HTMLInputElement)?.value ?? '';

    if (!nome || !cognome || gg.length < 2 || mm.length < 2 || aaaa.length < 4 || !this.sessoValore) return;
    if (!this.paeseValore) return;
    if (this.isItalia && !this.comuneValore) return;

    let codiceCatastale = '';
    if (this.isItalia) {
      codiceCatastale = this.fs.comuni.find(c => c.comune === this.comuneValore)?.codice_belfiore ?? '';
    } else {
      codiceCatastale = this.fs.nazioni.find(n => n.iso === this.paeseValore)?.codice_belfiore ?? '';
    }
    if (!codiceCatastale) return;

    const meseCodici  = ['A','B','C','D','E','H','L','M','P','R','S','T'];
    const giornoNum   = parseInt(gg, 10) + (this.sessoValore === 'F' ? 40 : 0);
    const parziale = (
      cfLettere(cognome, false) +
      cfLettere(nome,    true)  +
      aaaa.slice(-2)            +
      (meseCodici[parseInt(mm, 10) - 1] ?? '') +
      String(giornoNum).padStart(2, '0')       +
      codiceCatastale
    ).toUpperCase();

    if (parziale.length !== 15) return;

    const cf = parziale + cfControllo(parziale);
    if (cf === this.cfValore || this.cfModificatoManualmente) return;

    this.cfValore = cf;
    this.form.get('codiceFiscale')!.setValue(cf);
    this.form.get('codiceFiscale')!.markAsTouched();
    this.cfFlash = false;
    setTimeout(() => { this.cfFlash = true;  }, 10);
    setTimeout(() => { this.cfFlash = false; }, 1510);
  }

  // ─── Datepicker ───────────────────────────────────────────────────────────

  inizializzaDatepicker(lingua: string): void {
    const input = document.getElementById('datepicker-input') as HTMLInputElement;
    if (!input) return;

    this.datepicker = new Datepicker(input, {
      format: 'dd/mm/yyyy',
      autohide: true,
      language: lingua === 'it' ? 'it' : 'en',
      weekStart: 1,
    });

    input.addEventListener('show', () => { this.datepickerAperto = true; });
    input.addEventListener('hide', () => { this.datepickerAperto = false; });
    input.addEventListener('changeDate', (e: any) => {
      const data: Date = e.detail.date;
      if (!data) return;
      const gg   = String(data.getDate()).padStart(2, '0');
      const mm   = String(data.getMonth() + 1).padStart(2, '0');
      const aaaa = String(data.getFullYear());
      (document.getElementById('data_gg')   as HTMLInputElement).value = gg;
      (document.getElementById('data_mm')   as HTMLInputElement).value = mm;
      (document.getElementById('data_aaaa') as HTMLInputElement).value = aaaa;
      this.form.get('dataGg')!.setValue(gg);   this.form.get('dataGg')!.markAsTouched();
      this.form.get('dataMm')!.setValue(mm);   this.form.get('dataMm')!.markAsTouched();
      this.form.get('dataAaaa')!.setValue(aaaa); this.form.get('dataAaaa')!.markAsTouched();
      this.calcolaCodiceFiscale();
    });
  }

  apriDatepicker(event: Event): void {
    if (!this.datepicker) return;
    event.stopPropagation();
    this.datepickerAperto ? this.datepicker.hide() : this.datepicker.show();
  }

  // ─── Gestione tastiera data ───────────────────────────────────────────────

  soloNumeri(event: KeyboardEvent, campo?: 'gg' | 'mm' | 'aaaa'): void {
    const input = event.target as HTMLInputElement;

    if (event.key === 'Backspace') {
      if (campo && campo !== 'gg' && input.selectionStart === 0 && input.selectionEnd === 0) {
        event.preventDefault();
        const prec = (campo === 'mm'
          ? document.getElementById('data_gg')
          : document.getElementById('data_mm')) as HTMLInputElement;
        if (prec) { prec.focus(); prec.value = prec.value.slice(0, -1); prec.setSelectionRange(prec.value.length, prec.value.length); }
      }
      return;
    }
    if (event.key === 'Delete') {
      if (input.selectionStart === input.value.length) {
        const succ = (campo === 'gg'
          ? document.getElementById('data_mm')
          : campo === 'mm' ? document.getElementById('data_aaaa') : null) as HTMLInputElement | null;
        if (succ) { event.preventDefault(); succ.focus(); succ.value = succ.value.slice(1); succ.setSelectionRange(0, 0); }
      }
      return;
    }
    if (event.key === 'ArrowLeft' && input.selectionStart === 0) {
      event.preventDefault();
      const prec = (campo === 'mm' ? document.getElementById('data_gg') : campo === 'aaaa' ? document.getElementById('data_mm') : null) as HTMLInputElement | null;
      if (prec) { prec.focus(); prec.setSelectionRange(prec.value.length, prec.value.length); }
      return;
    }
    if (event.key === 'ArrowRight' && input.selectionStart === input.value.length) {
      event.preventDefault();
      const succ = (campo === 'gg' ? document.getElementById('data_mm') : campo === 'mm' ? document.getElementById('data_aaaa') : null) as HTMLInputElement | null;
      if (succ) { succ.focus(); succ.setSelectionRange(0, 0); }
      return;
    }
    if (event.key === 'Tab') return;
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
    if (target.tagName === 'INPUT' || target.closest('button')) return;
    const gg   = document.getElementById('data_gg')   as HTMLInputElement;
    const mm   = document.getElementById('data_mm')   as HTMLInputElement;
    const aaaa = document.getElementById('data_aaaa') as HTMLInputElement;
    if (!gg.value)                            { gg.focus();   return; }
    if (!mm.value)                            { mm.focus();   return; }
    if (!aaaa.value || aaaa.value.length < 4) { aaaa.focus(); return; }
    gg.focus();
  }

  dataCompilata(): boolean {
    const gg   = (document.getElementById('data_gg')   as HTMLInputElement)?.value;
    const mm   = (document.getElementById('data_mm')   as HTMLInputElement)?.value;
    const aaaa = (document.getElementById('data_aaaa') as HTMLInputElement)?.value;
    return !!(gg || mm || aaaa);
  }

  onTabForm(event: KeyboardEvent): void {
    if ((event.target as HTMLElement) === document.getElementById('data_aaaa'))
      this._sessoFocusDaTab = true;
  }

  onBlurAnag(event: FocusEvent): void {
    const dest = event.relatedTarget as HTMLElement | null;
    if ((dest?.classList.contains('avanti_btn') ?? false) && !this.isItalia) return;
    this.calcolaCodiceFiscale();
  }

  onEnterForm(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'BUTTON' && target.getAttribute('type') === 'submit') return;
    event.preventDefault();
  }

  // ─── Chiudi tutti i dropdown ──────────────────────────────────────────────

  chiudiDropdown(): void {
    this.sessoAperto  = false;
    this.paeseAperto  = false;
    this.comuneAperto = false;
  }
}
