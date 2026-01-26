// Utility che concentra la logica di navigazione tra le slide, così il carosello si muove in modo prevedibile senza spargere nel componente dettagli di transizione.

export class CaroselloScrollUtility {

  /**
 * Porta il carosello alla slide successiva.
 *
 * Esegue il cambio slide passando da 'avviaCambioSlideConFade' per gestire:
 * - fade-out audio e stop/reset video
 * - aggiornamento overlay con transizione
 * - aggiornamento indice, trasformazione e persistenza dell'indice reale
 * - gestione wrap alla prima slide reale quando si supera l'ultima
 * - riavvio trailer (se al top) oppure autoscroll (se non al top)
 *
 * @param ctx Contesto del componente/carousel
 * @param daAutoscroll Indica se l'avanzamento e' stato avviato dall'autoscroll
 * @returns void
 */
  static vaiAvanti(ctx: any, daAutoscroll: boolean = false): void {
    ctx.avviaCambioSlideConFade(() => {
      // Avvio il cambio slide con fade e poi eseguo la logica di avanzamento
      if (ctx.scorrimentoInCorso || ctx.immagini.length === 0) return; // Esco se sto gia' scorrendo o se non ho immagini
      ctx.scorrimentoInCorso = true; // Blocco altri movimenti finche' la transizione non finisce

      if (!ctx.alTop) ctx.fermaAutoscroll(); // Se non sono al top, fermo subito l'autoscroll per evitare scatti durante la transizione

      const prossimo = ctx.indiceCorrente + 1; // Calcolo l'indice della prossima slide

      ctx.aggiornaOverlayPerIndiceCorrente(prossimo, true); // Aggiorno l'overlay in base alla prossima slide con transizione

      ctx.indiceCorrente = prossimo; // Applico il nuovo indice corrente
      ctx.salvaIndiceRealeInStorage(ctx.getIndiceRealeZeroBased()); // Persisto l'indice reale attuale in storage
      ctx.aggiornaTrasformazione(true); // Applico la trasformazione con transizione attiva

      const chiudi = () => {
        // Definisco la routine di chiusura comune a fine transizione
        ctx.scorrimentoInCorso = false; // Sblocco lo scorrimento

        if (ctx.alTop && !ctx.pausaPerScroll) {
          // Se sono al top e non sono in pausa per scroll, posso far partire il trailer
          ctx.avviaTrailerCorrenteDopo(ctx.RITARDO_MOSTRA_PLAYER_MS); // Avvio il trailer della slide corrente dopo il ritardo
        } else {
          // Se non sono al top (o sono in pausa scroll), non devo riprodurre video
          ctx.mostraVideo = false; // Nascondo il video

          ctx.avviaAutoscroll(); // Se non sono al top, faccio ripartire da zero l'autoscroll
        }
      };

      if (ctx.indiceCorrente > ctx.immagini.length) {
        // Se ho superato l'ultima slide (clone), devo fare wrap alla prima reale
        setTimeout(() => {
          // Aspetto la durata della transizione prima di 'teletrasportare' senza animazione
          ctx.transizioneAttiva = false; // Spengo la transizione per fare il salto istantaneo
          ctx.indiceCorrente = 1; // Riporto l'indice alla prima slide reale
          ctx.salvaIndiceRealeInStorage(ctx.getIndiceRealeZeroBased()); // Aggiorno lo storage con l'indice reale dopo il wrap
          ctx.aggiornaTrasformazione(false); // Applico la trasformazione senza animazione
          chiudi(); // Chiudo la transizione e riattivo le logiche post-movimento
        }, ctx.durataTransizioneMs); // Uso la stessa durata della transizione CSS per sincronizzarmi
      } else {
        // Caso normale: non serve wrap
        setTimeout(() => {
          // Aspetto la fine della transizione prima di sbloccare
          chiudi(); // Sblocco e faccio partire trailer/autoscroll in base allo stato
        }, ctx.durataTransizioneMs); // Sincronizzo lo sblocco con la durata della transizione
      }
    });
  }


  /**
 * Porta il carosello alla slide precedente.
 *
 * Esegue il cambio slide passando da 'avviaCambioSlideConFade' per gestire:
 * - fade-out audio e stop/reset video
 * - aggiornamento overlay con transizione
 * - aggiornamento indice, trasformazione e persistenza dell'indice reale
 * - gestione wrap all'ultima slide reale quando si va prima della prima
 * - riavvio trailer (se al top) oppure autoscroll (se non al top)
 *
 * @param ctx Contesto del componente/carousel
 * @returns void
 */
  static vaiIndietro(ctx: any): void {
    ctx.avviaCambioSlideConFade(() => {
      // Avvio il cambio slide con fade e poi eseguo la logica di arretramento
      if (ctx.scorrimentoInCorso || ctx.immagini.length === 0) return; // Esco se sto gia' scorrendo o se non ho immagini
      ctx.scorrimentoInCorso = true; // Blocco altri movimenti finche' la transizione non finisce

      if (!ctx.alTop) ctx.fermaAutoscroll(); // Se non sono al top, fermo l'autoscroll durante la transizione

      const prossimo = ctx.indiceCorrente - 1; // Calcolo l'indice della slide precedente

      ctx.aggiornaOverlayPerIndiceCorrente(prossimo, true); // Aggiorno l'overlay in base alla prossima slide con transizione

      ctx.indiceCorrente = prossimo; // Applico il nuovo indice corrente
      ctx.salvaIndiceRealeInStorage(ctx.getIndiceRealeZeroBased()); // Persisto l'indice reale attuale in storage
      ctx.aggiornaTrasformazione(true); // Applico la trasformazione con transizione attiva

      const chiudi = () => {
        // Definisco la routine di chiusura comune a fine transizione
        ctx.scorrimentoInCorso = false; // Sblocco lo scorrimento

        if (ctx.alTop && !ctx.pausaPerScroll) {
          // Se sono al top e non sono in pausa per scroll, posso far partire il trailer
          ctx.avviaTrailerCorrenteDopo(ctx.RITARDO_MOSTRA_PLAYER_MS); // Avvio il trailer della slide corrente dopo il ritardo
        } else {
          // Se non sono al top (o sono in pausa scroll), non devo riprodurre video
          ctx.mostraVideo = false; // Nascondo il video
          ctx.avviaAutoscroll(); // Faccio ripartire l'autoscroll da zero quando non sono al top
        }
      };

      if (ctx.indiceCorrente === 0) {
        // Se sono andato sul clone prima della prima, devo fare wrap all'ultima reale
        setTimeout(() => {
          // Aspetto la durata della transizione prima di 'teletrasportare' senza animazione
          ctx.transizioneAttiva = false; // Spengo la transizione per fare il salto istantaneo
          ctx.indiceCorrente = ctx.immagini.length; // Riporto l'indice all'ultima slide reale
          ctx.salvaIndiceRealeInStorage(ctx.getIndiceRealeZeroBased()); // Aggiorno lo storage con l'indice reale dopo il wrap
          ctx.aggiornaTrasformazione(false); // Applico la trasformazione senza animazione
          chiudi(); // Chiudo la transizione e riattivo le logiche post-movimento
        }, ctx.durataTransizioneMs); // Sincronizzo il salto con la durata della transizione CSS
      } else {
        // Caso normale: non serve wrap
        setTimeout(() => {
          // Aspetto la fine della transizione prima di sbloccare
          chiudi(); // Sblocco e faccio partire trailer/autoscroll in base allo stato
        }, ctx.durataTransizioneMs); // Sincronizzo lo sblocco con la durata della transizione
      }
    });
  }


  /**
 * Seleziona una slide specifica partendo da un indice 0-based.
 *
 * Converte l'indice 0-based nell'indice interno 1-based e, se diverso dall'attuale,
 * esegue il cambio slide passando da 'avviaCambioSlideConFade' per gestire:
 * - fade-out audio e stop/reset video
 * - aggiornamento overlay con transizione
 * - aggiornamento indice, trasformazione e persistenza dell'indice reale
 * - sblocco a fine transizione e riavvio trailer/autoscroll in base allo stato
 *
 * @param ctx Contesto del componente/carousel
 * @param indiceZeroBased Indice 0-based della slide reale da selezionare
 * @returns void
 */
  static selezionaIndice(ctx: any, indiceZeroBased: number): void {
    ctx.avviaCambioSlideConFade(() => {
      // Avvio il cambio slide con fade e poi applico lo spostamento
      if (ctx.scorrimentoInCorso || ctx.immagini.length === 0) return; // Esco se sto gia' scorrendo o se non ho immagini

      const prossimo = indiceZeroBased + 1; // Converto l'indice 0-based nell'indice interno 1-based
      if (prossimo === ctx.indiceCorrente) return; // Esco se sto gia' sulla slide richiesta

      ctx.scorrimentoInCorso = true; // Blocco altri movimenti finche' non termina la transizione

      if (!ctx.alTop) ctx.fermaAutoscroll(); // Se non sono al top, fermo l'autoscroll per evitare scatti durante la transizione

      ctx.aggiornaOverlayPerIndiceCorrente(prossimo, true); // Aggiorno l'overlay puntando alla slide di destinazione

      ctx.indiceCorrente = prossimo; // Imposto la nuova slide corrente
      ctx.salvaIndiceRealeInStorage(ctx.getIndiceRealeZeroBased()); // Salvo in storage l'indice reale aggiornato
      ctx.aggiornaTrasformazione(true); // Applico la trasformazione con animazione

      setTimeout(() => {
        // Aspetto la durata della transizione prima di sbloccare e ripartire
        ctx.scorrimentoInCorso = false; // Sblocco lo scorrimento a fine transizione

        if (ctx.alTop && !ctx.pausaPerScroll) {
          // Se sono al top e non sono in pausa per scroll, posso ripartire col trailer
          ctx.avviaTrailerCorrenteDopo(ctx.RITARDO_MOSTRA_PLAYER_MS); // Avvio il trailer corrente dopo il ritardo previsto
        } else {
          // Se non sono al top (o sono in pausa scroll), niente video
          ctx.mostraVideo = false; // Nascondo il video
          ctx.avviaAutoscroll(); // Riparto da zero con l'autoscroll quando non sono al top
        }
      }, ctx.durataTransizioneMs); // Sincronizzo con la durata della transizione
    });
  }
}
