import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { Subscription } from 'rxjs';
import { SchedaProntaService } from './scheda_service/scheda-pronta.service';

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
export class SchedaComponent implements OnInit, OnDestroy {
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

serieData: Record<string, Record<string, { titolo: string; descrizione: string; anteprima: string; durata: string }>> = {
  '1': {
    ep1: { titolo: 'Episodio 1', descrizione: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.', anteprima: 'assets/screen/abbraccia_il_vento/01.webp', durata: '48 min' },
    ep2: { titolo: 'Episodio 2', descrizione: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.', anteprima: 'assets/screen/abbraccia_il_vento/01.webp', durata: '51 min' },
    ep3: { titolo: 'Episodio 3', descrizione: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.', anteprima: 'assets/screen/abbraccia_il_vento/01.webp', durata: '45 min' },
    ep4: { titolo: 'Episodio 4', descrizione: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.', anteprima: 'assets/screen/abbraccia_il_vento/01.webp', durata: '50 min' },
  },
  '2': {
    ep1: { titolo: 'Episodio 1', descrizione: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.', anteprima: 'assets/screen/abbraccia_il_vento/01.webp', durata: '47 min' },
    ep2: { titolo: 'Episodio 2', descrizione: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.', anteprima: 'assets/screen/abbraccia_il_vento/01.webp', durata: '52 min' },
    ep3: { titolo: 'Episodio 3', descrizione: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.', anteprima: 'assets/screen/abbraccia_il_vento/01.webp', durata: '49 min' },
    ep4: { titolo: 'Episodio 4', descrizione: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.', anteprima: 'assets/screen/abbraccia_il_vento/01.webp', durata: '46 min' },
  },
  '3': {
    ep1: { titolo: 'Episodio 1', descrizione: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.', anteprima: 'assets/screen/abbraccia_il_vento/01.webp', durata: '53 min' },
    ep2: { titolo: 'Episodio 2', descrizione: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.', anteprima: 'assets/screen/abbraccia_il_vento/01.webp', durata: '44 min' },
    ep3: { titolo: 'Episodio 3', descrizione: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.', anteprima: 'assets/screen/abbraccia_il_vento/01.webp', durata: '48 min' },
    ep4: { titolo: 'Episodio 4', descrizione: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.', anteprima: 'assets/screen/abbraccia_il_vento/01.webp', durata: '55 min' },
  }
};
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

constructor(
  private route: ActivatedRoute,
  private router: Router,
  private api: ApiService,
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
  this.schedaPronta.reset();
  window.addEventListener('loader-hidden', this.onLoaderHidden, { once: true });
    setTimeout(() => {
      if (!this._loaderNascosto) this.onLoaderHidden();
    }, 0);
 const aspettaDescrizione = () => {
    const el = document.querySelector('.descrizione');
    if (el && el.textContent && el.textContent.trim().length > 3) {
      console.log('[SCHEDA] .descrizione nel DOM alle ' + performance.now() + ' ms | ' + el.textContent.trim().substring(0, 40));
    } else {
      requestAnimationFrame(aspettaDescrizione);
    }
  };
  requestAnimationFrame(aspettaDescrizione);
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

  this.anno         = res?.data?.anno         ?? null;
  this.durata       = res?.data?.durata       ?? null;
  this.regista      = String(res?.data?.regista || '');
  this.episodiTotali = null;

  if (!this.urlSfondoScheda) {
    this.urlSfondoScheda = this.sfondoDaDescrizione(this.descrizione);
  }
  this._sfondoPronto = true;

  if (!this.imgTitoloScheda) {
    this.imgTitoloScheda = this.imgTitoloDaSlug(this.slugCorrente);
  }
  this._titoloPronto = true;
  this._tabellaPronta = true;

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

  this.anno          = res?.data?.anno            ?? null;
  this.episodiTotali = res?.data?.numero_episodi  ?? null;
  this.regista       = String(res?.data?.regista  || '');
  this.durata        = null;

  if (!this.urlSfondoScheda) {
    this.urlSfondoScheda = this.sfondoDaDescrizione(this.descrizione);
  }
  this._sfondoPronto = true;

  if (!this.imgTitoloScheda) {
    this.imgTitoloScheda = this.imgTitoloDaSlug(this.slugCorrente);
  }
  this._titoloPronto = true;
  this._tabellaPronta = true;

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
  this.schedaPronta.segnaPronte(); // sblocca sempre all'uscita
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

  getChiavi(obj: Record<string, any>): string[] {
  return Object.keys(obj);
}

attendi(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

urlAnteprimePerStagione(stagione: string): string[] {
  if (!this.serieData || !this.serieData[stagione]) return [];
  const episodi = this.serieData[stagione];
  return this.getChiavi(episodi)
    .map(k => episodi[k]?.anteprima)
    .filter((u: any) => !!u);
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

async selezionaStagione(stagione: string): Promise<void> {
  const stagioneCorrente = this.stagioneSelezionata || this.getChiavi(this.serieData)[0];
  if (stagioneCorrente === stagione && !this.caricamentoStagioneInCorso) return;

  const mioId = ++this.idCaricamento;
  this.caricamentoStagioneInCorso = true;
  this.stagioneSelezionata = stagione;

  const urls = this.urlAnteprimePerStagione(stagione);
  await Promise.all([
    this.attendi(this.timerMinimoPlaceholderMs),
    this.precaricaImmagini(urls)
  ]);

  if (mioId !== this.idCaricamento) return;
  this.caricamentoStagioneInCorso = false;
}

onClicEpisodio(numeroEpisodio: number): void {
  console.log('Clic episodio', numeroEpisodio, 'stagione', this.stagioneSelezionata || '1');
}
}
