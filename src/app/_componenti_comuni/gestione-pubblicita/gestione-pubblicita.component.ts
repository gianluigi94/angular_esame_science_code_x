import { Component, OnInit, EventEmitter, Output, ChangeDetectorRef } from '@angular/core';
import { take } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import gsap from 'gsap';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { ToastService } from 'src/app/_servizi_globali/toast.service';

interface PubblicitaItem {
  id_pubblicita: number;
  descrizione: string;
  campagna_attiva: boolean;
  inizio_campagna: string;
  fine_campagna: string;
  peso: number;
  visualizzazioni_count: number;
  aperta: boolean;
  salvataggioInCorso: boolean;
  fileIt: File | null;
  fileEn: File | null;
  uploadInCorso: boolean;
  modalitaIt: 'file' | 'url';
  modalitaEn: 'file' | 'url';
  urlIt: string;
  urlEn: string;
}

@Component({
  selector: 'app-gestione-pubblicita',
  templateUrl: './gestione-pubblicita.component.html',
  styleUrls: ['./gestione-pubblicita.component.scss'],
})
export class GestionePubblicitaComponent implements OnInit {
  @Output() chiudi = new EventEmitter<void>();

  pubblicita: PubblicitaItem[] = [];
  caricamento = false;

  mostraFormNuova = false;
  nuovaCampagnaAttiva = true;
  nuovaDescrizione = '';
  nuovoInizio = '';
  nuovoFine = '';
  nuovoPeso = 1;
  nuovoFileIt: File | null = null;
  nuovoFileEn: File | null = null;
  creazioneInCorso = false;

  playerUrl: string | null = null;
  playerTitolo = '';

  pubblicitaDaEliminare: PubblicitaItem | null = null;
  categorieFileEliminazione: Record<string, boolean> = {};
  eliminazioneInCorso = false;

  datiModifica: Record<number, { descrizione: string; inizio_campagna: string; fine_campagna: string; peso: number; campagna_attiva: boolean }> = {};
  dropdownModalitaAperta = '';
  modalitaNuovoIt: 'file' | 'url' = 'file';
  modalitaNuovoEn: 'file' | 'url' = 'file';
  urlNuovoIt = '';
  urlNuovoEn = '';

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private toastService: ToastService,
  ) {}

  ngOnInit(): void {
    this.caricaLista();
    setTimeout(() => this.avviaAnimazioniIngresso(), 0);
  }

  private caricaLista(): void {
    this.caricamento = true;
    this.api.getPubblicitaGestione().pipe(take(1)).subscribe({
      next: (rit) => {
        this.pubblicita = (rit.data ?? []).map((p: any) => ({
          ...p,
          descrizione: p.descrizione ?? '',
          aperta: false,
          salvataggioInCorso: false,
          fileIt: null,
          fileEn: null,
          uploadInCorso: false,
          modalitaIt: 'url' as 'file' | 'url',
          modalitaEn: 'url' as 'file' | 'url',
          urlIt: `https://d2kd3i5q9rl184.cloudfront.net/media/med_${p.id_pubblicita}_it.mp4`,
          urlEn: `https://d2kd3i5q9rl184.cloudfront.net/media/med_${p.id_pubblicita}_en.mp4`,
        }));
        this.caricamento = false;
      },
      error: () => {
        this.pubblicita = [];
        this.caricamento = false;
      },
    });
  }

  toggleItem(p: PubblicitaItem): void {
    p.aperta = !p.aperta;
    if (p.aperta) {
      this.datiModifica[p.id_pubblicita] = {
        descrizione: p.descrizione,
        inizio_campagna: p.inizio_campagna,
        fine_campagna: p.fine_campagna,
        peso: p.peso,
        campagna_attiva: p.campagna_attiva,
      };
    } else {
      delete this.datiModifica[p.id_pubblicita];
    }
  }

  toggleFormNuova(): void {
    this.mostraFormNuova = !this.mostraFormNuova;
    if (this.mostraFormNuova) {
      this.nuovaCampagnaAttiva = true;
      this.nuovaDescrizione = '';
      this.nuovoInizio = '';
      this.nuovoFine = '';
      this.nuovoPeso = 1;
      this.nuovoFileIt = null;
      this.nuovoFileEn = null;
      this.modalitaNuovoIt = 'file';
      this.modalitaNuovoEn = 'file';
      this.urlNuovoIt = '';
      this.urlNuovoEn = '';
    }
  }

  onFileChange(event: Event, tipo: 'it' | 'en', target?: PubblicitaItem): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (target) {
      if (tipo === 'it') target.fileIt = file;
      else target.fileEn = file;
    } else {
      if (tipo === 'it') this.nuovoFileIt = file;
      else this.nuovoFileEn = file;
    }
  }

  onDropFile(fileList: File[], tipo: 'it' | 'en', target?: PubblicitaItem): void {
    const file = fileList[0] ?? null;
    if (target) {
      if (tipo === 'it') target.fileIt = file;
      else target.fileEn = file;
    } else {
      if (tipo === 'it') this.nuovoFileIt = file;
      else this.nuovoFileEn = file;
    }
  }

  cambiaModalitaNuovo(lingua: 'it' | 'en', modalita: 'file' | 'url'): void {
    if (lingua === 'it') {
      this.modalitaNuovoIt = modalita;
      this.nuovoFileIt = null;
      if (modalita === 'url' && !this.urlNuovoIt) {
        this.urlNuovoIt = 'https://d2kd3i5q9rl184.cloudfront.net/media/';
      }
    } else {
      this.modalitaNuovoEn = modalita;
      this.nuovoFileEn = null;
      if (modalita === 'url' && !this.urlNuovoEn) {
        this.urlNuovoEn = 'https://d2kd3i5q9rl184.cloudfront.net/media/';
      }
    }
    this.dropdownModalitaAperta = '';
  }

  cambiaModalitaMod(p: PubblicitaItem, lingua: 'it' | 'en', modalita: 'file' | 'url'): void {
    if (lingua === 'it') {
      p.modalitaIt = modalita;
      p.fileIt = null;
      if (modalita === 'url' && !p.urlIt) {
        p.urlIt = 'https://d2kd3i5q9rl184.cloudfront.net/media/med_' + p.id_pubblicita + '_it.mp4';
      }
    } else {
      p.modalitaEn = modalita;
      p.fileEn = null;
      if (modalita === 'url' && !p.urlEn) {
        p.urlEn = 'https://d2kd3i5q9rl184.cloudfront.net/media/med_' + p.id_pubblicita + '_en.mp4';
      }
    }
    this.dropdownModalitaAperta = '';
  }

  apriPlayer(p: PubblicitaItem, lingua: 'it' | 'en'): void {
    this.playerUrl = 'https://d2kd3i5q9rl184.cloudfront.net/media/med_' + p.id_pubblicita + '_' + lingua + '.mp4';
    this.playerTitolo = '#' + p.id_pubblicita + ' — Video ' + lingua.toUpperCase();
  }

  chiudiPlayer(): void {
    this.playerUrl = null;
    this.playerTitolo = '';
  }

  creaPubblicita(): void {
    if (this.creazioneInCorso) return;
    if (!this.nuovoInizio || !this.nuovoFine) return;

    if (!this.haAbilita(7)) {
      alert("ATTENZIONE: ti manca l'abilità necessaria (aggiungere_pubblicita).");
      return;
    }

    this.creazioneInCorso = true;

    this.api.creaPubblicita({
      descrizione: this.nuovaDescrizione,
      inizio_campagna: this.nuovoInizio,
      fine_campagna: this.nuovoFine,
      peso: this.nuovoPeso,
      campagna_attiva: this.nuovaCampagnaAttiva,
    }).pipe(take(1)).subscribe({
      next: async (rit) => {
        const nuova: PubblicitaItem = {
          ...rit.data,
          descrizione: rit.data.descrizione ?? this.nuovaDescrizione,
          aperta: false,
          salvataggioInCorso: false,
          fileIt: null,
          fileEn: null,
          uploadInCorso: false,
          modalitaIt: 'url' as 'file' | 'url',
          modalitaEn: 'url' as 'file' | 'url',
          urlIt: `https://d2kd3i5q9rl184.cloudfront.net/media/med_${rit.data.id_pubblicita}_it.mp4`,
          urlEn: `https://d2kd3i5q9rl184.cloudfront.net/media/med_${rit.data.id_pubblicita}_en.mp4`,
        };

        const urlIt = this.modalitaNuovoIt === 'url' ? this.urlNuovoIt.trim() : '';
        const urlEn = this.modalitaNuovoEn === 'url' ? this.urlNuovoEn.trim() : '';
        if (this.nuovoFileIt || this.nuovoFileEn || urlIt || urlEn) {
          await this.uploadFile(nuova.id_pubblicita, this.nuovoFileIt, this.nuovoFileEn, urlIt, urlEn);
        }

        this.pubblicita.unshift(nuova);
        this.mostraFormNuova = false;
        this.creazioneInCorso = false;
        this.toastService.successo('Pubblicità creata con successo.');
        this.cdr.detectChanges();
      },
      error: () => {
        this.creazioneInCorso = false;
        this.toastService.errore('Errore durante la creazione della pubblicità.');
      },
    });
  }

  salvaPubblicita(p: PubblicitaItem): void {
    if (p.salvataggioInCorso) return;

    if (!this.haAbilita(8)) {
      alert("ATTENZIONE: ti manca l'abilità necessaria (modificare_pubblicita).");
      return;
    }

    const dati = this.datiModifica[p.id_pubblicita];
    if (!dati) return;

    p.salvataggioInCorso = true;

    this.api.aggiornaPubblicita(p.id_pubblicita, {
      descrizione: dati.descrizione,
      inizio_campagna: dati.inizio_campagna,
      fine_campagna: dati.fine_campagna,
      peso: dati.peso,
      campagna_attiva: dati.campagna_attiva,
    }).pipe(take(1)).subscribe({
      next: async () => {
        const urlIt = (p.modalitaIt || 'url') === 'url' ? (p.urlIt || '').trim() : '';
        const urlEn = (p.modalitaEn || 'url') === 'url' ? (p.urlEn || '').trim() : '';
        const urlItCambiato = urlIt && urlIt !== 'https://d2kd3i5q9rl184.cloudfront.net/media/med_' + p.id_pubblicita + '_it.mp4';
        const urlEnCambiato = urlEn && urlEn !== 'https://d2kd3i5q9rl184.cloudfront.net/media/med_' + p.id_pubblicita + '_en.mp4';
        if (p.fileIt || p.fileEn || urlItCambiato || urlEnCambiato) {
          await this.uploadFile(
            p.id_pubblicita,
            p.fileIt,
            p.fileEn,
            urlItCambiato ? urlIt : '',
            urlEnCambiato ? urlEn : '',
          );
          p.fileIt = null;
          p.fileEn = null;
        }
        p.descrizione = dati.descrizione;
        p.inizio_campagna = dati.inizio_campagna;
        p.fine_campagna = dati.fine_campagna;
        p.peso = dati.peso;
        p.campagna_attiva = dati.campagna_attiva;
        p.salvataggioInCorso = false;
        this.toastService.successo('Pubblicità aggiornata con successo.');
        this.cdr.detectChanges();
      },
      error: () => {
        p.salvataggioInCorso = false;
        this.toastService.errore('Errore durante l\'aggiornamento della pubblicità.');
      },
    });
  }

  private async uploadFile(
    id: number,
    fileIt: File | null,
    fileEn: File | null,
    urlDirettoIt: string = '',
    urlDirettoEn: string = '',
  ): Promise<void> {
    const fileDaCaricare: { lingua: string }[] = [];
    if (fileIt) fileDaCaricare.push({ lingua: 'it' });
    if (fileEn) fileDaCaricare.push({ lingua: 'en' });

    const urlDiretti: { lingua: string; url: string }[] = [];
    if (urlDirettoIt) urlDiretti.push({ lingua: 'it', url: urlDirettoIt });
    if (urlDirettoEn) urlDiretti.push({ lingua: 'en', url: urlDirettoEn });

    if (fileDaCaricare.length === 0 && urlDiretti.length === 0) return;

    try {
      const rit = await lastValueFrom(this.api.getPresignedUrlsPubblicita(id, fileDaCaricare, urlDiretti).pipe(take(1)));
      const urls: any[] = rit.data?.urls ?? [];

      for (const entry of urls) {
        const file = entry.lingua === 'it' ? fileIt : fileEn;
        if (!file) continue;
        try {
          await lastValueFrom(this.api.putFileSuS3(entry.url, file));
        } catch {}
      }
    } catch {}
  }

  apriModaleElimina(p: PubblicitaItem): void {
    if (this.eliminazioneInCorso) return;
    this.categorieFileEliminazione = { video_it: true, video_en: true };
    this.pubblicitaDaEliminare = p;
  }

  chiudiModaleElimina(): void {
    if (this.eliminazioneInCorso) return;
    this.pubblicitaDaEliminare = null;
  }

  confermaElimina(): void {
    if (!this.pubblicitaDaEliminare || this.eliminazioneInCorso) return;

    if (!this.haAbilita(9)) {
      alert("ATTENZIONE: ti manca l'abilità necessaria (eliminare_pubblicita).");
      return;
    }

    this.eliminazioneInCorso = true;

    this.api.eliminaPubblicita(this.pubblicitaDaEliminare.id_pubblicita, this.categorieFileEliminazione)
      .pipe(take(1)).subscribe({
        next: () => {
          this.pubblicita = this.pubblicita.filter(
            (x) => x.id_pubblicita !== this.pubblicitaDaEliminare!.id_pubblicita,
          );
          this.pubblicitaDaEliminare = null;
          this.eliminazioneInCorso = false;
          this.toastService.successo('Pubblicità eliminata con successo.');
        },
        error: () => {
          this.eliminazioneInCorso = false;
          this.toastService.errore('Errore durante l\'eliminazione della pubblicità.');
        },
      });
  }

  private leggiPayloadToken(): any | null {
    const archivi = [localStorage, sessionStorage];
    for (const archivio of archivi) {
      for (let i = 0; i < archivio.length; i++) {
        const chiave = archivio.key(i);
        if (!chiave) continue;
        const valore = archivio.getItem(chiave);
        if (!valore || valore.split('.').length !== 3) continue;
        try {
          const payloadBase64 = valore.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
          return JSON.parse(decodeURIComponent(escape(atob(payloadBase64))));
        } catch {
          continue;
        }
      }
    }
    return null;
  }

  private haAbilita(idAbilita: number): boolean {
    const payload = this.leggiPayloadToken();
    const abilita = payload?.data?.abilita ?? [];
    return Array.isArray(abilita) && abilita.map(Number).includes(idAbilita);
  }

  avviaAnimazioniIngresso(): void {
    const box = document.querySelector('.gp-box') as HTMLElement | null;
    const contenuto = document.querySelector('.gp-campo-animato') as HTMLElement | null;
    const sfocatura = document.querySelector('.gp-sfocatura') as HTMLElement | null;

    if (sfocatura) gsap.set(sfocatura, { opacity: 0 });
    if (box) gsap.set(box, { opacity: 0 });
    if (contenuto) gsap.set(contenuto, { opacity: 0, scaleX: 0, transformOrigin: 'center center' });

    if (sfocatura) gsap.to(sfocatura, { opacity: 1, duration: 0.7, ease: 'power2.out' });
    if (box) gsap.to(box, { opacity: 1, duration: 0.4, ease: 'power2.out' });
    if (contenuto) gsap.to(contenuto, { opacity: 1, scaleX: 1, duration: 0.55, delay: 0.12, ease: 'power2.out' });
  }

  chiudiPannello(): void {
    const box = document.querySelector('.gp-box') as HTMLElement | null;
    const contenuto = document.querySelector('.gp-campo-animato') as HTMLElement | null;
    const sfocatura = document.querySelector('.gp-sfocatura') as HTMLElement | null;

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
