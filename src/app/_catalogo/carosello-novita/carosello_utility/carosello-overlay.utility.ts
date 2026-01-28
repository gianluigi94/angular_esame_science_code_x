// Utility che gestisce l'aggiornamento dell'overlay del carosello, assicurando che titolo e sottotitolo cambino in modo 'pulito' (anche durante le transizioni).

import { CaroselloDatiUtility } from './carosello-dati.utility';

export class CaroselloOverlayUtility {

  /**
 * Aggiorna i contenuti dell'overlay in base a un indice del carosello (1-based).
 *
 * Converte l'indice 1-based in indice reale 0-based con wrap e ricava:
 * - titolo
 * - immagine titolo
 * - sottotitolo
 * quindi delega l'applicazione dei valori a 'impostaOverlay'.
 *
 * @param ctx Contesto del componente/carousel
 * @param indiceCorrenteNuovo Indice 1-based del carosello
 * @param conTransizione Se true applica transizione (fade/blackout/preload), altrimenti aggiorna subito
 * @returns void
 */
  static aggiornaOverlayPerIndiceCorrente(
    ctx: any, // Ricevo il componente come contesto per leggere/scrivere stato e chiamare servizi
    indiceCorrenteNuovo: number, // Ricevo l'indice del carosello nel formato interno 1-based
    conTransizione: boolean // Decido se applicare la transizione (fade/blackout/preload) oppure aggiornare subito
  ): void {
    // Espongo una funzione che calcola l'indice reale e delega l'impostazione dell'overlay
    const len = ctx.immagini.length; // Leggo quante immagini reali ho a disposizione
    if (!len) return; // Esco se non ho slide reali

    const indiceReale = (indiceCorrenteNuovo - 1 + len) % len; // Converto l'indice 1-based in indice reale 0-based con wrap

    const nuovoTitolo = ctx.titoliAlt[indiceReale] || ''; // Prendo il titolo per la slide reale o fallback
    const nuovaImgTitolo = ctx.imgTitolo[indiceReale] || ''; // Prendo l'immagine titolo per la slide reale
    const nuovoSottotitolo = ctx.sottotitoli[indiceReale] || ''; // Prendo il sottotitolo per la slide reale

    CaroselloOverlayUtility.impostaOverlay(
      // Delego a un metodo unico l'applicazione dei nuovi valori e della transizione
      ctx,
      nuovoTitolo,
      nuovaImgTitolo,
      nuovoSottotitolo,
      conTransizione
    );
  }

  /**
 * Imposta lo stato dell'overlay aggiornando titolo, immagine titolo e sottotitolo.
 *
 * Se 'conTransizione' e' false:
 * - applica subito i nuovi valori
 * - gestisce visibilita' e segnala readiness dei titoli quando necessario
 *
 * Se 'conTransizione' e' true:
 * - invalida transizioni precedenti tramite token
 * - esegue fade-out e pausa in nero
 * - precarica l'immagine titolo
 * - applica i nuovi valori e riattiva la visibilita' in modo pulito
 *
 * @param ctx Contesto del componente/carousel
 * @param nuovoTitolo Titolo da impostare nell'overlay
 * @param nuovaImgTitolo URL dell'immagine titolo da impostare nell'overlay
 * @param nuovoSottotitolo Sottotitolo da impostare nell'overlay
 * @param conTransizione Se true applica transizione (fade/blackout/preload), altrimenti aggiorna subito
 * @returns void
 */
  static impostaOverlay(
    ctx: any, // Ricevo il componente come contesto per leggere/scrivere stato e chiamare servizi
    nuovoTitolo: string,
    nuovaImgTitolo: string,
    nuovoSottotitolo: string,
    conTransizione: boolean
  ): void {
    // Applico i nuovi valori all'overlay e gestisco visibilita' e readiness
    if (!conTransizione) {
      // Se non devo fare transizione, aggiorno tutto in modo immediato
      ctx.inBlackoutTitoli = false; // Mi assicuro di non essere in blackout
      ctx.titoloPronto = !nuovaImgTitolo; // Considero il titolo pronto subito se non c'e' immagine da caricare
      ctx.titoloOverlay = nuovoTitolo; // Aggiorno il titolo dell'overlay
      ctx.imgTitoloOverlay = nuovaImgTitolo; // Aggiorno l'immagine titolo dell'overlay
      ctx.sottotitoloOverlay = nuovoSottotitolo; // Aggiorno il sottotitolo dell'overlay
      ctx.titoloVisibile = true; // Rendo visibile il titolo
      ctx.sottotitoloVisibile = true; // Rendo visibile il sottotitolo

      if (ctx.titoloPronto && !ctx.segnalatiTitoliPronti) {
        // Se il titolo e' pronto e non ho ancora segnalato, lo segnalo ora
        ctx.segnalatiTitoliPronti = true; // definisco che la segnalazione e' stata fatta
        ctx.caricamentoCaroselloService.segnalaTitoliPronti(); // Notifico al service che i titoli sono pronti
      }

      return; // Esco per non eseguire la logica di transizione
    }

    if (ctx.timerFadeTitolo) clearTimeout(ctx.timerFadeTitolo); // Cancello un eventuale timer di fade precedente
    if (ctx.timerImpostaTitolo) clearTimeout(ctx.timerImpostaTitolo); // Cancello un eventuale timer di impostazione precedente

    const token = ++ctx.idCambioTitoli; // Creo un token per invalidare transizioni precedenti
    ctx.inBlackoutTitoli = true; // Entro in blackout mentre preparo il nuovo contenuto
    ctx.titoloPronto = !nuovaImgTitolo; // Considero pronto subito se non ho immagine da caricare

    ctx.titoloVisibile = false; // Nascondo il titolo per avviare il fade-out
    ctx.sottotitoloVisibile = false; // Nascondo il sottotitolo per avviare il fade-out

    if (ctx.titoloPronto && !ctx.segnalatiTitoliPronti) {
      // Se non c'e' immagine e non ho segnalato ancora, posso segnalare subito
      ctx.segnalatiTitoliPronti = true; // Marco che la segnalazione e' stata fatta
      ctx.caricamentoCaroselloService.segnalaTitoliPronti(); // Notifico al service che i titoli sono pronti
    }

    const attesaFineFade = new Promise<void>(
      (
        res // Creo una promise che rappresenta l'attesa della durata del fade
      ) => setTimeout(res, ctx.durataFadeTitoliMs) // Aspetto i ms del fade titoli prima di procedere
    );
    const attesaPausaNero = new Promise<void>(
      (
        res // Creo una promise che rappresenta la pausa in nero tra i titoli
      ) => setTimeout(res, ctx.pausaNeroTitoliMs) // Aspetto i ms di pausa nera prima di procedere
    );
    const attesaPreload =
      CaroselloDatiUtility.precaricaImmagine(nuovaImgTitolo); // Avvio il preload dell'immagine titolo e ne uso la promise come attesa

   Promise.all([attesaFineFade, attesaPausaNero, attesaPreload]).then(() => {
  // Attendo che fade, pausa e preload siano tutti completati
  if (token !== ctx.idCambioTitoli) return; // Esco se nel frattempo e' partita un'altra transizione titoli

  ctx.titoloOverlay = nuovoTitolo; // Applico il nuovo titolo all'overlay
  ctx.imgTitoloOverlay = nuovaImgTitolo; // Applico la nuova immagine titolo all'overlay
  ctx.sottotitoloOverlay = nuovoSottotitolo; // Applico il nuovo sottotitolo all'overlay

  // FIX: se il preload e' finito, considero il titolo pronto anche se il (load) non scatta
  // (succede quando lo src resta identico, tipico passando velocemente tra locandine con dati "fittizi")
  ctx.titoloPronto = true;

  requestAnimationFrame(() => {
    // Aspetto un frame per applicare la riaccensione della visibilita' in modo pulito
    if (token !== ctx.idCambioTitoli) return; // Esco se nel frattempo e' partita un'altra transizione titoli
    ctx.inBlackoutTitoli = false; // Esco dal blackout ora che il contenuto e' pronto

    if (ctx.titoloPronto) {
      // Ora posso mostrare i testi anche se il load non e' ripartito
      ctx.titoloVisibile = true; // Rendo di nuovo visibile il titolo
      ctx.sottotitoloVisibile = true; // Rendo di nuovo visibile il sottotitolo
    }
  });
});
  }
}
