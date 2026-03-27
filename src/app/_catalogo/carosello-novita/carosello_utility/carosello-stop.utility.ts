export class CaroselloStopUtility {
  static stopDolceImmediato(contesto: any, durataMs: number): Promise<void> {
    try {
      contesto.fermaAvvioPendete();
    } catch {}

    if (!contesto.player) return Promise.resolve();

    return contesto
      .sfumaGuadagnoVerso(0, Math.max(0, durataMs || 0))
      .finally(() => {
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
          contesto.mostraVideo = false;
        } catch {}
      });
  }
}
