// Helper che registra il menu qualita' del player sulla control bar e aggiorna lo stato selezionato delle varie voci.

import videojs from 'video.js';
import { TranslateService } from '@ngx-translate/core';
import { PlayerStateContext } from '../player_utility/player-state.context';
import { PlayerAudioService } from '../player_service/player-audio.service';

export class PlayerQualityMenuHelper {
  constructor(
    private ctx: PlayerStateContext,
    private audio: PlayerAudioService,
    private translate: TranslateService,
    private onFreezeShow: (p: any) => void,
    private onFreezeHide: () => void,
    private onAggiornaSottotitoli: () => void,
  ) {}

  /**
   * Registra il pulsante del menu qualita' nella control bar del player.
   * - Recupera i componenti base MenuButton e MenuItem di Video.js
   * - Definisce la voce custom del menu qualita'
   * - Definisce il pulsante custom del menu qualita'
   * - Registra il componente custom in Video.js
   * - Aggiunge il pulsante alla control bar
   *
   * @param controlBar Control bar del player su cui inserire il menu qualita'.
   * @returns void
   */
  registra(controlBar: any): void {
    const MenuButton = videojs.getComponent('MenuButton') as any; // recupero il componente base MenuButton di Video.js
    const MenuItem = videojs.getComponent('MenuItem') as any; // recupero il componente base MenuItem di Video.js
    const self = this; // mi salvo il riferimento all'istanza helper per usarlo dentro le classi interne

    const QualityMenuItem = class extends (MenuItem as any) {
      private tipo: 'auto' | '1080' | '720' | '360'; // tipo di qualita' rappresentato da questa voce
      private label: string; // etichetta visuale della voce di menu

      /**
       * Costruisce una singola voce del menu qualita'.
       *
       * @param player Istanza player passata da Video.js.
       * @param options Opzioni della voce, incluse label e tipo.
       * @returns void
       */
      constructor(player: any, options: any) {
        super(player, options); // inizializzo il componente base MenuItem
        this.tipo = options.tipo; // salvo il tipo di qualita' associato alla voce
        this.label = options.label; // salvo l'etichetta visuale della voce
        (this as any)['addClass']('vjs-quality-menu-item'); // aggiungo la classe CSS custom della voce qualita'
        (this as any)['updateLabel'](); // aggiorno subito lo stato visuale iniziale della voce
      }

      /**
       * Gestisce il click su una voce del menu qualita'.
       * - Salva tempo corrente e stato play/pausa
       * - Ricava l'URL dello stream corrispondente al tipo selezionato
       * - Fa fade-out audio e mostra il freeze
       * - Cambia la sorgente del player
       * - Ripristina tempo, stato di riproduzione e sottotitoli
       * - Aggiorna lo stato visuale di tutte le voci del menu
       *
       * @returns Promise<void>
       */
      async handleClick() {
        const p = (this as any)['player_']; // recupero il player associato alla voce cliccata
        const currentTime = p.currentTime(); // salvo il tempo corrente del player prima del cambio qualita'
        const isPaused = p.paused(); // mi salvo se il player era in pausa prima del cambio qualita'
        const url = self.urlPerTipo(this.tipo); // ricavo l'URL dello stream per il tipo selezionato
        if (!url) return; // se non trovo una URL valida esco senza fare nulla

        await Promise.resolve(self.audio.audioCtx?.resume?.()).catch(() => {}); // provo a riattivare il contesto audio prima del cambio
        await self.audio.fadeGainTo(0, self.audio.FADE_PAUSA_MS); // porto l'audio a zero prima di cambiare sorgente
        self.onFreezeShow(p); // mostro il freeze del player durante il cambio qualita'
        p.src({ src: url, type: 'application/x-mpegURL' }); // imposto la nuova sorgente HLS sul player

        const rimuoviFreeze = () => {
          self.onFreezeHide(); // nascondo il freeze appena il player torna in stato utile oppure va in errore
          p.off('loadeddata', rimuoviFreeze); // rimuovo il listener di loadeddata dopo il primo uso
          p.off('error', rimuoviFreeze); // rimuovo il listener di error dopo il primo uso
        };

        p.on('loadeddata', rimuoviFreeze); // aggancio la rimozione freeze quando arrivano i dati caricati
        p.on('error', rimuoviFreeze); // aggancio la rimozione freeze anche in caso di errore

        p.ready(() => {
          p.currentTime(currentTime); // ripristino il tempo del player dopo il cambio sorgente
          if (!isPaused) p.play(); // se prima non era in pausa faccio ripartire la riproduzione
          self.onAggiornaSottotitoli(); // aggiorno i sottotitoli dopo il cambio qualita'
        });

        const items =
          p.getChild('ControlBar')?.getChild('QualityMenuButton')?.menu?.children?.() || []; // recupero tutte le voci del menu qualita'
        items.forEach((item: any) => item?.updateLabel?.()); // aggiorno lo stato visuale di tutte le voci del menu
      }

      /**
       * Aggiorna l'etichetta e lo stato selezionato della voce qualita'.
       * - Legge la sorgente corrente del player
       * - Confronta la sorgente con quella del tipo della voce
       * - Applica o rimuove la classe di selezione
       * - Reimposta il contenuto HTML della voce con la label prevista
       *
       * @returns void
       */
      updateLabel() {
        const p = (this as any)['player_']; // recupero il player associato alla voce
        const currentSrc = p.currentSource?.()?.src || ''; // leggo la sorgente corrente del player
        const urlCorrente = self.urlPerTipo(this.tipo); // ricavo la URL corrispondente al tipo di questa voce
        const selected = !!urlCorrente && currentSrc.includes(urlCorrente); // verifico se questa voce corrisponde alla sorgente attuale
        const el = (this as any)['el']() as HTMLElement; // recupero l'elemento DOM della voce
        el.classList.toggle('vjs-selected', selected); // aggiorno la classe CSS che segnala la voce selezionata
        el.innerHTML = this.label; // reimposto il contenuto visuale della voce usando la label prevista
      }
    };

    const QualityMenuButton = class extends (MenuButton as any) {
      /**
       * Costruisce il pulsante del menu qualita'.
       *
       * @param player Istanza player passata da Video.js.
       * @param options Opzioni del componente.
       * @returns void
       */
      constructor(player: any, options: any) {
        super(player, options); // inizializzo il componente base MenuButton
        (this as any)['addClass']('vjs-quality-menu-button'); // aggiungo la classe CSS custom del pulsante qualita'
        const el = (this as any)['el']?.(); // recupero l'elemento DOM del pulsante
        if (el) {
          el.classList.add('vjs-icon-placeholder'); // aggiungo la classe placeholder per l'icona del pulsante
          el.setAttribute('title', self.translate.instant('ui.videojs.quality')); // imposto il titolo localizzato del pulsante qualita'
          const span = document.createElement('span'); // creo lo span che conterra' l'etichetta visuale del pulsante
          span.className = 'vjs-quality-label'; // assegno la classe CSS allo span etichetta
          el.appendChild(span); // aggiungo lo span dentro il pulsante
        }
      }

      /**
       * Crea le voci del menu qualita'.
       *
       * @returns any[] Elenco delle voci del menu qualita'.
       */
      createItems() {
        return [
          { label: 'Auto', tipo: 'auto' as const },
          { label: '1080p', tipo: '1080' as const },
          { label: '720p', tipo: '720' as const },
          { label: '360p', tipo: '360' as const },
        ].map((q) => new (QualityMenuItem as any)((this as any)['player_'], q)); // creo le varie voci del menu qualita' partendo dalla configurazione fissa
      }
    };

    (videojs as any).registerComponent('QualityMenuButton', QualityMenuButton as any); // registro in Video.js il componente custom del pulsante qualita'
    controlBar?.addChild('QualityMenuButton', {}); // aggiungo il pulsante qualita' alla control bar se disponibile
  }

  /**
   * Aggiorna lo stato visuale delle voci del menu qualita' gia' presenti sul player.
   * - Recupera il pulsante qualita' nella control bar
   * - Legge le sue voci di menu
   * - Chiede a ogni voce di aggiornare il proprio stato visuale
   *
   * @param player Istanza del player Video.js.
   * @returns void
   */
  aggiornaVociMenuQualita(player: any): void {
    try {
      const items =
        player?.getChild?.('ControlBar')
          ?.getChild?.('QualityMenuButton')
          ?.menu?.children?.() || []; // recupero le voci attuali del menu qualita' del player
      items.forEach((it: any) => it.updateLabel?.()); // aggiorno lo stato visuale di ogni voce del menu
    } catch {} // ignoro eventuali errori di lookup del menu qualita'
  }

  /**
   * Restituisce l'URL dello stream associato a un tipo di qualita'.
   *
   * @param tipo Tipo di qualita' richiesto.
   * @returns string URL dello stream corrispondente al tipo richiesto.
   */
  private urlPerTipo(tipo: 'auto' | '1080' | '720' | '360'): string {
    switch (tipo) {
      case 'auto':
        return this.ctx.URL_MASTER; // per auto restituisco la master playlist
      case '1080':
        return this.ctx.URL_1080; // per 1080 restituisco l'URL 1080p
      case '720':
        return this.ctx.URL_720; // per 720 restituisco l'URL 720p
      case '360':
        return this.ctx.URL_360; // per 360 restituisco l'URL 360p
    }
  }
}
