import { Component, OnDestroy, OnInit, AfterViewInit, ElementRef, QueryList, ViewChildren, HostListener } from '@angular/core';
import { forkJoin, Subscription, take } from 'rxjs';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { TipoContenuto, TipoContenutoService } from '../app-riga-categoria/categoria_services/tipo-contenuto.service';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { AnimazioniScomparsaService } from 'src/app/_catalogo/app-riga-categoria/categoria_services/animazioni-scomparsa.service';


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
    public servizioAnimazioni: AnimazioniScomparsaService
  ) {}
   tickResetPagine = 0;
 timerCambioTipo: any = 0;
  sottoscrizioni = new Subscription();
  idCicloRighe = 0;
  categorieDb: any[] = [];
  categorieTraduzioniDb: any[] = [];
  categorieLocandineDb: any[] = [];
  locandinaDemo = 'assets/locandine_it/locandina_it_abbraccia_il_vento.webp';

    locandineDemo: string[] = [
    this.locandinaDemo,
    this.locandinaDemo,
    this.locandinaDemo,
    this.locandinaDemo,
    this.locandinaDemo,
    this.locandinaDemo,
    this.locandinaDemo,
    this.locandinaDemo,
  ];

     righeDemo: { idCategoria: string; category: string; posters: string[] }[] = [];
    tipoSelezionato: TipoContenuto = 'film_serie';



  @ViewChildren('rigaCatalogo', { read: ElementRef })
  righeCatalogo!: QueryList<ElementRef>;

  ngAfterViewInit(): void {
    this.servizioAnimazioni.inizializzaAnimazioni(this.righeCatalogo);
    this.righeCatalogo.changes.subscribe(() => {
      this.servizioAnimazioni.inizializzaAnimazioni(this.righeCatalogo);
    });
  }

  @HostListener('wheel', ['$event'])
  gestisciRotellina(evento: WheelEvent): void {
    this.servizioAnimazioni.gestisciWheel(evento);
  }

  ngOnInit(): void {
    this.caricaCategorieDaDb();
    this.forzaRottaCatalogoDaTipo();

    this.sottoscrizioni.add(
      this.cambioLingua.cambioLinguaApplicata$.subscribe(() => {
        this.ricostruisciRighe();
      })
    );
        this.sottoscrizioni.add(
      this.tipoContenuto.tipoSelezionato$.subscribe((tipo) => {
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
  }

  caricaCategorieDaDb(): void {
    forkJoin({
      c: this.api.getCategorieCatalogo().pipe(take(1)),
      t: this.api.getCategorieTraduzioni().pipe(take(1)),
      l: this.api.getCategorieLocandine().pipe(take(1)),
    }).subscribe(({ c, t, l }) => {
      this.categorieDb = Array.isArray((c as any)?.data) ? (c as any).data : [];
      this.categorieTraduzioniDb = Array.isArray((t as any)?.data) ? (t as any).data : [];
      this.categorieLocandineDb = Array.isArray((l as any)?.data) ? (l as any).data : [];
      this.ricostruisciRighe();
    });
  }

   ricostruisciRighe(idForzato: number = 0, notificaTipoApplicato: boolean = false): void {
 const id = idForzato ? idForzato : ++this.idCicloRighe;
    const codiceLingua = this.cambioLingua.leggiCodiceLingua(); // 'it' | 'en'
    const mappaNome = this.costruisciMappaNomeCategorie(codiceLingua);
    const mappaLocandine = this.costruisciMappaLocandineCategorie(codiceLingua, this.tipoSelezionato);

       const categorieFiltrate = this.filtraCategoriePerTipo(this.categorieDb || [], mappaLocandine, this.tipoSelezionato);

    const nuoveRighe = categorieFiltrate.map((cat: any) => {
      const idCategoria = cat?.id_categoria;
      const codice = String(cat?.codice || '');
      const nome = mappaNome[idCategoria] || codice;
            const posters = mappaLocandine[String(idCategoria)] || [];
      return { idCategoria: String(idCategoria), category: nome, posters: posters.length ? posters : this.locandineDemo };
    });


 this.precaricaImmaginiRighe(nuoveRighe).then(() => {
 if (id !== this.idCicloRighe) return;
 this.aggiornaRigheInPlace(nuoveRighe);

  // notifico "applicato": le righe faranno lo SCOPRI dopo il minimo
 if (notificaTipoApplicato) {
 this.tipoContenuto.notificaCambioTipoApplicato(this.tipoSelezionato, id);
 }
 });
  }

  costruisciMappaNomeCategorie(codiceLingua: string): Record<string, string> {
    const mappa: Record<string, string> = {};
    const idLingua = this.idLinguaDaCodice(codiceLingua);

    for (const tr of (this.categorieTraduzioniDb || [])) {
      if (String(tr?.id_lingua) !== String(idLingua)) continue;
      const idCategoria = String(tr?.id_categoria || '');
      const nome = String(tr?.nome || '');
      if (idCategoria && nome) mappa[idCategoria] = nome;
    }
    return mappa;
  }

  idLinguaDaCodice(codiceLingua: string): number {
    return codiceLingua === 'it' ? 1 : 2;
  }


  costruisciMappaLocandineCategorie(codiceLingua: string, tipo: TipoContenuto): Record<string, string[]> {
    const raccolta: Record<string, Array<{ slug: string; tipo: string; idContenuto: string }>> = {};

    for (const r of (this.categorieLocandineDb || [])) {
      if (String(r?.lingua) !== String(codiceLingua)) continue;
      if (tipo !== 'film_serie' && String(r?.tipo) !== String(tipo)) continue;

      const idCategoria = String(r?.id_categoria || '');
      const slug = String(r?.slug || '');
      const tipoRiga = String(r?.tipo || '');
      const idContenuto = String(r?.id_contenuto || '');
      if (!idCategoria || !slug) continue;

      if (!raccolta[idCategoria]) raccolta[idCategoria] = [];
      raccolta[idCategoria].push({ slug, tipo: tipoRiga, idContenuto });
    }

    const mappa: Record<string, string[]> = {};
    for (const idCategoria of Object.keys(raccolta)) {
      const lista = raccolta[idCategoria];

      if (tipo === 'film_serie') {
        lista.sort((a, b) => {
          const ka = this.chiaveShuffleDeterministica(idCategoria, a.tipo, a.idContenuto);
          const kb = this.chiaveShuffleDeterministica(idCategoria, b.tipo, b.idContenuto);
          return ka - kb;
        });
      }

      mappa[idCategoria] = lista.map(x => this.costruisciUrlLocandina(codiceLingua, x.slug));
    }

    return mappa;
  }



  tracciaRigaCategoria(_indice: number, riga: { idCategoria: string }): string {
    return riga.idCategoria;
  }


    filtraCategoriePerTipo(
    categorie: any[],
    mappaLocandine: Record<string, string[]>,
    tipo: TipoContenuto
  ): any[] {
    if (tipo === 'film_serie') return categorie;
    // tengo solo le categorie che hanno almeno una locandina per quel tipo
    return categorie.filter((cat: any) => {
      const idCategoria = String(cat?.id_categoria || '');
      return !!(idCategoria && mappaLocandine[idCategoria] && mappaLocandine[idCategoria].length);
    });
  }



  calcolaHash32(testo: string): number {
    // FNV-1a 32-bit (deterministico)
    let h = 2166136261;
    for (let i = 0; i < testo.length; i++) {
      h ^= testo.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  chiaveShuffleDeterministica(idCategoria: string, tipo: string, idContenuto: string): number {
    return this.calcolaHash32(idCategoria + '|' + tipo + '|' + idContenuto);
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

    costruisciUrlLocandina(codiceLingua: string, slug: string): string {
    return `assets/locandine_${codiceLingua}/locandina_${codiceLingua}_${slug}.webp`;
  }

   precaricaImmaginiRighe(
 righe: { posters: string[] }[],
 ): Promise<void> {
 const urls: string[] = [];
 for (const r of righe || []) {
 for (const u of r.posters || []) {
 const s = String(u || '');
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

 aggiornaRigheInPlace(
 nuoveRighe: { idCategoria: string; category: string; posters: string[] }[],
 ): void {
 const mappaEsistenti: Record<string, any> = {};
 for (const r of this.righeDemo || [])
 mappaEsistenti[String(r.idCategoria)] = r;

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

 // IMPORTANT: tengo lo stesso array reference
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

 // 1) COPRO SUBITO
 this.tipoContenuto.notificaCambioTipoAvviato(this.tipoSelezionato, id);

 // 2) DOPO TOT aggiorno righe (ma la copertura rimane)
 this.timerCambioTipo = setTimeout(() => {
 this.timerCambioTipo = 0;
 this.ricostruisciRighe(id, true);
 }, 100);
 }
}
