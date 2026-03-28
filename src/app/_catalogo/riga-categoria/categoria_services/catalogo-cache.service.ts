import { Injectable } from '@angular/core';
import { TipoContenuto } from './tipo-contenuto.service';

@Injectable({ providedIn: 'root' })
export class CatalogoCacheService {
  righeDemo: any[] = [];
  offsetRighe = 0;
  haAltreRighe = true;
  hoFinitoTutto = false;
  tipo: TipoContenuto = 'film_serie';
  lingua = 'it';
  scrollY = 0;

  valida(lingua: string, tipo: TipoContenuto): boolean {
    return this.righeDemo.length > 0 && this.lingua === lingua && this.tipo === tipo;
  }

  svuota(): void {
    this.righeDemo = [];
    this.offsetRighe = 0;
    this.haAltreRighe = true;
    this.hoFinitoTutto = false;
    this.scrollY = 0;
  }
}
