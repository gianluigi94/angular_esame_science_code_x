// utility che gestisce la preparazione e l'avvio del trailer hover, aspettando che l'immagine hover sia pronta e coordinando cover, player, audio, fade e possibili blocchi del browser

export class CaroselloHoverTrailerUtility {
  /**
   * Prepara e avvia il trailer hover solo quando l'immagine hover e' pronta e il contesto e' ancora valido.
   * - Invalida eventuali avvii trailer hover precedenti
   * - Aspetta che il player sia disponibile
   * - Verifica che l'hover sia ancora attivo e coerente
   * - Carica il nuovo src trailer hover e aspetta canplay
   * - Gestisce autoplay con audio, fallback mutato e sblocco su click se necessario
   * - Nasconde la cover hover dopo l'avvio del trailer
   *
   * @param contesto any Contesto del carosello che contiene stato, player, audio e metodi pubblici utili.
   * @returns void
   */
  static preparaTrailerHoverDopoImmaginePronta(contesto: any): void {
    const token = ++contesto.tokenHoverTrailer; // genero un nuovo token per invalidare eventuali avvii trailer hover precedenti

    if (contesto.timerMostraTrailerHover) {
      clearTimeout(contesto.timerMostraTrailerHover);
    } // se esiste gia' un timer di avvio trailer hover lo cancello subito
    contesto.timerMostraTrailerHover = null; // azzero il riferimento al timer trailer hover

    if (!contesto.player) {
      contesto.hoverTrailerInAttesa = true;
      return;
    } // se il player non e' ancora pronto segno che il trailer hover resta in attesa e mi fermo

    contesto.hoverTrailerInAttesa = false; // se il player esiste tolgo lo stato di attesa del trailer hover

    const hoverValido =
      contesto.pausaPerHover &&
      (contesto.mostraImmagineHover || contesto.mostraVideo) &&
      contesto.immagineHoverPronta; // verifico che l'hover sia ancora attivo, che ci sia cover o video visibile e che l'immagine hover sia pronta

    if (!hoverValido) return; // se l'hover non e' piu' valido esco senza fare altro

    const onCanPlay = () => {
      // preparo la logica da eseguire quando il nuovo trailer hover risulta pronto a partire
      if (token !== contesto.tokenHoverTrailer) return; // se il token non coincide piu' ignoro questo avvio vecchio

      const restante = contesto.mostraImmagineHover
        ? Math.max(
            0,
            contesto.MIN_MS_IMMAGINE_HOVER -
              (Date.now() - contesto.inizioImmagineHoverMs),
          )
        : 0; // calcolo per quanto tempo devo ancora tenere visibile la cover hover prima di mostrare il trailer

      contesto.timerMostraTrailerHover = setTimeout(() => {
        // pianifico la vera partenza del trailer hover dopo il tempo minimo della cover
        if (token !== contesto.tokenHoverTrailer) return; // se il token non coincide piu' ignoro questo avvio vecchio
        if (!contesto.pausaPerHover) return; // se l'hover non e' piu' attivo non avvio piu' nulla

        contesto.mostraVideo = true; // rendo visibile il player video
        contesto.verificaRicollegamentoVideo(); // verifico se devo ricollegare il vero elemento video
        contesto.inizializzaWebAudioSuVideoReale(); // mi assicuro che WebAudio sia inizializzato sul video reale

        try {
          if (
            contesto.contestoAudio &&
            contesto.contestoAudio.state === 'suspended'
          ) {
            contesto.contestoAudio.resume().catch(() => {});
          }
        } catch {} // se il contesto audio e' sospeso provo a riattivarlo

        try {
          if (contesto.nodoGuadagno && contesto.contestoAudio) {
            const t0 = contesto.contestoAudio.currentTime; // leggo il tempo corrente del contesto audio
            contesto.nodoGuadagno.gain.cancelScheduledValues(t0); // cancello eventuali automazioni precedenti del gain
            contesto.nodoGuadagno.gain.setValueAtTime(0, t0); // imposto subito il gain a zero per partire senza colpi audio
          }
        } catch {} // provo a preparare il gain audio iniziale a zero senza rompere il flusso

        if (contesto.audioBloccatoDaUtente) contesto.impostaMuteReale(true);
        else contesto.impostaMuteReale(false); // se l'audio e' bloccato dall'utente tengo il video mutato, altrimenti tolgo il mute reale

        try {
          if (
            contesto.player &&
            typeof contesto.player.readyState === 'function' &&
            contesto.player.readyState() >= 1
          ) {
            contesto.player.currentTime(0);
          }
        } catch {} // se il player e' pronto riporto il trailer hover all'inizio prima del play

        const preparaSbloccoHover = () => {
          // preparo una logica di sblocco su click da usare se il browser rifiuta l'autoplay con audio
          if (contesto.audioBloccatoDaUtente) return; // se l'audio e' bloccato dall'utente non preparo nessuno sblocco automatico

          const onClick = () => {
            // questo handler verra' eseguito al primo click utile dell'utente
            window.removeEventListener('click', onClick, true); // rimuovo subito il listener per non farlo scattare piu' volte
            if (token !== contesto.tokenHoverTrailer) return; // se il token non coincide piu' ignoro questo sblocco vecchio
            if (!contesto.pausaPerHover) return; // se non sono piu' in hover non faccio ripartire nulla

            contesto.audioConsentito = true; // segno che ora l'audio puo' essere considerato consentito

            try {
              contesto.mostraVideo = false;
            } catch {} // nascondo il player per fare un riavvio pulito in stile click utente
            try {
              contesto.mostraImmagineHover = true;
            } catch {} // mostro di nuovo la cover hover durante la ripartenza pulita
            try {
              contesto.inizioImmagineHoverMs = Date.now();
            } catch {} // salvo il nuovo momento di inizio cover hover
            try {
              if (
                contesto.contestoAudio &&
                contesto.contestoAudio.state === 'suspended'
              ) {
                contesto.contestoAudio.resume().catch(() => {});
              }
            } catch {} // se il contesto audio e' ancora sospeso provo a riattivarlo dopo il click

            try {
              contesto.sfumaGuadagnoVerso(0, 0);
            } catch {} // porto subito il gain a zero per evitare colpi audio
            try {
              contesto.player.pause();
            } catch {} // provo a mettere in pausa il player prima del riavvio
            try {
              if (
                contesto.player &&
                typeof contesto.player.readyState === 'function' &&
                contesto.player.readyState() >= 1
              ) {
                contesto.player.currentTime(0);
              }
            } catch {} // se il player e' pronto riporto il trailer all'inizio
            try {
              contesto.impostaMuteReale(false);
            } catch {} // tolgo il mute reale per il nuovo tentativo con audio sbloccato dal click

            contesto.preparaTrailerHoverDopoImmaginePronta(); // rilancio tutta la procedura hover adesso che ho avuto una gesture valida
          };

          window.addEventListener('click', onClick, {
            once: true,
            passive: true,
            capture: true,
          }); // registro un listener che scatti al primo click utile dell'utente
        };

        try {
          const p = contesto.player.play(); // provo ad avviare il trailer hover

          if (p && typeof p.then === 'function') {
            // entro qui se il play restituisce una promise compatibile con autoplay policy moderne
            p.then(() => {
              // entro qui se il player parte correttamente
              try {
                const el = contesto.ottieniElementoVideoReale(); // recupero il vero elemento video attualmente usato
                if (el && !el.muted) contesto.audioConsentito = true;
              } catch {} // se il video non e' mutato segno che l'audio e' effettivamente consentito

              if (!contesto.audioBloccatoDaUtente) {
                contesto.sfumaGuadagnoVerso(1, contesto.durataFadeAudioMs);
              } // se l'utente non ha bloccato l'audio faccio rientrare gradualmente il volume
            }).catch(() => {
              // entro qui se l'autoplay con audio viene rifiutato dal browser
              contesto.impostaMuteReale(true); // metto il video in mute come fallback
              try {
                contesto.player.play();
              } catch {} // provo a far ripartire il player in mute
              contesto.sfumaGuadagnoVerso(0, contesto.durataFadeAudioMs); // tengo il gain a zero durante il fallback mutato
              preparaSbloccoHover(); // preparo lo sblocco su click per un futuro tentativo con audio
            });
          } else {
            // entro qui se play non restituisce una promise standard
            if (!contesto.audioBloccatoDaUtente) {
              contesto.audioConsentito = true; // considero l'audio consentito in questo scenario semplice
              contesto.sfumaGuadagnoVerso(1, contesto.durataFadeAudioMs); // faccio rientrare gradualmente il volume
            } else {
              contesto.sfumaGuadagnoVerso(0, contesto.durataFadeAudioMs); // se l'utente blocca l'audio tengo il gain a zero
            }
          }
        } catch {
          // entro qui se play lancia direttamente un errore
          contesto.impostaMuteReale(true); // vado in fallback mutato
          try {
            contesto.player.play();
          } catch {} // provo comunque a far partire il player in mute
          contesto.sfumaGuadagnoVerso(0, contesto.durataFadeAudioMs); // tengo il gain a zero nel fallback
          preparaSbloccoHover(); // preparo lo sblocco su click per un nuovo tentativo
        }

        if (contesto.mostraImmagineHover) {
          // se la cover hover e' ancora visibile pianifico la sua scomparsa poco dopo l'avvio del trailer
          requestAnimationFrame(() => {
            // aspetto almeno un frame per evitare cambi troppo bruschi
            if (token !== contesto.tokenHoverTrailer) return; // se il token non coincide piu' ignoro questa operazione vecchia

            setTimeout(() => {
              // aggiungo anche un piccolo ritardo visivo prima di togliere la cover
              if (token !== contesto.tokenHoverTrailer) return; // se il token non coincide piu' ignoro questa operazione vecchia
              contesto.mostraImmagineHover = false; // nascondo la cover hover lasciando visibile solo il trailer
            }, 200);
          });
        }
      }, restante); // faccio partire il timer rispettando il tempo minimo di permanenza della cover hover
    };

    const avviaNuovoSrc = () => {
      // preparo e carico il nuovo src del trailer hover
      if (token !== contesto.tokenHoverTrailer) return; // se il token non coincide piu' ignoro questo avvio vecchio

      try {
        contesto.player.off('canplay');
      } catch {} // provo a rimuovere eventuali vecchi listener canplay rimasti attivi
      try {
        contesto.player.one('canplay', onCanPlay);
      } catch {} // registro il listener one-shot che gestira' l'avvio quando il trailer sara' pronto

      try {
        contesto.verificaRicollegamentoVideo(); // verifico se il player ha sostituito il vero elemento video
        contesto.applicaAttributiVideoReale(); // riapplico gli attributi necessari al video reale

        contesto.player.src({
          src: contesto.trailerHoverProvvisorio,
          type: 'video/mp4',
        }); // imposto il nuovo trailer hover come sorgente del player
        contesto.player.load?.(); // se disponibile forzo il caricamento della nuova sorgente

        contesto.barraAvanzamentoService.resetBarraAvanzamento(); // resetto la barra di avanzamento per il nuovo trailer

        contesto.verificaRicollegamentoVideo(); // ricontrollo il ricollegamento del vero video dopo il cambio sorgente
        contesto.applicaAttributiVideoReale(); // riapplico gli attributi al video reale anche dopo il load
      } catch {
        return;
      } // se qualcosa fallisce durante il cambio src mi fermo senza continuare

      try {
        const rs =
          typeof contesto.player.readyState === 'function'
            ? contesto.player.readyState()
            : 0; // leggo il readyState attuale del player se disponibile
        if (rs >= 3) setTimeout(() => onCanPlay(), 0); // se il trailer e' gia' abbastanza pronto richiamo subito onCanPlay senza aspettare l'evento
      } catch {} // provo a fare questo avvio rapido senza bloccare il flusso in caso di errore
    };

    contesto.sfumaGuadagnoVerso(0, contesto.durataFadeAudioMs).finally(() => {
      // prima di cambiare trailer hover porto sempre l'audio a zero con uno stop dolce
      if (token !== contesto.tokenHoverTrailer) return; // se il token non coincide piu' ignoro questa sequenza vecchia
      try {
        contesto.player.pause();
      } catch {} // provo a mettere in pausa il player corrente
      try {
        if (
          contesto.player &&
          typeof contesto.player.readyState === 'function' &&
          contesto.player.readyState() >= 1
        ) {
          contesto.player.currentTime(0);
        }
      } catch {} // se il player e' pronto provo a riportarlo all'inizio
      avviaNuovoSrc(); // dopo lo stop dolce carico e preparo il nuovo trailer hover
    });
  }
}
