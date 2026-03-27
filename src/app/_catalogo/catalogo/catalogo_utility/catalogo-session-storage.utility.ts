export class CatalogoSessionStorageUtility {
  static leggiCategoriaDaSessionStorage(): string {
    try {
      return String(sessionStorage.getItem('ultima_categoria_click') || '').trim();
    } catch {
      return '';
    }
  }

  static pulisciCategoriaDaSessionStorage(): void {
    try {
      sessionStorage.removeItem('ultima_categoria_click');
    } catch {}
  }

  static pulisciStoricoScrollOrizzontaleDaSessionStorage(): void {
    try {
      sessionStorage.removeItem('storico_scroll_categorie');
    } catch {}
  }

  static provaAutoScrollDaSessionStorage(contesto: any): void {
    if (contesto.autoScrollSessioneEseguito) return;

    const idCategoria = CatalogoSessionStorageUtility.leggiCategoriaDaSessionStorage();
    if (!idCategoria) {
      contesto.servizioAnimazioni.scrollaA(0, 0);
      return;
    }

    contesto.autoScrollSessioneEseguito = true;

    if (contesto.timerAutoScrollSessione) {
      clearTimeout(contesto.timerAutoScrollSessione);
      contesto.timerAutoScrollSessione = 0;
    }

    contesto.timerAutoScrollSessione = setTimeout(() => {
      contesto.timerAutoScrollSessione = 0;
      contesto.gestisciScrollACategoria(idCategoria);

      setTimeout(() => {
        const esito =
          CatalogoSessionStorageUtility.applicaScrollOrizzontaleInizialePerCategoria(
            contesto,
            idCategoria,
          );

        CatalogoSessionStorageUtility.pulisciStoricoScrollOrizzontaleDaSessionStorage();

        if (esito?.eseguito) {
          CatalogoSessionStorageUtility.salvaScrollOrizzontaleInSessionStorage(
            esito.idCategoria,
            esito.pagina,
          );
        }
      }, 120);

      CatalogoSessionStorageUtility.pulisciCategoriaDaSessionStorage();
    }, 80);
  }

  static leggiScrollOrizzontalePerCategoriaDaSessionStorage(
    idCategoria: string,
  ): { idCategoria: string; pagina: number } | null {
    try {
      const id = String(idCategoria || '').trim();
      if (!id) return null;

      const raw = sessionStorage.getItem('storico_scroll_categorie');
      if (!raw) return null;

      const storico = JSON.parse(raw);
      if (!Array.isArray(storico) || !storico.length) return null;

      let trovato: any = null;

      for (let i = storico.length - 1; i >= 0; i--) {
        const voce = storico[i] || {};
        const idVoce = String(voce?.idCategoria || '').trim();
        if (idVoce === id) {
          trovato = voce;
          break;
        }
      }

      if (!trovato) return null;

      const pagina = Number(trovato?.pagina);
      if (!Number.isFinite(pagina) || pagina < 0) return null;

      return { idCategoria: id, pagina: Math.floor(pagina) };
    } catch {
      return null;
    }
  }

  static applicaScrollOrizzontaleInizialePerCategoria(
    contesto: any,
    idCategoria: string,
  ): { eseguito: boolean; idCategoria: string; pagina: number } | null {
    const match =
      CatalogoSessionStorageUtility.leggiScrollOrizzontalePerCategoriaDaSessionStorage(
        idCategoria,
      );
    if (!match) return null;

    const righe = contesto.righeComponenti ? contesto.righeComponenti.toArray() : [];
    if (!righe.length) return null;

    const target = righe.find(
      (r: any) => String(r?.idCategoria || '').trim() === match.idCategoria,
    );
    if (!target) return null;

    target.impostaPaginaIniziale(match.pagina);

    return {
      eseguito: true,
      idCategoria: match.idCategoria,
      pagina: match.pagina,
    };
  }

  static salvaScrollOrizzontaleInSessionStorage(
    idCategoria: string,
    pagina: number,
  ): void {
    try {
      const id = String(idCategoria || '').trim();
      const p = Number.isFinite(pagina) ? Math.max(0, Math.floor(pagina)) : 0;
      if (!id) return;

      const chiave = 'storico_scroll_categorie';
      const storico = [{ idCategoria: id, pagina: p }];
      sessionStorage.setItem(chiave, JSON.stringify(storico));
    } catch {}
  }
}
