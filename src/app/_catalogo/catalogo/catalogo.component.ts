import { Component, OnDestroy, OnInit, AfterViewInit, ElementRef, QueryList, ViewChildren, HostListener, ViewChild } from '@angular/core';
import { Subscription, take, skip, distinctUntilChanged, forkJoin } from 'rxjs';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { TipoContenuto, TipoContenutoService } from '../app-riga-categoria/categoria_services/tipo-contenuto.service';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { AnimazioniScomparsaService } from 'src/app/_catalogo/app-riga-categoria/categoria_services/animazioni-scomparsa.service';
import { ScorrimentoCatalogoService } from '../app-riga-categoria/categoria_services/scorrimento-catalogo.service';
@Component({
  selector: 'app-catalogo',
  templateUrl: './catalogo.component.html',
  styleUrls: ['./catalogo.component.scss']
})
export class CatalogoComponent implements OnInit, AfterViewInit, OnDestroy {
  constructor(
    public api: ApiService,
    public tipoContenuto: TipoContenutoService,
    public router: Router,
    public location: Location,
    public cambioLingua: CambioLinguaService,
     public servizioAnimazioni: AnimazioniScomparsaService,
 public scorrimentoCatalogo: ScorrimentoCatalogoService
  ) {}

  tickResetPagine = 0;
  timerCambioTipo: any = 0;
  sottoscrizioni = new Subscription();
  idCicloRighe = 0;
   timerCaricaFino: any = 0;
 tokenScroll = 0;
  limiteRighe = 4;
  offsetRighe = 0;
  haAltreRighe = true;
  hoFinitoTutto = false;
  caricamentoRighe = false;

  timerSentinella: any = 0;
  osservatoreSentinella: IntersectionObserver | null = null;
  sentinellaPronta = false;
  utenteHaScrollato = false;
  scrollYPrimaCambio = 0;

  cinqueElementi = Array(5).fill(0);

   locandinaDemo = 'assets/locandine_it/locandina_it_abbraccia_il_vento.webp';
  locandineDemo: { src: string; titolo: string; sottotitolo: string }[] = Array(8).fill(0).map(() => ({
    src: this.locandinaDemo,
    titolo: '',
    sottotitolo: '',
  }));

  righeDemo: { idCategoria: string; category: string; locandine: { src: string; titolo: string; sottotitolo: string }[] }[] = [];
  tipoSelezionato: TipoContenuto = 'film_serie';

  @ViewChild('sentinella', { read: ElementRef })
  sentinella!: ElementRef;

  @ViewChildren('rigaCatalogo', { read: ElementRef })
  righeCatalogo!: QueryList<ElementRef>;

  ngAfterViewInit(): void {
    this.servizioAnimazioni.inizializzaAnimazioni(this.righeCatalogo);
    this.righeCatalogo.changes.subscribe(() => {
      this.servizioAnimazioni.inizializzaAnimazioni(this.righeCatalogo);
    });
    this.inizializzaOsservatoreSentinella();
  }

  @HostListener('wheel', ['$event'])
  gestisciRotellina(evento: WheelEvent): void {
    this.utenteHaScrollato = true;
    this.servizioAnimazioni.gestisciWheel(evento);
  }

  ngOnInit(): void {
    this.tipoSelezionato = this.tipoContenuto.leggiTipo();
    this.forzaRottaCatalogoDaTipo();
    this.caricaPrimeRigheDaApi(0, false);
     this.sottoscrizioni.add(
 this.scorrimentoCatalogo.richieste$.subscribe((idCategoria: string) => {
 this.gestisciScrollACategoria(idCategoria);
 }),
 );
    this.sottoscrizioni.add(
      this.cambioLingua.cambioLinguaApplicata$.subscribe(() => {
        this.caricaPrimeRigheDaApi(0, false);
      })
    );

    this.sottoscrizioni.add(
      this.tipoContenuto.tipoSelezionato$
        .pipe(distinctUntilChanged(), skip(1))
        .subscribe((tipo) => {
          this.tipoSelezionato = tipo;
          this.tickResetPagine += 1;
          this.avviaCambioTipoConAttese();
          this.forzaRottaCatalogoDaTipo();
        })
    );
  }

  ngOnDestroy(): void {
    this.sottoscrizioni.unsubscribe();
    try { this.servizioAnimazioni.disconnettiOsservatori(); } catch {}
    if (this.timerCambioTipo) { clearTimeout(this.timerCambioTipo); this.timerCambioTipo = 0; }
    if (this.timerSentinella) { clearTimeout(this.timerSentinella); this.timerSentinella = 0; }
    if (this.timerCaricaFino) { clearTimeout(this.timerCaricaFino); this.timerCaricaFino = 0; }
    try { this.osservatoreSentinella?.disconnect(); } catch {}
    this.osservatoreSentinella = null;
  }

  tracciaRigaCategoria(_indice: number, riga: { idCategoria: string }): string {
    return riga.idCategoria;
  }

  forzaRottaCatalogoDaTipo(): void {
    const url = this.router.url || '';
    const base = url.split('?')[0].split('#')[0];
    const eCatalogoNudo = base === '/catalogo' || base === '/catalogo/';
    if (!eCatalogoNudo) return;

    const target = this.pathCatalogoDaTipo(this.tipoSelezionato);
    if (target !== base) this.location.go(target);
  }

  pathCatalogoDaTipo(val: TipoContenuto): string {
    if (val === 'film') return '/catalogo/film';
    if (val === 'serie') return '/catalogo/serie';
    return '/catalogo/film-serie';
  }
  calcolaHash32(testo: string): number {
    let h = 2166136261;
    for (let i = 0; i < testo.length; i++) {
      h ^= testo.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

    slugDaPoster(url: string): string {
    const u = String(url || '');
    const file = (u.split('/').pop() || '').trim(); // locandina_it_slug.webp
    if (!file) return u;

    const senzaExt = file.replace(/\.webp$/i, '');
    const parti = senzaExt.split('_');

    // atteso: locandina + lingua + slug...
    if (parti.length >= 3 && parti[0] === 'locandina') {
      return parti.slice(2).join('_'); // slug (stabile tra lingue)
    }

    return senzaExt;
  }

  mescolaDeterministicaLocandine(lista: { src: string }[], seed: string): { src: string }[] {
    const s = String(seed || '');
    const out = (lista || []).slice();
    out.sort((a, b) => {
            const sa = this.slugDaPoster(String(a?.src || ''));
      const sb = this.slugDaPoster(String(b?.src || ''));
      const ka = this.calcolaHash32(s + '|' + sa);
      const kb = this.calcolaHash32(s + '|' + sb);
      return ka - kb;
    });
    return out;
  }
  precaricaImmaginiRighe(righe: { locandine: { src: string }[] }[]): Promise<void> {
    const urls: string[] = [];
    for (const r of righe || []) {
            for (const u of r.locandine || []) {
        const s = String(u?.src || '');
        if (s) urls.push(s);
      }
    }
    if (!urls.length) return Promise.resolve();

    const promesse = urls.map(
      (u) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          (img as any).decode
            ? (img as any)
                .decode()
                .then(() => resolve())
                .catch(() => resolve())
            : (img.src = u);
          img.src = u;
        }),
    );
    return Promise.all(promesse).then(() => {});
  }

  aggiornaRigheInPlace(nuoveRighe: { idCategoria: string; category: string; posters: string[] }[]): void {
    const mappaEsistenti: Record<string, any> = {};
    for (const r of this.righeDemo || []) mappaEsistenti[String(r.idCategoria)] = r;

    const ordine: any[] = [];
    for (const n of nuoveRighe) {
      const idCat = String(n.idCategoria);
      const r = mappaEsistenti[idCat] || {
        idCategoria: idCat,
        category: '',
        posters: [],
      };
      r.category = n.category;
      this.aggiornaLocandineInPlace(r.posters, n.posters);
      ordine.push(r);
    }

    this.righeDemo.splice(0, this.righeDemo.length, ...ordine);
  }

  aggiornaLocandineInPlace(target: string[], sorgente: string[]): void {
    const t = target || [];
    const s = sorgente || [];
    while (t.length < s.length) t.push('');
    if (t.length > s.length) t.splice(s.length);
    for (let i = 0; i < s.length; i++) t[i] = s[i];
  }

  avviaCambioTipoConAttese(): void {
    if (this.timerCambioTipo) { clearTimeout(this.timerCambioTipo); this.timerCambioTipo = 0; }

    this.idCicloRighe += 1;
    const id = this.idCicloRighe;

    this.tipoContenuto.notificaCambioTipoAvviato(this.tipoSelezionato, id);

    this.timerCambioTipo = setTimeout(() => {
      this.timerCambioTipo = 0;
      this.caricaPrimeRigheDaApi(id, true);
    }, 100);
  }

  inizializzaOsservatoreSentinella(): void {
    try { this.osservatoreSentinella?.disconnect(); } catch {}
    this.osservatoreSentinella = null;

    const host = this.sentinella?.nativeElement;
    if (!host) return;

    this.osservatoreSentinella = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;

        console.log('Sentinella raggiunta');

        if (!this.sentinellaPronta) continue;
        if (!this.utenteHaScrollato) continue;
        if (!this.haAltreRighe) return;
        if (this.caricamentoRighe) return;

        if (this.timerSentinella) clearTimeout(this.timerSentinella);
        this.timerSentinella = setTimeout(() => {
          this.timerSentinella = 0;
          this.caricaAltreQuattroRigheDaApi();
        }, 400);
      }
    }, { root: null, threshold: 0.1 });

    this.osservatoreSentinella.observe(host);
  }

  caricaPrimeRigheDaApi(idForzato: number = 0, notificaTipoApplicato: boolean = false): void {
    const id = idForzato ? idForzato : (this.idCicloRighe + 1);
 if (!idForzato) this.idCicloRighe = id;

 this.scrollYPrimaCambio = window.scrollY || 0;
    const eroFinitoPrimaDelCambio = this.hoFinitoTutto;
 if (this.timerSentinella) { clearTimeout(this.timerSentinella); this.timerSentinella = 0; }
 try { this.osservatoreSentinella?.disconnect(); } catch {}
 this.osservatoreSentinella = null;

 const totaleDaRicaricare = this.offsetRighe > 0 ? this.offsetRighe : this.limiteRighe;
 const lingua = this.cambioLingua.leggiCodiceLingua();
 const tipo = this.tipoSelezionato;

  this.haAltreRighe = true;
 this.hoFinitoTutto = false;
 this.caricamentoRighe = true;
 this.sentinellaPronta = false;
 this.utenteHaScrollato = false;

 const richieste: any[] = [];
 for (let off = 0; off < totaleDaRicaricare; off += this.limiteRighe) {
 const lim = Math.min(this.limiteRighe, totaleDaRicaricare - off);
 richieste.push(this.api.getCatalogoRighe(lingua, tipo, lim, off).pipe(take(1)));
 }

 forkJoin(richieste).subscribe((risposte: any[]) => {
 const itemsTotali: any[] = [];
 for (const ris of risposte || []) {
 const items = Array.isArray(ris?.data?.items) ? ris.data.items : [];
 itemsTotali.push(...items);
 }

 const nuoveRighe = itemsTotali
 .map((x: any) => {
 const idCategoria = String(x?.idCategoria || '');

  let locandine = (Array.isArray(x?.locandine) ? x.locandine : [])
 .map((p: any) => ({
   src: String(p?.src || ''),
   titolo: String(p?.titolo || ''),
   sottotitolo: String(p?.sottotitolo || ''),
 }))
 .filter((p: any) => !!p.src);
  if (this.tipoSelezionato === 'film_serie' && locandine.length) {
   locandine = this.mescolaDeterministicaLocandine(locandine as any, idCategoria) as any;
 }

 return {
 idCategoria,
 category: String(x?.category || ''),
 locandine: locandine.length ? (locandine as any) : this.locandineDemo,
 };
 })
 .filter((r: any) => !!r.idCategoria);

 this.precaricaImmaginiRighe(nuoveRighe).then(() => {
 if (id !== this.idCicloRighe) return;

 this.righeDemo.splice(0, this.righeDemo.length, ...nuoveRighe);
 this.offsetRighe = nuoveRighe.length;

 const ultimo = risposte && risposte.length ? risposte[risposte.length - 1] : null;
 const itemsUltimo = Array.isArray(ultimo?.data?.items) ? ultimo.data.items : [];
 const limUltimo = Math.min(this.limiteRighe, totaleDaRicaricare - Math.max(0, (risposte.length - 1) * this.limiteRighe));

 this.haAltreRighe = itemsUltimo.length === limUltimo;
 this.hoFinitoTutto = !this.haAltreRighe;
 this.caricamentoRighe = false;
  this.sentinellaPronta = this.haAltreRighe && !this.hoFinitoTutto;
 if (!this.haAltreRighe) {
 try { this.osservatoreSentinella?.disconnect(); } catch {}
 this.osservatoreSentinella = null;
 }

 requestAnimationFrame(() => {
 window.scrollTo(0, this.scrollYPrimaCambio);
 if (eroFinitoPrimaDelCambio) this.hoFinitoTutto = true;
 this.sentinellaPronta = this.haAltreRighe && !this.hoFinitoTutto;
 if (this.sentinellaPronta) this.inizializzaOsservatoreSentinella();
  if (this.hoFinitoTutto) {
 try { this.osservatoreSentinella?.disconnect(); } catch {}
 this.osservatoreSentinella = null;
 }
 });

 if (notificaTipoApplicato) {
 this.tipoContenuto.notificaCambioTipoApplicato(this.tipoSelezionato, id);
 }
 });
 });
  }

  caricaAltreQuattroRigheDaApi(): void {
    if (!this.haAltreRighe) return;
    if (this.caricamentoRighe) return;

    this.caricamentoRighe = true;

    this.idCicloRighe += 1;
    const id = this.idCicloRighe;

    const lingua = this.cambioLingua.leggiCodiceLingua();
    const tipo = this.tipoSelezionato;
    const offset = this.offsetRighe;

    this.api.getCatalogoRighe(lingua, tipo, this.limiteRighe, offset)
      .pipe(take(1))
      .subscribe((ris: any) => {
        const items = Array.isArray(ris?.data?.items) ? ris.data.items : [];

                    const nuoveRighe = items
          .map((x: any) => {
            const idCategoria = String(x?.idCategoria || '');

            let locandine = (Array.isArray(x?.locandine) ? x.locandine : [])
              .map((p: any) => ({
                src: String(p?.src || ''),
                titolo: String(p?.titolo || ''),
                sottotitolo: String(p?.sottotitolo || ''),
              }))
              .filter((p: any) => !!p.src);

            if (this.tipoSelezionato === 'film_serie' && locandine.length) {
              locandine = this.mescolaDeterministicaLocandine(locandine as any, idCategoria) as any;
            }

            return {
              idCategoria,
              category: String(x?.category || ''),
              locandine: locandine.length ? (locandine as any) : this.locandineDemo,
            };
          })
          .filter((r: any) => !!r.idCategoria);

        this.precaricaImmaginiRighe(nuoveRighe).then(() => {
          if (id !== this.idCicloRighe) return;

          const gia: Record<string, boolean> = {};
          for (const r of this.righeDemo) gia[String(r.idCategoria)] = true;
          const soloNuove = nuoveRighe.filter((r: any) => !gia[String(r.idCategoria)]);

          this.righeDemo.push(...soloNuove);
          this.offsetRighe += nuoveRighe.length;

          this.haAltreRighe = nuoveRighe.length === this.limiteRighe;
          if (!this.haAltreRighe) this.hoFinitoTutto = true;

          this.caricamentoRighe = false;

          this.sentinellaPronta = this.haAltreRighe && !this.hoFinitoTutto;

          if (!this.haAltreRighe) {
            try { this.osservatoreSentinella?.disconnect(); } catch {}
            this.osservatoreSentinella = null;
          }
        });
      });
  }

    gestisciScrollACategoria(idCategoria: string): void {
    const id = String(idCategoria || '').trim();
    if (!id) return;

    this.scorrimentoCatalogo.impostaSpinnerScroll(true);
    this.utenteHaScrollato = true;

    this.tokenScroll += 1;
    const token = this.tokenScroll;

    if (this.timerCaricaFino) {
      clearTimeout(this.timerCaricaFino);
      this.timerCaricaFino = 0;
    }

    this.caricaFinoACategoria(id, token).then((trovata: boolean) => {
      if (!trovata) {
        this.scorrimentoCatalogo.impostaSpinnerScroll(false);
        return;
      }

      requestAnimationFrame(() => {
        const el = document.getElementById('cat_' + id);
        if (!el) {
          this.scorrimentoCatalogo.impostaSpinnerScroll(false);
          return;
        }

        const rect = el.getBoundingClientRect();
        const y = (window.scrollY || 0) + rect.top - Math.floor(window.innerHeight * 0.65);
        this.scorrimentoCatalogo.impostaSpinnerScroll(false);
        this.servizioAnimazioni.scrollaA(y, 0.35);
        setTimeout(() => this.forzaControlloSentinella(), 380);
      });
    });
  }

  caricaFinoACategoria(idCategoria: string, token: number): Promise<boolean> {
    const id = String(idCategoria || '').trim();
    if (!id) return Promise.resolve(false);

    const gia = this.righeDemo.some((r) => String(r?.idCategoria) === id);
    if (gia) return Promise.resolve(true);
    if (!this.haAltreRighe) return Promise.resolve(false);

    const lingua = this.cambioLingua.leggiCodiceLingua();
    const tipo = this.tipoSelezionato;

    return new Promise<boolean>((resolve) => {
      let finito = false;
      const chiudi = (esito: boolean) => {
        if (finito) return;
        finito = true;
        if (this.timerCaricaFino) {
          clearTimeout(this.timerCaricaFino);
          this.timerCaricaFino = 0;
        }
        resolve(esito);
      };

      const caricaUnBlocco = () => {
        if (finito) return;
        if (token !== this.tokenScroll) return;

        const giaOra = this.righeDemo.some((r) => String(r?.idCategoria) === id);
        if (giaOra) return chiudi(true);
        if (!this.haAltreRighe) return chiudi(false);

        if (this.caricamentoRighe) {
          if (this.timerCaricaFino) clearTimeout(this.timerCaricaFino);
          this.timerCaricaFino = setTimeout(caricaUnBlocco, 50);
          return;
        }

        this.caricamentoRighe = true;
        const offset = this.offsetRighe;
        const limiteJump = this.limiteRighe;

        this.api
          .getCatalogoRighe(lingua, tipo, limiteJump, offset)
          .pipe(take(1))
          .subscribe({
            next: (ris: any) => {
              const items = Array.isArray(ris?.data?.items) ? ris.data.items : [];
                                     const nuoveRighe = items
                .map((x: any) => {
                  const idCategoriaRiga = String(x?.idCategoria || '');

                  let locandine = (Array.isArray(x?.locandine) ? x.locandine : [])
                    .map((p: any) => ({
                      src: String(p?.src || ''),
                      titolo: String(p?.titolo || ''),
                      sottotitolo: String(p?.sottotitolo || ''),
                    }))
                    .filter((p: any) => !!p.src);

                  if (this.tipoSelezionato === 'film_serie' && locandine.length) {
                    locandine = this.mescolaDeterministicaLocandine(locandine as any, idCategoriaRiga) as any;
                  }

                  return {
                    idCategoria: idCategoriaRiga,
                    category: String(x?.category || ''),
                    locandine: locandine.length ? (locandine as any) : this.locandineDemo,
                  };
                })
                .filter((x: any) => !!x.idCategoria);

              // durante il salto NON blocco: pre-carico in background, ma aggiorno subito DOM
              this.precaricaImmaginiRighe(nuoveRighe);

              // evita duplicati
              const giaMap: Record<string, boolean> = {};
              for (const r of this.righeDemo) giaMap[String(r.idCategoria)] = true;
              const soloNuove = nuoveRighe.filter((r: any) => !giaMap[String(r.idCategoria)]);

              this.righeDemo.push(...soloNuove);
              this.offsetRighe += nuoveRighe.length;

              this.haAltreRighe = nuoveRighe.length === limiteJump;
              if (!this.haAltreRighe) this.hoFinitoTutto = true;

              this.caricamentoRighe = false;

              try { (window as any).ScrollTrigger?.refresh?.(); } catch {}

              const trovataOra = this.righeDemo.some((r) => String(r?.idCategoria) === id);
              if (trovataOra) return chiudi(true);
              if (!this.haAltreRighe) return chiudi(false);
              if (this.timerCaricaFino) clearTimeout(this.timerCaricaFino);
              this.timerCaricaFino = setTimeout(caricaUnBlocco, 0);
            },
            error: () => {
              this.caricamentoRighe = false;
              this.haAltreRighe = false;
              this.hoFinitoTutto = true;
              this.scorrimentoCatalogo.impostaSpinnerScroll(false);
              chiudi(false);
            },
          });
      };

      caricaUnBlocco();
    });
  }

  forzaControlloSentinella(): void {
    if (!this.sentinellaPronta) return;
    if (!this.haAltreRighe) return;
    if (this.caricamentoRighe) return;

    const host = this.sentinella?.nativeElement as HTMLElement;
    if (!host) return;

   const r = host.getBoundingClientRect();
    const inVista = r.top <= window.innerHeight && r.bottom >= 0;
    if (!inVista) return;

    this.caricaAltreQuattroRigheDaApi();
  }
}
