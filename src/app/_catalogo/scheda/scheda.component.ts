import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from 'src/app/_servizi_globali/api.service';

 @Component({
   selector: 'app-scheda',
   templateUrl: './scheda.component.html',
   styleUrls: ['./scheda.component.scss']
 })

export class SchedaComponent implements OnInit {
  descrizione = '';
  tipoContenuto: 'film' | 'serie' | null = null;
  idContenuto: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((pm) => {
      const idRaw = pm.get('id');
      const id = idRaw ? Number(idRaw) : NaN;
      if (!idRaw || Number.isNaN(id)) return;

      this.idContenuto = id;
      this.tipoContenuto = this.leggiTipoDaUrl();

      if (this.tipoContenuto === 'film') {
        this.api.getFilm(id).subscribe((res) => {
          this.descrizione = String(res?.data?.descrizione || '');
        });
      }

      if (this.tipoContenuto === 'serie') {
        this.api.getSerie(id).subscribe((res) => {
          this.descrizione = String(res?.data?.descrizione || '');
        });
      }
    });
  }

  leggiTipoDaUrl(): 'film' | 'serie' | null {
    // esempi:
    // /it/catalogo/film/21
    // /en/catalog/movies/21
    // /it/catalogo/serie/1
    // /en/catalog/series/1
    const segments = this.route.snapshot.url.map((s) => s.path); // solo i segmenti di questa rotta
    // spesso qui avrai solo ['21'] quindi uso anche parent
    const parentSegs = this.route.parent?.snapshot.url.map((s) => s.path) || [];
    const all = [...parentSegs, ...segments].join('/');

    if (/(^|\/)(film|movies)(\/|$)/.test(all)) return 'film';
    if (/(^|\/)(serie|series)(\/|$)/.test(all)) return 'serie';
    return null;
  }
}
