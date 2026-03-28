// ─── header-categorie.helper.ts ──────────────────────────────────────────────
// Carica le voci del menu categorie dall'API.
// Estratto da header.component.ts.

import { forkJoin }    from 'rxjs';
import { take }        from 'rxjs/operators';
import { ApiService }  from 'src/app/_servizi_globali/api.service';

export class HeaderCategorieHelper {

  voci:           Array<{ idCategoria: string; codice: string; label: string }> = [];
  inCaricamento = false;

  constructor(
    private api:    ApiService,
    private isIt:   () => boolean,
  ) {}

  // ── Estratto da caricaCategorieMenu() ─────────────────────────────────────
  carica(): void {
    if (this.inCaricamento) return;
    this.inCaricamento = true;

    forkJoin([
      this.api.getCategorieCatalogo().pipe(take(1)),
      this.api.getCategorieTraduzioni().pipe(take(1)),
    ]).subscribe({
      next: ([categorie, traduzioni]) => {
        const listaCategorie = Array.isArray((categorie as any)?.data?.items)
          ? (categorie as any).data.items
          : Array.isArray((categorie as any)?.data) ? (categorie as any).data : [];

        const listaTraduzioni = Array.isArray((traduzioni as any)?.data?.items)
          ? (traduzioni as any).data.items
          : Array.isArray((traduzioni as any)?.data) ? (traduzioni as any).data : [];

        const idLingua = this.isIt() ? 1 : 2;
        const mappaNome: Record<string, string> = {};
        for (const tr of listaTraduzioni) {
          if (String(tr?.id_lingua) !== String(idLingua)) continue;
          const idCat = String(tr?.id_categoria || '');
          const nome  = String(tr?.nome || '');
          if (idCat && nome) mappaNome[idCat] = nome;
        }

        const voci: Array<{ idCategoria: string; codice: string; label: string }> = [];
        for (const c of listaCategorie) {
          const idCategoria = String(c?.id_categoria || c?.idCategoria || '');
          const codice      = String(c?.codice || c?.code || '');
          if (!idCategoria) continue;
          voci.push({ idCategoria, codice, label: mappaNome[idCategoria] || codice || idCategoria });
        }

        this.voci           = voci;
        this.inCaricamento  = false;
      },
      error: () => {
        this.voci          = [];
        this.inCaricamento = false;
      },
    });
  }
}
