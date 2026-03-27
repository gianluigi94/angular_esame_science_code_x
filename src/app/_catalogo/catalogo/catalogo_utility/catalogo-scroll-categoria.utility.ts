export class CatalogoScrollCategoriaUtility {
  static gestisciScrollACategoria(contesto: any, idCategoria: string): void {
    const id = String(idCategoria || '').trim();
    if (!id) return;

    contesto.scorrimentoCatalogo.impostaSpinnerScroll(true);
    contesto.utenteHaScrollato = true;

    contesto.tokenScroll += 1;
    const token = contesto.tokenScroll;

    if (contesto.timerCaricaFino) {
      clearTimeout(contesto.timerCaricaFino);
      contesto.timerCaricaFino = 0;
    }

    contesto.caricaFinoACategoria(id, token).then((trovata: boolean) => {
      if (!trovata) {
        contesto.scorrimentoCatalogo.impostaSpinnerScroll(false);
        return;
      }

      requestAnimationFrame(() => {
        const el = document.getElementById('cat_' + id);
        if (!el) {
          contesto.scorrimentoCatalogo.impostaSpinnerScroll(false);
          return;
        }

        const rect = el.getBoundingClientRect();
        const y =
          (window.scrollY || 0) +
          rect.top -
          Math.floor(window.innerHeight * 0.65);

        contesto.scorrimentoCatalogo.impostaSpinnerScroll(false);
        contesto.servizioAnimazioni.scrollaA(y, 0.35);
        setTimeout(() => contesto.forzaControlloSentinella(), 380);
      });
    });
  }
}
