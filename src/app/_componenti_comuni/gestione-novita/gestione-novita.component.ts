import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { forkJoin, take } from 'rxjs';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { Authservice } from 'src/app/_benvenuto/login/_login_service/auth.service';

@Component({
  selector: 'app-gestione-novita',
  templateUrl: './gestione-novita.component.html',
  styleUrls: ['./gestione-novita.component.scss'],
})
export class GestioneNovitaComponent implements OnInit {
  @Output() chiudi = new EventEmitter<void>();

  caricamento = false;
  salvataggioNovitaInCorso = false;
  listaFilm: { id: number; nome: string; novita: boolean; novitaIniziale: boolean }[] = [];
  listaSerie: { id: number; nome: string; novita: boolean; novitaIniziale: boolean }[] = [];

  constructor(
    private api: ApiService,
    private authService: Authservice,
  ) {}

  ngOnInit(): void {
    this.caricaDati();
  }

  get isAmministratore(): boolean {
    const id = this.authService.leggiObsAuth().value?.idRuolo;
    return id === 4 || id === 7;
  }

  pulisciNome(descrizione: string): string {
    const s = (descrizione || '')
      .trim()
      .replace(/^film\./i, '')
      .replace(/^serie\./i, '')
      .replace(/_/g, ' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  private caricaDati(): void {
    if (!this.isAmministratore) {
      this.chiudi.emit();
      return;
    }
    this.caricamento = true;
    forkJoin([this.api.getElencoFilm(), this.api.getElencoSerie()])
      .pipe(take(1))
      .subscribe({
        next: ([rispFilm, rispSerie]) => {
          const film = (rispFilm.data as any[]) || [];
          const serie = (rispSerie.data as any[]) || [];
          this.listaFilm = film.map((f) => ({
            id: Number(f.id_film),
            nome: this.pulisciNome(f.descrizione || ''),
            novita: !!f.novita,
            novitaIniziale: !!f.novita,
          }));
          this.listaSerie = serie.map((s) => ({
            id: Number(s.id_serie),
            nome: this.pulisciNome(s.descrizione || ''),
            novita: !!s.novita,
            novitaIniziale: !!s.novita,
          }));
          this.caricamento = false;
        },
        error: () => {
          this.caricamento = false;
          this.chiudi.emit();
        },
      });
  }

  chiudiModale(): void {
    if (this.salvataggioNovitaInCorso) return;
    this.chiudi.emit();
  }

  salvaNovita(): void {
    if (this.salvataggioNovitaInCorso) return;
    if (!this.isAmministratore) return;

    const cambiati: { tipo: 'film' | 'serie'; id: number; novita: boolean }[] = [];
    for (const f of this.listaFilm) {
      if (f.novita !== f.novitaIniziale) {
        cambiati.push({ tipo: 'film', id: f.id, novita: f.novita });
      }
    }
    for (const s of this.listaSerie) {
      if (s.novita !== s.novitaIniziale) {
        cambiati.push({ tipo: 'serie', id: s.id, novita: s.novita });
      }
    }

    if (cambiati.length === 0) {
      this.chiudi.emit();
      return;
    }

    this.salvataggioNovitaInCorso = true;
    forkJoin(cambiati.map((c) => this.api.impostaNovitaMedia(c.tipo, c.id, c.novita)))
      .pipe(take(1))
      .subscribe({
        next: () => {
          window.location.reload();
        },
        error: () => {
          this.salvataggioNovitaInCorso = false;
        },
      });
  }
}
