import { Injectable }    from '@angular/core';
import { Validators }    from '@angular/forms';
import { TranslateService }    from '@ngx-translate/core';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { ApiService }          from 'src/app/_servizi_globali/api.service';
import { IscrizioneFormService } from './iscrizione-form.service';

@Injectable()
export class IscrizioneStep2Service {

  // ─── Paese domicilio ──────────────────────────────────────────────────────
  paeseDomAperto   = false;
  paeseDomValore   = 'IT';
  filtroNazioniDom = '';
  indiceNazioneDom = -1;

  // ─── Comune domicilio ─────────────────────────────────────────────────────
  comuneDomAperto  = false;
  comuneDomValore  = '';
  filtroComuniDom  = '';
  indiceComuneDom  = -1;

  // ─── CAP ──────────────────────────────────────────────────────────────────
  capDomAperto     = false;
  capValore        = '';
  filtroCapDom     = '';
  indiceCapDom     = -1;
  capIsMulti       = false;
  capMultiOpzioni: string[] = [];
  capFlash         = false;

  // ─── Provincia / coerenza ─────────────────────────────────────────────────
  provinciaFlash          = false;
  erroreCoerenzaIndirizzo = false;

  // ─── Prezzi ───────────────────────────────────────────────────────────────
  prezzoBase    = '5€';
  prezzoPremium = '10€';

  // ─── Getter ───────────────────────────────────────────────────────────────

  get form() { return this.fs.reactiveFormStep2; }

  get isItaliaDom(): boolean { return this.paeseDomValore === 'IT'; }

  get nazioniFiltrateDom(): any[] {
    if (!this.filtroNazioniDom.trim()) return this.fs.nazioni;
    const f = this.filtroNazioniDom.toLowerCase();
    return this.fs.nazioni.filter(n =>
      (n.nazione_it ?? '').toLowerCase().startsWith(f) ||
      (n.nazione_en ?? '').toLowerCase().startsWith(f)
    );
  }

  get comuniFiltreatiDom(): any[] {
    if (!this.filtroComuniDom.trim()) return [];
    const f = this.filtroComuniDom.toLowerCase();
    return this.fs.comuni
      .filter(c => (c.comune ?? '').toLowerCase().startsWith(f))
      .slice(0, 50);
  }

  get capFiltrate(): string[] {
    if (!this.filtroCapDom.trim()) return this.capMultiOpzioni;
    return this.capMultiOpzioni.filter(c => c.startsWith(this.filtroCapDom));
  }

  constructor(
    private fs:                  IscrizioneFormService,
    private apiService:          ApiService,
    private cambioLinguaService: CambioLinguaService,
    private translateService:    TranslateService,
  ) {}

  // ─── Prezzi ───────────────────────────────────────────────────────────────

  aggiornaPrezzi(iso: string): void {
    this.apiService.getPrezziNazione(iso).subscribe({
      next: (rit) => {
        const d = rit.data;
        if (!d || !d.tasso || parseFloat(d.tasso) <= 0) {
          this.prezzoBase = '5€'; this.prezzoPremium = '10€'; return;
        }
        const tasso:    number = parseFloat(d.tasso);
        const aliquota: number = d.aliquota ? parseFloat(d.aliquota) / 100 : 0;
        const simbolo:  string = d.valuta_simbolo ?? '€';
        const calcola  = (base: number) =>
          `${(base * tasso * (1 + aliquota)).toFixed(2)}${simbolo}`;
        this.prezzoBase    = calcola(5);
        this.prezzoPremium = calcola(10);
      },
      error: () => { this.prezzoBase = '5€'; this.prezzoPremium = '10€'; },
    });
  }

  // ─── Label ────────────────────────────────────────────────────────────────

  paeseDomLabel(): string {
    if (!this.paeseDomValore)
      return this.translateService.instant('ui.registrazione.placeholder.seleziona_paese');
    const nazione = this.fs.nazioni.find(n => n.iso === this.paeseDomValore);
    if (!nazione) return '';
    return this.cambioLinguaService.leggiCodiceLingua() === 'it'
      ? nazione.nazione_it
      : nazione.nazione_en;
  }

  // ─── Paese domicilio ──────────────────────────────────────────────────────

  togglePaeseDom(event: Event): void {
    event.stopPropagation();
    this.paeseDomAperto = !this.paeseDomAperto;
    if (this.paeseDomAperto) {
      this.comuneDomAperto = false;
      this.capDomAperto    = false;
      this.indiceNazioneDom = -1;
      this.filtroNazioniDom = this.paeseDomValore ? this.paeseDomLabel() : '';
      setTimeout(() => {
        const i = document.querySelector('.paese-dom-input') as HTMLInputElement;
        if (i) { i.focus(); i.select(); }
      }, 0);
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
    const lista = this.nazioniFiltrateDom;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.filtroNazioniDom = (event.target as HTMLInputElement).value;
      this.indiceNazioneDom = Math.min(this.indiceNazioneDom + 1, lista.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.filtroNazioniDom = (event.target as HTMLInputElement).value;
      this.indiceNazioneDom = Math.max(this.indiceNazioneDom - 1, -1);
    } else if (event.key === 'Enter' && this.indiceNazioneDom >= 0) {
      event.preventDefault();
      this.selezionaPaeseDom(lista[this.indiceNazioneDom].iso);
    } else if (event.key === 'Escape') {
      this.paeseDomAperto   = false;
      this.filtroNazioniDom = '';
      this.indiceNazioneDom = -1;
    }
  }

  onBlurPaeseDom(event: FocusEvent): void {
    const dest = event.relatedTarget as HTMLElement | null;
    if (dest?.closest('.select-dropdown')) return;
    const val = (event.target as HTMLInputElement).value.trim().toLowerCase();
    if (!val) return;
    if (this.paeseDomValore && this.paeseDomLabel().toLowerCase() === val) return;
    const trovata = this.fs.nazioni.find(n =>
      (n.nazione_it ?? '').toLowerCase() === val ||
      (n.nazione_en ?? '').toLowerCase() === val
    );
    if (trovata) this.selezionaPaeseDom(trovata.iso);
  }

  selezionaPaeseDom(valore: string): void {
    const cambiaTipo = (valore === 'IT') !== (this.paeseDomValore === 'IT');
    this.paeseDomValore   = valore;
    this.paeseDomAperto   = false;
    this.filtroNazioniDom = '';
    this.indiceNazioneDom = -1;
    this.aggiornaPrezzi(valore);
    this.form.get('nazioneD')!.setValue(valore);
    this.form.get('nazioneD')!.markAsTouched();

    if (cambiaTipo) {
      this.comuneDomValore = '';
      this.filtroComuniDom = '';
      this.capValore = ''; this.capIsMulti = false; this.capMultiOpzioni = [];
      this.form.get('comuneD')!.setValue('');
      this.form.get('cittaD')!.setValue('');
      this.form.get('provinciaD')!.setValue('');
      this.form.get('cap')!.setValue('');

      if (valore === 'IT') {
        this.form.get('comuneD')!.setValidators(Validators.required);
        this.form.get('cittaD')!.clearValidators();
        this.form.get('provinciaD')!.setValidators([Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)]);
        this.form.get('cap')!.setValidators([Validators.required, Validators.pattern(/^\d{5}$/)]);
      } else {
        this.form.get('cittaD')!.setValidators([Validators.required, Validators.minLength(2), Validators.maxLength(80)]);
        this.form.get('comuneD')!.clearValidators();
        this.form.get('provinciaD')!.clearValidators();
        this.form.get('cap')!.clearValidators();
      }
      this.form.get('comuneD')!.updateValueAndValidity();
      this.form.get('cittaD')!.updateValueAndValidity();
      this.form.get('provinciaD')!.updateValueAndValidity();
      this.form.get('cap')!.updateValueAndValidity();
    }
  }

  // ─── Comune domicilio ─────────────────────────────────────────────────────

  toggleComuneDom(event: Event): void {
    event.stopPropagation();
    this.comuneDomAperto = !this.comuneDomAperto;
    if (this.comuneDomAperto) {
      this.paeseDomAperto  = false;
      this.capDomAperto    = false;
      this.indiceComuneDom = -1;
      this.filtroComuniDom = this.comuneDomValore ?? '';
      setTimeout(() => {
        const i = document.querySelector('.comune-dom-input') as HTMLInputElement;
        if (i) { i.focus(); i.select(); }
      }, 0);
    }
    if (!this.comuneDomAperto) { this.filtroComuniDom = ''; this.indiceComuneDom = -1; }
  }

  onInputComuneDom(event: Event): void {
    this.filtroComuniDom = (event.target as HTMLInputElement).value;
    this.indiceComuneDom = -1;
    if (!this.comuneDomAperto) this.comuneDomAperto = true;
  }

  navigaComuneDom(event: KeyboardEvent): void {
    if (!this.comuneDomAperto) return;
    const lista = this.comuniFiltreatiDom;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.filtroComuniDom = (event.target as HTMLInputElement).value;
      this.indiceComuneDom = Math.min(this.indiceComuneDom + 1, lista.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.filtroComuniDom = (event.target as HTMLInputElement).value;
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

  onBlurComuneDom(event: FocusEvent): void {
    const dest = event.relatedTarget as HTMLElement | null;
    if (dest?.closest('.select-dropdown')) return;
    const val = (event.target as HTMLInputElement).value.trim().toLowerCase();
    if (!val) return;
    if (this.comuneDomValore && this.comuneDomValore.toLowerCase() === val) return;
    const trovato = this.fs.comuni.find(c => (c.comune ?? '').toLowerCase() === val);
    if (trovato) this.selezionaComuneDom(trovato.comune);
  }

  selezionaComuneDom(valore: string): void {
    this.comuneDomValore = valore;
    this.comuneDomAperto = false;
    this.filtroComuniDom = '';
    this.indiceComuneDom = -1;
    this.form.get('comuneD')!.setValue(valore);
    this.form.get('comuneD')!.markAsTouched();

    const comune = this.fs.comuni.find(c => c.comune === valore);
    if (!comune) return;

    // Provincia
    const sigla = (comune.sigla_automobilistica ?? '').toUpperCase();
    this.form.get('provinciaD')!.setValue(sigla);
    this.form.get('provinciaD')!.markAsTouched();
    this.provinciaFlash = false;
    setTimeout(() => { this.provinciaFlash = true;  }, 10);
    setTimeout(() => { this.provinciaFlash = false; }, 1510);

    // CAP
    this.capValore = ''; this.capIsMulti = false; this.capMultiOpzioni = [];
    this.capFlash  = false;
    this.form.get('cap')!.setValue('');

    if (comune.cap_inizio && comune.cap_fine && String(comune.cap_inizio) !== String(comune.cap_fine)) {
      const inizio = parseInt(String(comune.cap_inizio), 10);
      const fine   = parseInt(String(comune.cap_fine),   10);
      if (!isNaN(inizio) && !isNaN(fine) && fine > inizio) {
        const opzioni: string[] = [];
        for (let n = inizio; n <= fine; n++) opzioni.push(String(n).padStart(5, '0'));
        this.capIsMulti = true;
        this.capMultiOpzioni = opzioni;
        this.form.get('cap')!.clearValidators();
        this.form.get('cap')!.updateValueAndValidity();
        setTimeout(() => { this.capFlash = true; setTimeout(() => { this.capFlash = false; }, 1510); }, 30);
        return;
      }
    }
    if (comune.cap) {
      this.capValore = String(comune.cap).padStart(5, '0');
      this.form.get('cap')!.setValue(this.capValore);
      this.form.get('cap')!.markAsTouched();
      setTimeout(() => { this.capFlash = true;  }, 10);
      setTimeout(() => { this.capFlash = false; }, 1510);
    }
  }

  // ─── CAP ──────────────────────────────────────────────────────────────────

  toggleCapDom(event: Event): void {
    event.stopPropagation();
    this.capDomAperto = !this.capDomAperto;
    if (this.capDomAperto) {
      this.paeseDomAperto  = false;
      this.comuneDomAperto = false;
      this.indiceCapDom    = -1;
      this.filtroCapDom    = this.capValore ?? '';
      setTimeout(() => {
        const i = document.querySelector('.cap-dom-input') as HTMLInputElement;
        if (i) { i.focus(); i.select(); }
      }, 0);
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

  onBlurCapDom(event: FocusEvent): void {
    const dest = event.relatedTarget as HTMLElement | null;
    if (dest?.closest('.select-dropdown')) return;
    const val = (event.target as HTMLInputElement).value.trim();
    if (!val || this.capValore === val) return;
    const trovato = this.capMultiOpzioni.find(c => c === val);
    if (trovato) this.selezionaCapDom(trovato);
  }

  selezionaCapDom(valore: string): void {
    this.capValore    = valore;
    this.capDomAperto = false;
    this.filtroCapDom = '';
    this.indiceCapDom = -1;
    this.form.get('cap')!.setValidators([Validators.required, Validators.pattern(/^\d{5}$/)]);
    this.form.get('cap')!.setValue(valore);
    this.form.get('cap')!.markAsTouched();
    this.form.get('cap')!.updateValueAndValidity();
    setTimeout(() => { this.capFlash = true;  }, 10);
    setTimeout(() => { this.capFlash = false; }, 1510);
  }

  onInputCap(event: Event): void {
    const input = event.target as HTMLInputElement;
    const val   = input.value.replace(/[^0-9]/g, '');
    input.value = val;
    this.capValore = val;
    this.form.get('cap')!.setValue(val);
  }

  // ─── Provincia ────────────────────────────────────────────────────────────

  onInputProvincia(event: Event): void {
    const input = event.target as HTMLInputElement;
    const val   = input.value.toUpperCase().replace(/[^A-Z]/g, '');
    input.value = val;
    this.form.get('provinciaD')!.setValue(val);
  }

  // ─── Verifica coerenza indirizzo (usata da avanti2 nel componente) ─────────

  verificaCoerenzaIndirizzo(): boolean {
    if (!this.isItaliaDom) return true;
    const comune = this.fs.comuni.find(c => c.comune === this.comuneDomValore);
    if (!comune) return true;

    const provinciaInserita = (this.form.get('provinciaD')!.value ?? '').toUpperCase();
    const provinciaAttesa   = (comune.sigla_automobilistica ?? '').toUpperCase();

    let capOk: boolean;
    if (comune.cap_inizio && comune.cap_fine && String(comune.cap_inizio) !== String(comune.cap_fine)) {
      const inizio = parseInt(String(comune.cap_inizio), 10);
      const fine   = parseInt(String(comune.cap_fine),   10);
      const capNum = parseInt(this.capValore, 10);
      capOk = !isNaN(capNum) && capNum >= inizio && capNum <= fine;
    } else {
      capOk = this.capValore === String(comune.cap).padStart(5, '0');
    }
    return provinciaInserita === provinciaAttesa && capOk;
  }

  // ─── Chiudi tutti i dropdown ──────────────────────────────────────────────

  chiudiDropdown(): void {
    this.paeseDomAperto  = false;
    this.comuneDomAperto = false;
    this.capDomAperto    = false;
  }
}
