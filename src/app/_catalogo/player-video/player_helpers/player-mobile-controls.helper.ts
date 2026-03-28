// ─── player-mobile-controls.helper.ts ────────────────────────────────────────
// Definisce e registra i pulsanti Play/Pause/SkipForward/SkipBackward mobile.
// Estratto dalla sezione `if (isMobile && controlBar)` di player-video.component.ts.

import videojs from 'video.js';

export class PlayerMobileControlsHelper {

  // ── Estratto dal blocco isMobile ──────────────────────────────────────────
  registra(player: any, controlBar: any, progressIndex: number): void {
    const Button = videojs.getComponent('Button') as any;

    class MobilePlayButton extends (Button as any) {
      constructor(p: any, options: any) {
        super(p, options);
        (this as any)['controlText']('Play');
        (this as any)['addClass']('vjs-mobile-play-button');
      }
      handleClick() { (this as any)['player_'].play(); }
    }

    class MobilePauseButton extends (Button as any) {
      constructor(p: any, options: any) {
        super(p, options);
        (this as any)['controlText']('Pause');
        (this as any)['addClass']('vjs-mobile-pause-button');
      }
      handleClick() { (this as any)['player_'].pause(); }
    }

    class MobileSkipForwardButton extends (Button as any) {
      constructor(p: any, options: any) {
        super(p, options);
        (this as any)['controlText']('Avanti');
        (this as any)['addClass']('vjs-mobile-skip-forward-button');
      }
      handleClick() {
        const p2 = (this as any)['player_'];
        p2.currentTime(p2.currentTime() + 10);
      }
    }

    class MobileSkipBackwardButton extends (Button as any) {
      constructor(p: any, options: any) {
        super(p, options);
        (this as any)['controlText']('Indietro');
        (this as any)['addClass']('vjs-mobile-skip-backward-button');
      }
      handleClick() {
        const p2 = (this as any)['player_'];
        p2.currentTime(Math.max(0, p2.currentTime() - 10));
      }
    }

    (videojs as any).registerComponent('MobilePlayButton',         MobilePlayButton         as any);
    (videojs as any).registerComponent('MobilePauseButton',        MobilePauseButton        as any);
    (videojs as any).registerComponent('MobileSkipForwardButton',  MobileSkipForwardButton  as any);
    (videojs as any).registerComponent('MobileSkipBackwardButton', MobileSkipBackwardButton as any);

    const mobilePlayButton  = new (MobilePlayButton  as any)(player, {});
    const mobilePauseButton = new (MobilePauseButton as any)(player, {});

    controlBar.addChild('MobileSkipBackwardButton', {}, progressIndex);
    controlBar.addChild('MobileSkipForwardButton',  {}, progressIndex + 1);

    if (player.paused()) {
      controlBar.addChild(mobilePlayButton,  {}, progressIndex + 2);
    } else {
      controlBar.addChild(mobilePauseButton, {}, progressIndex + 2);
    }

    player.on('play', () => {
      if (controlBar.children().includes(mobilePlayButton))
        controlBar.removeChild(mobilePlayButton);
      if (!controlBar.children().includes(mobilePauseButton))
        controlBar.addChild(mobilePauseButton, {}, progressIndex + 2);
    });

    player.on('pause', () => {
      if (controlBar.children().includes(mobilePauseButton))
        controlBar.removeChild(mobilePauseButton);
      if (!controlBar.children().includes(mobilePlayButton))
        controlBar.addChild(mobilePlayButton, {}, progressIndex + 2);
    });
  }
}
