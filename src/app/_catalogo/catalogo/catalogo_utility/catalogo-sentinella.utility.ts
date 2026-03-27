export class CatalogoSentinellaUtility {
  static inizializzaOsservatoreSentinella(contesto: any): void {
    try {
      contesto.osservatoreSentinella?.disconnect();
    } catch {}
    contesto.osservatoreSentinella = null;

    const host = contesto.sentinella?.nativeElement;
    if (!host) return;

    contesto.osservatoreSentinella = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          if (!contesto.sentinellaPronta) continue;
          if (!contesto.utenteHaScrollato) continue;
          if (!contesto.haAltreRighe) return;
          if (contesto.caricamentoRighe) return;

          if (contesto.timerSentinella) clearTimeout(contesto.timerSentinella);
          contesto.timerSentinella = setTimeout(() => {
            contesto.timerSentinella = 0;
            contesto.caricaAltreQuattroRigheDaApi();
          }, 400);
        }
      },
      { root: null, threshold: 0.1 },
    );

    contesto.osservatoreSentinella.observe(host);
  }

  static forzaControlloSentinella(contesto: any): void {
    if (!contesto.sentinellaPronta) return;
    if (!contesto.haAltreRighe) return;
    if (contesto.caricamentoRighe) return;

    const host = contesto.sentinella?.nativeElement as HTMLElement;
    if (!host) return;

    const r = host.getBoundingClientRect();
    const inVista = r.top <= window.innerHeight && r.bottom >= 0;
    if (!inVista) return;

    contesto.caricaAltreQuattroRigheDaApi();
  }
}
