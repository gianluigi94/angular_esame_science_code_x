// Utility pure del player che gestiscono attese temporali, rilevamento fullscreen e calcolo compatibile del buffered end.

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms)); // aspetto il numero di millisecondi richiesto e poi risolvo la promise
}

/**
 * Verifica se un elemento target si trova attualmente in fullscreen.
 * - Legge l'elemento fullscreen corrente usando anche le varianti compatibili
 * - Controlla se coincide col target oppure se il target lo contiene
 *
 * @param target Elemento che voglio verificare rispetto allo stato fullscreen.
 * @returns boolean True se il target e' in fullscreen o contiene l'elemento fullscreen, false altrimenti.
 */
export function isInFullscreen(target: HTMLElement | null): boolean {
  const d = document as any; // mi salvo il document castato per accedere anche alle varianti vendor-specific
  const fsEl: Element | null =
    document.fullscreenElement ||
    d.webkitFullscreenElement ||
    d.mozFullScreenElement ||
    d.msFullscreenElement ||
    null; // recupero l'elemento fullscreen corrente usando anche le proprieta' compatibili
  return !!(fsEl && target && (fsEl === target || target.contains(fsEl))); // verifico se l'elemento fullscreen coincide col target o se e' contenuto al suo interno
}

/**
 * Attende che un elemento entri in fullscreen entro un timeout.
 * - Se il target e' gia' in fullscreen risolve subito con true
 * - Si aggancia agli eventi fullscreen standard e compatibili
 * - Quando rileva il fullscreen del target pulisce i listener e risolve con true
 * - Se scade il timeout pulisce i listener e risolve con false
 *
 * @param target Elemento che voglio attendere in fullscreen.
 * @param timeoutMs Tempo massimo di attesa in millisecondi.
 * @returns Promise<boolean> Promise risolta con true se il target entra in fullscreen, false se scade il timeout.
 */
export function waitForFullscreen(
  target: HTMLElement | null,
  timeoutMs = 2500,
): Promise<boolean> {
  if (isInFullscreen(target)) return Promise.resolve(true); // se il target e' gia' in fullscreen risolvo subito con true

  return new Promise((resolve) => {
    let done = false; // flag che mi evita di risolvere o pulire piu' volte
    const d = document as any; // mi salvo il document castato per accedere anche alle varianti vendor-specific

    const onChange = () => {
      if (done) return; // se ho gia' chiuso il flusso esco subito
      if (isInFullscreen(target)) {
        done = true; // segno che ho concluso correttamente l'attesa
        cleanup(); // rimuovo tutti i listener fullscreen
        resolve(true); // risolvo la promise con successo
      }
    };

    const cleanup = () => {
      document.removeEventListener('fullscreenchange', onChange); // rimuovo il listener standard del fullscreen
      d.removeEventListener?.('webkitfullscreenchange', onChange); // rimuovo il listener fullscreen webkit
      d.removeEventListener?.('mozfullscreenchange', onChange); // rimuovo il listener fullscreen moz
      d.removeEventListener?.('MSFullscreenChange', onChange); // rimuovo il listener fullscreen ms
    };

    document.addEventListener('fullscreenchange', onChange); // ascolto il cambio fullscreen standard
    d.addEventListener?.('webkitfullscreenchange', onChange); // ascolto il cambio fullscreen webkit
    d.addEventListener?.('mozfullscreenchange', onChange); // ascolto il cambio fullscreen moz
    d.addEventListener?.('MSFullscreenChange', onChange); // ascolto il cambio fullscreen ms

    setTimeout(() => {
      if (done) return; // se nel frattempo ho gia' concluso non faccio nulla
      done = true; // segno che sto chiudendo il flusso per timeout
      cleanup(); // rimuovo tutti i listener fullscreen
      resolve(false); // risolvo la promise con esito negativo
    }, timeoutMs);
  });
}

/**
 * Calcola in modo compatibile il punto finale del buffer del player.
 * - Recupera il TimeRanges dal player o dal video reale
 * - Se non ci sono range restituisce il currentTime corrente
 * - Parte dall'ultimo end disponibile
 * - Se trova un range che contiene il currentTime usa l'end di quel range
 * - In caso di errore restituisce il currentTime corrente
 *
 * @param player Istanza del player da cui leggere buffer e currentTime.
 * @returns number Secondo finale del buffer compatibile col currentTime corrente.
 */
export function calcolaBufferedEndCompat(player: any): number {
  try {
    const tech: any = player?.tech?.(true); // recupero il tech corrente del player
    const el = tech?.el?.(); // recupero il vero elemento video del tech
    const tr: TimeRanges | undefined = player?.buffered?.() ?? el?.buffered; // provo a leggere il TimeRanges dal player oppure direttamente dal video reale
    const ct = Number(player?.currentTime?.() ?? 0); // leggo il currentTime corrente del player
    if (!tr || tr.length === 0) return ct; // se non ho range di buffer restituisco il currentTime corrente

    let end = Number(tr.end(tr.length - 1) ?? ct); // parto usando come fallback l'end dell'ultimo range disponibile
    for (let i = 0; i < tr.length; i++) {
      const s = Number(tr.start(i) ?? 0); // leggo l'inizio del range corrente
      const e = Number(tr.end(i) ?? ct); // leggo la fine del range corrente
      if (s <= ct && ct <= e) {
        end = e; // se il currentTime cade dentro questo range uso la sua fine come buffered end corretto
        break; // appena trovo il range giusto interrompo il ciclo
      }
    }
    return end; // restituisco il buffered end compatibile trovato
  } catch {
    return Number(player?.currentTime?.() ?? 0); // se qualcosa fallisce restituisco il currentTime corrente come fallback sicuro
  }
}
