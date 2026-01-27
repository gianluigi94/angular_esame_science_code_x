// Utility che mantiene coerente lo 'stato di scorrimento' del carosello, coordinando cambio slide, autoscroll e persistenza dell’indice.

export class CaroselloScrollStateUtility {

/**
 * Avvia un cambio slide assicurando fade-out audio e stop/reset del video prima di completare la transizione.
 *
 * Se il player non e' disponibile esegue direttamente l'azione di scorrimento.
 * Altrimenti:
 * - nasconde il video
 * - annulla avvii pendenti
 * - avvia il fade-out audio
 * - esegue l'azione di scorrimento
 * - al termine del fade mette in pausa e resetta il player
 *
 * @param ctx Contesto del componente/carousel
 * @param azioneScorrimento Funzione che esegue lo scorrimento effettivo (avanti/indietro/selezione)
 * @returns void
 */
  static avviaCambioSlideConFade(ctx: any, azioneScorrimento: () => void): void { // Avvio un cambio slide assicurandomi di fare fade-out audio e stop video
    if (!ctx.player) { // se dovessi avere problemi con il player..
      azioneScorrimento(); // Eseguo direttamente l'azione di scorrimento
      return; // Esco per evitare logica video
    }

    ctx.mostraVideo = false; // Nascondo subito il video mentre cambio slide
    ctx.fermaAvvioPendete(); // Annullo eventuali avvii trailer pendenti

    const fade = ctx.sfumaGuadagnoVerso(0, ctx.durataFadeAudioMs); // Avvio il fade-out dell'audio del trailer

    azioneScorrimento(); // Eseguo lo scorrimento (aggiorna indice/trasformazione/overlay)

    fade.finally(() => { // Dopo il fade-out, fermo e resetto il player
      try { ctx.player.pause(); } catch {} // Metto in pausa in modo safe
      try { ctx.player.currentTime(0); } catch {} // Riporto a inizio in modo safe
    });
  }


  /**
 * Avanza alla slide successiva quando il trailer termina, senza riavviare l'autoscroll.
 *
 * Aggiorna overlay, indice, trasformazione e persistenza dell'indice reale.
 * Gestisce il wrap alla prima slide quando si supera l'ultima slide reale e,
 * a fine transizione, avvia il trailer solo se si e' al top e non in pausa per scroll.
 *
 * @param ctx Contesto del componente/carousel
 * @returns void
 */
  static vaiAvantiDaFineTrailer(ctx: any): void { // Avanzo alla slide successiva quando il trailer termina (senza riavviare autoscroll)
    if (ctx.scorrimentoInCorso || ctx.immagini.length === 0) return; // Esco se sto gia' scorrendo o se non ho immagini
    ctx.scorrimentoInCorso = true; // Blocco altri movimenti finche' la transizione non finisce

    const prossimo = ctx.indiceCorrente + 1; // Calcolo l'indice della prossima slide

    ctx.aggiornaOverlayPerIndiceCorrente(prossimo, true); // Aggiorno l'overlay per la prossima slide con transizione

    ctx.indiceCorrente = prossimo; // Aggiorno l'indice corrente alla prossima slide
    ctx.salvaIndiceRealeInStorage(ctx.getIndiceRealeZeroBased()); // Salvo l'indice reale attuale in storage
    ctx.aggiornaTrasformazione(true); // Applico la trasformazione con animazione

    const chiudi = () => { // Definisco la routine di chiusura comune a fine transizione
      ctx.scorrimentoInCorso = false; // Sblocco lo scorrimento

      if (ctx.alTop && !ctx.pausaPerScroll) { // Se sono al top e non sono in pausa scroll, posso avviare il trailer della nuova slide
        ctx.avviaTrailerCorrenteDopo(ctx.RITARDO_MOSTRA_PLAYER_MS); // Avvio il trailer corrente dopo il ritardo previsto
      } else { // Se non sono al top (o sono in pausa scroll), niente video
        ctx.mostraVideo = false; // Nascondo il video
      }
    };

    if (ctx.indiceCorrente > ctx.immagini.length) { // Se ho superato l'ultima slide reale, devo fare wrap alla prima
      setTimeout(() => { // Aspetto la durata della transizione prima del salto istantaneo
        ctx.transizioneAttiva = false; // Disattivo la transizione per il salto senza animazione
        ctx.indiceCorrente = 1; // Riporto l'indice alla prima slide reale
        ctx.salvaIndiceRealeInStorage(ctx.getIndiceRealeZeroBased()); // Aggiorno lo storage con il nuovo indice reale
        ctx.aggiornaTrasformazione(false); // Applico la trasformazione senza animazione
        chiudi(); // Chiudo e riattivo la logica post-transizione
      }, ctx.durataTransizioneMs); // Sincronizzo con la durata della transizione
    } else { // Caso normale: non serve wrap
      setTimeout(() => { // Aspetto la fine della transizione prima di chiudere
        chiudi(); // Chiudo e riattivo la logica post-transizione
      }, ctx.durataTransizioneMs); // Sincronizzo con la durata della transizione
    }
  }

/**
 * Avvia o ripianifica l'autoscroll quando non si e' al top della pagina.
 *
 * Cancella sempre un eventuale timer precedente e schedula un avanzamento automatico.
 * Se allo scatto del timer lo scorrimento e' in corso, ripianifica invece di forzare il cambio slide.
 *
 * @param ctx Contesto del componente/carousel
 * @returns void
 */
  static avviaAutoscroll(ctx: any): void { // Avvio (o ripianifico) l'autoscroll quando non sono al top
    if (ctx.alTop) return; // Se sono al top, non devo schedulare autoscroll
    if (ctx.pausaPerHover) return;
    CaroselloScrollStateUtility.fermaAutoscroll(ctx); // Resetto sempre prima di schedulare un nuovo timeout

    ctx.timerAutoscroll = setTimeout(() => { // Schedulo il prossimo avanzamento automatico
      ctx.timerAutoscroll = null; // Azzero il riferimento al timer quando scatta

      if (ctx.alTop) return; // Esco se nel frattempo sono tornato al top
      if (ctx.pausaPerHover) return;
      if (ctx.scorrimentoInCorso) { // Se sto gia' scorrendo, ripianifico e basta
        CaroselloScrollStateUtility.avviaAutoscroll(ctx); // Riparto con un nuovo timer invece di forzare lo scorrimento
        return; // Esco dopo aver ripianificato
      }

      ctx.vaiAvanti(true); // Avanzo alla prossima slide indicando che arrivo da autoscroll
    }, ctx.INTERVALLO_AUTOSCROLL_MS); // Uso l'intervallo configurato per l'autoscroll
  }

/**
 * Ferma e pulisce il timer dell'autoscroll, se presente.
 *
 * @param ctx Contesto del componente/carousel
 * @returns void
 */
  static fermaAutoscroll(ctx: any): void { // Fermo e pulisco il timer dell'autoscroll se presente
    if (ctx.timerAutoscroll) { // Controllo se esiste un timeout attivo
      clearTimeout(ctx.timerAutoscroll); // Cancello il timeout
      ctx.timerAutoscroll = null; // Azzero il riferimento al timer
    }
  }

/**
 * Legge da localStorage l'indice reale 0-based dell'ultima slide vista.
 *
 * Ritorna null se il valore non esiste, non e' un intero valido o lo storage non e' accessibile.
 *
 * @param ctx Contesto del componente/carousel
 * @returns Indice reale 0-based salvato, oppure null se non presente/valido
 */
  static leggiIndiceRealeDaStorage(ctx: any): number | null {
    try { // Provo a leggere lo storage senza far fallire in ambienti dove non e' disponibile
      const v = window && window.localStorage // Controllo che esistano window e localStorage
        ? window.localStorage.getItem(ctx.chiaveStorageIndice) // Leggo il valore associato alla chiave configurata
        : null; // Se non posso leggere, tratto come assente
      if (v === null) return null; // Se non c'e' nulla salvato, ritorno null
      const n = Number(v); // Converto la stringa in numero
      return Number.isInteger(n) ? n : null; // Ritorno il numero solo se e' un intero valido, altrimenti null
    } catch { // Se localStorage lancia eccezioni (privacy mode, ecc.)
      return null; // Ritorno null come fallback sicuro
    }
  }

 /**
 * Salva in localStorage l'indice reale 0-based della slide corrente.
 *
 * Ignora eventuali errori di storage per non bloccare la UI.
 *
 * @param ctx Contesto del componente/carousel
 * @param indiceReale Indice reale 0-based da salvare
 * @returns void
 */
  static salvaIndiceRealeInStorage(ctx: any, indiceReale: number): void { // Salvo in localStorage l'indice reale 0-based della slide corrente
    try { // Provo a scrivere nello storage senza far fallire in ambienti dove non e' disponibile
      if (window && window.localStorage) { // Verifico che esistano window e localStorage
        window.localStorage.setItem(ctx.chiaveStorageIndice, String(indiceReale)); // Salvo l'indice convertendolo in stringa
      }
    } catch {} // Ignoro errori di storage per non bloccare la UI
  }

}
