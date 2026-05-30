import {
  Component,
  EventEmitter,
  Output,
  ViewChild,
  ElementRef,
  Input,
  OnInit,
} from '@angular/core';
import { HttpEventType } from '@angular/common/http';
import { forkJoin, firstValueFrom, Subscription } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { Authservice } from 'src/app/_benvenuto/login/_login_service/auth.service';
import { ToastService } from 'src/app/_servizi_globali/toast.service';
import { Router } from '@angular/router';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { CatalogoCacheService } from 'src/app/_catalogo/riga-categoria/categoria_services/catalogo-cache.service';
import { SchedaCacheService } from 'src/app/_catalogo/scheda/scheda_service/scheda-cache.service';
import { ErroreGlobaleService } from 'src/app/_servizi_globali/errore-globale.service';

interface FileUploadMedia {
  categoriaFile: 'singoli' | 'pacchetto_hls' | 'anteprime';
  file: File;
  chiave?: string;
  indice?: number;
  indiceStagione?: number;
  indiceEpisodio?: number;
  percorsoOriginale?: string;
}

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
    private router: Router,
    private cambioLingua: CambioLinguaService,
    private erroreGlobaleService: ErroreGlobaleService,
    private cacheCatalogo: CatalogoCacheService,
    private cacheScheda: SchedaCacheService,
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
  elaborazioneHlsInCorso = false;
  annullamentoInCorso = false;
  dropdownModalitaAperta = '';
  idJobCorrente = 0;
  private subUploadAttive = new Set<Subscription>();
  formatiImmaginePermessi = [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/avif',
  ];
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

  modalitaCaricamento: Record<string, 'file' | 'url'> = {
    img_titolo_it: 'file',
    img_titolo_en: 'file',
    img_copertina: 'file',
    locandina_it: 'file',
    locandina_en: 'file',
    trailer_it: 'file',
    trailer_en: 'file',
    sottotitoli_it: 'file',
    sottotitoli_en: 'file',
    pacchetto_hls: 'file',
  };

  urlDiretti: Record<string, string> = {
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
      modalitaAnteprima: 'file' | 'url';
      urlAnteprima: string;
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
          : Array.isArray((categorie as any)?.data)
            ? (categorie as any).data
            : [];

        const listaTraduzioni = Array.isArray((traduzioni as any)?.data?.items)
          ? (traduzioni as any).data.items
          : Array.isArray((traduzioni as any)?.data)
            ? (traduzioni as any).data
            : [];

        const mappaNome: Record<string, string> = {};

        for (const tr of listaTraduzioni) {
          if (String(tr?.id_lingua) !== '1') continue;

          const idCat = String(tr?.id_categoria || '');
          const nome = String(tr?.nome || '');

          if (idCat && nome) mappaNome[idCat] = nome;
        }

        const categorieFinali: Array<{
          idCategoria: string;
          codice: string;
          label: string;
        }> = [];

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

  selezionaCategoria(cat: {
    idCategoria: string;
    codice: string;
    label: string;
  }): void {
    this.categoriaSelezionata = cat.label;
    this.idCategoriaSelezionata = cat.idCategoria;
    this.categoriaAperta = false;

    if (this.categoriaSecondariaSelezionata === cat.label) {
      this.categoriaSecondariaSelezionata = '';
      this.idCategoriaSecondariaSelezionata = '';
    }
  }

  selezionaCategoriaSecondaria(cat: {
    idCategoria: string;
    codice: string;
    label: string;
  }): void {
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
      modalitaAnteprima: 'file' as 'file' | 'url',
      urlAnteprima: '',
    });

    this.aggiornaErrorePacchettoHls();
  }

  rimuoviEpisodio(indiceStagione: number, indiceEpisodio: number): void {
    this.stagioniSerie[indiceStagione].episodi.splice(indiceEpisodio, 1);
    this.aggiornaErrorePacchettoHls();
  }

  onFileAnteprimaEpisodioSelezionato(
    indiceStagione: number,
    indiceEpisodio: number,
    event: Event,
  ): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    this.aggiungiAnteprimaEpisodio(
      indiceStagione,
      indiceEpisodio,
      Array.from(input.files),
    );
    input.value = '';
  }

  onFileAnteprimaEpisodioDrop(
    indiceStagione: number,
    indiceEpisodio: number,
    fileList: FileList | File[],
  ): void {
    this.aggiungiAnteprimaEpisodio(
      indiceStagione,
      indiceEpisodio,
      Array.from(fileList),
    );
  }

  aggiungiAnteprimaEpisodio(
    indiceStagione: number,
    indiceEpisodio: number,
    nuovi: File[],
  ): void {
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
      episodio.erroreAnteprima =
        'Formato non valido. Usa PNG, JPG, WEBP o AVIF.';
      return;
    }

    if (file.size > this.pesoMassimoImmagine) {
      episodio.anteprima = [];
      episodio.erroreAnteprima = 'Il file non può superare 500 KB.';
      return;
    }

    episodio.anteprima = [file];
  }

  rimuoviAnteprimaEpisodio(
    indiceStagione: number,
    indiceEpisodio: number,
  ): void {
    const episodio = this.stagioniSerie[indiceStagione].episodi[indiceEpisodio];
    episodio.anteprima = [];
    episodio.erroreAnteprima = '';
    episodio.urlAnteprima = '';
  }

  onFileSelezionato(chiave: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    if (this.isCampoPacchettoHls(chiave)) {
      this.elaborazioneHlsInCorso = true;
    }
    void this.aggiungiFiles(chiave, input.files).finally(() => {
      if (this.isCampoPacchettoHls(chiave)) {
        this.elaborazioneHlsInCorso = false;
      }
    });
    input.value = '';
  }

  onFileDrop(chiave: string, fileList: FileList | File[]): void {
    void this.aggiungiFiles(chiave, fileList).finally(() => {
      if (this.isCampoPacchettoHls(chiave)) {
        this.elaborazioneHlsInCorso = false;
      }
    });
  }

  rimuoviFile(chiave: string, indice: number): void {
    this.files[chiave].splice(indice, 1);
    this.erroriFiles[chiave] = '';
  }

  private async aggiungiFiles(
    chiave: string,
    fileList: FileList | File[],
  ): Promise<void> {
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
        this.erroriFiles[chiave] =
          'Formato non valido. Usa PNG, JPG, WEBP o AVIF.';
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
        this.erroriFiles[chiave] =
          'Pacchetto HLS incompleto. Controlla master, cartelle 360/720/1080/it/en e file m3u8/ts.';
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
    return [
      'img_titolo_it',
      'img_titolo_en',
      'img_copertina',
      'locandina_it',
      'locandina_en',
    ].includes(chiave);
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

    return (
      this.formatiImmaginePermessi.includes(file.type) ||
      this.estensioniImmaginePermesse.some((estensione) =>
        nome.endsWith(estensione),
      )
    );
  }

  formatoTrailerValido(file: File): boolean {
    const nome = file.name.toLowerCase();

    return (
      this.formatiTrailerPermessi.includes(file.type) ||
      this.estensioniTrailerPermesse.some((estensione) =>
        nome.endsWith(estensione),
      )
    );
  }

  formatoSottotitoliValido(file: File): boolean {
    const nome = file.name.toLowerCase();

    return (
      this.formatiSottotitoliPermessi.includes(file.type) ||
      this.estensioniSottotitoliPermesse.some((estensione) =>
        nome.endsWith(estensione),
      )
    );
  }

  formatoJsonValido(file: File): boolean {
    const nome = file.name.toLowerCase();

    return (
      this.formatiJsonPermessi.includes(file.type) ||
      this.estensioniJsonPermesse.some((estensione) =>
        nome.endsWith(estensione),
      )
    );
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
    if (
      typeof dati.categoria === 'string' &&
      this.categorie.includes(dati.categoria)
    )
      this.categoriaSelezionata = dati.categoria;
    if (
      typeof dati.categoriaSecondaria === 'string' &&
      this.categorie.includes(dati.categoriaSecondaria) &&
      dati.categoriaSecondaria !== dati.categoria
    )
      this.categoriaSecondariaSelezionata = dati.categoriaSecondaria;
    if (typeof dati.anno === 'string' || typeof dati.anno === 'number')
      this.anno = String(dati.anno).replace(/\D/g, '').slice(0, 4);
    if (typeof dati.regista === 'string') this.regista = dati.regista;
    if (dati.tipoMedia === 'film' || dati.tipoMedia === 'serie')
      this.tipoMedia = dati.tipoMedia;
    if (typeof dati.titoloIt === 'string') this.titoloIt = dati.titoloIt;
    if (typeof dati.titoloEn === 'string') this.titoloEn = dati.titoloEn;
    if (typeof dati.sottotitoloIt === 'string')
      this.sottotitoloIt = dati.sottotitoloIt;
    if (typeof dati.sottotitoloEn === 'string')
      this.sottotitoloEn = dati.sottotitoloEn;
    if (typeof dati.descrizioneIt === 'string')
      this.descrizioneIt = dati.descrizioneIt;
    if (typeof dati.descrizioneEn === 'string')
      this.descrizioneEn = dati.descrizioneEn;
    if (typeof dati.novita === 'boolean') this.novita = dati.novita;

    if (Array.isArray(dati.stagioni)) {
      this.tipoMedia = 'serie';
      this.applicaJsonStagioni(dati.stagioni);
    }
  }

  applicaJsonStagioni(stagioni: any[]): void {
    this.stagioniSerie = stagioni.map((stagione) => ({
      aperta: true,
      episodi: Array.isArray(stagione.episodi)
        ? stagione.episodi.map((episodio: any) => ({
            aperto: true,
            titoloIt:
              typeof episodio.titoloIt === 'string' ? episodio.titoloIt : '',
            titoloEn:
              typeof episodio.titoloEn === 'string' ? episodio.titoloEn : '',
            descrizioneIt:
              typeof episodio.descrizioneIt === 'string'
                ? episodio.descrizioneIt
                : '',
            descrizioneEn:
              typeof episodio.descrizioneEn === 'string'
                ? episodio.descrizioneEn
                : '',
            anteprima: [],
            erroreAnteprima: '',
            modalitaAnteprima: 'file' as 'file' | 'url',
            urlAnteprima: '',
          }))
        : [],
    }));

    this.aggiornaErrorePacchettoHls();
  }

  percorsoFile(file: File): string {
    const fileConPercorso = file as File & { webkitRelativePath?: string };

    return (fileConPercorso.webkitRelativePath || file.name).replace(
      /\\/g,
      '/',
    );
  }

  pacchettoHlsValido(files: File[]): boolean {
    const percorsi = files.map((file) => this.percorsoFile(file));
    const contiene = (pezzo: string) =>
      percorsi.some((percorso) => percorso.endsWith(pezzo));
    const contieneTsInCartella = (cartella: string) =>
      percorsi.some(
        (percorso) =>
          percorso.includes(`/${cartella}/`) && percorso.endsWith('.ts'),
      );

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
    return this.files['pacchetto_hls'].filter((file) =>
      this.percorsoFile(file).includes(`/${cartella}/`),
    ).length;
  }

  fileHlsPresente(nomeFile: string): boolean {
    return this.files['pacchetto_hls'].some((file) =>
      this.percorsoFile(file).endsWith(nomeFile),
    );
  }

  contaFileHlsPerNome(nomeFile: string): number {
    return this.files['pacchetto_hls'].filter((file) =>
      this.percorsoFile(file).endsWith(nomeFile),
    ).length;
  }

  testoRiepilogoFileHls(nomeFile: string): string {
    if (this.tipoMedia === 'film') {
      return this.fileHlsPresente(nomeFile) ? 'presente' : 'mancante';
    }

    return `${this.contaFileHlsPerNome(nomeFile)} file`;
  }

  pesoTotaleHls(): string {
    const totale = this.files['pacchetto_hls'].reduce(
      (somma, file) => somma + file.size,
      0,
    );
    return this.formattaPeso(totale);
  }

  formattaPeso(byte: number): string {
    if (byte < 1024) return `${byte} B`;
    if (byte < 1024 * 1024) return `${(byte / 1024).toFixed(1)} KB`;
    if (byte < 1024 * 1024 * 1024)
      return `${(byte / (1024 * 1024)).toFixed(1)} MB`;
    return `${(byte / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  urlPrecompilatoPerCampo(chiave: string): string {
    const base = 'https://d2kd3i5q9rl184.cloudfront.net/';
    const mappa: Record<string, string> = {
      img_titolo_it: base + 'assets/titoli_it/',
      img_titolo_en: base + 'assets/titoli_en/',
      img_copertina: base + 'assets/carosello_locandine/',
      locandina_it: base + 'assets/locandine_it/',
      locandina_en: base + 'assets/locandine_en/',
      trailer_it: base + 'mp4-trailer-it/',
      trailer_en: base + 'mp4-trailer-en/',
      sottotitoli_it: base + 'assets/sottotitoli/it/' + this.tipoMedia + '/',
      sottotitoli_en: base + 'assets/sottotitoli/en/' + this.tipoMedia + '/',
      pacchetto_hls: base + 'streaming/',
    };
    return mappa[chiave] || base;
  }

  urlPrecompilatoAnteprima(): string {
    return 'https://d2kd3i5q9rl184.cloudfront.net/assets/screen/';
  }

  cambiaModalita(chiave: string, modalita: 'file' | 'url'): void {
    this.modalitaCaricamento[chiave] = modalita;
    if (modalita === 'url') {
      this.files[chiave] = [];
      this.erroriFiles[chiave] = '';
      if (!this.urlDiretti[chiave]) {
        this.urlDiretti[chiave] = this.urlPrecompilatoPerCampo(chiave);
      }
    } else {
      this.urlDiretti[chiave] = '';
    }
  }

  cambiaModalitaAnteprima(
    indiceStagione: number,
    indiceEpisodio: number,
    modalita: 'file' | 'url',
  ): void {
    const episodio = this.stagioniSerie[indiceStagione].episodi[indiceEpisodio];
    episodio.modalitaAnteprima = modalita;
    if (modalita === 'url') {
      episodio.anteprima = [];
      episodio.erroreAnteprima = '';
      if (!episodio.urlAnteprima) {
        episodio.urlAnteprima = this.urlPrecompilatoAnteprima();
      }
    } else {
      episodio.urlAnteprima = '';
    }
  }

  campoFileValido(chiave: string): boolean {
    if (this.modalitaCaricamento[chiave] === 'url') {
      return this.urlDiretti[chiave]?.trim().length > 0;
    }
    return this.files[chiave].length === 1 && !this.erroriFiles[chiave];
  }

  listaUrlDirettiUploadMedia(): { categoriaFile: string; chiave: string; url: string }[] {
    const lista: { categoriaFile: string; chiave: string; url: string }[] = [];

    for (const chiave of [
      'img_titolo_it', 'img_titolo_en', 'img_copertina',
      'locandina_it', 'locandina_en',
      'trailer_it', 'trailer_en',
      'sottotitoli_it', 'sottotitoli_en',
    ]) {
      if (this.modalitaCaricamento[chiave] !== 'url') continue;
      const url = this.urlDiretti[chiave]?.trim();
      if (url) lista.push({ categoriaFile: 'singoli', chiave, url });
    }

    if (this.modalitaCaricamento['pacchetto_hls'] === 'url') {
      const url = this.urlDiretti['pacchetto_hls']?.trim();
      if (url) lista.push({ categoriaFile: 'pacchetto_hls', chiave: 'pacchetto_hls', url });
    }

    this.stagioniSerie.forEach((stagione, indiceStagione) => {
      stagione.episodi.forEach((episodio, indiceEpisodio) => {
        if (episodio.modalitaAnteprima !== 'url') return;
        const url = episodio.urlAnteprima?.trim();
        if (url) lista.push({
          categoriaFile: 'anteprime',
          chiave: `anteprima_${indiceStagione}_${indiceEpisodio}`,
          url,
        });
      });
    });

    return lista;
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
    if (this.stagioniSerie.length === 0)
      return 'Aggiungi almeno una stagione prima di validare il pacchetto HLS.';

    const percorsi = this.files['pacchetto_hls'].map((file) =>
      this.percorsoFile(file).toLowerCase(),
    );
    const stagioniTrovate = this.stagioniTrovateNelPacchetto(percorsi);
    const stagioniAttese = this.stagioniSerie.map((_, indice) => indice + 1);

    const stagioniMancanti = stagioniAttese.filter(
      (numero) => !stagioniTrovate.includes(numero),
    );
    const stagioniExtra = stagioniTrovate.filter(
      (numero) => !stagioniAttese.includes(numero),
    );

    if (stagioniMancanti.length > 0)
      return `Nel pacchetto HLS mancano le stagioni: ${stagioniMancanti.join(', ')}.`;
    if (stagioniExtra.length > 0)
      return `Nel pacchetto HLS ci sono stagioni non presenti nel form: ${stagioniExtra.join(', ')}.`;

    for (
      let indiceStagione = 0;
      indiceStagione < this.stagioniSerie.length;
      indiceStagione++
    ) {
      const numeroStagione = indiceStagione + 1;
      const episodiTrovati = this.episodiTrovatiNelPacchetto(
        percorsi,
        numeroStagione,
      );
      const episodiAttesi = this.stagioniSerie[indiceStagione].episodi.map(
        (_, indice) => indice + 1,
      );

      const episodiMancanti = episodiAttesi.filter(
        (numero) => !episodiTrovati.includes(numero),
      );
      const episodiExtra = episodiTrovati.filter(
        (numero) => !episodiAttesi.includes(numero),
      );

      if (episodiMancanti.length > 0)
        return `Nella stagione ${numeroStagione} mancano gli episodi HLS: ${episodiMancanti.join(', ')}.`;
      if (episodiExtra.length > 0)
        return `Nella stagione ${numeroStagione} ci sono episodi HLS non presenti nel form: ${episodiExtra.join(', ')}.`;

      for (const numeroEpisodio of episodiAttesi) {
        if (
          !this.strutturaHlsEpisodioValida(
            percorsi,
            numeroStagione,
            numeroEpisodio,
          )
        ) {
          return `La struttura HLS della stagione ${numeroStagione}, episodio ${numeroEpisodio}, è incompleta.`;
        }
      }
    }

    return '';
  }

  stagioniTrovateNelPacchetto(percorsi: string[]): number[] {
    const numeri = percorsi
      .map((percorso) => percorso.match(/\/stagione_(\d+)\//)?.[1])
      .filter((numero): numero is string => !!numero)
      .map((numero) => Number(numero));

    return [...new Set(numeri)].sort((a, b) => a - b);
  }

  episodiTrovatiNelPacchetto(
    percorsi: string[],
    numeroStagione: number,
  ): number[] {
    const regex = new RegExp(`/stagione_${numeroStagione}/e(\\d+)/`);
    const numeri = percorsi
      .map((percorso) => percorso.match(regex)?.[1])
      .filter((numero): numero is string => !!numero)
      .map((numero) => Number(numero));

    return [...new Set(numeri)].sort((a, b) => a - b);
  }

  strutturaHlsEpisodioValida(
    percorsi: string[],
    numeroStagione: number,
    numeroEpisodio: number,
  ): boolean {
    const base = `stagione_${numeroStagione}/e${numeroEpisodio}`;
    const contiene = (pezzo: string) =>
      percorsi.some((percorso) => percorso.endsWith(`${base}/${pezzo}`));
    const contieneTsInCartella = (cartella: string) =>
      percorsi.some(
        (percorso) =>
          percorso.includes(`${base}/${cartella}/`) && percorso.endsWith('.ts'),
      );

    return (
      contiene('master.m3u8') &&
      contiene('360/360p.m3u8') &&
      contiene('720/720p.m3u8') &&
      contiene('1080/1080p.m3u8') &&
      contiene('360/with-audio.m3u8') &&
      contiene('720/with-audio.m3u8') &&
      contiene('1080/with-audio.m3u8') &&
      contiene('it/audio_it.m3u8') &&
      contiene('en/audio_en.m3u8') &&
      contieneTsInCartella('360') &&
      contieneTsInCartella('720') &&
      contieneTsInCartella('1080') &&
      contieneTsInCartella('it') &&
      contieneTsInCartella('en')
    );
  }

  svuotaPacchettoHls(event: Event): void {
    event.stopPropagation();
    this.files['pacchetto_hls'] = [];
    this.erroriFiles['pacchetto_hls'] = '';
  }

  immaginiValide(): boolean {
    return (
      this.campoFileValido('img_titolo_it') &&
      this.campoFileValido('img_titolo_en') &&
      this.campoFileValido('img_copertina') &&
      this.campoFileValido('locandina_it') &&
      this.campoFileValido('locandina_en')
    );
  }

  trailerValide(): boolean {
    return (
      this.campoFileValido('trailer_it') &&
      this.campoFileValido('trailer_en')
    );
  }

  sottotitoliValidi(): boolean {
    return (
      this.campoFileValido('sottotitoli_it') &&
      this.campoFileValido('sottotitoli_en')
    );
  }

  jsonValido(): boolean {
    return (
      this.files['json_testi'].length === 0 || !this.erroriFiles['json_testi']
    );
  }

  pacchettoHlsCaricato(): boolean {
    if (this.modalitaCaricamento['pacchetto_hls'] === 'url') {
      return this.urlDiretti['pacchetto_hls']?.trim().length > 0;
    }
    return this.files['pacchetto_hls'].length > 0 && !this.errorePacchettoHls();
  }

  episodioSerieValido(episodio: any): boolean {
    return (
      episodio.titoloIt.trim().length >= 3 &&
      episodio.titoloIt.trim().length <= 30 &&
      episodio.titoloEn.trim().length >= 3 &&
      episodio.titoloEn.trim().length <= 30 &&
      episodio.descrizioneIt.trim().length >= 10 &&
      episodio.descrizioneIt.trim().length <= 3000 &&
      episodio.descrizioneEn.trim().length >= 10 &&
      episodio.descrizioneEn.trim().length <= 3000 &&
      (episodio.modalitaAnteprima === 'url'
        ? episodio.urlAnteprima?.trim().length > 0
        : episodio.anteprima.length === 1 && !episodio.erroreAnteprima)
    );
  }

  serieValida(): boolean {
    if (this.tipoMedia === 'film') return true;

    return (
      this.stagioniSerie.length > 0 &&
      this.stagioniSerie.every(
        (stagione) =>
          stagione.episodi.length > 0 &&
          stagione.episodi.every((episodio) =>
            this.episodioSerieValido(episodio),
          ),
      )
    );
  }

  formValido(): boolean {
    return (
      this.informazioniValide() &&
      this.immaginiValide() &&
      this.trailerValide() &&
      this.sottotitoliValidi() &&
      this.jsonValido() &&
      this.serieValida() &&
      this.pacchettoHlsCaricato()
    );
  }

  utentePuoAggiungereMedia(): boolean {
    const abilita = Authservice.auth?.abilita ?? [];

    return Array.isArray(abilita) && abilita.map(Number).includes(4);
  }

  uploadInProduzione(): boolean {
    return (
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    );
  }

  percentualeUploadVisibile(percentualeBackend: number): number {
    if (!this.uploadInProduzione()) return percentualeBackend;

    return Math.min(100, 80 + Math.round(percentualeBackend * 0.2));
  }
  creaDatiJobMedia(): any {
    return {
      tipoMedia: this.tipoMedia,
      idCategoria: this.idCategoriaSelezionata,
      idCategoriaSecondaria: this.idCategoriaSecondariaSelezionata || null,
      anno: this.anno,
      regista: this.regista.trim(),
      novita: this.novita ? '1' : '0',
      titoloIt: this.titoloIt.trim(),
      titoloEn: this.titoloEn.trim(),
      sottotitoloIt: this.sottotitoloIt.trim(),
      sottotitoloEn: this.sottotitoloEn.trim(),
      descrizioneIt: this.descrizioneIt.trim(),
      descrizioneEn: this.descrizioneEn.trim(),
      stagioni:
        this.tipoMedia === 'serie' ? JSON.stringify(this.stagioniSerie) : null,
    };
  }

  listaFileUploadMedia(): FileUploadMedia[] {
    const lista: FileUploadMedia[] = [];

    for (const chiave of [
      'img_titolo_it',
      'img_titolo_en',
      'img_copertina',
      'locandina_it',
      'locandina_en',
      'trailer_it',
      'trailer_en',
      'sottotitoli_it',
      'sottotitoli_en',
    ]) {
      if (this.modalitaCaricamento[chiave] === 'url') continue;
      const file = this.files[chiave]?.[0];

      if (file) {
        lista.push({
          categoriaFile: 'singoli',
          chiave,
          file,
        });
      }
    }

    if (this.modalitaCaricamento['pacchetto_hls'] !== 'url') {
      this.files['pacchetto_hls'].forEach((file, indice) => {
        lista.push({
          categoriaFile: 'pacchetto_hls',
          file,
          indice,
          percorsoOriginale: this.percorsoFile(file),
        });
      });
    }

    this.stagioniSerie.forEach((stagione, indiceStagione) => {
      stagione.episodi.forEach((episodio, indiceEpisodio) => {
        if (episodio.modalitaAnteprima === 'url') return;
        const file = episodio.anteprima[0];

        if (file) {
          lista.push({
            categoriaFile: 'anteprime',
            file,
            indiceStagione,
            indiceEpisodio,
          });
        }
      });
    });

    return lista;
  }

  creaFormDataFileUpload(voce: FileUploadMedia): FormData {
    const dati = new FormData();

    dati.append('categoria_file', voce.categoriaFile);
    dati.append('file', voce.file);

    if (voce.chiave) dati.append('chiave', voce.chiave);
    if (voce.indice !== undefined) dati.append('indice', String(voce.indice));
    if (voce.indiceStagione !== undefined)
      dati.append('indice_stagione', String(voce.indiceStagione));
    if (voce.indiceEpisodio !== undefined)
      dati.append('indice_episodio', String(voce.indiceEpisodio));
    if (voce.percorsoOriginale)
      dati.append('percorso_originale', voce.percorsoOriginale);

    return dati;
  }

  async caricaFileConRetry(
    voce: FileUploadMedia,
    urlFirmata: string,
    indiceFile: number,
    totaleFile: number,
  ): Promise<void> {
    const pause = [5000, 10000, 20000, 40000, 60000, 90000, 120000, 180000];

    for (let tentativo = 0; tentativo < pause.length; tentativo++) {
      try {
        await this.caricaFileSingolo(
          voce,
          urlFirmata,
          indiceFile,
          totaleFile,
          tentativo + 1,
        );
        return;
      } catch (err) {
        console.error('[UPLOAD MEDIA] file fallito', {
          file: voce.file.name,
          tentativo: tentativo + 1,
          err,
        });

        if (tentativo === pause.length - 1) {
          throw err;
        }

        this.testoProgressoUpload = `Errore upload file. Nuovo tentativo ${tentativo + 2}/8 tra ${Math.round(pause[tentativo] / 1000)}s...`;
        await this.attendi(pause[tentativo]);
      }
    }
  }

  caricaFileSingolo(
    voce: FileUploadMedia,
    urlFirmata: string,
    indiceFile: number,
    totaleFile: number,
    tentativo: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const sub = this.api.putFileSuS3(urlFirmata, voce.file).subscribe({
        next: (evento) => {
          if (evento.type === HttpEventType.Response) {
            this.subUploadAttive.delete(sub);
            sub.unsubscribe();
            resolve();
          }
        },
        error: (err) => {
          this.subUploadAttive.delete(sub);
          sub.unsubscribe();
          reject(err);
        },
      });

      this.subUploadAttive.add(sub);
    });
  }
  attendi(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  async onConferma(): Promise<void> {
    this.formInviato = true;

    if (!this.formValido() || this.salvataggioInCorso) return;

    if (!this.utentePuoAggiungereMedia()) {
      this.toastService.errore(
        "ERRORE: non hai l'abilità per aggiungere media.",
      );
      return;
    }

    let idUploadMediaJob = 0;

    try {
      this.salvataggioInCorso = true;
      this.annullamentoInCorso = false;
      this.progressoUpload = 0;
      this.testoProgressoUpload = 'Creazione job upload...';
      this.toastUploadMostrato = false;

      const rispostaJob = await firstValueFrom(
        this.api.creaMediaJob(this.creaDatiJobMedia()).pipe(take(1)),
      );

      idUploadMediaJob = Number(rispostaJob?.data?.id_upload_media_job ?? 0);

      if (!idUploadMediaJob) {
        throw new Error('Job upload non creato.');
      }

      this.idJobCorrente = idUploadMediaJob;

      const listaFile = this.listaFileUploadMedia();
      const PARALLELISMO_UPLOAD = 6;
      const totaleFile = listaFile.length;

      this.testoProgressoUpload = 'Generazione URL firmate...';

      const urlDiretti = this.listaUrlDirettiUploadMedia();

      const datiPresignedUrls = listaFile.map((voce) => ({
        categoriaFile: voce.categoriaFile,
        chiave: voce.chiave ?? null,
        percorsoOriginale: voce.percorsoOriginale ?? null,
        indiceStagione: voce.indiceStagione ?? null,
        indiceEpisodio: voce.indiceEpisodio ?? null,
      }));

      const rispostaUrls = await firstValueFrom(
        this.api
          .getPresignedUrls(idUploadMediaJob, datiPresignedUrls, urlDiretti)
          .pipe(take(1)),
      );

      const urlsFirmate: {
        indice: number;
        url: string;
        destinazione: string;
      }[] = rispostaUrls?.data?.urls ?? [];

      if (urlsFirmate.length !== totaleFile) {
        throw new Error('Numero URL firmate diverso dal numero file.');
      }

      if (totaleFile === 0) {
        this.progressoUpload = this.uploadInProduzione() ? 80 : 5;
        this.testoProgressoUpload = 'Lavorazione avviata...';
        this.avviaControlloStatoUpload(idUploadMediaJob);
        this.avviaProcessamentoUpload(idUploadMediaJob);
        return;
      }

      let indiceFileSuccessivo = 0;
      let fileCompletati = 0;

      const aggiornaProgressoBatch = () => {
        const percentuale = Math.round((fileCompletati / totaleFile) * 80);
        this.progressoUpload = Math.max(1, Math.min(80, percentuale));
        this.testoProgressoUpload = `Caricamento file ${fileCompletati}/${totaleFile}`;
      };

      const worker = async (): Promise<void> => {
        while (indiceFileSuccessivo < totaleFile) {
          if (this.annullamentoInCorso) return;
          const mioIndice = indiceFileSuccessivo++;
          const urlFirmata =
            urlsFirmate.find((u) => u.indice === mioIndice)?.url ?? '';
          await this.caricaFileConRetry(
            listaFile[mioIndice],
            urlFirmata,
            mioIndice,
            totaleFile,
          );
          fileCompletati++;
          aggiornaProgressoBatch();
        }
      };

      await Promise.all(
        Array.from({ length: PARALLELISMO_UPLOAD }, () => worker()),
      );

      if (this.annullamentoInCorso) return;

      this.progressoUpload = this.uploadInProduzione() ? 80 : 5;
      this.testoProgressoUpload = 'Lavorazione avviata...';

      this.avviaControlloStatoUpload(idUploadMediaJob);
      this.avviaProcessamentoUpload(idUploadMediaJob);
    } catch (err) {
      if (idUploadMediaJob) {
        try {
          await firstValueFrom(
            this.api.annullaUploadMedia(idUploadMediaJob).pipe(take(1)),
          );
        } catch {}
      }

      this.salvataggioInCorso = false;
      this.progressoUpload = 0;
      this.testoProgressoUpload = '';
      this.toastService.errore('ERRORE: salvataggio non riuscito.');
      this.erroreGlobaleService.segnalaErroreServer(
        'ERRORE: salvataggio non riuscito.',
      );
      console.error('Errore salvataggio media', err);
    }
  }
  avviaProcessamentoUpload(idUploadMediaJob: number): void {
    console.time('POST /media-processa - durata totale');
    console.log(
      '[UPLOAD MEDIA] POST /media-processa iniziato',
      idUploadMediaJob,
    );

    this.api
      .processaUploadMedia(idUploadMediaJob)
      .pipe(take(1))
      .subscribe({
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
          this.erroreGlobaleService.segnalaErroreServer(
            'ERRORE: salvataggio non riuscito.',
          );
          console.error('Errore processamento upload media', err);
        },
      });
  }
  avviaControlloStatoUpload(idUploadMediaJob: number): void {
    this.fermaControlloStatoUpload();
    this.controlloUploadAttivo = true;

    const controlla = () => {
      if (!this.controlloUploadAttivo) return;

      this.api
        .getStatoUploadMedia(idUploadMediaJob)
        .pipe(take(1))
        .subscribe({
          next: (rit) => {
            if (!this.controlloUploadAttivo) return;

            const dati = rit.data;

            const percentualeBackend = Number(dati?.percentuale ?? 0);

            this.progressoUpload =
              this.percentualeUploadVisibile(percentualeBackend);
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
              this.toastService.successo(
                'SUCCESSO: media salvato correttamente.',
              );

              setTimeout(() => {
                this.salvataggioInCorso = false;
                this.cacheCatalogo.svuota();
                this.cacheScheda.svuota();
                window.dispatchEvent(new CustomEvent('media-aggiornato'));
                const url = (this.router.url || '').split('?')[0];
                const suCatalogo = /^\/(it|en)\/(catalogo|catalog)(\/|$)/.test(
                  url,
                );
                if (!suCatalogo) {
                  const lingua = this.cambioLingua.leggiCodiceLingua();
                  this.router.navigateByUrl(
                    `/${lingua}/${lingua === 'it' ? 'catalogo' : 'catalog'}`,
                  );
                }
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
            this.toastService.errore(
              'ERRORE: impossibile leggere lo stato upload.',
            );
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

    dati.append(
      'stagioni',
      JSON.stringify(
        this.stagioniSerie.map((stagione) => ({
          episodi: stagione.episodi.map((episodio) => ({
            titoloIt: episodio.titoloIt.trim(),
            titoloEn: episodio.titoloEn.trim(),
            descrizioneIt: episodio.descrizioneIt.trim(),
            descrizioneEn: episodio.descrizioneEn.trim(),
          })),
        })),
      ),
    );

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

    return (
      /^\d{4}$/.test(this.anno) &&
      annoNumero >= 1800 &&
      annoNumero <= annoCorrente
    );
  }

  informazioniValide(): boolean {
    return (
      !!this.categoriaSelezionata &&
      (!this.categoriaSecondariaSelezionata ||
        this.categoriaSecondariaSelezionata !== this.categoriaSelezionata) &&
      this.annoValido() &&
      this.regista.trim().length >= 3 &&
      this.regista.trim().length <= 50 &&
      this.titoloIt.trim().length >= 3 &&
      this.titoloIt.trim().length <= 30 &&
      this.titoloEn.trim().length >= 3 &&
      this.titoloEn.trim().length <= 30 &&
      this.sottotitoloIt.trim().length >= 3 &&
      this.sottotitoloIt.trim().length <= 35 &&
      this.sottotitoloEn.trim().length >= 3 &&
      this.sottotitoloEn.trim().length <= 35 &&
      this.descrizioneIt.trim().length >= 10 &&
      this.descrizioneIt.trim().length <= 3000 &&
      this.descrizioneEn.trim().length >= 10 &&
      this.descrizioneEn.trim().length <= 3000
    );
  }

  filtraAnno(event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '').slice(0, 4);
    this.anno = input.value;
  }

  onAnnulla(): void {
    if (!this.salvataggioInCorso) {
      this.chiudi.emit();
      return;
    }

    if (this.controlloUploadAttivo) {
      return;
    }

    this.annullamentoInCorso = true;
    this.testoProgressoUpload = 'Annullamento in corso...';

    this.subUploadAttive.forEach((sub) => sub.unsubscribe());
    this.subUploadAttive.clear();

    const idDaAnnullare = this.idJobCorrente;

    if (idDaAnnullare) {
      this.api
        .annullaUploadMedia(idDaAnnullare)
        .pipe(take(1))
        .subscribe({
          next: () => this.chiudiDopoAnnullamento(),
          error: () => this.chiudiDopoAnnullamento(),
        });
    } else {
      this.chiudiDopoAnnullamento();
    }
  }

  onClickFuori(): void {
    if (this.salvataggioInCorso) return;
    this.chiudi.emit();
  }

  private chiudiDopoAnnullamento(): void {
    this.salvataggioInCorso = false;
    this.annullamentoInCorso = false;
    this.progressoUpload = 0;
    this.testoProgressoUpload = '';
    this.idJobCorrente = 0;
    this.chiudi.emit();
  }

  categorieSecondarieDisponibili(): {
    idCategoria: string;
    codice: string;
    label: string;
  }[] {
    return this.categorie.filter(
      (cat) => cat.label !== this.categoriaSelezionata,
    );
  }
}
