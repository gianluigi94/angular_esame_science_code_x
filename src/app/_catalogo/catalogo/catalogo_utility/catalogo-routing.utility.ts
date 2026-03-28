import { TipoContenuto } from "../../riga-categoria/categoria_services/tipo-contenuto.service";

export class CatalogoRoutingUtility {
  static baseCatalogoDaLingua(contesto: any): string {
    const codice = contesto.cambioLingua.leggiCodiceLingua();
    const pref = codice === 'it' ? '/it' : '/en';
    const base = codice === 'it' ? '/catalogo' : '/catalog';
    return pref + base;
  }

  static sottoPathDaTipo(contesto: any, val: TipoContenuto): string {
    const codice = contesto.cambioLingua.leggiCodiceLingua();
    const en = codice === 'en';

    if (val === 'film') return en ? '/movies' : '/film';
    if (val === 'serie') return en ? '/series' : '/serie';
    return en ? '/movies-series' : '/film-serie';
  }

  static forzaRottaCatalogoDaLinguaETipo(
    contesto: any,
    preservaBaseDaUrl: boolean = false,
  ): void {
    const full = contesto.location.path(true) || '';
    const soloPath = full.split('?')[0].split('#')[0];
    const tail = full.substring(soloPath.length);

    const matchBase = soloPath.match(/^\/(it|en)\/(catalogo|catalog)(\/.*)?$/);
    if (!matchBase) return;

    const prefissoDaUrl = '/' + matchBase[1];
    const baseCatalogoDaUrl = prefissoDaUrl + '/' + matchBase[2];

    const nuovaBase = preservaBaseDaUrl
      ? baseCatalogoDaUrl
      : CatalogoRoutingUtility.baseCatalogoDaLingua(contesto);

    const resto = soloPath.replace(/^\/(it|en)\/(catalogo|catalog)/, '');

    const eRootCatalogo = resto === '' || resto === '/';
    const eVistaPrincipale =
      /^\/(film|serie|film-serie|movies|series|movies-series)\/?$/.test(resto);

    const nuovoResto =
      eRootCatalogo || eVistaPrincipale
        ? CatalogoRoutingUtility.sottoPathDaTipo(contesto, contesto.tipoSelezionato)
        : resto;

    const targetPath = (nuovaBase + nuovoResto).replace(/\/+$/, '');
    const currentPath = soloPath.replace(/\/+$/, '');

    if (targetPath !== currentPath) {
      contesto.location.go(targetPath + tail);
    }
  }
}
