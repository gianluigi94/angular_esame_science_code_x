export class CatalogoPreloadUtility {
  static precaricaImmaginiRighe(
    righe: { locandine: { src: string }[] }[],
  ): Promise<void> {
    const urls: string[] = [];

    for (const r of righe || []) {
      for (const u of r.locandine || []) {
        const s = String(u?.src || '');
        if (s) urls.push(s);
      }
    }

    if (!urls.length) return Promise.resolve();

    const promesse = urls.map(
      (u) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();

          if ((img as any).decode) {
            img.src = u;
            (img as any)
              .decode()
              .then(() => resolve())
              .catch(() => resolve());
          } else {
            img.src = u;
          }
        }),
    );

    return Promise.all(promesse).then(() => {});
  }

  static aggiornaRigheInPlace(
    contesto: any,
    nuoveRighe: { idCategoria: string; category: string; posters: string[] }[],
  ): void {
    const mappaEsistenti: Record<string, any> = {};

    for (const r of contesto.righeDemo || []) {
      mappaEsistenti[String(r.idCategoria)] = r;
    }

    const ordine: any[] = [];

    for (const n of nuoveRighe) {
      const idCat = String(n.idCategoria);
      const r = mappaEsistenti[idCat] || {
        idCategoria: idCat,
        category: '',
        posters: [],
      };

      r.category = n.category;
      CatalogoPreloadUtility.aggiornaLocandineInPlace(r.posters, n.posters);
      ordine.push(r);
    }

    contesto.righeDemo.splice(0, contesto.righeDemo.length, ...ordine);
  }

  static aggiornaLocandineInPlace(target: string[], sorgente: string[]): void {
    const t = target || [];
    const s = sorgente || [];

    while (t.length < s.length) t.push('');
    if (t.length > s.length) t.splice(s.length);

    for (let i = 0; i < s.length; i++) {
      t[i] = s[i];
    }
  }
}
