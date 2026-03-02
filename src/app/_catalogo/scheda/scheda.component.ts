import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import videojs from 'video.js';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { Subscription, forkJoin } from 'rxjs';
import { SchedaProntaService } from './scheda_service/scheda-pronta.service';
import { SchedaCacheService } from './scheda_service/scheda-cache.service';
import { take } from 'rxjs/operators';
import { calcolaHash32, slugDaLocandina, mescolaDeterministicaLocandine } from 'src/app/_helpers_globali/helpers';
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
tipoContenuto: 'film' | 'serie' | null = null;
idContenuto: number | null = null;
urlSfondoScheda = '';
imgTitoloScheda = '';




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

  private slugCorrente = '';
  private subs = new Subscription();

  // --- FLAG DI SINCRONIZZAZIONE ---
private _loaderNascosto = false;
private _sfondoPronto = false;
private _titoloPronto = false;
private _descPronta = false;
private _tabellaPronta = false;

righeCorrelate: {
  idCategoria: string;
  category: string;
  locandine: { src: string; titolo: string; sottotitolo: string; tipo: string; id_media: string }[];
}[] = [];
righeCorrelateInCaricamento = true;

playerScheda: any = null;
mostraVideoScheda = false;
durataFadeSchedaMs = 400;

  @ViewChild('playerSchedaRef') playerSchedaRef!: ElementRef;

ngAfterViewInit(): void {
  setTimeout(() => {
    const el = this.playerSchedaRef?.nativeElement;
    if (!el) return;
    this.playerScheda = videojs(el, {
      controls: false,
      autoplay: true,
      muted: true,
      preload: 'auto',
      loop: false,
      sources: [{
        src: 'https://d2kd3i5q9rl184.cloudfront.net/mp4-trailer-it/trailer_ita_noi_non_siamo_soli.mp4',
        type: 'video/mp4'
      }]
    });

    this.playerScheda.ready(() => {
  setTimeout(() => {
    this.mostraVideoScheda = true;
  }, 1900);

  this.playerScheda.on('ended', () => {
    this.mostraVideoScheda = false;
  });
});
  }, 50);
}

constructor(
  private route: ActivatedRoute,
  private router: Router,
  private location: Location,
  private api: ApiService,
  private schedaCache: SchedaCacheService,
  private cambioLingua: CambioLinguaService,
  private schedaPronta: SchedaProntaService,
) {}

private verificaEAvviaAnimazioni(): void {
  if (this._sfondoPronto && this._titoloPronto && this._descPronta && this._tabellaPronta) {
    const aspetta = () => {
      const el = document.querySelector('.descrizione');
      if (el && el.textContent && el.textContent.trim().length > 3) {
        this.schedaPronta.segnaPronte();
      } else {
        requestAnimationFrame(aspetta);
      }
    };
    requestAnimationFrame(aspetta);
  }

  if (this._loaderNascosto && this._sfondoPronto && this._titoloPronto && this._descPronta && this._tabellaPronta) {
    requestAnimationFrame(() => {
      this.startAnim = true;
      this.startAnimTitolo = true;
      this.startAnimDescrizione = true;
    });
  }
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
  setTimeout(() => this.schedaPronta.reset());
  window.addEventListener('loader-hidden', this.onLoaderHidden, { once: true });
  setTimeout(() => {
    if (!this._loaderNascosto) this.onLoaderHidden();
  }, 0);



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
    this.cambioLingua.cambioLinguaApplicata$.subscribe(() => {
      const lingua = this.cambioLingua.leggiCodiceLingua();

      const nuovoTitolo = this.slugCorrente
        ? this.imgTitoloDaSlug(this.slugCorrente)
        : this.imgTitoloScheda;

      if (this.idContenuto && this.tipoContenuto) {
        const fetch$ = this.tipoContenuto === 'film'
          ? this.api.getFilmTraduzioni(this.idContenuto, lingua)
          : this.api.getSerieTraduzioni(this.idContenuto, lingua);

       fetch$.subscribe((res) => {
          const nuovaDesc = String(res?.data?.descrizione || '');
          this.startAnimTitolo = false;
          this.startAnimDescrizione = false;
          this.imgTitoloScheda = nuovoTitolo;
          this.descrizioneTestuale = nuovaDesc;

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              this.startAnimTitolo = true;
              this.startAnimDescrizione = true;
            });
          });

          this.caricaRigheCorrelate(false);

          if (this.tipoContenuto === 'serie' && this.stagioneSelezionata) {
            this.stagioneCachata.clear();
            this.serieData = {};
            this.selezionaStagione(this.stagioneSelezionata);
          }
        });
      } else {
        this.startAnimTitolo = false;
        this.imgTitoloScheda = nuovoTitolo;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => (this.startAnimTitolo = true));
        });
      }
    })
  );

  this.route.paramMap.subscribe((pm) => {
    const idRaw = pm.get('id');
    const id = idRaw ? Number(idRaw) : NaN;
    if (!idRaw || Number.isNaN(id)) return;

    // Reset animazioni e flag per ogni cambio di contenuto
    this.startAnim = false;
    this.startAnimTitolo = false;
    this.startAnimDescrizione = false;
    this._sfondoPronto = false;
    this._titoloPronto = false;
    this._descPronta = false;
    this._tabellaPronta = false;
    this.urlSfondoScheda = '';
    this.imgTitoloScheda = '';
    this.descrizioneTestuale = '';
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

      this.righeCorrelate = cached.righeCorrelate ?? [];
      this.righeCorrelateInCaricamento = false;

      this.schedaPronta.segnaPronte();
      requestAnimationFrame(() => {
        this.startAnim            = true;
        this.startAnimTitolo      = true;
        this.startAnimDescrizione = true;
      });

      return;
    }
    // ── fine ripristino da cache ──

    if (this.tipoContenuto === 'film') {
        this.api.getFilm(id).subscribe((res) => {
        this.descrizione = String(res?.data?.descrizione || '');
        this.slugCorrente = this.slugDaDescrizione(this.descrizione);

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
      });

      this.api.getFilmTraduzioni(id, this.cambioLingua.leggiCodiceLingua()).subscribe((res) => {
        this.descrizioneTestuale = String(res?.data?.descrizione || '');
        this._descPronta = true;
        this.verificaEAvviaAnimazioni();
      });
    }

    if (this.tipoContenuto === 'serie') {
      const lingua = this.cambioLingua.leggiCodiceLingua();

      this.api.getSerieTraduzioni(id, lingua).subscribe((res) => {
        this.descrizioneTestuale = String(res?.data?.descrizione || '');
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
        this.verificaEAvviaAnimazioni();
        this.caricaRigheCorrelate();
        const lista: any[] = Array.isArray(resStagioni?.data) ? resStagioni.data : [];
        this.stagioni = lista.map(s => ({
          id_stagione:     s.id_stagione,
          numero_stagione: s.numero_stagione,
          numero_episodi:  s.numero_episodi
        }));

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
  this.schedaPronta.segnaPronte();

  if (this.tipoContenuto && this.idContenuto) {
    const lingua = this.cambioLingua.leggiCodiceLingua();
   this.schedaCache.set(this.tipoContenuto, this.idContenuto, lingua, {
      descrizione: this.descrizione,
      descrizioneTestuale: this.descrizioneTestuale,
      urlSfondoScheda: this.urlSfondoScheda,
      imgTitoloScheda: this.imgTitoloScheda,
      anno: this.anno,
      durata: this.durata,
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
  try { if (this.playerScheda) this.playerScheda.dispose(); } catch {}
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
  const path = this.location.path(false);
  const baseUrl = path.replace(/\/(stagione|season)\/\d+$/, '');
  const segmento = path.includes('/en/') ? 'season' : 'stagione';
  this.location.replaceState(`${baseUrl}/${segmento}/${numeroStagione}`);
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
}
