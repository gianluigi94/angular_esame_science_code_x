// Helper che registra i controlli mobile del player con pulsanti play, pausa, avanti e indietro nella control bar.

import videojs from 'video.js';

export class PlayerMobileControlsHelper {
  /**
   * Registra e inserisce nella control bar i pulsanti mobile del player.
   * - Recupera il componente base Button di Video.js
   * - Definisce i pulsanti custom play, pausa, avanti e indietro
   * - Registra i componenti custom in Video.js
   * - Inserisce i pulsanti nella control bar nelle posizioni richieste
   * - Tiene sincronizzato il pulsante play/pausa in base allo stato del player
   *
   * @param player Istanza del player Video.js.
   * @param controlBar Control bar del player su cui inserire i pulsanti mobile.
   * @param progressIndex Indice di riferimento vicino alla progress bar per il posizionamento dei pulsanti.
   * @returns void
   */
  registra(player: any, controlBar: any, progressIndex: number): void {
    const Button = videojs.getComponent('Button') as any; // recupero il componente base Button di Video.js

    class MobilePlayButton extends (Button as any) {
      /**
       * Costruisce il pulsante mobile di play.
       *
       * @param p Istanza player passata da Video.js.
       * @param options Opzioni del componente.
       * @returns void
       */
      constructor(p: any, options: any) {
        super(p, options); // inizializzo il componente base Button
        (this as any)['controlText']('Play'); // imposto il testo accessibile del pulsante play
        (this as any)['addClass']('vjs-mobile-play-button'); // aggiungo la classe CSS del pulsante play mobile
      }

      /**
       * Gestisce il click sul pulsante play.
       *
       * @returns void
       */
      handleClick() {
        (this as any)['player_'].play(); // faccio partire la riproduzione del player
      }
    }

    class MobilePauseButton extends (Button as any) {
      /**
       * Costruisce il pulsante mobile di pausa.
       *
       * @param p Istanza player passata da Video.js.
       * @param options Opzioni del componente.
       * @returns void
       */
      constructor(p: any, options: any) {
        super(p, options); // inizializzo il componente base Button
        (this as any)['controlText']('Pause'); // imposto il testo accessibile del pulsante pausa
        (this as any)['addClass']('vjs-mobile-pause-button'); // aggiungo la classe CSS del pulsante pausa mobile
      }

      /**
       * Gestisce il click sul pulsante pausa.
       *
       * @returns void
       */
      handleClick() {
        (this as any)['player_'].pause(); // metto in pausa il player
      }
    }

    class MobileSkipForwardButton extends (Button as any) {
      /**
       * Costruisce il pulsante mobile di salto in avanti.
       *
       * @param p Istanza player passata da Video.js.
       * @param options Opzioni del componente.
       * @returns void
       */
      constructor(p: any, options: any) {
        super(p, options); // inizializzo il componente base Button
        (this as any)['controlText']('Avanti'); // imposto il testo accessibile del pulsante avanti
        (this as any)['addClass']('vjs-mobile-skip-forward-button'); // aggiungo la classe CSS del pulsante avanti mobile
      }

      /**
       * Gestisce il click sul pulsante di salto in avanti.
       *
       * @returns void
       */
      handleClick() {
        const p2 = (this as any)['player_']; // recupero il player associato al pulsante
        p2.currentTime(p2.currentTime() + 10); // sposto la riproduzione avanti di 10 secondi
      }
    }

    class MobileSkipBackwardButton extends (Button as any) {
      /**
       * Costruisce il pulsante mobile di salto indietro.
       *
       * @param p Istanza player passata da Video.js.
       * @param options Opzioni del componente.
       * @returns void
       */
      constructor(p: any, options: any) {
        super(p, options); // inizializzo il componente base Button
        (this as any)['controlText']('Indietro'); // imposto il testo accessibile del pulsante indietro
        (this as any)['addClass']('vjs-mobile-skip-backward-button'); // aggiungo la classe CSS del pulsante indietro mobile
      }

      /**
       * Gestisce il click sul pulsante di salto indietro.
       *
       * @returns void
       */
      handleClick() {
        const p2 = (this as any)['player_']; // recupero il player associato al pulsante
        p2.currentTime(Math.max(0, p2.currentTime() - 10)); // porto la riproduzione indietro di 10 secondi senza scendere sotto zero
      }
    }

    (videojs as any).registerComponent('MobilePlayButton', MobilePlayButton as any); // registro in Video.js il componente custom del play mobile
    (videojs as any).registerComponent('MobilePauseButton', MobilePauseButton as any); // registro in Video.js il componente custom della pausa mobile
    (videojs as any).registerComponent('MobileSkipForwardButton', MobileSkipForwardButton as any); // registro in Video.js il componente custom del salto avanti mobile
    (videojs as any).registerComponent('MobileSkipBackwardButton', MobileSkipBackwardButton as any); // registro in Video.js il componente custom del salto indietro mobile

    const mobilePlayButton = new (MobilePlayButton as any)(player, {}); // creo l'istanza del pulsante play mobile
    const mobilePauseButton = new (MobilePauseButton as any)(player, {}); // creo l'istanza del pulsante pausa mobile

    controlBar.addChild('MobileSkipBackwardButton', {}, progressIndex); // inserisco il pulsante indietro nella control bar alla posizione richiesta
    controlBar.addChild('MobileSkipForwardButton', {}, progressIndex + 1); // inserisco il pulsante avanti nella control bar subito dopo

    if (player.paused()) {
      controlBar.addChild(mobilePlayButton, {}, progressIndex + 2); // se il player e' in pausa inserisco il pulsante play
    } else {
      controlBar.addChild(mobilePauseButton, {}, progressIndex + 2); // altrimenti inserisco il pulsante pausa
    }

    player.on('play', () => {
      // quando il player entra in play riallineo il pulsante centrale alla pausa
      if (controlBar.children().includes(mobilePlayButton))
        controlBar.removeChild(mobilePlayButton); // se il pulsante play e' presente lo rimuovo
      if (!controlBar.children().includes(mobilePauseButton))
        controlBar.addChild(mobilePauseButton, {}, progressIndex + 2); // se il pulsante pausa manca lo aggiungo
    });

    player.on('pause', () => {
      // quando il player entra in pausa riallineo il pulsante centrale al play
      if (controlBar.children().includes(mobilePauseButton))
        controlBar.removeChild(mobilePauseButton); // se il pulsante pausa e' presente lo rimuovo
      if (!controlBar.children().includes(mobilePlayButton))
        controlBar.addChild(mobilePlayButton, {}, progressIndex + 2); // se il pulsante play manca lo aggiungo
    });
  }
}
