import { firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';
import { CaroselloGettersUtility } from './carosello-getters.utility';

export class CaroselloNavigazioneUtility {
  static async vaiAllaSchedaCorrente(contesto: any): Promise<void> {
    const indiceReale = CaroselloGettersUtility.getIndiceRealeZeroBased(contesto);
    const descrizione = contesto.descrizioni[indiceReale];
    if (!descrizione) return;

    const info = contesto.mappaNovitaCorrente[descrizione];
    if (!info?.tipo || !info?.id_media) return;

    const tipo = info.tipo;
    const id = info.id_media;
    const lingua = contesto.cambioLinguaService.leggiCodiceLingua();

    const baseCatalogo = lingua === 'it' ? '/it/catalogo' : '/en/catalog';
    const fogliaFilm = lingua === 'it' ? '/film' : '/movies';
    const fogliaSerie = lingua === 'it' ? '/serie' : '/series';
    const fogliaUrl = tipo === 'serie' ? fogliaSerie : fogliaFilm;
    const url = baseCatalogo + fogliaUrl + '/' + id;

    const slug = String(descrizione).replace(/^(film|serie)\./, '').trim();
    const urlSfondo = `assets/carosello_locandine/carosello_${slug}.webp`;
    const urlImgTitolo = `assets/titoli_${lingua}/titolo_${lingua}_${slug}.webp`;

    const caricaImmagine = (src: string): Promise<void> =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = src;
      });

    const traduzioni$ =
      tipo === 'film'
        ? contesto.api.getFilmTraduzioni(id, lingua)
        : contesto.api.getSerieTraduzioni(id, lingua);

    const tabella$ =
      tipo === 'film'
        ? contesto.api.getFilm(id)
        : contesto.api.getSerie(id);

    const [_sfondo, tradRes, tabellaRes] = await Promise.all([
      caricaImmagine(urlSfondo),
      firstValueFrom(traduzioni$.pipe(take(1))).catch(() => null),
      firstValueFrom(tabella$.pipe(take(1))).catch(() => null),
    ]);

    const descrizioneTestuale = String((tradRes as any)?.data?.descrizione || '');
    const tabellaDati = (tabellaRes as any)?.data ?? null;

    await contesto.stopVideoGlobale.richiediSoloFadeAudio(350).catch(() => {});

    contesto.router.navigateByUrl(url, {
      state: { urlSfondo, urlImgTitolo, descrizioneTestuale, tabellaDati },
    });
  }
}
