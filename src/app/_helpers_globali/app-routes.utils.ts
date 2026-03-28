// ─── app-routes.utils.ts ─────────────────────────────────────────────────────
// Funzioni pure per il riconoscimento delle rotte usate in app.component.ts.

export function isRottaLogin(url: string): boolean {
  return (
    /^\/(it|en)\/benvenuto\/(login|accedi|registrazione)(\/|$)/.test(url) ||
    /^\/(it|en)\/welcome\/(login|accedi|registration)(\/|$)/.test(url)
  );
}

export function isRotta404(url: string): boolean {
  return /^\/(it|en)\/(non-trovato|not-found)(\/|$)/.test(url);
}

export function isRottaContatti(url: string): boolean {
  const path = String(url || '').split('?')[0].split('#')[0];
  return /^\/(it|en)\/(contatti|contact)(\/|$)/.test(path);
}

export function isRottaCatalogo(url: string): boolean {
  return /^\/(it|en)\/(catalogo|catalog)(\/|$)/.test(url);
}
