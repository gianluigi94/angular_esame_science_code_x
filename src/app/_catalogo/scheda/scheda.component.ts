import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import videojs from 'video.js';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { Subscription, forkJoin } from 'rxjs';
import { SchedaProntaService } from './scheda_service/scheda-pronta.service';
import { SchedaCacheService } from './scheda_service/scheda-cache.service';
import { take } from 'rxjs/operators';
import {  mescolaDeterministicaLocandine } from 'src/app/_helpers_globali/helpers';
import { AudioGlobaleService } from 'src/app/_servizi_globali/audio-globale.service';
import { StopVideoGlobaleService } from '../app-riga-categoria/categoria_services/stop-video-globale.service';
import { SchedaPlayerTransizioneTitoloService } from 'src/app/_servizi_globali/animazioni_saturno/gsap/scheda-player-transizione-titolo.service';
import { TranslateService } from '@ngx-translate/core';
import { TitoloPaginaService } from 'src/app/_servizi_globali/titolo-pagina.service';

export interface Episodio {
  titolo: string;
  descrizione: string;
  anteprima: string;
  durata: string;
}

@Component({
  selector: 'app-scheda',
  templateUrl: './scheda.component.html',
  styleUrls: ['./scheda.component.scss']
})
export class SchedaComponent implements OnInit, OnDestroy, AfterViewInit {
  descrizione = '';
descrizioneTestuale = '';
titoloScheda = '';
altSfondoScheda = '';
altTitoloScheda = '';
private _prefetchTitoloPromise: Promise<string> | null = null;
tipoContenuto: 'film' | 'serie' | null = null;
idContenuto: number | null = null;
urlSfondoScheda = '';
imgTitoloScheda = '';
private _paramRiproduzioneInAttesa: string | null = null;
private _stagioneRiproduzioneInAttesa: string | null = null;


private _labelPronte = false;
anno: number | null = null;
durata: number | null = null;       // minuti — solo film
episodiTotali: number | null = null; // solo serie
regista = '';

stagioneSelezionata: string | null = null;
caricamentoStagioneInCorso = false;
private idCaricamento = 0;
private timerMinimoPlaceholderMs = 500;

stagioni: Array<{ id_stagione: number; numero_stagione: number; numero_episodi: number }> = [];
serieData: Record<string, Record<string, { titolo: string; descrizione: string; anteprima: string; durata: string }>> = {};
private stagioneCachata = new Set<string>();
  startAnim = false;
  startAnimTitolo = false;
  startAnimDescrizione = false;
  segnale_cambio = false;
  // etichette UI — aggiornate insieme al titolo/descrizione
  labelRiprendi      = '';
labelRiproduci     = '';
labelRiprendiTitle  = '';
labelRiproduciTitle = '';
labelTrailerTitle   = '';
  labelAnno = '';
  labelDurata = '';
  labelRegista = '';
  labelEpisodiTotali = '';
  labelStagione = '';
  labelEpisodio = '';

  private slugCorrente = '';
private _preloadTitoloPromise: Promise<void> | null = null;
private _nuovoTitoloPrecaricato = '';
private _prefetchDescPromise: Promise<string> | null = null;
  private subs = new Subscription();

  // --- FLAG DI SINCRONIZZAZIONE ---
private _loaderNascosto = false;
private _sfondoPronto = false;
private _titoloPronto = false;
private _descPronta = false;
private _tabellaPronta = false;
private _primaNavigazione = true;
private contestoAudio: any = null;
private nodoSorgente: any = null;
private nodoGuadagno: any = null;
private elementoVideoReale: HTMLVideoElement | null = null;

righeCorrelate: {
  idCategoria: string;
  category: string;
  locandine: { src: string; titolo: string; sottotitolo: string; tipo: string; id_media: string }[];
}[] = [];
righeCorrelateInCaricamento = true;

 playerScheda: any = null;
 mostraPlayerSchedaNelDom = false;
mostraVideoScheda = false;
trailerInRiproduzione = true;
mostraPlayerVideo = false;
risorsePLayerVideo: { auto: string; '1080': string; '720': string; '360': string } | null = null;
sottotitoliPlayerVideo: { en: string; it: string } | null = null;
infoEpisodioPlayer: { stagione: number; episodio: number } | null = null;
transitioneVersoPLayer = false;

toggleTrailer(): void {
  if (this.trailerInRiproduzione) {
    this.trailerInRiproduzione = false;
    if (this.timerInserisciPlayerSchedaNelDom) {
      clearTimeout(this.timerInserisciPlayerSchedaNelDom);
      this.timerInserisciPlayerSchedaNelDom = null;
    }
    if (this.timerMostraVideoScheda) {
      clearTimeout(this.timerMostraVideoScheda);
      this.timerMostraVideoScheda = null;
    }
    this.avvioTrailerSchedaRichiesto = false;
    if (this.mostraVideoScheda) {
      this.mostraVideoScheda = false;
      this.sfumaGuadagnoVerso(0, this.durataFadeSchedaMs).finally(() => {
        this.resettaPlayerSchedaPerNuovoAvvio();
      });
    }
  this.aggiornaTrailerTitle();
  } else {
    this.trailerInRiproduzione = true;
    if (this.mostraPlayerSchedaNelDom && this.playerSchedaPronto) {
  this.richiediAvvioTrailerScheda(true);
  this.aggiornaTrailerTitle();
} else {
  this.programmaInserimentoPlayerSchedaNelDom();
}
  }
}
onRiproduci(): void {
  this.avviaTransizionePlayer();
}

onClicEpisodio(numeroEpisodio: number): void {
  this.avviaTransizionePlayer(numeroEpisodio);
}

private avviaTransizionePlayer(episodio?: number): void {
  if (!this.slugCorrente) {
    console.warn('[avviaTransizionePlayer] slug non ancora pronto, skip');
    return;
  }

  const BASE = 'https://d2kd3i5q9rl184.cloudfront.net/streaming';
  const slug = this.slugCorrente;

if (this.tipoContenuto === 'film') {
    this.risorsePLayerVideo = {
      auto:   `${BASE}/film/${slug}/master.m3u8`,
      '1080': `${BASE}/film/${slug}/1080/with-audio.m3u8`,
      '720':  `${BASE}/film/${slug}/720/with-audio.m3u8`,
      '360':  `${BASE}/film/${slug}/360/with-audio.m3u8`,
    };
    this.sottotitoliPlayerVideo = {
      en: `assets/sottotitoli/en/film/${slug}.vtt`,
      it: `assets/sottotitoli/it/film/${slug}.vtt`,
    };
  } else if (this.tipoContenuto === 'serie' && episodio != null) {
    const stagione = this.stagioneSelezionata ?? '1';
    this.risorsePLayerVideo = {
      auto:   `${BASE}/serie/${slug}/stagione_${stagione}/e${episodio}/master.m3u8`,
      '1080': `${BASE}/serie/${slug}/stagione_${stagione}/e${episodio}/1080/with-audio.m3u8`,
      '720':  `${BASE}/serie/${slug}/stagione_${stagione}/e${episodio}/720/with-audio.m3u8`,
      '360':  `${BASE}/serie/${slug}/stagione_${stagione}/e${episodio}/360/with-audio.m3u8`,
    };
    this.sottotitoliPlayerVideo = {
      en: `assets/sottotitoli/en/serie/${slug}.vtt`,
      it: `assets/sottotitoli/it/serie/${slug}.vtt`,
    };
    this.infoEpisodioPlayer = { stagione: Number(stagione), episodio };
  }

if (this.trailerInRiproduzione) {
  this.avvioTrailerSchedaRichiesto = false;
  this.trailerInRiproduzione = false;
  this.aggiornaTrailerTitle();
  if (this.mostraVideoScheda) {
    this.mostraVideoScheda = false;
    this.sfumaGuadagnoVerso(0, this.durataFadeSchedaMs).finally(() => {
      this.smontaPlayerSchedaDalDomSubito();  // ← dispose completo: DOM + istanza + nodi audio
    });
  } else {
    this.smontaPlayerSchedaDalDomSubito();    // ← idem, anche se il video non era visibile
  }
}
  const valore = episodio ? `ep${episodio}` : 'true';
  const lingua = this.cambioLingua.leggiCodiceLingua();
  const nomeParam = lingua === 'it' ? 'riproduzione' : 'play';
  const pathCorrente = this.location.path(true).split('?')[0];
  window.history.pushState(null, '', `${pathCorrente}?${nomeParam}=${valore}`);
  this.schedaPronta.impostaUrlScheda(pathCorrente);
  this.schedaPronta.impostaPlayerAperto(true);
  this.schedaPronta.impostaHeaderNascosto(true);
  this.mostraPlayerVideo = true;
  this.transitioneVersoPLayer = true;

  // Animazione titolo: da alto-piccolo → centro, in parallelo alla dissolvenza scheda
  this.transizioneTitolo.animaTitoloVersocentro();
}

@HostListener('window:popstate')
gestisciPopState(): void {
  if (this.mostraPlayerVideo) {
    this.mostraPlayerVideo = false;
    this.transitioneVersoPLayer = false;
    this.schedaPronta.impostaPlayerAperto(false);
    this.transizioneTitolo.ripristinaTitoloOrigineScheda();
  }
}

@HostListener('window:blur')
gestisciBlurFinestra(): void {
  if (!this.playerScheda) return;
  if (!this.mostraVideoScheda) return;

  this.avvioTrailerSchedaRichiesto = false;
  if (this.timerMostraVideoScheda) {
    clearTimeout(this.timerMostraVideoScheda);
    this.timerMostraVideoScheda = null;
  }

  this.mostraVideoScheda = false;

  this.sfumaGuadagnoVerso(0, this.durataFadeSchedaMs).finally(() => {
    try { this.playerScheda?.pause?.(); } catch {}
    try { this.playerScheda?.currentTime?.(0); } catch {}
  });
}

@HostListener('window:focus')
gestisciFocusFinestra(): void {
  if (!this.trailerInRiproduzione) return;    // utente aveva premuto pausa: non ripartire
  if (!this.playerScheda) return;

  if (this.mostraPlayerSchedaNelDom && this.playerSchedaPronto) {
    this.richiediAvvioTrailerScheda(true);
  }
}
 durataFadeSchedaMs = 400;
 private timerInserisciPlayerSchedaNelDom: any = null;
 private timerMostraVideoScheda: any = null;
 private timerResetPlayerScheda: any = null;
 private playerSchedaPronto = false;
 private avvioTrailerSchedaRichiesto = false;
// === AUDIO (collegato ad AudioGlobaleService) ===
audioBloccatoDaUtente = false;
soloBrowserBlocca = false;
private distrutto = false;
private handlerSbloccoAudioScheda: any = null;

   private _playerSchedaRef: ElementRef | null = null;

 @ViewChild('playerSchedaRef')
 set playerSchedaRef(ref: ElementRef | undefined) {
   this._playerSchedaRef = ref ?? null;
   if (ref) this.inizializzaPlayerSchedaDaRef(ref);
 }

 ngAfterViewInit(): void {}

constructor(
  private route: ActivatedRoute,
  private router: Router,
  private location: Location,
  private api: ApiService,
  private translate: TranslateService,
  private schedaCache: SchedaCacheService,
  private cambioLingua: CambioLinguaService,
  private schedaPronta: SchedaProntaService,
  private audioGlobaleService: AudioGlobaleService,
  private stopVideoGlobale: StopVideoGlobaleService,
  private transizioneTitolo: SchedaPlayerTransizioneTitoloService,
  private titoloPagina: TitoloPaginaService,
) {}

private verificaEAvviaAnimazioni(): void {
  const tuttoPronto =
    this._loaderNascosto &&
    this._sfondoPronto &&
    this._titoloPronto &&
    this._descPronta &&
    this._tabellaPronta;

  if (!tuttoPronto) return;

const _param = this._paramRiproduzioneInAttesa;
this._paramRiproduzioneInAttesa = null;
if (_param && !this.mostraPlayerVideo) {
  const ep = _param.startsWith('ep') ? Number(_param.replace('ep', '')) : undefined;
  if (this._stagioneRiproduzioneInAttesa) {
    this.stagioneSelezionata = this._stagioneRiproduzioneInAttesa;
    this._stagioneRiproduzioneInAttesa = null;
  }
  this.avviaTransizionePlayer(ep);
    this.schedaPronta.segnaPronte();
    // fire-and-forget: popola le label in background così quando il player
    // si chiude (popstate / chiudiPlayer / route navigation) la scheda
    // le trova già pronte senza dover aspettare il loader
    if (!this._labelPronte) {
      this._labelPronte = true;
      this.commitLabelUISincronizzate();
    }
    return;
  }

  if (!this._labelPronte) {
    this._labelPronte = true;
    // aspetta che le label siano davvero pronte PRIMA di togliere il loader.
    // su F5: translate.get() riprova finché le traduzioni arrivano → loader resta.
    // su scheda→scheda: traduzioni già in memoria → resolve immediato → nessun loader.
    this.commitLabelUISincronizzate().then(() => {
      if (this.distrutto) return;
      this.schedaPronta.segnaPronte();
      requestAnimationFrame(() => {
        this.startAnim = true;
        this.startAnimTitolo = true;
        this.startAnimDescrizione = true;
      });
    });
    return;
  }

  // label già pronte (es. navigazione scheda→scheda dopo il primo caricamento)
  this.schedaPronta.segnaPronte();
  requestAnimationFrame(() => {
    this.startAnim = true;
    this.startAnimTitolo = true;
    this.startAnimDescrizione = true;
  });
}
  private imgTitoloDaSlug(slug: string): string {
    if (!slug) return '';
    const lingua = this.cambioLingua.leggiCodiceLingua();
    return `assets/titoli_${lingua}/titolo_${lingua}_${slug}.webp`;
  }

  private sfondoDaDescrizione(descrizione: string): string {
    const slug = String(descrizione || '').replace(/^(film|serie)\./, '').trim();
    if (!slug) return '';
    return `assets/carosello_locandine/carosello_${slug}.webp`;
  }

  private slugDaDescrizione(descrizione: string): string {
    return String(descrizione || '').replace(/^(film|serie)\./, '').trim();
  }

  ngOnInit(): void {
if (this.schedaPronta.loaderGlobalmenteNascosto) {
    this._loaderNascosto = true;
  } else {
    window.addEventListener('loader-hidden', this.onLoaderHidden, { once: true });
  }

 this.subs.add(
   this.audioGlobaleService.statoAudio$.subscribe((consentito) => {
     this.audioBloccatoDaUtente = !consentito;

     // se l’utente sceglie "senza audio": forzo mute e NON preparo sblocco
    if (this.audioBloccatoDaUtente) {
       this.soloBrowserBlocca = false;
       try { this.audioGlobaleService.setSoloBrowserBlocca(false); } catch {}
       this.rimuoviSbloccoAudioScheda();
       try { this.inizializzaWebAudio(); } catch {}
       this.sfumaGuadagnoVerso(0, this.durataFadeSchedaMs).finally(() => {
         try { this.playerScheda?.muted?.(true); } catch {}
       });
       return;
     }

     // utente vuole audio: se il player è pronto, prova a partire con audio
     try { this.inizializzaWebAudio(); } catch {}
     try {
       if (this.contestoAudio && this.contestoAudio.state === 'suspended') {
         this.contestoAudio.resume().catch(() => {});
       }
     } catch {}
    try { this.sfumaGuadagnoVerso(1, 80); } catch {}
try { this.playerScheda?.muted?.(false); } catch {}
if (this.mostraVideoScheda) {
  this.proseguiAvvioTrailerScheda();
} else {
  this.sincronizzaAvvioTrailerScheda();
}
   }),
 );

  const navState = this.router.getCurrentNavigation()?.extras?.state ?? history.state;
  const urlDaState = String(navState?.['urlSfondo'] || '').trim();
  const imgTitoloDaState = String(navState?.['urlImgTitolo'] || '').trim();
  const descDaState = String(navState?.['descrizioneTestuale'] || '').trim();

  if (urlDaState) {
    this.urlSfondoScheda = urlDaState;
    this._sfondoPronto = true;
  }
  if (imgTitoloDaState) {
    this.imgTitoloScheda = imgTitoloDaState;
    this._titoloPronto = true;
  }
  if (descDaState) {
    this.descrizioneTestuale = descDaState;
    this._descPronta = true;
  }

  const tabellaDaState = navState?.['tabellaDati'] ?? null;
  if (tabellaDaState) {
    this.anno          = tabellaDaState.anno           ?? null;
    this.durata        = tabellaDaState.durata         ?? null;
    this.episodiTotali = tabellaDaState.numero_episodi ?? null;
    this.regista       = String(tabellaDaState.regista || '');
    this._tabellaPronta = true;
  }

this.subs.add(
  this.cambioLingua.cambioLinguaAvviato$.subscribe((codice: string) => {
    if (this.tipoContenuto === 'serie') this.caricamentoStagioneInCorso = true;

    if (this.slugCorrente) {
      const url = `assets/titoli_${codice}/titolo_${codice}_${this.slugCorrente}.webp`;
      this._nuovoTitoloPrecaricato = url;
      this._preloadTitoloPromise = new Promise<void>(resolve => {
        const img = new Image();
        img.onload = img.onerror = () => resolve();
        img.src = url;
      });
    } else {
      this._nuovoTitoloPrecaricato = '';
      this._preloadTitoloPromise = Promise.resolve();
    }

    if (this.idContenuto && this.tipoContenuto) {
      const fetch$ = this.tipoContenuto === 'film'
        ? this.api.getFilmTraduzioni(this.idContenuto, codice)
        : this.api.getSerieTraduzioni(this.idContenuto, codice);

      let resolveDesc!: (v: string) => void;
let resolveTitolo!: (v: string) => void;
this._prefetchDescPromise   = new Promise<string>(r => resolveDesc   = r);
this._prefetchTitoloPromise = new Promise<string>(r => resolveTitolo = r);

fetch$.pipe(take(1)).subscribe({
  next: (res) => {
    resolveDesc(String(res?.data?.descrizione || ''));
    resolveTitolo(String(res?.data?.titolo     || ''));
  },
  error: () => { resolveDesc(''); resolveTitolo(''); },
});
    } else {
      this._prefetchDescPromise   = Promise.resolve('');
this._prefetchTitoloPromise = Promise.resolve('');
    }
  })
);

this.subs.add(
 this.cambioLingua.cambioLinguaApplicata$.subscribe(() => {
  const lingua = this.cambioLingua.leggiCodiceLingua();

    const nuovoTitolo = this.slugCorrente
      ? this.imgTitoloDaSlug(this.slugCorrente)
      : this.imgTitoloScheda;

    const trailerEraAttivo =
      this.trailerInRiproduzione &&
      (this.mostraVideoScheda || this.mostraPlayerSchedaNelDom || !!this.timerMostraVideoScheda);

    const continuaDopoFade = () => {
      if (this.idContenuto && this.tipoContenuto) {


        const descPromise   = this._prefetchDescPromise   ?? Promise.resolve('');
const titoloPromise = this._prefetchTitoloPromise ?? Promise.resolve('');
this._prefetchDescPromise   = null;
this._prefetchTitoloPromise = null;
Promise.all([descPromise, titoloPromise]).then(([nuovaDesc, nuovoTitoloScheda]) => {
  this.titoloScheda = nuovoTitoloScheda;
  this.aggiornaAltSfondo();
          this.logUrlTrailerCorrente();
    const preloadPromise = this._preloadTitoloPromise ?? Promise.resolve();
const urlTitolo = this._nuovoTitoloPrecaricato || nuovoTitolo;
this._preloadTitoloPromise = null;
this._nuovoTitoloPrecaricato = '';

preloadPromise.then(() => {
  this.startAnimTitolo = false;
  this.startAnimDescrizione = false;
  this.descrizioneTestuale = nuovaDesc;

  const secondoPreload = new Image();
  secondoPreload.onload = secondoPreload.onerror = () => {
  this.imgTitoloScheda = urlTitolo;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      this.segnale_cambio = true;
this.commitLabelUISincronizzate();
this.schedaPronta.impostaLabelTorna(
  this.cambioLingua.leggiCodiceLingua() === 'it' ? 'Ritorna al catalogo ⮨' : 'Back to catalog ⮨'
);
      this.startAnimTitolo = true;
      this.startAnimDescrizione = true;
    });
  });
};
  secondoPreload.src = urlTitolo;
});

          this.caricaRigheCorrelate(false);

          if (this.tipoContenuto === 'serie' && this.stagioneSelezionata) {
            this.stagioneCachata.clear();
            this.serieData = {};
            this.selezionaStagione(this.stagioneSelezionata);
          }

          if (trailerEraAttivo && this.slugCorrente) {
            this.programmaInserimentoPlayerSchedaNelDom();
          }
        });
      } else {
        this.startAnimTitolo = false;
        this.imgTitoloScheda = nuovoTitolo;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => (this.startAnimTitolo = true));
        });
      }
    };

    if (trailerEraAttivo) {
      this.chiudiPlayerSchedaConFadeEReset(350).finally(() => {
        continuaDopoFade();
      });
    } else {
      continuaDopoFade();
    }
  })
);

  this.route.paramMap.subscribe((pm) => {
    const idRaw = pm.get('id');
    const id = idRaw ? Number(idRaw) : NaN;
    if (!idRaw || Number.isNaN(id)) return;

               this.schedaPronta.reset();

    // Reset animazioni e flag per ogni cambio di contenuto
    this.startAnim = false;
    this.startAnimTitolo = false;
    this.startAnimDescrizione = false;
    this.avvioTrailerSchedaRichiesto = false;
this.trailerInRiproduzione = true;
if (this._primaNavigazione) {
  const _sp = new URLSearchParams(window.location.search);
  this._paramRiproduzioneInAttesa = _sp.get('riproduzione') || _sp.get('play') || null;
  if (this._paramRiproduzioneInAttesa) {
    this._stagioneRiproduzioneInAttesa = pm.get('stagione') || null;
  }
}
this._primaNavigazione = false;

this._sfondoPronto = false;
    this._titoloPronto = false;
    this._descPronta = false;
    this._tabellaPronta = false;
    this._labelPronte = false;
    this.urlSfondoScheda = '';
    this.imgTitoloScheda = '';
    this.descrizioneTestuale = '';
this.titoloScheda        = '';
this.altSfondoScheda     = '';
this.altTitoloScheda     = '';
this.labelRiprendiTitle  = '';
this.labelRiproduciTitle = '';
this.labelTrailerTitle   = '';
      this.descrizione = '';
  this.slugCorrente = '';

  this.anno = null;
  this.durata = null;
  this.episodiTotali = null;
  this.regista = '';

  this.stagioni = [];
  this.serieData = {};
  this.stagioneSelezionata = null;
  this.stagioneCachata.clear();

    this.righeCorrelate = [];
    this.righeCorrelateInCaricamento = true;
    window.scrollTo(0, 0);
    // Rileggi lo state del router (valido anche su riuso del componente)
    const navState = history.state;
    const urlDaState = String(navState?.['urlSfondo'] || '').trim();
    const imgTitoloDaState = String(navState?.['urlImgTitolo'] || '').trim();
    const descDaState = String(navState?.['descrizioneTestuale'] || '').trim();
    const tabellaDaState = navState?.['tabellaDati'] ?? null;

    if (urlDaState) { this.urlSfondoScheda = urlDaState; this._sfondoPronto = true; }
    if (imgTitoloDaState) { this.imgTitoloScheda = imgTitoloDaState; this._titoloPronto = true; }
    if (descDaState) { this.descrizioneTestuale = descDaState; this._descPronta = true; }
    if (tabellaDaState) {
      this.anno          = tabellaDaState.anno           ?? null;
      this.durata        = tabellaDaState.durata         ?? null;
      this.episodiTotali = tabellaDaState.numero_episodi ?? null;
      this.regista       = String(tabellaDaState.regista || '');
      this._tabellaPronta = true;
    }



    this.idContenuto = id;
    this.tipoContenuto = this.leggiTipoDaUrl();
    this.verificaEAvviaAnimazioni();
    // ── Ripristino da cache (es. back button da /contatti) ──
    const lingua = this.cambioLingua.leggiCodiceLingua();
    const cached = this.tipoContenuto
      ? this.schedaCache.get(this.tipoContenuto, id, lingua)
      : null;

  if (cached) {
  this.descrizione         = cached.descrizione;
  this.descrizioneTestuale = cached.descrizioneTestuale;
  this.urlSfondoScheda     = cached.urlSfondoScheda;
  this.imgTitoloScheda     = cached.imgTitoloScheda;
  this.anno                = cached.anno;
  this.durata              = cached.durata;
  this.episodiTotali       = cached.episodiTotali;
  this.regista             = cached.regista;
  this.slugCorrente        = cached.slugCorrente;
  this.stagioni            = cached.stagioni;
  this.stagioneSelezionata = cached.stagioneSelezionata;
  this.serieData           = cached.serieData;

  for (const k of Object.keys(cached.serieData)) {
    this.stagioneCachata.add(k);
  }

  this._sfondoPronto  = true;
  this._titoloPronto  = true;
  this._descPronta    = true;
  this._tabellaPronta = true;

  this.titoloScheda = cached.titoloScheda ?? '';
this.aggiornaAltSfondo();
if (this.tipoContenuto === 'serie' && this.stagioneSelezionata) {
  this.aggiornaUrlStagione(this.stagioneSelezionata);
}
this.righeCorrelate = cached.righeCorrelate ?? [];
this.righeCorrelateInCaricamento = false;

  this.verificaEAvviaAnimazioni();

 if (this.slugCorrente && !this._paramRiproduzioneInAttesa) {
  this.programmaInserimentoPlayerSchedaNelDom();
}

  return;
}
    // ── fine ripristino da cache ──

    if (this.tipoContenuto === 'film') {
        this.api.getFilm(id).subscribe((res) => {
  this.descrizione = String(res?.data?.descrizione || '');
  this.slugCorrente = this.slugDaDescrizione(this.descrizione);

  this.logUrlTrailerCorrente();
        this.anno          = res?.data?.anno    ?? null;
        this.durata        = res?.data?.durata  ?? null;
        this.regista       = String(res?.data?.regista || '');
        this.episodiTotali = null;

        if (!this.urlSfondoScheda) {
          this.urlSfondoScheda = this.sfondoDaDescrizione(this.descrizione);
        }
        this._sfondoPronto = true;

        if (!this.imgTitoloScheda) {
          this.imgTitoloScheda = this.imgTitoloDaSlug(this.slugCorrente);
        }
        this._titoloPronto  = true;
        this._tabellaPronta = true;

        this.verificaEAvviaAnimazioni();
this.caricaRigheCorrelate();

if (this.slugCorrente && !this._paramRiproduzioneInAttesa) {
  this.programmaInserimentoPlayerSchedaNelDom();
}
      });

     this.api.getFilmTraduzioni(id, this.cambioLingua.leggiCodiceLingua()).subscribe((res) => {
  this.descrizioneTestuale = String(res?.data?.descrizione || '');
  this.titoloScheda        = String(res?.data?.titolo      || '');
  this.aggiornaAltSfondo();
  this._descPronta = true;
        this.verificaEAvviaAnimazioni();
      });
    }

    if (this.tipoContenuto === 'serie') {
      const lingua = this.cambioLingua.leggiCodiceLingua();

      this.api.getSerieTraduzioni(id, lingua).subscribe((res) => {
  this.descrizioneTestuale = String(res?.data?.descrizione || '');
  this.titoloScheda        = String(res?.data?.titolo      || '');
  this.aggiornaAltSfondo();
  this._descPronta = true;
        this.verificaEAvviaAnimazioni();
      });

      const stagioneDaUrl = pm.get('stagione') ? Number(pm.get('stagione')) : 1;

       forkJoin([
        this.api.getSerie(id),
        this.api.getStagioni(id)
      ]).subscribe(([resSerie, resStagioni]: [any, any]) => {
        this.descrizione   = String(resSerie?.data?.descrizione || '');
        this.slugCorrente  = this.slugDaDescrizione(this.descrizione);
        this.logUrlTrailerCorrente();
        this.anno          = resSerie?.data?.anno           ?? null;
        this.episodiTotali = resSerie?.data?.numero_episodi ?? null;
        this.regista       = String(resSerie?.data?.regista || '');
        this.durata        = null;

        if (!this.urlSfondoScheda) {
          this.urlSfondoScheda = this.sfondoDaDescrizione(this.descrizione);
        }
        this._sfondoPronto = true;

        if (!this.imgTitoloScheda) {
          this.imgTitoloScheda = this.imgTitoloDaSlug(this.slugCorrente);
        }
     this._titoloPronto  = true;
        this._tabellaPronta = true;

        // ── stagioni popolate PRIMA di verificaEAvviaAnimazioni ──
        const lista: any[] = Array.isArray(resStagioni?.data) ? resStagioni.data : [];
        this.stagioni = lista.map(s => ({
          id_stagione:     s.id_stagione,
          numero_stagione: s.numero_stagione,
          numero_episodi:  s.numero_episodi
        }));

        // ── validazione episodio da link diretto ──
        if (this._paramRiproduzioneInAttesa?.startsWith('ep')) {
          const epRichiesto = Number(this._paramRiproduzioneInAttesa.replace('ep', ''));
          const stagNum = Number(this._stagioneRiproduzioneInAttesa ?? '1');
          const stagInfo = this.stagioni.find(s => s.numero_stagione === stagNum);
          if (!stagInfo || epRichiesto < 1 || epRichiesto > stagInfo.numero_episodi) {
            const codice = this.cambioLingua.leggiCodiceLingua();
            this.router.navigateByUrl(`/${codice}/${codice === 'it' ? 'non-trovato' : 'not-found'}`);
            return;
          }
        }

        this.verificaEAvviaAnimazioni();
this.caricaRigheCorrelate();

if (this.slugCorrente && !this._paramRiproduzioneInAttesa) {
  this.programmaInserimentoPlayerSchedaNelDom();
}

        if (this.stagioni.length > 0) {
          const stagioneDaUrlEsplicita = !!pm.get('stagione');
          const target = this.stagioni.find(s => s.numero_stagione === stagioneDaUrl);

          if (!target && stagioneDaUrlEsplicita) {
            const codice = this.cambioLingua.leggiCodiceLingua();
            this.router.navigateByUrl(`/${codice}/${codice === 'it' ? 'non-trovato' : 'not-found'}`);
            return;
          }

          const stagione = target ?? this.stagioni[0];
          const targetStr = String(stagione.numero_stagione);
          this.aggiornaUrlStagione(targetStr);
          this.caricaEpisodiStagione(stagione.id_stagione, targetStr).then(() => {
            this.stagioneSelezionata = targetStr;
          });
        }
      });
    }
  });

    this.subs.add(
     this.stopVideoGlobale.osservaRichiesteFadeAudio$().subscribe(({ durataMs, done }) => {
       if (!this.playerScheda || !this.mostraVideoScheda) {
         done();
         return;
       }
       this.sfumaGuadagnoVerso(0, durataMs).finally(() => done());
     })
   );

 this.subs.add(
     this.stopVideoGlobale.osservaRichiesteChiusuraPlayerScheda$().subscribe(({ durataMs, done }) => {
       this.chiudiPlayerSchedaConFadeEReset(durataMs).finally(() => done());
     })
   );

this.subs.add(
     this.schedaPronta.chiudiPlayer$.subscribe(() => {
      this.mostraPlayerVideo = false;
       this.transitioneVersoPLayer = false;
       this.schedaPronta.impostaPlayerAperto(false);
       this.schedaPronta.impostaHeaderNascosto(false);
       this.transizioneTitolo.ripristinaTitoloOrigineScheda();
       const pathPulito = this.location.path(true).split('?')[0];
       this.location.replaceState(pathPulito);

       this.startAnim = false;
       this.startAnimTitolo = false;
       this.startAnimDescrizione = false;
       requestAnimationFrame(() => {
         this.startAnim = true;
         this.startAnimTitolo = true;
         this.startAnimDescrizione = true;
       });
     })
   );


}







tracciaRigaCorrelata(_i: number, riga: { idCategoria: string }): string {
  return riga.idCategoria;
}

private caricaRigheCorrelate(mostraCaricamento = true): void {
  if (!this.idContenuto || !this.tipoContenuto) return;
  const lingua = this.cambioLingua.leggiCodiceLingua();
  if (mostraCaricamento) this.righeCorrelateInCaricamento = true;

  this.api
    .getCategoriePerContenuto(lingua, this.tipoContenuto, this.idContenuto)
    .pipe(take(1))
    .subscribe({
      next: (ris: any) => {
        const items: any[] = Array.isArray(ris?.data?.items) ? ris.data.items : [];
        this.righeCorrelate = items
          .map((x: any) => ({
            idCategoria: String(x?.idCategoria || ''),
            category: String(x?.category || ''),
            locandine: (() => {
  const idCategoria = String(x?.idCategoria || '');
  const loc = (Array.isArray(x?.locandine) ? x.locandine : [])
    .map((p: any) => ({
      src: String(p?.src || ''),
      titolo: String(p?.titolo || ''),
      sottotitolo: String(p?.sottotitolo || ''),
      tipo: String(p?.tipo || ''),
      id_media: String(p?.id_media || ''),
    }))
    .filter((p: any) => !!p.src);
  return loc.length
    ? (mescolaDeterministicaLocandine(loc, idCategoria) as typeof loc)
    : loc;
})(),
          }))
          .filter((r) => !!r.idCategoria);
        this.righeCorrelateInCaricamento = false;
      },
      error: () => {
        this.righeCorrelateInCaricamento = false;
      },
    });
}

ngOnDestroy(): void {
  this.distrutto = true;
  if (this.tipoContenuto && this.idContenuto) {
    const lingua = this.cambioLingua.leggiCodiceLingua();
    this.schedaCache.set(this.tipoContenuto, this.idContenuto, lingua, {
  descrizione: this.descrizione,
      descrizioneTestuale: this.descrizioneTestuale,
      urlSfondoScheda: this.urlSfondoScheda,
      imgTitoloScheda: this.imgTitoloScheda,
      anno: this.anno,
      durata: this.durata,
      titoloScheda: this.titoloScheda,
      episodiTotali: this.episodiTotali,
      regista: this.regista,
      slugCorrente: this.slugCorrente,
      stagioni: this.stagioni,
      stagioneSelezionata: this.stagioneSelezionata,
      serieData: this.serieData,
      righeCorrelate: this.righeCorrelate,
    });
  }

  this.subs.unsubscribe();
  window.removeEventListener('loader-hidden', this.onLoaderHidden);
    if (this.timerInserisciPlayerSchedaNelDom) {
    clearTimeout(this.timerInserisciPlayerSchedaNelDom);
    this.timerInserisciPlayerSchedaNelDom = null;
  }
  if (this.timerMostraVideoScheda) {
    clearTimeout(this.timerMostraVideoScheda);
    this.timerMostraVideoScheda = null;
  }
  if (this.timerResetPlayerScheda) {
  clearTimeout(this.timerResetPlayerScheda);
  this.timerResetPlayerScheda = null;
}
if (this._retryLabelTimer) {
  clearTimeout(this._retryLabelTimer);
  this._retryLabelTimer = null;
}
  this.rimuoviSbloccoAudioScheda();
  try { this.audioGlobaleService.setSoloBrowserBlocca(false); } catch {}

  // ← fade-out audio, poi dispose
  const playerDaCancellare = this.playerScheda;
  this.sfumaGuadagnoVerso(0, this.durataFadeSchedaMs).finally(() => {
    try { if (playerDaCancellare) playerDaCancellare.dispose(); } catch {}
  });
}

  leggiTipoDaUrl(): 'film' | 'serie' | null {
    const segments = this.route.snapshot.url.map((s) => s.path);
    const parentSegs = this.route.parent?.snapshot.url.map((s) => s.path) || [];
    const all = [...parentSegs, ...segments].join('/');

    if (/(^|\/)(film|movies)(\/|$)/.test(all)) return 'film';
    if (/(^|\/)(serie|series)(\/|$)/.test(all)) return 'serie';
    return null;
  }

  private onLoaderHidden = () => {
    this._loaderNascosto = true;
    this.verificaEAvviaAnimazioni();
  };

  getChiavi(obj: Record<string, any>): string[] {
  return Object.keys(obj);
}

attendi(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}


precaricaImmagini(urls: string[]): Promise<void> {
  if (!urls || urls.length === 0) return Promise.resolve();
  const jobs = urls.map(u => new Promise<void>(resolve => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = u;
  }));
  return Promise.all(jobs).then(() => undefined);
}

async selezionaStagione(numeroStagione: string): Promise<void> {
  const stagioneCorrente = this.stagioneSelezionata || (this.stagioni.length > 0 ? String(this.stagioni[0].numero_stagione) : null);
  if (stagioneCorrente === numeroStagione && !this.caricamentoStagioneInCorso && this.stagioneCachata.has(numeroStagione)) return;

  this.aggiornaUrlStagione(numeroStagione);

  const mioId = ++this.idCaricamento;
  this.caricamentoStagioneInCorso = true;
  this.stagioneSelezionata = numeroStagione;

  if (!this.stagioneCachata.has(numeroStagione)) {
    const stagione = this.stagioni.find(s => String(s.numero_stagione) === numeroStagione);
    if (stagione) {
      await Promise.all([
        this.attendi(this.timerMinimoPlaceholderMs),
        this.caricaEpisodiStagione(stagione.id_stagione, numeroStagione)
      ]);
    } else {
      await this.attendi(this.timerMinimoPlaceholderMs);
    }
 } else {
  await this.precaricaImmagini(this.urlAnteprimePerStagione(numeroStagione));
}

  if (mioId !== this.idCaricamento) return;
  this.caricamentoStagioneInCorso = false;
}

private caricaEpisodiStagione(idStagione: number, numeroStagione: string): Promise<void> {
  const lingua = this.cambioLingua.leggiCodiceLingua();
  const slug = this.slugCorrente;

  return new Promise<void>(resolve => {
    Promise.all([
      this.api.getEpisodi(idStagione).toPromise(),
      this.api.getEpisodiTraduzioni(idStagione, lingua).toPromise()
    ]).then(([resEpisodi, resTrad]) => {
      const episodi: any[] = Array.isArray(resEpisodi?.data) ? (resEpisodi as any).data : [];
      const traduzioni: any[] = Array.isArray(resTrad?.data) ? (resTrad as any).data : [];

      const mapTrad: Record<number, { titolo: string; descrizione: string }> = {};
      traduzioni.forEach(t => {
        mapTrad[t.id_episodio] = { titolo: t.titolo || '', descrizione: t.descrizione || '' };
      });

      const stagObj: Record<string, { titolo: string; descrizione: string; anteprima: string; durata: string }> = {};
      const offsetEpisodi = this.stagioni
  .filter(s => s.numero_stagione < Number(numeroStagione))
  .reduce((acc, s) => acc + s.numero_episodi, 0);

episodi.forEach(ep => {
  const numProgressivo = offsetEpisodi + ep.numero_episodio;
  const numPadded = String(numProgressivo).padStart(2, '0');
  const anteprima = slug ? `assets/screen/${slug}/${numPadded}.webp` : '';
        const trad = mapTrad[ep.id_episodio] || { titolo: '', descrizione: '' };
        stagObj[`ep${ep.id_episodio}`] = {
          titolo: trad.titolo,
          descrizione: trad.descrizione,
          anteprima,
          durata: this.secondiInLeggibile(ep.durata)
        };
      });

      this.serieData = { ...this.serieData, [numeroStagione]: stagObj };
      this.stagioneCachata.add(numeroStagione);

      this.precaricaImmagini(this.urlAnteprimePerStagione(numeroStagione)).then(resolve);
    }).catch(() => resolve());
  });
}

urlAnteprimePerStagione(numeroStagione: string): string[] {
  if (!this.serieData || !this.serieData[numeroStagione]) return [];
  const episodi = this.serieData[numeroStagione];
  return this.getChiavi(episodi)
    .map(k => episodi[k]?.anteprima)
    .filter((u: any) => !!u);
}



toString(val: any): string {
  return String(val);
}

private aggiornaUrlStagione(numeroStagione: string): void {
  const pathCompleto = this.location.path(false);
  const [path, query] = pathCompleto.split('?');
  const baseUrl = path.replace(/\/(stagione|season)\/\d+$/, '');
  const segmento = path.includes('/en/') ? 'season' : 'stagione';
  const nuovoPath = `${baseUrl}/${segmento}/${numeroStagione}`;
  this.location.replaceState(query ? `${nuovoPath}?${query}` : nuovoPath);
}
secondiInLeggibile(secondi: number | null | undefined): string {
  if (!secondi || secondi <= 0) return '';
  const ore = Math.floor(secondi / 3600);
  const min = Math.floor((secondi % 3600) / 60);
  const sec = secondi % 60;
  if (ore > 0) {
    return sec > 0 ? `${ore}h ${min}m ${sec}s` : `${ore}h ${min}m`;
  }
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
}


private sincronizzaAvvioTrailerScheda(): void {
  const urlCalcolata = this.costruisciUrlTrailer();



  if (!this.playerScheda) return;
  if (!this.mostraVideoScheda) return;

  const url = urlCalcolata;
  if (!url) {

    return;
  }

  this.mostraVideoScheda = false;
  try { this.playerScheda.src({ src: url, type: 'video/mp4' }); } catch {}

  this.playerScheda.one('canplay', () => {
    if (!this.trailerInRiproduzione) return;
    this.mostraVideoScheda = true;
    this.proseguiAvvioTrailerScheda();
  });
}



private proseguiAvvioTrailerScheda(): void {
  if (!this.playerScheda) return;



  if (this.audioBloccatoDaUtente) {
    try { this.playerScheda.muted(true); } catch {}
    try { this.playerScheda.currentTime(0); } catch {}
    try { this.playerScheda.play(); } catch {}
    return;
  }

  try { this.sfumaGuadagnoVerso(1, 0); } catch {}

  try { this.playerScheda.muted(false); } catch {}
  try { this.playerScheda.currentTime(0); } catch {}


  try {
    const p = this.playerScheda.play();

    if (p && typeof p.then === 'function') {
      p.then(() => {
        this.soloBrowserBlocca = false;
        try { this.audioGlobaleService.setSoloBrowserBlocca(false); } catch {}
        this.rimuoviSbloccoAudioScheda();
      }).catch((e: any) => {
        this.attivaFallbackSoloBrowserBlocca();
      });
    }
  } catch (e) {
    this.attivaFallbackSoloBrowserBlocca();
  }
}

 private attivaFallbackSoloBrowserBlocca(): void {
   if (!this.playerScheda) return;
   if (this.audioBloccatoDaUtente) return; // se utente ha scelto "senza audio", niente fallback

   this.soloBrowserBlocca = true;
   try { this.audioGlobaleService.setSoloBrowserBlocca(true); } catch {}

   // parto mutato (così almeno si vede)
   try { this.playerScheda.muted(true); } catch {}
   try { this.playerScheda.currentTime(0); } catch {}
   try { this.playerScheda.play(); } catch {}

   // al primo click ovunque: restart da capo con audio
   this.preparaSbloccoAudioScheda();
 }

 private preparaSbloccoAudioScheda(): void {
   if (this.handlerSbloccoAudioScheda) return;
   if (this.audioBloccatoDaUtente) return;

      this.handlerSbloccoAudioScheda = () => {
     this.rimuoviSbloccoAudioScheda();
     if (!this.playerScheda) return;
     if (this.audioBloccatoDaUtente) return;

    // Se il click arriva quando il trailer è già finito/nascosto,
    // non devo riavviarlo, ma devo ripulire lo stato.
    if (!this.mostraVideoScheda) {
      this.soloBrowserBlocca = false;
      try { this.audioGlobaleService.setSoloBrowserBlocca(false); } catch {}

      try {
        if (this.contestoAudio && this.contestoAudio.state === 'suspended') {
          this.contestoAudio.resume().catch(() => {});
        }
      } catch {}

      try { this.sfumaGuadagnoVerso(1, 0); } catch {}
      this.resettaPlayerSchedaPerNuovoAvvio();
      return;
    }

  // Nascondi subito il video con fade, poi reset, poi riparti con audio
     this.mostraVideoScheda = false;
     this.sfumaGuadagnoVerso(0, this.durataFadeSchedaMs).then(() => {
       try { this.playerScheda.pause(); } catch {}
       try { this.playerScheda.currentTime(0); } catch {}
       try { this.playerScheda.muted(false); } catch {}

       try {
         if (this.contestoAudio && this.contestoAudio.state === 'suspended') {
           this.contestoAudio.resume().catch(() => {});
         }
       } catch {}

    setTimeout(() => {
         if (this.distrutto || !this.playerScheda) return;
         try { this.sfumaGuadagnoVerso(0, 0); } catch {}   // gain a 0 prima di apparire
         this.mostraVideoScheda = true;                     // CSS transition parte qui
         try { this.sfumaGuadagnoVerso(1, this.durataFadeSchedaMs); } catch {}  // audio in parallelo
         const p = this.playerScheda.play();
         if (p && typeof p.then === 'function') {
           p.then(() => {
             this.soloBrowserBlocca = false;
             try { this.audioGlobaleService.setSoloBrowserBlocca(false); } catch {}
           }).catch(() => {
             this.mostraVideoScheda = false;
             if (!this.distrutto) this.attivaFallbackSoloBrowserBlocca();
           });
         }
       }, 500);
     });
   };

   window.addEventListener('click', this.handlerSbloccoAudioScheda, { once: true, passive: true, capture: true });
 }

 private rimuoviSbloccoAudioScheda(): void {
   const h = this.handlerSbloccoAudioScheda;
   if (!h) return;
   try { window.removeEventListener('click', h, true); } catch {}
   this.handlerSbloccoAudioScheda = null;
 }

  private arrestaTrailerSchedaSubito(): void {
   if (this.timerMostraVideoScheda) {
     clearTimeout(this.timerMostraVideoScheda);
     this.timerMostraVideoScheda = null;
   }

     if (this.timerResetPlayerScheda) {
    clearTimeout(this.timerResetPlayerScheda);
    this.timerResetPlayerScheda = null;
  }
   this.avvioTrailerSchedaRichiesto = false;
   this.mostraVideoScheda = false;
   this.soloBrowserBlocca = false;

   try { this.audioGlobaleService.setSoloBrowserBlocca(false); } catch {}
   this.rimuoviSbloccoAudioScheda();

  this.resettaPlayerSchedaPerNuovoAvvio();
 }

 private ottieniVideoReale(): HTMLVideoElement | null {
  try {
    if (!this.playerScheda?.el) return null;
    return (this.playerScheda.el() as HTMLElement).querySelector('video');
  } catch { return null; }
}

private inizializzaWebAudio(): void {
  const el = this.ottieniVideoReale();
  if (!el) return;
  if (this.elementoVideoReale === el && this.nodoSorgente && this.nodoGuadagno) return;
  try {
    try { this.nodoSorgente?.disconnect(); } catch {}
    try { this.nodoGuadagno?.disconnect(); } catch {}
    if (!this.contestoAudio) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      this.contestoAudio = new Ctx();
    }
    el.setAttribute('crossorigin', 'anonymous');
    el.setAttribute('playsinline', '');
    this.elementoVideoReale = el;
    this.nodoSorgente = this.contestoAudio.createMediaElementSource(el);
    this.nodoGuadagno = this.contestoAudio.createGain();
    try { this.nodoGuadagno.gain.setValueAtTime(1, this.contestoAudio.currentTime); } catch {}
    this.nodoSorgente.connect(this.nodoGuadagno).connect(this.contestoAudio.destination);
  } catch {}
}

private sfumaGuadagnoVerso(target: number, durataMs: number): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (!this.contestoAudio || !this.nodoGuadagno) return resolve();
      const durataSec = Math.max(0, (durataMs || 0) / 1000);
      const t0 = this.contestoAudio.currentTime;
      try { this.nodoGuadagno.gain.cancelScheduledValues(t0); } catch {}
      try { this.nodoGuadagno.gain.setValueAtTime(this.nodoGuadagno.gain.value ?? 0, t0); } catch {}
      try { this.nodoGuadagno.gain.linearRampToValueAtTime(target, t0 + durataSec); } catch {}
      if (durataSec === 0) return resolve();
      const nativeTimeout = (window as any).__zone_symbol__setTimeout ?? setTimeout;
      nativeTimeout(resolve, Math.max(0, durataMs));
    } catch { resolve(); }
  });
}

private richiediAvvioTrailerScheda(immediato = false): void {
  this.avvioTrailerSchedaRichiesto = true;
  this.programmaAvvioTrailerSchedaSePossibile(immediato);
}

private programmaAvvioTrailerSchedaSePossibile(immediato = false): void {


  if (!this.avvioTrailerSchedaRichiesto) return;
  if (!this.playerSchedaPronto) return;
  if (!this.playerScheda) return;
  if (this.timerMostraVideoScheda) return;
  if (this.mostraVideoScheda) return;
  if (this.timerResetPlayerScheda) {
    clearTimeout(this.timerResetPlayerScheda);
    this.timerResetPlayerScheda = null;
  }
  this.avvioTrailerSchedaRichiesto = false;

  const ritardo = immediato ? 0 : 1000;

  this.timerMostraVideoScheda = setTimeout(() => {

    this.timerMostraVideoScheda = null;
    this.mostraVideoScheda = true;
    this.sincronizzaAvvioTrailerScheda();
  }, ritardo);
}


 private resettaPlayerSchedaPerNuovoAvvio(): void {
   try { this.playerScheda?.pause?.(); } catch {}
   try { this.playerScheda?.currentTime?.(0); } catch {}
   try { this.playerScheda?.muted?.(false); } catch {}

   try {
     const video = this.ottieniVideoReale();
     video?.load?.();
   } catch {}
 }


 private programmaResetPlayerSchedaDopoScomparsa(extraMs = 50): void {
  if (this.timerResetPlayerScheda) {
    clearTimeout(this.timerResetPlayerScheda);
    this.timerResetPlayerScheda = null;
  }

  const attesa = Math.max(0, this.durataFadeSchedaMs + extraMs);

  this.timerResetPlayerScheda = setTimeout(() => {
    this.timerResetPlayerScheda = null;
    this.resettaPlayerSchedaPerNuovoAvvio();
  }, attesa);
}

    private chiudiPlayerSchedaConFadeEReset(durataMs: number): Promise<void> {
   return new Promise<void>((resolve) => {
     if (this.timerInserisciPlayerSchedaNelDom) {
       clearTimeout(this.timerInserisciPlayerSchedaNelDom);
       this.timerInserisciPlayerSchedaNelDom = null;
     }
     if (this.timerMostraVideoScheda) {
       clearTimeout(this.timerMostraVideoScheda);
       this.timerMostraVideoScheda = null;
     }
     if (this.timerResetPlayerScheda) {
       clearTimeout(this.timerResetPlayerScheda);
       this.timerResetPlayerScheda = null;
     }

     this.avvioTrailerSchedaRichiesto = false;
     this.rimuoviSbloccoAudioScheda();
     this.soloBrowserBlocca = false;
     try { this.audioGlobaleService.setSoloBrowserBlocca(false); } catch {}

     const attesaVisiva = Math.max(0, durataMs || this.durataFadeSchedaMs || 0);
     const eraVisibile = this.mostraVideoScheda;

     this.durataFadeSchedaMs = attesaVisiva;
     this.mostraVideoScheda = false;

     if (!this.playerScheda) {
       this.smontaPlayerSchedaDalDomSubito();
       resolve();
       return;
     }

     if (!eraVisibile) {
       this.resettaPlayerSchedaPerNuovoAvvio();
       this.smontaPlayerSchedaDalDomSubito();
       resolve();
       return;
     }

     try { this.playerScheda?.muted?.(false); } catch {}
     this.sfumaGuadagnoVerso(0, attesaVisiva).finally(() => {
       this.resettaPlayerSchedaPerNuovoAvvio();
       this.smontaPlayerSchedaDalDomSubito();
       resolve();
     });
   });
 }


  private inizializzaPlayerSchedaDaRef(ref: ElementRef): void {
   if (this.playerScheda) return;

   setTimeout(() => {
     const el = ref?.nativeElement;
     if (!el || this.playerScheda) return;

     el.setAttribute('crossorigin', 'anonymous');

     this.playerScheda = videojs(el, {
       controls: false,
       autoplay: false,
       muted: false,
       preload: 'auto',
       loop: false,
       playsinline: true,

     });

    this.playerScheda.ready(() => {

  this.playerSchedaPronto = true;
  try { this.inizializzaWebAudio(); } catch {}
  this.programmaAvvioTrailerSchedaSePossibile();



  this.playerScheda.on('ended', () => {
  this.trailerInRiproduzione = false;
  this.mostraVideoScheda = false;
  this.aggiornaTrailerTitle();
  this.programmaResetPlayerSchedaDopoScomparsa();
});
});
   }, 50);
 }

 private programmaInserimentoPlayerSchedaNelDom(): void {


  if (this.mostraPlayerSchedaNelDom) return;
  if (this.timerInserisciPlayerSchedaNelDom) return;

  this.timerInserisciPlayerSchedaNelDom = setTimeout(() => {
    this.timerInserisciPlayerSchedaNelDom = null;
    this.mostraPlayerSchedaNelDom = true;
    this.richiediAvvioTrailerScheda();
  }, 500);
}

 private smontaPlayerSchedaDalDomSubito(): void {
   if (this.timerInserisciPlayerSchedaNelDom) {
     clearTimeout(this.timerInserisciPlayerSchedaNelDom);
     this.timerInserisciPlayerSchedaNelDom = null;
   }
   if (this.timerMostraVideoScheda) {
     clearTimeout(this.timerMostraVideoScheda);
     this.timerMostraVideoScheda = null;
   }
   if (this.timerResetPlayerScheda) {
     clearTimeout(this.timerResetPlayerScheda);
     this.timerResetPlayerScheda = null;
   }

   this.mostraVideoScheda = false;
   this.mostraPlayerSchedaNelDom = false;
   this.playerSchedaPronto = false;

   try { this.nodoSorgente?.disconnect?.(); } catch {}
   try { this.nodoGuadagno?.disconnect?.(); } catch {}

   this.nodoSorgente = null;
   this.nodoGuadagno = null;
   this.elementoVideoReale = null;

   const playerDaSmontare = this.playerScheda;
   this.playerScheda = null;

   try { playerDaSmontare?.dispose?.(); } catch {}
 }



private logUrlTrailerCorrente(): void {
  if (!this.slugCorrente) return;
  const lang = this.cambioLingua.leggiCodiceLingua();
  const folder = lang === 'it' ? 'mp4-trailer-it' : 'mp4-trailer-en';
  const prefix = lang === 'it' ? 'trailer_ita_' : 'trailer_en_';
  const url = `https://d2kd3i5q9rl184.cloudfront.net/${folder}/${prefix}${this.slugCorrente}.mp4`;
}

private costruisciUrlTrailer(): string {
  if (!this.slugCorrente) return '';
  const lang = this.cambioLingua.leggiCodiceLingua();
  const folder = lang === 'it' ? 'mp4-trailer-it' : 'mp4-trailer-en';
  const prefix = lang === 'it' ? 'trailer_ita_' : 'trailer_en_';
  return `https://d2kd3i5q9rl184.cloudfront.net/${folder}/${prefix}${this.slugCorrente}.mp4`;
}

private aggiornaEtichetteUI(): void {
  this.labelRiprendi       = this.translate.instant('ui.scheda.riprendi.label');
  this.labelRiproduci      = this.translate.instant('ui.scheda.riproduci.label');
  this.labelAnno           = this.translate.instant('ui.scheda.anno.label');
  this.labelDurata         = this.translate.instant('ui.scheda.durata.label');
  this.labelRegista        = this.translate.instant('ui.scheda.regista.label');
  this.labelEpisodiTotali  = this.translate.instant('ui.scheda.numero_episodi.label');
  this.labelStagione       = this.translate.instant('ui.scheda.stagione.label');
  this.labelEpisodio       = this.translate.instant('ui.scheda.episodio.label');
  this.aggiornaAltSfondo();
}

private _retryLabelTimer: any = null;

private commitLabelUISincronizzate(): Promise<void> {
  if (this._retryLabelTimer) {
    clearTimeout(this._retryLabelTimer);
    this._retryLabelTimer = null;
  }

  return new Promise<void>((resolve) => {
    let retried = false;

    const prova = () => {
      if (this.distrutto) { resolve(); return; }

      this.translate.get('ui.scheda.riprendi.label').pipe(take(1)).subscribe({
        next: (val: string) => {
          if (val === 'ui.scheda.riprendi.label') {
            // traduzioni non ancora in memoria (F5): riprova tra 300ms, loader resta
            retried = true;
            this._retryLabelTimer = setTimeout(() => {
              this._retryLabelTimer = null;
              prova();
            }, 300);
          } else {
            // traduzioni pronte: popola le label e risolve
            this.aggiornaEtichetteUI();
            // extra 100ms solo su F5 (retried=true) per dare tempo al browser
            // di applicare il paint prima di togliere il loader
            if (retried) {
              setTimeout(() => resolve(), 100);
            } else {
              resolve();
            }
          }
        },
        error: () => {
          this.aggiornaEtichetteUI();
          resolve();
        },
      });
    };

    prova();
  });
}

private aggiornaAltSfondo(): void {
  this.titoloPagina.impostaTitoloScheda(this.titoloScheda);
  this.altSfondoScheda    = this.translate.instant('ui.carosello.altSfondo', { titolo: this.titoloScheda });
  this.altTitoloScheda    = this.translate.instant('ui.carosello.altTitolo', { titolo: this.titoloScheda });
  this.labelRiprendiTitle  = this.translate.instant('ui.scheda.riprendi.title.two',  { titolo: this.titoloScheda });
  this.labelRiproduciTitle = this.translate.instant('ui.scheda.riproduci.title.two', { titolo: this.titoloScheda });
  this.aggiornaTrailerTitle();
}

private aggiornaTrailerTitle(): void {
  const chiave = this.trailerInRiproduzione
    ? 'ui.scheda.trailer.title.pause'
    : 'ui.scheda.trailer.title';
  this.labelTrailerTitle = this.translate.instant(chiave, { title: this.titoloScheda });
}
}
