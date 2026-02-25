import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-scheda',
  templateUrl: './scheda.component.html',
  styleUrls: ['./scheda.component.scss']
})
export class SchedaComponent implements OnInit, OnDestroy {
  descrizione = '';
  descrizioneTestuale = '';
  tipoContenuto: 'film' | 'serie' | null = null;
  idContenuto: number | null = null;
  urlSfondoScheda = '';
  imgTitoloScheda = '';
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private cambioLingua: CambioLinguaService,
  ) {}

  // Controlla se tutti i pezzi sono pronti e solo allora scatta tutte le animazioni insieme
  private verificaEAvviaAnimazioni(): void {
    if (
      this._loaderNascosto &&
      this._sfondoPronto &&
      this._titoloPronto &&
      this._descPronta
    ) {
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
    window.addEventListener('loader-hidden', this.onLoaderHidden, { once: true });
    setTimeout(() => {
      if (!this._loaderNascosto) this.onLoaderHidden();
    }, 0);

    // Legge stato passato dal catalogo (già precaricato)
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
  this._descPronta = true; // già pronta dallo state: non serve aspettare la chiamata API
}

    // Cambio lingua: sincronizza titolo (sincrono) + descrizione (asincrona)
   this.subs.add(
  this.cambioLingua.cambioLinguaApplicata$.subscribe(() => {
    const lingua = this.cambioLingua.leggiCodiceLingua();

    // Calcola il nuovo titolo in memoria, senza toccare ancora la UI
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
});
    } else {
      // Nessuna descrizione da caricare: aggiorna solo il titolo
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

      this.idContenuto = id;
      this.tipoContenuto = this.leggiTipoDaUrl();

      if (this.tipoContenuto === 'film') {
        this.api.getFilm(id).subscribe((res) => {
          this.descrizione = String(res?.data?.descrizione || '');
          this.slugCorrente = this.slugDaDescrizione(this.descrizione);

          if (!this.urlSfondoScheda) {
            this.urlSfondoScheda = this.sfondoDaDescrizione(this.descrizione);
          }
          this._sfondoPronto = true;

          if (!this.imgTitoloScheda) {
            this.imgTitoloScheda = this.imgTitoloDaSlug(this.slugCorrente);
          }
          this._titoloPronto = true;

          this.verificaEAvviaAnimazioni();
        });

        this.api.getFilmTraduzioni(id, this.cambioLingua.leggiCodiceLingua()).subscribe((res) => {
          this.descrizioneTestuale = String(res?.data?.descrizione || '');
          this._descPronta = true;
          this.verificaEAvviaAnimazioni();
        });
      }

      if (this.tipoContenuto === 'serie') {
        this.api.getSerie(id).subscribe((res) => {
          this.descrizione = String(res?.data?.descrizione || '');
          this.slugCorrente = this.slugDaDescrizione(this.descrizione);

          if (!this.urlSfondoScheda) {
            this.urlSfondoScheda = this.sfondoDaDescrizione(this.descrizione);
          }
          this._sfondoPronto = true;

          if (!this.imgTitoloScheda) {
            this.imgTitoloScheda = this.imgTitoloDaSlug(this.slugCorrente);
          }
          this._titoloPronto = true;

          this.verificaEAvviaAnimazioni();
        });

        this.api.getSerieTraduzioni(id, this.cambioLingua.leggiCodiceLingua()).subscribe((res) => {
          this.descrizioneTestuale = String(res?.data?.descrizione || '');
          this._descPronta = true;
          this.verificaEAvviaAnimazioni();
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    window.removeEventListener('loader-hidden', this.onLoaderHidden);
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
}
