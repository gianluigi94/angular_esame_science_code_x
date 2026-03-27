import { BarraAvanzamentoService } from 'src/app/_componenti_comuni/barra-avanzamento/barra-avanzamento.service';

export class CaroselloHoverTrailerUtility {
  static preparaTrailerHoverDopoImmaginePronta(contesto: any): void {
    const token = ++contesto.tokenHoverTrailer;

    if (contesto.timerMostraTrailerHover) {
      clearTimeout(contesto.timerMostraTrailerHover);
    }
    contesto.timerMostraTrailerHover = null;

    if (!contesto.player) {
      contesto.hoverTrailerInAttesa = true;
      return;
    }

    contesto.hoverTrailerInAttesa = false;

    const hoverValido =
      contesto.pausaPerHover &&
      (contesto.mostraImmagineHover || contesto.mostraVideo) &&
      contesto.immagineHoverPronta;

    if (!hoverValido) return;

    const onCanPlay = () => {
      if (token !== contesto.tokenHoverTrailer) return;

      const restante = contesto.mostraImmagineHover
        ? Math.max(
            0,
            contesto.MIN_MS_IMMAGINE_HOVER -
              (Date.now() - contesto.inizioImmagineHoverMs),
          )
        : 0;

      contesto.timerMostraTrailerHover = setTimeout(() => {
        if (token !== contesto.tokenHoverTrailer) return;
        if (!contesto.pausaPerHover) return;

        contesto.mostraVideo = true;
        contesto.verificaRicollegamentoVideo();
        contesto.inizializzaWebAudioSuVideoReale();

        try {
          if (
            contesto.contestoAudio &&
            contesto.contestoAudio.state === 'suspended'
          ) {
            contesto.contestoAudio.resume().catch(() => {});
          }
        } catch {}

        try {
          if (contesto.nodoGuadagno && contesto.contestoAudio) {
            const t0 = contesto.contestoAudio.currentTime;
            contesto.nodoGuadagno.gain.cancelScheduledValues(t0);
            contesto.nodoGuadagno.gain.setValueAtTime(0, t0);
          }
        } catch {}

        if (contesto.audioBloccatoDaUtente) contesto.impostaMuteReale(true);
        else contesto.impostaMuteReale(false);

        try {
          if (
            contesto.player &&
            typeof contesto.player.readyState === 'function' &&
            contesto.player.readyState() >= 1
          ) {
            contesto.player.currentTime(0);
          }
        } catch {}

        const preparaSbloccoHover = () => {
          if (contesto.audioBloccatoDaUtente) return;

          const onClick = () => {
            window.removeEventListener('click', onClick, true);
            if (token !== contesto.tokenHoverTrailer) return;
            if (!contesto.pausaPerHover) return;

            contesto.audioConsentito = true;

            try {
              contesto.mostraVideo = false;
            } catch {}
            try {
              contesto.mostraImmagineHover = true;
            } catch {}
            try {
              contesto.inizioImmagineHoverMs = Date.now();
            } catch {}
            try {
              if (
                contesto.contestoAudio &&
                contesto.contestoAudio.state === 'suspended'
              ) {
                contesto.contestoAudio.resume().catch(() => {});
              }
            } catch {}

            try {
              contesto.sfumaGuadagnoVerso(0, 0);
            } catch {}
            try {
              contesto.player.pause();
            } catch {}
            try {
              if (
                contesto.player &&
                typeof contesto.player.readyState === 'function' &&
                contesto.player.readyState() >= 1
              ) {
                contesto.player.currentTime(0);
              }
            } catch {}
            try {
              contesto.impostaMuteReale(false);
            } catch {}

            contesto.preparaTrailerHoverDopoImmaginePronta();
          };

          window.addEventListener('click', onClick, {
            once: true,
            passive: true,
            capture: true,
          });
        };

        try {
          const p = contesto.player.play();

          if (p && typeof p.then === 'function') {
            p.then(() => {
              try {
                const el = contesto.ottieniElementoVideoReale();
                if (el && !el.muted) contesto.audioConsentito = true;
              } catch {}

              if (!contesto.audioBloccatoDaUtente) {
                contesto.sfumaGuadagnoVerso(1, contesto.durataFadeAudioMs);
              }
            }).catch(() => {
              contesto.impostaMuteReale(true);
              try {
                contesto.player.play();
              } catch {}
              contesto.sfumaGuadagnoVerso(0, contesto.durataFadeAudioMs);
              preparaSbloccoHover();
            });
          } else {
            if (!contesto.audioBloccatoDaUtente) {
              contesto.audioConsentito = true;
              contesto.sfumaGuadagnoVerso(1, contesto.durataFadeAudioMs);
            } else {
              contesto.sfumaGuadagnoVerso(0, contesto.durataFadeAudioMs);
            }
          }
        } catch {
          contesto.impostaMuteReale(true);
          try {
            contesto.player.play();
          } catch {}
          contesto.sfumaGuadagnoVerso(0, contesto.durataFadeAudioMs);
          preparaSbloccoHover();
        }

        if (contesto.mostraImmagineHover) {
          requestAnimationFrame(() => {
            if (token !== contesto.tokenHoverTrailer) return;

            setTimeout(() => {
              if (token !== contesto.tokenHoverTrailer) return;
              contesto.mostraImmagineHover = false;
            }, 200);
          });
        }
      }, restante);
    };

    const avviaNuovoSrc = () => {
      if (token !== contesto.tokenHoverTrailer) return;

      try {
        contesto.player.off('canplay');
      } catch {}
      try {
        contesto.player.one('canplay', onCanPlay);
      } catch {}

      try {
        contesto.verificaRicollegamentoVideo();
        contesto.applicaAttributiVideoReale();

        contesto.player.src({
          src: contesto.trailerHoverProvvisorio,
          type: 'video/mp4',
        });
        contesto.player.load?.();

        contesto.barraAvanzamentoService.resetBarraAvanzamento();

        contesto.verificaRicollegamentoVideo();
        contesto.applicaAttributiVideoReale();
      } catch {
        return;
      }

      try {
        const rs =
          typeof contesto.player.readyState === 'function'
            ? contesto.player.readyState()
            : 0;
        if (rs >= 3) setTimeout(() => onCanPlay(), 0);
      } catch {}
    };

    contesto.sfumaGuadagnoVerso(0, contesto.durataFadeAudioMs).finally(() => {
      if (token !== contesto.tokenHoverTrailer) return;
      try {
        contesto.player.pause();
      } catch {}
      try {
        if (
          contesto.player &&
          typeof contesto.player.readyState === 'function' &&
          contesto.player.readyState() >= 1
        ) {
          contesto.player.currentTime(0);
        }
      } catch {}
      avviaNuovoSrc();
    });
  }
}
