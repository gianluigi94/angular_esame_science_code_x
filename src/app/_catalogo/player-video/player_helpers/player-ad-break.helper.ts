// Helper che gestisce tutta la logica degli ad break del player, inclusi rilevamento utente, accumulo del tempo di visione, avvio della pubblicita', ripresa del contenuto e pulizia finale.

import { take } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { BarraAvanzamentoService } from 'src/app/_componenti_comuni/barra-avanzamento/barra-avanzamento.service';
import { PlayerStateContext } from '../player_utility/player-state.context';
import { PlayerAudioService } from '../player_service/player-audio.service';

export class PlayerAdBreakHelper {
  adInCorso = false; // flag che mi dice se in questo momento e' in corso un ad break
  intervallo_ad_s = 20; // ogni quanti secondi di visione effettiva devo far partire una pubblicita'

  private tempoVisioneAccumulato = 0; // secondi di visione validi del contenuto principale
  private ultimoCurrentTime = -1; // l'ultimo currentTime visto per calcolare il delta al timeupdate successivo
  private tempoRitornoDopoAd = 0; // tengo il punto del contenuto da cui riprendere dopo la pubblicita'
  private _vedePublicita: boolean | null = null; // memoizzo qui se l'utente deve vedere pubblicita' oppure no

  private adVideoEl: HTMLVideoElement | null = null; // tengo il riferimento al tag video creato dinamicamente per la pubblicita'
  private adTimeUpdateHandler: any = null; // l'handler del timeupdate della pubblicita' per poterlo rimuovere dopo
  private adLoadedMetadataHandler: any = null; // l'handler del loadedmetadata della pubblicita' per poterlo rimuovere dopo

  constructor(
    private ctx: PlayerStateContext,
    private audio: PlayerAudioService,
    private api: ApiService,
    private barraAvanzamentoService: BarraAvanzamentoService,
    private translate: TranslateService,
    private getBarraAdEl: () => HTMLElement | undefined,
  ) {}

  /**
   * Verifica se l'utente corrente deve visualizzare la pubblicita'.
   * - Riutilizza un eventuale valore gia' calcolato in precedenza
   * - Prova a leggere i dati auth da localStorage o sessionStorage
   * - Controlla la presenza dell'abilitazione specifica all'interno del payload auth
   * - In caso di errore o assenza dati restituisce false
   *
   * @returns boolean True se l'utente deve vedere pubblicita', false altrimenti.
   */
  utenteVedePublicita(): boolean {
    if (this._vedePublicita !== null) return this._vedePublicita; // se ho gia' calcolato il valore in precedenza lo riuso subito

    try {
      const authRaw =
        localStorage.getItem('auth') ?? sessionStorage.getItem('auth'); // provo a leggere i dati auth da localStorage oppure da sessionStorage
      if (authRaw) {
        const auth = JSON.parse(authRaw); // provo a fare il parse del payload auth
        const abilita: number[] = auth?.abilita ?? []; // estraggo in modo sicuro l'array delle abilitazioni
        this._vedePublicita = abilita.includes(3); // salvo se tra le abilitazioni e' presente quella che richiede la pubblicita'
        return this._vedePublicita; // restituisco il valore appena calcolato
      }

      this._vedePublicita = false; // se non ho trovato auth considero che l'utente non debba vedere pubblicita'
      return false; // restituisco false come fallback
    } catch {
      this._vedePublicita = false; // se qualcosa fallisce nel parsing o nella lettura salvo false come valore sicuro
      return false; // restituisco false in caso di errore
    }
  }

  /**
   * Gestisce il timeupdate del contenuto principale per decidere se avviare un ad break.
   * - Ignora l'aggiornamento se la pubblicita' e' gia' in corso
   * - Ignora l'aggiornamento se l'avvio del player non e' consentito
   * - Ignora l'aggiornamento se l'utente non deve vedere pubblicita'
   * - Accumula solo delta positivi e realistici di visione
   * - Quando raggiunge la soglia prevista avvia un nuovo ad break
   *
   * @returns void
   */
  gestisciTimeUpdate(): void {
    if (this.adInCorso) return; // se una pubblicita' e' gia' in corso non devo accumulare tempo del contenuto
    if (!this.ctx.avvioConsentito) return; // se l'avvio del player non e' consentito non faccio nulla
    if (!this.utenteVedePublicita()) return; // se l'utente non deve vedere pubblicita' esco subito

    const ct = Number(this.ctx.player?.currentTime?.() ?? 0); // leggo il currentTime corrente del contenuto principale
    if (this.ultimoCurrentTime >= 0) {
      const delta = ct - this.ultimoCurrentTime; // calcolo il delta rispetto all'ultimo currentTime visto
      if (delta > 0 && delta < 2) this.tempoVisioneAccumulato += delta; // accumulo solo avanzamenti positivi piccoli, evitando salti anomali
    }
    this.ultimoCurrentTime = ct; // aggiorno l'ultimo currentTime noto con quello appena letto

    if (this.tempoVisioneAccumulato >= this.intervallo_ad_s) {
      this.tempoVisioneAccumulato = 0; // quando raggiungo la soglia azzero l'accumulatore
      this.avviaAdBreak(); // avvio il blocco pubblicitario
    }
  }

  /**
   * Avvia un nuovo ad break sopra il player principale.
   * - Evita avvii doppi se una pubblicita' e' gia' in corso
   * - Recupera l'id della prossima pubblicita' dal backend
   * - Costruisce l'URL della pubblicita' in base alla lingua video corrente
   * - Crea il tag video pubblicitario e collega barra e listener
   * - Attende che la pubblicita' sia almeno caricabile prima di interrompere il film
   * - Ferma il contenuto principale, mostra il video ad e ne avvia la riproduzione
   *
   * @returns Promise<void>
   */
  async avviaAdBreak(): Promise<void> {
    if (this.adInCorso) return; // se una pubblicita' e' gia' in corso non ne avvio un'altra
    this.adInCorso = true; // segno subito che l'ad break e' in corso

    let idPubblicita = 1; // preparo un id pubblicita' di fallback
    try {
      const res = await this.api
        .getProssimaPublicita()
        .pipe(take(1))
        .toPromise(); // provo a chiedere al backend quale pubblicita' mostrare
      idPubblicita = res?.data?.id_pubblicita ?? 1; // uso l'id ricevuto oppure tengo il fallback
    } catch {} // se la chiamata fallisce continuo col fallback senza interrompere il flusso

    const lingua =
      localStorage.getItem('video_lingua') === 'italiano' ? 'it' : 'en'; // ricavo la lingua video corrente per costruire l'URL della pubblicita'
    const urlAd = `https://d2kd3i5q9rl184.cloudfront.net/media/med_${idPubblicita}_${lingua}.mp4`; // costruisco l'URL completo della pubblicita' da riprodurre

    this.adVideoEl = document.createElement('video'); // creo dinamicamente il tag video che usero' per la pubblicita'
    this.adVideoEl.style.cssText = `
      position: absolute; inset: 0; width: 100%; height: 100%;
      z-index: 100; background: #000; object-fit: contain; visibility: hidden;
    `; // imposto gli stili inline del video pubblicitario per sovrapporlo al player
    this.adVideoEl.playsInline = true; // abilito la riproduzione inline del video pubblicitario
    this.adVideoEl.volume = 1; // imposto il volume del video pubblicitario a 1
    this.adVideoEl.muted = false; // mi assicuro che il video pubblicitario non parta mutato
    this.adVideoEl.preload = 'auto'; // chiedo al browser di precaricare automaticamente il video pubblicitario
    this.adVideoEl.src = urlAd; // assegno al video pubblicitario la sorgente dell'ad break

    this.barraAvanzamentoService.resetBarraAvanzamento(); // resetto la barra di avanzamento prima di collegarla al video ad
    this.adLoadedMetadataHandler = () =>
      this.barraAvanzamentoService.aggiornaBarraDaValori(
        0,
        Number(this.adVideoEl?.duration ?? 0),
      ); // preparo l'handler che inizializza la barra quando arrivano i metadata
    this.adTimeUpdateHandler = () =>
      this.barraAvanzamentoService.aggiornaBarraDaValori(
        Number(this.adVideoEl?.currentTime ?? 0),
        Number(this.adVideoEl?.duration ?? 0),
      ); // preparo l'handler che aggiorna la barra durante la riproduzione dell'ad

    this.adVideoEl.addEventListener(
      'loadedmetadata',
      this.adLoadedMetadataHandler,
    ); // collego l'handler dei metadata del video pubblicitario
    this.adVideoEl.addEventListener('timeupdate', this.adTimeUpdateHandler); // collego l'handler del timeupdate del video pubblicitario

    const playerEl = this.ctx.player?.el?.() as HTMLElement; // recupero l'elemento root del player principale
    playerEl.appendChild(this.adVideoEl); // inserisco il video pubblicitario dentro il player

    let adCaricato = false; // preparo un flag che mi dira' se l'ad e' diventato almeno riproducibile
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 4000); // imposto un timeout massimo di attesa del buffer dell'ad
      this.adVideoEl!.addEventListener(
        'canplay',
        () => {
          adCaricato = true; // se arriva canplay considero l'ad correttamente caricato
          clearTimeout(timeout); // annullo il timeout di attesa
          resolve(); // risolvo l'attesa
        },
        { once: true },
      );
      this.adVideoEl!.addEventListener(
        'error',
        () => {
          clearTimeout(timeout); // se arriva errore annullo il timeout di attesa
          resolve(); // risolvo comunque l'attesa lasciando adCaricato a false
        },
        { once: true },
      );
      this.adVideoEl!.load(); // avvio esplicitamente il caricamento del video pubblicitario
    });

    if (!adCaricato) {
      this.adVideoEl?.remove(); // se l'ad non si e' caricato rimuovo il tag video creato
      this.adVideoEl = null; // azzero il riferimento al video pubblicitario
      this.adInCorso = false; // tolgo il flag di ad in corso
      return; // esco senza interrompere il contenuto principale
    }

    const playerElRoot = this.ctx.player?.el?.() as HTMLElement | null; // recupero di nuovo il root del player principale
    playerElRoot?.classList.add('ad-in-corso'); // aggiungo una classe CSS che segnala lo stato di ad in corso
    await this.audio.fadeGainTo(0, this.audio.FADE_PAUSA_MS); // faccio il fade-out dell'audio del contenuto principale
    this.tempoRitornoDopoAd = Number(this.ctx.player?.currentTime?.() ?? 0); // salvo il punto esatto da cui riprendere il contenuto dopo l'ad
    this.ctx.playInterno = true; // segno che sto per eseguire una pausa interna controllata
    try {
      this.ctx.originalPause?.();
    } catch {} // provo a mettere in pausa il contenuto principale senza bloccare il flusso
    this.ctx.playInterno = false; // ripristino il flag di play interno

    this.adVideoEl.style.visibility = 'visible'; // rendo visibile il video pubblicitario solo dopo avere fermato il contenuto principale

    const adLabel = document.createElement('div'); // creo l'etichetta testuale che segnala la pubblicita'
    adLabel.id = 'ad-label'; // assegno un id fisso all'etichetta pubblicitaria
    adLabel.textContent = this.translate.instant('ui.videojs.ad_label'); // traduco e assegno il testo dell'etichetta pubblicitaria
    playerEl.appendChild(adLabel); // inserisco l'etichetta pubblicitaria dentro il player

    const barraEl = this.getBarraAdEl(); // recupero l'elemento della barra dedicata all'ad se disponibile
    if (barraEl) playerEl.appendChild(barraEl); // se la barra esiste la inserisco nel player

    this.adVideoEl.addEventListener('ended', () => this.riprendiDopoAd()); // quando l'ad finisce avvio la ripresa del contenuto
    this.adVideoEl.addEventListener('error', () => this.riprendiDopoAd()); // se l'ad va in errore provo comunque a riprendere il contenuto
    this.adVideoEl.play().catch(() => this.riprendiDopoAd()); // provo ad avviare l'ad e, se fallisce, torno al contenuto
  }

  /**
   * Gestisce la fine del video principale quando un ad break e' ancora in corso.
   *
   * @returns void
   */
  gestisciFineVideo(): void {
    if (this.adInCorso) this.riprendiDopoAd(); // se il video principale finisce mentre l'ad e' in corso forzo la ripresa/pulizia dell'ad
  }

  /**
   * Ripristina il contenuto principale dopo la fine o l'errore della pubblicita'.
   * - Rimuove listener e tag video pubblicitario
   * - Resetta barra ed elementi grafici collegati all'ad
   * - Ripristina i flag interni e il currentTime del contenuto principale
   * - Riavvia il player originale e fa rientrare l'audio con fade-in
   *
   * @returns Promise<void>
   */
  async riprendiDopoAd(): Promise<void> {
    if (this.adVideoEl) {
      if (this.adLoadedMetadataHandler)
        this.adVideoEl.removeEventListener(
          'loadedmetadata',
          this.adLoadedMetadataHandler,
        ); // se presente rimuovo l'handler dei metadata dal video pubblicitario
      if (this.adTimeUpdateHandler)
        this.adVideoEl.removeEventListener(
          'timeupdate',
          this.adTimeUpdateHandler,
        ); // se presente rimuovo l'handler del timeupdate dal video pubblicitario
      this.adVideoEl.pause(); // metto in pausa il video pubblicitario prima di rimuoverlo
      this.adVideoEl.remove(); // rimuovo il video pubblicitario dal DOM
      this.adVideoEl = null; // azzero il riferimento al video pubblicitario
    }

    this.adLoadedMetadataHandler = null; // azzero il riferimento all'handler dei metadata dell'ad
    this.adTimeUpdateHandler = null; // azzero il riferimento all'handler del timeupdate dell'ad
    this.barraAvanzamentoService.resetBarraAvanzamento(); // resetto la barra di avanzamento dopo la fine della pubblicita'
    document.getElementById('ad-label')?.remove(); // rimuovo l'etichetta DOM della pubblicita' se presente
    this.getBarraAdEl()?.remove(); // rimuovo anche l'eventuale barra DOM dedicata all'ad

    this.adInCorso = false; // tolgo il flag di ad in corso
    this.ultimoCurrentTime = -1; // resetto l'ultimo currentTime per ripartire pulito con il tracciamento del contenuto
    const playerElRoot = this.ctx.player?.el?.() as HTMLElement | null; // recupero il root del player principale
    playerElRoot?.classList.remove('ad-in-corso'); // rimuovo la classe CSS che segnala l'ad in corso

    try {
      this.ctx.player?.currentTime?.(this.tempoRitornoDopoAd);
    } catch {} // provo a riportare il contenuto principale al punto salvato prima dell'ad
    this.ctx.playInterno = true; // segno che sto per eseguire una play interna controllata
    try {
      await Promise.resolve(this.ctx.originalPlay?.());
    } catch {} // provo a far ripartire il contenuto principale senza bloccare il flusso in caso di errore
    this.ctx.playInterno = false; // ripristino il flag di play interno
    await this.audio.fadeGainTo(1, this.audio.FADE_PLAY_MS); // faccio rientrare gradualmente l'audio del contenuto principale
  }

  /**
   * Esegue la pulizia finale dell'helper.
   * - Rimuove gli eventuali listener ancora agganciati al video pubblicitario
   * - Resetta la barra di avanzamento collegata all'ad
   *
   * @returns void
   */
  destroy(): void {
    if (this.adVideoEl) {
      if (this.adLoadedMetadataHandler)
        this.adVideoEl.removeEventListener(
          'loadedmetadata',
          this.adLoadedMetadataHandler,
        ); // se presente rimuovo l'handler dei metadata dal video ad
      if (this.adTimeUpdateHandler)
        this.adVideoEl.removeEventListener(
          'timeupdate',
          this.adTimeUpdateHandler,
        ); // se presente rimuovo l'handler del timeupdate dal video ad
    }
    this.barraAvanzamentoService.resetBarraAvanzamento(); // resetto la barra di avanzamento come pulizia finale dell'helper
  }
}
