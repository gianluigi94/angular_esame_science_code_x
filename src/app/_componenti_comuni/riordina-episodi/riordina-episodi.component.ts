import { Component, OnDestroy } from '@angular/core';
import { forkJoin, map, Observable, take } from 'rxjs';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { ToastService } from 'src/app/_servizi_globali/toast.service';

interface EpisodioRiordino {
  chiave: string;
  titolo: string;
}

interface StagioneRiordino {
  idStagione: number;
  episodi: EpisodioRiordino[];
}

@Component({
  selector: 'app-riordina-episodi',
  templateUrl: './riordina-episodi.component.html',
  styleUrls: ['./riordina-episodi.component.scss'],
})
export class RiordinaEpisodiComponent implements OnDestroy {
  visibile = false;
  caricamento = false;
  salvataggioInCorso = false;
  idSerie: number | null = null;
  stagioni: StagioneRiordino[] = [];

  private trascinato: { stagione: number; episodio: number } | null = null;

  private readonly onApri = (evento: Event) => {
    const dettaglio = (evento as CustomEvent).detail;
    const id = Number(dettaglio?.id);
    if (!id) return;
    this.apri(id);
  };

  constructor(
    private api: ApiService,
    private cambioLingua: CambioLinguaService,
    private toast: ToastService,
  ) {
    window.addEventListener('apri-riordina-episodi-lazy', this.onApri);
  }

  ngOnDestroy(): void {
    window.removeEventListener('apri-riordina-episodi-lazy', this.onApri);
  }

  get isIt(): boolean {
    return this.cambioLingua.leggiCodiceLingua() === 'it';
  }

  private apri(idSerie: number): void {
    this.idSerie = idSerie;
    this.visibile = true;
    this.caricamento = true;
    this.stagioni = [];

    const lingua = this.cambioLingua.leggiCodiceLingua();

    this.api.getStagioni(idSerie).pipe(take(1)).subscribe({
      next: (ritStagioni) => {
        const righeStagioni = this.righeDa(ritStagioni.data);
        const stagioniOrdinate = [...righeStagioni].sort(
          (a, b) => this.numeroStagioneDa(a) - this.numeroStagioneDa(b),
        );

        if (!stagioniOrdinate.length) {
          this.stagioni = [];
          this.caricamento = false;
          return;
        }

        forkJoin(stagioniOrdinate.map((s) => this.caricaStagione(s, lingua)))
          .pipe(take(1))
          .subscribe({
            next: (stagioni) => {
              this.stagioni = stagioni;
              this.caricamento = false;
            },
            error: () => {
              this.caricamento = false;
              this.toast.errore(this.isIt ? 'Errore nel caricamento degli episodi.' : 'Error loading episodes.');
            },
          });
      },
      error: () => {
        this.caricamento = false;
        this.toast.errore(this.isIt ? 'Errore nel caricamento delle stagioni.' : 'Error loading seasons.');
      },
    });
  }

  private caricaStagione(s: any, lingua: string): Observable<StagioneRiordino> {
    const idStagione = this.idStagioneDa(s);
    return forkJoin({
      episodi: this.api.getEpisodi(idStagione).pipe(take(1)),
      traduzioni: this.api.getEpisodiTraduzioni(idStagione, lingua).pipe(take(1)),
    }).pipe(
      map(({ episodi, traduzioni }) => {
        const righeEpisodi = this.righeDa(episodi.data);
        const righeTraduzioni = this.righeDa(traduzioni.data);
        const mappaTitoli = new Map<number, string>();
        for (const t of righeTraduzioni) {
          mappaTitoli.set(this.idEpisodioDa(t), this.titoloDa(t));
        }
        const episodiOrdinati = [...righeEpisodi]
          .sort((a, b) => this.numeroEpisodioDa(a) - this.numeroEpisodioDa(b))
          .map((e) => ({
            chiave: this.chiaveDa(e),
            titolo: mappaTitoli.get(this.idEpisodioDa(e)) || '',
          }));
        return { idStagione, episodi: episodiOrdinati };
      }),
    );
  }

  onInizioTrascinamento(e: { stagione: number; episodio: number }): void {
    this.trascinato = e;
  }

  onRilascio(e: { stagione: number; episodio: number }): void {
    if (!this.trascinato) return;
    const destinazione = this.stagioni[e.stagione];
    const fine = e.episodio < 0 ? (destinazione ? destinazione.episodi.length : 0) : e.episodio;
    this.spostaEpisodio(this.trascinato.stagione, this.trascinato.episodio, e.stagione, fine);
    this.trascinato = null;
  }

  private spostaEpisodio(srcS: number, srcE: number, dstS: number, dstE: number): void {
    const sorgente = this.stagioni[srcS];
    const destinazione = this.stagioni[dstS];
    if (!sorgente || !destinazione) return;
    const [episodio] = sorgente.episodi.splice(srcE, 1);
    if (!episodio) return;
    let indice = dstE;
    if (srcS === dstS && srcE < dstE) indice = indice - 1;
    if (indice < 0) indice = 0;
    if (indice > destinazione.episodi.length) indice = destinazione.episodi.length;
    destinazione.episodi.splice(indice, 0, episodio);
  }

  salva(): void {
    if (this.salvataggioInCorso || this.idSerie == null) return;
    this.salvataggioInCorso = true;
    const stagioni = this.stagioni.map((s) => ({
      idStagione: s.idStagione,
      episodi: s.episodi.map((e) => e.chiave),
    }));
    this.api.riordinaEpisodi(this.idSerie, stagioni).pipe(take(1)).subscribe({
      next: () => {
        this.toast.successo(this.isIt ? 'Ordine episodi aggiornato.' : 'Episode order updated.');
        this.visibile = false;
        this.salvataggioInCorso = false;
        setTimeout(() => {
          window.location.href = window.location.href;
        }, 500);
      },
      error: () => {
        this.salvataggioInCorso = false;
        this.toast.errore(this.isIt ? 'Errore durante il riordino.' : 'Error while reordering.');
      },
    });
  }

  chiudi(): void {
    if (this.salvataggioInCorso) return;
    this.visibile = false;
    this.trascinato = null;
  }

  private righeDa(data: any): any[] {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.stagioni)) return data.stagioni;
    if (Array.isArray(data?.episodi)) return data.episodi;
    if (Array.isArray(data?.traduzioni)) return data.traduzioni;
    return [];
  }

  private numeroStagioneDa(s: any): number {
    return Number(s?.numero_stagione ?? s?.numeroStagione ?? 0);
  }

  private idStagioneDa(s: any): number {
    return Number(s?.id_stagione ?? s?.idStagione ?? 0);
  }

  private numeroEpisodioDa(e: any): number {
    return Number(e?.numero_episodio ?? e?.numeroEpisodio ?? 0);
  }

  private idEpisodioDa(e: any): number {
    return Number(e?.id_episodio ?? e?.idEpisodio ?? 0);
  }

  private chiaveDa(e: any): string {
    return String(e?.chiave_archivio ?? e?.chiaveArchivio ?? '');
  }

  private titoloDa(t: any): string {
    return String(t?.titolo ?? '');
  }
}
