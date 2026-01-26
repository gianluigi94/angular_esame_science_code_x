import { Component, OnDestroy, OnInit, AfterViewInit, ElementRef, QueryList, ViewChildren, HostListener } from '@angular/core';
import { Subscription, take, skip, distinctUntilChanged } from 'rxjs';
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
     this.tipoSelezionato = this.tipoContenuto.leggiTipo();
 this.forzaRottaCatalogoDaTipo();
 this.caricaQuattroRigheDaApi(0, false);

    this.sottoscrizioni.add(
      this.cambioLingua.cambioLinguaApplicata$.subscribe(() => {
        this.caricaQuattroRigheDaApi(0, false);
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
this.caricaQuattroRigheDaApi(id, true);
 }, 100);
 }



 caricaQuattroRigheDaApi(idForzato: number = 0, notificaTipoApplicato: boolean = false): void {
 const id = idForzato ? idForzato : ++this.idCicloRighe;
 const lingua = this.cambioLingua.leggiCodiceLingua(); // 'it' | 'en'
 const tipo = this.tipoSelezionato; // 'film' | 'serie' | 'film_serie'

 this.api
 .getCatalogoRighe(lingua, tipo, 4, 0)
 .pipe(take(1))
 .subscribe((ris: any) => {
 const items = Array.isArray(ris?.data?.items) ? ris.data.items : [];

 const nuoveRighe = items
 .map((x: any) => {
 const posters = (Array.isArray(x?.locandine) ? x.locandine : [])
 .map((p: any) => String(p?.src || ''))
 .filter((u: string) => !!u);

 return {
 idCategoria: String(x?.idCategoria || ''),
 category: String(x?.category || ''),
 posters: posters.length ? posters : this.locandineDemo,
 };
 })
 .filter((r: any) => !!r.idCategoria);

 this.precaricaImmaginiRighe(nuoveRighe).then(() => {
 if (id !== this.idCicloRighe) return;
 this.aggiornaRigheInPlace(nuoveRighe);

 if (notificaTipoApplicato) {
 this.tipoContenuto.notificaCambioTipoApplicato(this.tipoSelezionato, id);
 }
 });
 });
 }
}
