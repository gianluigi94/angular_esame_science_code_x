import { Component, EventEmitter, Output, ViewChild, ElementRef, Input, OnInit } from '@angular/core';
import { HttpEventType } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { take } from 'rxjs/operators';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { Authservice } from 'src/app/_benvenuto/login/_login_service/auth.service';
import { ToastService } from 'src/app/_servizi_globali/toast.service';

@Component({
  selector: 'app-form-aggiungi-media',
  templateUrl: './form-aggiungi-media.component.html',
  styleUrls: ['./form-aggiungi-media.component.scss'],
})
export class FormAggiungiMediaComponent implements OnInit {
  @Input() idCategoria = '';
  @Output() chiudi = new EventEmitter<void>();

  constructor(
    public api: ApiService,
    private toastService: ToastService,
  ) {}

  categoriaAperta = false;
  categoriaSelezionata = '';
  idCategoriaSelezionata = '';
  categoriaSecondariaAperta = false;
  categoriaSecondariaSelezionata = '';
  idCategoriaSecondariaSelezionata = '';
  categorie: {
    idCategoria: string;
    codice: string;
    label: string;
  }[] = [];
  indiceCategoriaAttivo = -1;
  indiceCategoriaSecondariaAttivo = -1;

  titoloIt = '';
  titoloEn = '';
  sottotitoloIt = '';
  sottotitoloEn = '';
  descrizioneIt = '';
  descrizioneEn = '';
  anno = '';
  regista = '';
  tipoMedia: 'film' | 'serie' = 'film';
  novita = false;
  formInviato = false;
  salvataggioInCorso = false;
  progressoUpload = 0;
  testoProgressoUpload = '';
  timerUploadMedia: any = null;
  toastUploadMostrato = false;
  controlloUploadAttivo = false;
  formatiImmaginePermessi = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];
  estensioniImmaginePermesse = ['.png', '.jpg', '.jpeg', '.webp', '.avif'];
  pesoMassimoImmagine = 500 * 1024;

  formatiTrailerPermessi = ['video/mp4', 'video/webm', 'video/quicktime'];
  estensioniTrailerPermesse = ['.mp4', '.webm', '.mov'];
  pesoMassimoTrailer = 30 * 1024 * 1024;

  formatiSottotitoliPermessi = ['text/vtt', 'text/plain'];
  estensioniSottotitoliPermesse = ['.vtt'];
  pesoMassimoSottotitoli = 2 * 1024 * 1024;

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
    sottotitoli_it: '',
    sottotitoli_en: '',
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
    sottotitoli_it: [],
    sottotitoli_en: [],
    pacchetto_hls: [],
  };

  stagioniSerie: {
    aperta: boolean;
    episodi: {
      aperto: boolean;
      titoloIt: string;
      titoloEn: string;
      descrizioneIt: string;
      descrizioneEn: string;
      anteprima: File[];
      erroreAnteprima: string;
    }[];
  }[] = [];

  ngOnInit(): void {
    this.caricaCategorieItaliane();
  }

    caricaCategorieItaliane(): void {
    forkJoin([
      this.api.getCategorieCatalogo().pipe(take(1)),
      this.api.getCategorieTraduzioni().pipe(take(1)),
    ]).subscribe({
      next: ([categorie, traduzioni]) => {
        const listaCategorie = Array.isArray((categorie as any)?.data?.items)
          ? (categorie as any).data.items
          : Array.isArray((categorie as any)?.data) ? (categorie as any).data : [];

        const listaTraduzioni = Array.isArray((traduzioni as any)?.data?.items)
          ? (traduzioni as any).data.items
          : Array.isArray((traduzioni as any)?.data) ? (traduzioni as any).data : [];

        const mappaNome: Record<string, string> = {};

        for (const tr of listaTraduzioni) {
          if (String(tr?.id_lingua) !== '1') continue;

          const idCat = String(tr?.id_categoria || '');
          const nome = String(tr?.nome || '');

          if (idCat && nome) mappaNome[idCat] = nome;
        }

        const categorieFinali: Array<{ idCategoria: string; codice: string; label: string }> = [];

        for (const c of listaCategorie) {
          const idCategoria = String(c?.id_categoria || c?.idCategoria || '');
          const codice = String(c?.codice || c?.code || '');

          if (!idCategoria) continue;

          categorieFinali.push({
            idCategoria,
            codice,
            label: mappaNome[idCategoria] || codice || idCategoria,
          });
        }

        this.categorie = categorieFinali;
        this.precompilaCategoriaDaId();
      },
      error: () => {
        this.categorie = [];
      },
    });
  }

  precompilaCategoriaDaId(): void {
    if (!this.idCategoria) return;

    const categoria = this.categorie.find(
      (cat) => cat.idCategoria === String(this.idCategoria),
    );

    if (!categoria) return;

    this.selezionaCategoria(categoria);
  }

  selezionaCategoria(cat: { idCategoria: string; codice: string; label: string }): void {
    this.categoriaSelezionata = cat.label;
    this.idCategoriaSelezionata = cat.idCategoria;
    this.categoriaAperta = false;

    if (this.categoriaSecondariaSelezionata === cat.label) {
      this.categoriaSecondariaSelezionata = '';
      this.idCategoriaSecondariaSelezionata = '';
    }
  }

  selezionaCategoriaSecondaria(cat: { idCategoria: string; codice: string; label: string }): void {
    this.categoriaSecondariaSelezionata = cat.label;
    this.idCategoriaSecondariaSelezionata = cat.idCategoria;
    this.categoriaSecondariaAperta = false;
  }

  rimuoviCategoriaSecondaria(): void {
    this.categoriaSecondariaSelezionata = '';
    this.idCategoriaSecondariaSelezionata = '';
    this.categoriaSecondariaAperta = false;
  }

  aggiungiStagione(): void {
    this.stagioniSerie.push({
      aperta: true,
      episodi: [],
    });

    this.aggiornaErrorePacchettoHls();
  }

  rimuoviStagione(indiceStagione: number): void {
    this.stagioniSerie.splice(indiceStagione, 1);
    this.aggiornaErrorePacchettoHls();
  }

  aggiungiEpisodio(indiceStagione: number): void {
    this.stagioniSerie[indiceStagione].episodi.push({
      aperto: true,
      titoloIt: '',
      titoloEn: '',
      descrizioneIt: '',
      descrizioneEn: '',
      anteprima: [],
      erroreAnteprima: '',
    });

    this.aggiornaErrorePacchettoHls();
  }

  rimuoviEpisodio(indiceStagione: number, indiceEpisodio: number): void {
    this.stagioniSerie[indiceStagione].episodi.splice(indiceEpisodio, 1);
    this.aggiornaErrorePacchettoHls();
  }

  onFileAnteprimaEpisodioSelezionato(indiceStagione: number, indiceEpisodio: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    this.aggiungiAnteprimaEpisodio(indiceStagione, indiceEpisodio, Array.from(input.files));
    input.value = '';
  }

  onFileAnteprimaEpisodioDrop(indiceStagione: number, indiceEpisodio: number, fileList: FileList | File[]): void {
    this.aggiungiAnteprimaEpisodio(indiceStagione, indiceEpisodio, Array.from(fileList));
  }

  aggiungiAnteprimaEpisodio(indiceStagione: number, indiceEpisodio: number, nuovi: File[]): void {
    const episodio = this.stagioniSerie[indiceStagione].episodi[indiceEpisodio];
    episodio.erroreAnteprima = '';

    if (nuovi.length > 1) {
      episodio.anteprima = [];
      episodio.erroreAnteprima = 'Puoi caricare un solo file.';
      return;
    }

    const file = nuovi[0];

    if (!file) return;

    if (!this.formatoImmagineValido(file)) {
      episodio.anteprima = [];
      episodio.erroreAnteprima = 'Formato non valido. Usa PNG, JPG, WEBP o AVIF.';
      return;
    }

    if (file.size > this.pesoMassimoImmagine) {
      episodio.anteprima = [];
      episodio.erroreAnteprima = 'Il file non può superare 500 KB.';
      return;
    }

    episodio.anteprima = [file];
  }

  rimuoviAnteprimaEpisodio(indiceStagione: number, indiceEpisodio: number): void {
    const episodio = this.stagioniSerie[indiceStagione].episodi[indiceEpisodio];
    episodio.anteprima = [];
    episodio.erroreAnteprima = '';
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

    if (this.isCampoSottotitoli(chiave)) {
      this.erroriFiles[chiave] = '';

      if (nuovi.length > 1) {
        this.files[chiave] = [];
        this.erroriFiles[chiave] = 'Puoi caricare un solo file sottotitoli.';
        return;
      }

      const file = nuovi[0];

      if (!file) return;

      if (!this.formatoSottotitoliValido(file)) {
        this.files[chiave] = [];
        this.erroriFiles[chiave] = 'Formato non valido. Usa un file VTT.';
        return;
      }

      if (file.size > this.pesoMassimoSottotitoli) {
        this.files[chiave] = [];
        this.erroriFiles[chiave] = 'Il file sottotitoli non può superare 2 MB.';
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

      if (this.tipoMedia === 'film' && !this.pacchettoHlsValido(nuovi)) {
        this.files[chiave] = [];
        this.erroriFiles[chiave] = 'Pacchetto HLS incompleto. Controlla master, cartelle 360/720/1080/it/en e file m3u8/ts.';
        return;
      }

      this.files[chiave] = nuovi;
      this.aggiornaErrorePacchettoHls();
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

  isCampoSottotitoli(chiave: string): boolean {
    return ['sottotitoli_it', 'sottotitoli_en'].includes(chiave);
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

  formatoSottotitoliValido(file: File): boolean {
    const nome = file.name.toLowerCase();

    return this.formatiSottotitoliPermessi.includes(file.type)
      || this.estensioniSottotitoliPermesse.some(estensione => nome.endsWith(estensione));
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
    if (typeof dati.categoriaSecondaria === 'string' && this.categorie.includes(dati.categoriaSecondaria) && dati.categoriaSecondaria !== dati.categoria) this.categoriaSecondariaSelezionata = dati.categoriaSecondaria;
    if (typeof dati.anno === 'string' || typeof dati.anno === 'number') this.anno = String(dati.anno).replace(/\D/g, '').slice(0, 4);
    if (typeof dati.regista === 'string') this.regista = dati.regista;
    if (dati.tipoMedia === 'film' || dati.tipoMedia === 'serie') this.tipoMedia = dati.tipoMedia;
    if (typeof dati.titoloIt === 'string') this.titoloIt = dati.titoloIt;
    if (typeof dati.titoloEn === 'string') this.titoloEn = dati.titoloEn;
    if (typeof dati.sottotitoloIt === 'string') this.sottotitoloIt = dati.sottotitoloIt;
    if (typeof dati.sottotitoloEn === 'string') this.sottotitoloEn = dati.sottotitoloEn;
    if (typeof dati.descrizioneIt === 'string') this.descrizioneIt = dati.descrizioneIt;
    if (typeof dati.descrizioneEn === 'string') this.descrizioneEn = dati.descrizioneEn;
    if (typeof dati.novita === 'boolean') this.novita = dati.novita;

    if (Array.isArray(dati.stagioni)) {
      this.tipoMedia = 'serie';
      this.applicaJsonStagioni(dati.stagioni);
    }
  }

  applicaJsonStagioni(stagioni: any[]): void {
    this.stagioniSerie = stagioni.map(stagione => ({
      aperta: true,
      episodi: Array.isArray(stagione.episodi)
        ? stagione.episodi.map((episodio: any) => ({
            aperto: true,
            titoloIt: typeof episodio.titoloIt === 'string' ? episodio.titoloIt : '',
            titoloEn: typeof episodio.titoloEn === 'string' ? episodio.titoloEn : '',
            descrizioneIt: typeof episodio.descrizioneIt === 'string' ? episodio.descrizioneIt : '',
            descrizioneEn: typeof episodio.descrizioneEn === 'string' ? episodio.descrizioneEn : '',
            anteprima: [],
            erroreAnteprima: '',
          }))
        : [],
    }));

    this.aggiornaErrorePacchettoHls();
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

  contaFileHlsPerNome(nomeFile: string): number {
    return this.files['pacchetto_hls']
      .filter(file => this.percorsoFile(file).endsWith(nomeFile))
      .length;
  }

  testoRiepilogoFileHls(nomeFile: string): string {
    if (this.tipoMedia === 'film') {
      return this.fileHlsPresente(nomeFile) ? 'presente' : 'mancante';
    }

    return `${this.contaFileHlsPerNome(nomeFile)} file`;
  }

  aggiornaErrorePacchettoHls(): void {
    if (this.files['pacchetto_hls'].length === 0) return;

    if (this.tipoMedia === 'serie') {
      this.erroriFiles['pacchetto_hls'] = this.messaggioErroreHlsSerie();
    }
  }

  errorePacchettoHls(): string {
    if (this.files['pacchetto_hls'].length === 0) return '';
    if (this.tipoMedia === 'serie') return this.messaggioErroreHlsSerie();

    return this.erroriFiles['pacchetto_hls'];
  }

  messaggioErroreHlsSerie(): string {
    if (this.tipoMedia !== 'serie') return '';
    if (this.files['pacchetto_hls'].length === 0) return '';
    if (this.stagioniSerie.length === 0) return 'Aggiungi almeno una stagione prima di validare il pacchetto HLS.';

    const percorsi = this.files['pacchetto_hls'].map(file => this.percorsoFile(file).toLowerCase());
    const stagioniTrovate = this.stagioniTrovateNelPacchetto(percorsi);
    const stagioniAttese = this.stagioniSerie.map((_, indice) => indice + 1);

    const stagioniMancanti = stagioniAttese.filter(numero => !stagioniTrovate.includes(numero));
    const stagioniExtra = stagioniTrovate.filter(numero => !stagioniAttese.includes(numero));

    if (stagioniMancanti.length > 0) return `Nel pacchetto HLS mancano le stagioni: ${stagioniMancanti.join(', ')}.`;
    if (stagioniExtra.length > 0) return `Nel pacchetto HLS ci sono stagioni non presenti nel form: ${stagioniExtra.join(', ')}.`;

    for (let indiceStagione = 0; indiceStagione < this.stagioniSerie.length; indiceStagione++) {
      const numeroStagione = indiceStagione + 1;
      const episodiTrovati = this.episodiTrovatiNelPacchetto(percorsi, numeroStagione);
      const episodiAttesi = this.stagioniSerie[indiceStagione].episodi.map((_, indice) => indice + 1);

      const episodiMancanti = episodiAttesi.filter(numero => !episodiTrovati.includes(numero));
      const episodiExtra = episodiTrovati.filter(numero => !episodiAttesi.includes(numero));

      if (episodiMancanti.length > 0) return `Nella stagione ${numeroStagione} mancano gli episodi HLS: ${episodiMancanti.join(', ')}.`;
      if (episodiExtra.length > 0) return `Nella stagione ${numeroStagione} ci sono episodi HLS non presenti nel form: ${episodiExtra.join(', ')}.`;

      for (const numeroEpisodio of episodiAttesi) {
        if (!this.strutturaHlsEpisodioValida(percorsi, numeroStagione, numeroEpisodio)) {
          return `La struttura HLS della stagione ${numeroStagione}, episodio ${numeroEpisodio}, è incompleta.`;
        }
      }
    }

    return '';
  }

  stagioniTrovateNelPacchetto(percorsi: string[]): number[] {
    const numeri = percorsi
      .map(percorso => percorso.match(/\/stagione_(\d+)\//)?.[1])
      .filter((numero): numero is string => !!numero)
      .map(numero => Number(numero));

    return [...new Set(numeri)].sort((a, b) => a - b);
  }

  episodiTrovatiNelPacchetto(percorsi: string[], numeroStagione: number): number[] {
    const regex = new RegExp(`/stagione_${numeroStagione}/e(\\d+)/`);
    const numeri = percorsi
      .map(percorso => percorso.match(regex)?.[1])
      .filter((numero): numero is string => !!numero)
      .map(numero => Number(numero));

    return [...new Set(numeri)].sort((a, b) => a - b);
  }

  strutturaHlsEpisodioValida(percorsi: string[], numeroStagione: number, numeroEpisodio: number): boolean {
    const base = `stagione_${numeroStagione}/e${numeroEpisodio}`;
    const contiene = (pezzo: string) => percorsi.some(percorso => percorso.endsWith(`${base}/${pezzo}`));
    const contieneTsInCartella = (cartella: string) => percorsi.some(percorso => percorso.includes(`${base}/${cartella}/`) && percorso.endsWith('.ts'));

    return contiene('master.m3u8')
      && contiene('360/360p.m3u8')
      && contiene('720/720p.m3u8')
      && contiene('1080/1080p.m3u8')
      && contiene('360/with-audio.m3u8')
      && contiene('720/with-audio.m3u8')
      && contiene('1080/with-audio.m3u8')
      && contiene('it/audio_it.m3u8')
      && contiene('en/audio_en.m3u8')
      && contieneTsInCartella('360')
      && contieneTsInCartella('720')
      && contieneTsInCartella('1080')
      && contieneTsInCartella('it')
      && contieneTsInCartella('en');
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

  sottotitoliValidi(): boolean {
    return this.files['sottotitoli_it'].length === 1
      && this.files['sottotitoli_en'].length === 1
      && !this.erroriFiles['sottotitoli_it']
      && !this.erroriFiles['sottotitoli_en'];
  }

  jsonValido(): boolean {
    return this.files['json_testi'].length === 0 || !this.erroriFiles['json_testi'];
  }

  pacchettoHlsCaricato(): boolean {
    return this.files['pacchetto_hls'].length > 0 && !this.errorePacchettoHls();
  }

  episodioSerieValido(episodio: any): boolean {
    return episodio.titoloIt.trim().length >= 3
      && episodio.titoloIt.trim().length <= 30
      && episodio.titoloEn.trim().length >= 3
      && episodio.titoloEn.trim().length <= 30
      && episodio.descrizioneIt.trim().length >= 10
      && episodio.descrizioneIt.trim().length <= 3000
      && episodio.descrizioneEn.trim().length >= 10
      && episodio.descrizioneEn.trim().length <= 3000
      && episodio.anteprima.length === 1
      && !episodio.erroreAnteprima;
  }

  serieValida(): boolean {
    if (this.tipoMedia === 'film') return true;

    return this.stagioniSerie.length > 0
      && this.stagioniSerie.every(stagione =>
        stagione.episodi.length > 0
        && stagione.episodi.every(episodio => this.episodioSerieValido(episodio))
      );
  }

  formValido(): boolean {
    return this.informazioniValide()
      && this.immaginiValide()
      && this.trailerValide()
      && this.sottotitoliValidi()
      && this.jsonValido()
      && this.serieValida()
      && this.pacchettoHlsCaricato();
  }

  utentePuoAggiungereMedia(): boolean {
    const abilita = Authservice.auth?.abilita ?? [];

    return Array.isArray(abilita) && abilita.map(Number).includes(4);
  }

  uploadInProduzione(): boolean {
    return window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  }

  percentualeUploadVisibile(percentualeBackend: number): number {
    if (!this.uploadInProduzione()) return percentualeBackend;

    return Math.min(100, 80 + Math.round(percentualeBackend * 0.2));
  }

  onConferma(): void {
    this.formInviato = true;

    if (!this.formValido() || this.salvataggioInCorso) return;

    if (!this.utentePuoAggiungereMedia()) {
      this.toastService.errore('ERRORE: non hai l\'abilità per aggiungere media.');
      return;
    }

    const dati = this.creaFormDataMedia();

    this.salvataggioInCorso = true;
    this.toastUploadMostrato = false;
    this.progressoUpload = 0;
    this.testoProgressoUpload = 'Invio file al server...';

    console.time('POST /media - durata totale');
    console.log('[UPLOAD MEDIA] POST /media iniziato');

    this.api.creaMedia(dati).subscribe({
      next: (evento) => {
        if (evento.type === HttpEventType.UploadProgress) {
          if (evento.total) {
            const percentualeRealeInvio = Math.round((evento.loaded / evento.total) * 100);

            const massimoInvio = this.uploadInProduzione() ? 80 : 5;
            this.progressoUpload = Math.min(massimoInvio, Math.round((evento.loaded / evento.total) * massimoInvio));

            console.log('[UPLOAD MEDIA] invio browser -> Laravel', {
              loaded: evento.loaded,
              total: evento.total,
              percentualeRealeInvio,
              percentualeBarra: this.progressoUpload,
            });
          }

          this.testoProgressoUpload = 'Invio file al server...';
        }

        if (evento.type === HttpEventType.Response) {
          console.timeEnd('POST /media - durata totale');
          console.log('[UPLOAD MEDIA] POST /media completato', evento.body);

          const idUploadMediaJob = Number(evento.body?.data?.id_upload_media_job);

          if (!idUploadMediaJob) {
            this.salvataggioInCorso = false;
            this.toastService.errore('ERRORE: job upload non creato.');
            return;
          }

          this.progressoUpload = this.uploadInProduzione() ? 80 : 5;
          this.testoProgressoUpload = 'Lavorazione avviata...';
          this.avviaControlloStatoUpload(idUploadMediaJob);
          this.avviaProcessamentoUpload(idUploadMediaJob);
        }
      },
      error: (err) => {
        console.timeEnd('POST /media - durata totale');
        console.error('[UPLOAD MEDIA] POST /media errore', err);

        this.salvataggioInCorso = false;
        this.progressoUpload = 0;
        this.testoProgressoUpload = '';
        this.toastService.errore('ERRORE: salvataggio non riuscito.');
        console.error('Errore salvataggio media', err);
      },
    });
  }
    avviaProcessamentoUpload(idUploadMediaJob: number): void {
    console.time('POST /media-processa - durata totale');
    console.log('[UPLOAD MEDIA] POST /media-processa iniziato', idUploadMediaJob);

    this.api.processaUploadMedia(idUploadMediaJob).pipe(take(1)).subscribe({
      next: (rit) => {
        console.timeEnd('POST /media-processa - durata totale');
        console.log('[UPLOAD MEDIA] POST /media-processa completato', rit);
      },
      error: (err) => {
        console.timeEnd('POST /media-processa - durata totale');
        console.error('[UPLOAD MEDIA] POST /media-processa errore', err);
        this.fermaControlloStatoUpload();
        this.salvataggioInCorso = false;
        this.toastService.errore('ERRORE: salvataggio non riuscito.');
        console.error('Errore processamento upload media', err);
      },
    });
  }
  avviaControlloStatoUpload(idUploadMediaJob: number): void {
    this.fermaControlloStatoUpload();
    this.controlloUploadAttivo = true;

    const controlla = () => {
      if (!this.controlloUploadAttivo) return;

      this.api.getStatoUploadMedia(idUploadMediaJob).pipe(take(1)).subscribe({
        next: (rit) => {
          if (!this.controlloUploadAttivo) return;

          const dati = rit.data;

          const percentualeBackend = Number(dati?.percentuale ?? 0);

          this.progressoUpload = this.percentualeUploadVisibile(percentualeBackend);
          this.testoProgressoUpload = String(dati?.messaggio ?? '');

          console.log('[UPLOAD MEDIA] stato upload', {
            stato: dati?.stato,
            percentuale: dati?.percentuale,
            messaggio: dati?.messaggio,
          });

          if (dati?.stato === 'completato' && !this.toastUploadMostrato) {
            this.toastUploadMostrato = true;
            this.fermaControlloStatoUpload();
            this.progressoUpload = 100;
            this.toastService.successo('SUCCESSO: media salvato correttamente.');

            setTimeout(() => {
              this.salvataggioInCorso = false;
              this.chiudi.emit();
            }, 700);

            return;
          }

          if (dati?.stato === 'errore' && !this.toastUploadMostrato) {
            this.toastUploadMostrato = true;
            this.fermaControlloStatoUpload();
            this.salvataggioInCorso = false;
            this.toastService.errore('ERRORE: salvataggio non riuscito.');
            return;
          }

          this.timerUploadMedia = setTimeout(controlla, 1000);
        },
        error: (err) => {
          if (!this.controlloUploadAttivo || this.toastUploadMostrato) return;

          this.toastUploadMostrato = true;
          this.fermaControlloStatoUpload();
          this.salvataggioInCorso = false;
          this.toastService.errore('ERRORE: impossibile leggere lo stato upload.');
          console.error('Errore stato upload media', err);
        },
      });
    };

    controlla();
  }

  fermaControlloStatoUpload(): void {
    this.controlloUploadAttivo = false;

    if (this.timerUploadMedia) {
      clearTimeout(this.timerUploadMedia);
      this.timerUploadMedia = null;
    }
  }
  creaFormDataMedia(): FormData {
    const dati = new FormData();

    dati.append('tipoMedia', this.tipoMedia);
    dati.append('idCategoria', this.idCategoriaSelezionata);
    dati.append('idCategoriaSecondaria', this.idCategoriaSecondariaSelezionata);
    dati.append('anno', this.anno);
    dati.append('regista', this.regista.trim());
    dati.append('novita', this.novita ? '1' : '0');

    dati.append('titoloIt', this.titoloIt.trim());
    dati.append('titoloEn', this.titoloEn.trim());
    dati.append('sottotitoloIt', this.sottotitoloIt.trim());
    dati.append('sottotitoloEn', this.sottotitoloEn.trim());
    dati.append('descrizioneIt', this.descrizioneIt.trim());
    dati.append('descrizioneEn', this.descrizioneEn.trim());

    this.aggiungiFileSingoloFormData(dati, 'img_titolo_it');
    this.aggiungiFileSingoloFormData(dati, 'img_titolo_en');
    this.aggiungiFileSingoloFormData(dati, 'img_copertina');
    this.aggiungiFileSingoloFormData(dati, 'locandina_it');
    this.aggiungiFileSingoloFormData(dati, 'locandina_en');
    this.aggiungiFileSingoloFormData(dati, 'trailer_it');
    this.aggiungiFileSingoloFormData(dati, 'trailer_en');
    this.aggiungiFileSingoloFormData(dati, 'sottotitoli_it');
    this.aggiungiFileSingoloFormData(dati, 'sottotitoli_en');

    this.files['pacchetto_hls'].forEach((file) => {
      dati.append('pacchetto_hls[]', file);
      dati.append('percorsi_hls[]', this.percorsoFile(file));
    });

    dati.append('stagioni', JSON.stringify(
      this.stagioniSerie.map((stagione) => ({
        episodi: stagione.episodi.map((episodio) => ({
          titoloIt: episodio.titoloIt.trim(),
          titoloEn: episodio.titoloEn.trim(),
          descrizioneIt: episodio.descrizioneIt.trim(),
          descrizioneEn: episodio.descrizioneEn.trim(),
        })),
      })),
    ));

    this.stagioniSerie.forEach((stagione, indiceStagione) => {
      stagione.episodi.forEach((episodio, indiceEpisodio) => {
        if (episodio.anteprima[0]) {
          dati.append(
            `anteprime[${indiceStagione}][${indiceEpisodio}]`,
            episodio.anteprima[0],
          );
        }
      });
    });

    return dati;
  }

  aggiungiFileSingoloFormData(dati: FormData, chiave: string): void {
    if (!this.files[chiave]?.[0]) return;

    dati.append(chiave, this.files[chiave][0]);
  }

  annoValido(): boolean {
    const annoNumero = Number(this.anno);
    const annoCorrente = new Date().getFullYear();

    return /^\d{4}$/.test(this.anno) && annoNumero >= 1800 && annoNumero <= annoCorrente;
  }

  informazioniValide(): boolean {
    return !!this.categoriaSelezionata
      && (!this.categoriaSecondariaSelezionata || this.categoriaSecondariaSelezionata !== this.categoriaSelezionata)
      && this.annoValido()
      && this.regista.trim().length >= 3
      && this.regista.trim().length <= 50
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

    categorieSecondarieDisponibili(): { idCategoria: string; codice: string; label: string }[] {
    return this.categorie.filter((cat) => cat.label !== this.categoriaSelezionata);
  }
}
