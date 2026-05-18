import { Component, EventEmitter, Output, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-form-aggiungi-media',
  templateUrl: './form-aggiungi-media.component.html',
  styleUrls: ['./form-aggiungi-media.component.scss'],
})
export class FormAggiungiMediaComponent {
  @Output() chiudi = new EventEmitter<void>();

  categoriaAperta = false;
  categoriaSelezionata = '';
  categorie = ['Azione', 'Commedia', 'Drammatico', 'Horror', 'Fantascienza', 'Thriller', 'Animazione'];
  indiceCategoriaAttivo = -1;

  titoloIt = '';
  titoloEn = '';
  sottotitoloIt = '';
  sottotitoloEn = '';
  descrizioneIt = '';
  descrizioneEn = '';
  anno = '';
  novita = false;
  formInviato = false;
  formatiImmaginePermessi = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];
  estensioniImmaginePermesse = ['.png', '.jpg', '.jpeg', '.webp', '.avif'];
  pesoMassimoImmagine = 500 * 1024;

  formatiTrailerPermessi = ['video/mp4', 'video/webm', 'video/quicktime'];
  estensioniTrailerPermesse = ['.mp4', '.webm', '.mov'];
  pesoMassimoTrailer = 30 * 1024 * 1024;

  formatiJsonPermessi = ['application/json'];
  estensioniJsonPermesse = ['.json'];
  pesoMassimoJson = 100 * 1024;

  erroriFiles: Record<string, string> = {
    json_testi: '',
    img_titolo_it: '',
    img_titolo_en: '',
    img_copertina: '',
    locandina_it: '',
    locandina_en: '',
    trailer_it: '',
    trailer_en: '',
    pacchetto_hls: '',
  };

  files: Record<string, File[]> = {
    json_testi: [],
    img_titolo_it: [],
    img_titolo_en: [],
    img_copertina: [],
    locandina_it: [],
    locandina_en: [],
    trailer_it: [],
    trailer_en: [],
    pacchetto_hls: [],
  };

  selezionaCategoria(cat: string): void {
    this.categoriaSelezionata = cat;
    this.categoriaAperta = false;
  }

  onFileSelezionato(chiave: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    void this.aggiungiFiles(chiave, input.files);
    input.value = '';
  }

  onFileDrop(chiave: string, fileList: FileList | File[]): void {
    void this.aggiungiFiles(chiave, fileList);
  }

  rimuoviFile(chiave: string, indice: number): void {
    this.files[chiave].splice(indice, 1);
    this.erroriFiles[chiave] = '';
  }

  private async aggiungiFiles(chiave: string, fileList: FileList | File[]): Promise<void> {
    const multiplo = this.isMultiplo(chiave);
    const nuovi = Array.from(fileList);

    if (this.isCampoJson(chiave)) {
      this.erroriFiles[chiave] = '';

      if (nuovi.length > 1) {
        this.files[chiave] = [];
        this.erroriFiles[chiave] = 'Puoi caricare un solo file JSON.';
        return;
      }

      const file = nuovi[0];

      if (!file) return;

      if (!this.formatoJsonValido(file)) {
        this.files[chiave] = [];
        this.erroriFiles[chiave] = 'Formato non valido. Usa un file JSON.';
        return;
      }

      if (file.size > this.pesoMassimoJson) {
        this.files[chiave] = [];
        this.erroriFiles[chiave] = 'Il file JSON non può superare 100 KB.';
        return;
      }

      this.files[chiave] = [file];
      await this.compilaCampiDaJson(file);
      return;
    }

    if (this.isCampoImmagine(chiave)) {
      this.erroriFiles[chiave] = '';

      if (nuovi.length > 1) {
        this.files[chiave] = [];
        this.erroriFiles[chiave] = 'Puoi caricare un solo file.';
        return;
      }

      const file = nuovi[0];

      if (!file) return;

      if (!this.formatoImmagineValido(file)) {
        this.files[chiave] = [];
        this.erroriFiles[chiave] = 'Formato non valido. Usa PNG, JPG, WEBP o AVIF.';
        return;
      }

      if (file.size > this.pesoMassimoImmagine) {
        this.files[chiave] = [];
        this.erroriFiles[chiave] = 'Il file non può superare 500 KB.';
        return;
      }

      this.files[chiave] = [file];
      return;
    }

    if (this.isCampoTrailer(chiave)) {
      this.erroriFiles[chiave] = '';

      if (nuovi.length > 1) {
        this.files[chiave] = [];
        this.erroriFiles[chiave] = 'Puoi caricare un solo file.';
        return;
      }

      const file = nuovi[0];

      if (!file) return;

      if (!this.formatoTrailerValido(file)) {
        this.files[chiave] = [];
        this.erroriFiles[chiave] = 'Formato non valido. Usa MP4, WEBM o MOV.';
        return;
      }

      if (file.size > this.pesoMassimoTrailer) {
        this.files[chiave] = [];
        this.erroriFiles[chiave] = 'Il file non può superare 30 MB.';
        return;
      }

      this.files[chiave] = [file];
      return;
    }

    if (this.isCampoPacchettoHls(chiave)) {
      this.erroriFiles[chiave] = '';

      if (nuovi.length === 0) {
        this.files[chiave] = [];
        this.erroriFiles[chiave] = 'Il pacchetto HLS è obbligatorio.';
        return;
      }

      if (!this.pacchettoHlsValido(nuovi)) {
        this.files[chiave] = [];
        this.erroriFiles[chiave] = 'Pacchetto HLS incompleto. Controlla master, cartelle 360/720/1080/it/en e file m3u8/ts.';
        return;
      }

      this.files[chiave] = nuovi;
      return;
    }

    if (multiplo) {
      this.files[chiave] = [...this.files[chiave], ...nuovi];
    } else {
      this.files[chiave] = nuovi.slice(0, 1);
    }
  }

  isMultiplo(chiave: string): boolean {
    return ['pacchetto_hls'].includes(chiave);
  }

  isCampoImmagine(chiave: string): boolean {
    return ['img_titolo_it', 'img_titolo_en', 'img_copertina', 'locandina_it', 'locandina_en'].includes(chiave);
  }

  isCampoTrailer(chiave: string): boolean {
    return ['trailer_it', 'trailer_en'].includes(chiave);
  }

  isCampoJson(chiave: string): boolean {
    return chiave === 'json_testi';
  }

  isCampoPacchettoHls(chiave: string): boolean {
    return chiave === 'pacchetto_hls';
  }

  formatoImmagineValido(file: File): boolean {
    const nome = file.name.toLowerCase();

    return this.formatiImmaginePermessi.includes(file.type)
      || this.estensioniImmaginePermesse.some(estensione => nome.endsWith(estensione));
  }

  formatoTrailerValido(file: File): boolean {
    const nome = file.name.toLowerCase();

    return this.formatiTrailerPermessi.includes(file.type)
      || this.estensioniTrailerPermesse.some(estensione => nome.endsWith(estensione));
  }

  formatoJsonValido(file: File): boolean {
    const nome = file.name.toLowerCase();

    return this.formatiJsonPermessi.includes(file.type)
      || this.estensioniJsonPermesse.some(estensione => nome.endsWith(estensione));
  }

  async compilaCampiDaJson(file: File): Promise<void> {
    try {
      const testo = await file.text();
      const dati = JSON.parse(testo);

      this.applicaJsonFilm(dati);
      this.erroriFiles['json_testi'] = '';
    } catch {
      this.files['json_testi'] = [];
      this.erroriFiles['json_testi'] = 'JSON non valido o non leggibile.';
    }
  }

  applicaJsonFilm(dati: any): void {
    if (typeof dati.categoria === 'string' && this.categorie.includes(dati.categoria)) this.categoriaSelezionata = dati.categoria;
    if (typeof dati.anno === 'string' || typeof dati.anno === 'number') this.anno = String(dati.anno).replace(/\D/g, '').slice(0, 4);
    if (typeof dati.titoloIt === 'string') this.titoloIt = dati.titoloIt;
    if (typeof dati.titoloEn === 'string') this.titoloEn = dati.titoloEn;
    if (typeof dati.sottotitoloIt === 'string') this.sottotitoloIt = dati.sottotitoloIt;
    if (typeof dati.sottotitoloEn === 'string') this.sottotitoloEn = dati.sottotitoloEn;
    if (typeof dati.descrizioneIt === 'string') this.descrizioneIt = dati.descrizioneIt;
    if (typeof dati.descrizioneEn === 'string') this.descrizioneEn = dati.descrizioneEn;
    if (typeof dati.novita === 'boolean') this.novita = dati.novita;
  }

  percorsoFile(file: File): string {
    const fileConPercorso = file as File & { webkitRelativePath?: string };

    return (fileConPercorso.webkitRelativePath || file.name).replace(/\\/g, '/');
  }

  pacchettoHlsValido(files: File[]): boolean {
    const percorsi = files.map(file => this.percorsoFile(file));
    const contiene = (pezzo: string) => percorsi.some(percorso => percorso.endsWith(pezzo));
    const contieneTsInCartella = (cartella: string) => percorsi.some(percorso => percorso.includes(`/${cartella}/`) && percorso.endsWith('.ts'));

    const controlli = {
      master: contiene('master.m3u8'),
      playlist360: contiene('360/360p.m3u8'),
      playlist720: contiene('720/720p.m3u8'),
      playlist1080: contiene('1080/1080p.m3u8'),
      withAudio360: contiene('360/with-audio.m3u8'),
      withAudio720: contiene('720/with-audio.m3u8'),
      withAudio1080: contiene('1080/with-audio.m3u8'),
      audioIt: contiene('it/audio_it.m3u8'),
      audioEn: contiene('en/audio_en.m3u8'),
      segmenti360: contieneTsInCartella('360'),
      segmenti720: contieneTsInCartella('720'),
      segmenti1080: contieneTsInCartella('1080'),
      segmentiIt: contieneTsInCartella('it'),
      segmentiEn: contieneTsInCartella('en'),
    };

    const controlliFalliti = Object.entries(controlli)
      .filter(([, valido]) => !valido)
      .map(([nome]) => nome);

    console.log('NUMERO FILE HLS CARICATI:', percorsi.length);
    console.table(percorsi);
    console.log('CONTROLLI HLS:', controlli);
    console.log('CONTROLLI HLS FALLITI:', controlliFalliti);

    return controlliFalliti.length === 0;
  }

  contaFileHls(cartella: string): number {
    return this.files['pacchetto_hls']
      .filter(file => this.percorsoFile(file).includes(`/${cartella}/`))
      .length;
  }

  fileHlsPresente(nomeFile: string): boolean {
    return this.files['pacchetto_hls']
      .some(file => this.percorsoFile(file).endsWith(nomeFile));
  }

  svuotaPacchettoHls(event: Event): void {
    event.stopPropagation();
    this.files['pacchetto_hls'] = [];
    this.erroriFiles['pacchetto_hls'] = '';
  }

  immaginiValide(): boolean {
    return this.files['img_titolo_it'].length === 1
      && this.files['img_titolo_en'].length === 1
      && this.files['img_copertina'].length === 1
      && this.files['locandina_it'].length === 1
      && this.files['locandina_en'].length === 1
      && !this.erroriFiles['img_titolo_it']
      && !this.erroriFiles['img_titolo_en']
      && !this.erroriFiles['img_copertina']
      && !this.erroriFiles['locandina_it']
      && !this.erroriFiles['locandina_en'];
  }

  trailerValide(): boolean {
    return this.files['trailer_it'].length === 1
      && this.files['trailer_en'].length === 1
      && !this.erroriFiles['trailer_it']
      && !this.erroriFiles['trailer_en'];
  }

  jsonValido(): boolean {
    return this.files['json_testi'].length === 0 || !this.erroriFiles['json_testi'];
  }

  pacchettoHlsCaricato(): boolean {
    return this.files['pacchetto_hls'].length > 0 && !this.erroriFiles['pacchetto_hls'];
  }

  formValido(): boolean {
    return this.informazioniValide()
      && this.immaginiValide()
      && this.trailerValide()
      && this.jsonValido()
      && this.pacchettoHlsCaricato();
  }

  onConferma(): void {
    this.formInviato = true;

    if (!this.formValido()) return;
  }

  annoValido(): boolean {
    const annoNumero = Number(this.anno);
    const annoCorrente = new Date().getFullYear();

    return /^\d{4}$/.test(this.anno) && annoNumero >= 1800 && annoNumero <= annoCorrente;
  }

  informazioniValide(): boolean {
    return !!this.categoriaSelezionata
      && this.annoValido()
      && this.titoloIt.trim().length >= 3
      && this.titoloIt.trim().length <= 30
      && this.titoloEn.trim().length >= 3
      && this.titoloEn.trim().length <= 30
      && this.sottotitoloIt.trim().length >= 3
      && this.sottotitoloIt.trim().length <= 30
      && this.sottotitoloEn.trim().length >= 3
      && this.sottotitoloEn.trim().length <= 30
      && this.descrizioneIt.trim().length >= 10
      && this.descrizioneIt.trim().length <= 3000
      && this.descrizioneEn.trim().length >= 10
      && this.descrizioneEn.trim().length <= 3000;
  }

  filtraAnno(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '').slice(0, 4);
    this.anno = input.value;
  }

  onAnnulla(): void {
    this.chiudi.emit();
  }
}
