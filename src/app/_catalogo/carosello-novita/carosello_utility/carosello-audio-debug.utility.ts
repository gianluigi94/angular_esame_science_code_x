export class CaroselloAudioDebugUtility {
  static intercettaTipoBloccoAudio(contesto: any): void {
    if (contesto.audioBloccatoDaUtente) {
      console.log('audio bloccato da utente');
      try {
        contesto.audioGlobaleService.setSoloBrowserBlocca(false);
      } catch {}
      return;
    }

    let mutato = false;
    try {
      const el = contesto.ottieniElementoVideoReale();
      mutato = !!el && !!el.muted;
    } catch {}

    if (mutato) {
      console.log('audio bloccato dal brawser');
      try {
        contesto.audioGlobaleService.setSoloBrowserBlocca(true);
      } catch {}
      return;
    }

    console.log('audio non bloccato');
    try {
      contesto.audioGlobaleService.setSoloBrowserBlocca(false);
    } catch {}
  }
}
