import { forkJoin, take } from 'rxjs';
import { mescolaDeterministicaLocandine } from 'src/app/_helpers_globali/helpers';

export class CatalogoCaricamentoUtility {
  static caricaPrimeRigheDaApi(
    contesto: any,
    idForzato: number = 0,
    notificaTipoApplicato: boolean = false,
  ): void {
    const id = idForzato ? idForzato : contesto.idCicloRighe + 1;
    if (!idForzato) contesto.idCicloRighe = id;

    contesto.scrollYPrimaCambio = window.scrollY || 0;

    if (contesto.scrollYPrimaCambio === 0) {
      contesto.servizioAnimazioni.scrollaA(0, 0);
    }

    const eroFinitoPrimaDelCambio = contesto.hoFinitoTutto;

    if (contesto.timerSentinella) {
      clearTimeout(contesto.timerSentinella);
      contesto.timerSentinella = 0;
    }

    try {
      contesto.osservatoreSentinella?.disconnect();
    } catch {}
    contesto.osservatoreSentinella = null;

    const totaleDaRicaricare =
      contesto.offsetRighe > 0 ? contesto.offsetRighe : contesto.limiteRighe;

    const lingua = contesto.cambioLingua.leggiCodiceLingua();
    const tipo = contesto.tipoSelezionato;

    contesto.haAltreRighe = true;
    contesto.hoFinitoTutto = false;
    contesto.caricamentoRighe = true;
    contesto.sentinellaPronta = false;
    contesto.utenteHaScrollato = false;

    const richieste: any[] = [];
    for (let off = 0; off < totaleDaRicaricare; off += contesto.limiteRighe) {
      const lim = Math.min(contesto.limiteRighe, totaleDaRicaricare - off);
      richieste.push(
        contesto.api.getCatalogoRighe(lingua, tipo, lim, off).pipe(take(1)),
      );
    }

    forkJoin(richieste).subscribe((risposte: any[]) => {
      const itemsTotali: any[] = [];
      for (const ris of risposte || []) {
        const items = Array.isArray(ris?.data?.items) ? ris.data.items : [];
        itemsTotali.push(...items);
      }

      const nuoveRighe = itemsTotali
        .map((x: any) => {
          const idCategoria = String(x?.idCategoria || '');

          let locandine = (Array.isArray(x?.locandine) ? x.locandine : [])
            .map((p: any) => ({
              src: String(p?.src || ''),
              titolo: String(p?.titolo || ''),
              sottotitolo: String(p?.sottotitolo || ''),
              tipo: String(p?.tipo || ''),
              id_media: String(p?.id_media || ''),
            }))
            .filter((p: any) => !!p.src);

          if (contesto.tipoSelezionato === 'film_serie' && locandine.length) {
            locandine = mescolaDeterministicaLocandine(
              locandine as any,
              idCategoria,
            ) as any;
          }

          return {
            idCategoria,
            category: String(x?.category || ''),
            locandine: locandine.length
              ? (locandine as any)
              : contesto.locandineDemo,
          };
        })
        .filter((r: any) => !!r.idCategoria);

      contesto.precaricaImmaginiRighe(nuoveRighe).then(() => {
        if (id !== contesto.idCicloRighe) return;

        contesto.righeDemo.splice(0, contesto.righeDemo.length, ...nuoveRighe);
        contesto.offsetRighe = nuoveRighe.length;

        const ultimo =
          risposte && risposte.length ? risposte[risposte.length - 1] : null;
        const itemsUltimo = Array.isArray(ultimo?.data?.items)
          ? ultimo.data.items
          : [];
        const limUltimo = Math.min(
          contesto.limiteRighe,
          totaleDaRicaricare -
            Math.max(0, (risposte.length - 1) * contesto.limiteRighe),
        );

        contesto.haAltreRighe = itemsUltimo.length === limUltimo;
        contesto.hoFinitoTutto = !contesto.haAltreRighe;
        contesto.caricamentoRighe = false;
        contesto.sentinellaPronta =
          contesto.haAltreRighe && !contesto.hoFinitoTutto;

        if (!contesto.haAltreRighe) {
          try {
            contesto.osservatoreSentinella?.disconnect();
          } catch {}
          contesto.osservatoreSentinella = null;
        }

        requestAnimationFrame(() => {
          window.scrollTo(0, contesto.scrollYPrimaCambio);
          if (eroFinitoPrimaDelCambio) contesto.hoFinitoTutto = true;

          contesto.sentinellaPronta =
            contesto.haAltreRighe && !contesto.hoFinitoTutto;

          if (contesto.sentinellaPronta) {
            contesto.inizializzaOsservatoreSentinella();
          }

          if (contesto.hoFinitoTutto) {
            try {
              contesto.osservatoreSentinella?.disconnect();
            } catch {}
            contesto.osservatoreSentinella = null;
          }
        });

        if (notificaTipoApplicato) {
          contesto.tipoContenuto.notificaCambioTipoApplicato(
            contesto.tipoSelezionato,
            id,
          );
        }
      });
    });
  }

  static caricaAltreQuattroRigheDaApi(contesto: any): void {
    if (!contesto.haAltreRighe) return;
    if (contesto.caricamentoRighe) return;

    contesto.caricamentoRighe = true;

    contesto.idCicloRighe += 1;
    const id = contesto.idCicloRighe;

    const lingua = contesto.cambioLingua.leggiCodiceLingua();
    const tipo = contesto.tipoSelezionato;
    const offset = contesto.offsetRighe;

    contesto.api
      .getCatalogoRighe(lingua, tipo, contesto.limiteRighe, offset)
      .pipe(take(1))
      .subscribe((ris: any) => {
        const items = Array.isArray(ris?.data?.items) ? ris.data.items : [];

        const nuoveRighe = items
          .map((x: any) => {
            const idCategoria = String(x?.idCategoria || '');

            let locandine = (Array.isArray(x?.locandine) ? x.locandine : [])
              .map((p: any) => ({
                src: String(p?.src || ''),
                titolo: String(p?.titolo || ''),
                sottotitolo: String(p?.sottotitolo || ''),
                tipo: String(p?.tipo || ''),
                id_media: String(p?.id_media || ''),
              }))
              .filter((p: any) => !!p.src);

            if (contesto.tipoSelezionato === 'film_serie' && locandine.length) {
              locandine = mescolaDeterministicaLocandine(
                locandine as any,
                idCategoria,
              ) as any;
            }

            return {
              idCategoria,
              category: String(x?.category || ''),
              locandine: locandine.length
                ? (locandine as any)
                : contesto.locandineDemo,
            };
          })
          .filter((r: any) => !!r.idCategoria);

        contesto.precaricaImmaginiRighe(nuoveRighe).then(() => {
          if (id !== contesto.idCicloRighe) return;

          const gia: Record<string, boolean> = {};
          for (const r of contesto.righeDemo) {
            gia[String(r.idCategoria)] = true;
          }

          const soloNuove = nuoveRighe.filter(
            (r: any) => !gia[String(r.idCategoria)],
          );

          contesto.righeDemo.push(...soloNuove);
          contesto.offsetRighe += nuoveRighe.length;

          contesto.haAltreRighe = nuoveRighe.length === contesto.limiteRighe;
          if (!contesto.haAltreRighe) contesto.hoFinitoTutto = true;

          contesto.caricamentoRighe = false;
          contesto.sentinellaPronta =
            contesto.haAltreRighe && !contesto.hoFinitoTutto;

          if (!contesto.haAltreRighe) {
            try {
              contesto.osservatoreSentinella?.disconnect();
            } catch {}
            contesto.osservatoreSentinella = null;
          }
        });
      });
  }

  static caricaFinoACategoria(
    contesto: any,
    idCategoria: string,
    token: number,
  ): Promise<boolean> {
    const id = String(idCategoria || '').trim();
    if (!id) return Promise.resolve(false);

    const gia = contesto.righeDemo.some((r: any) => String(r?.idCategoria) === id);
    if (gia) return Promise.resolve(true);
    if (!contesto.haAltreRighe) return Promise.resolve(false);

    const lingua = contesto.cambioLingua.leggiCodiceLingua();
    const tipo = contesto.tipoSelezionato;

    return new Promise<boolean>((resolve) => {
      let finito = false;

      const chiudi = (esito: boolean) => {
        if (finito) return;
        finito = true;
        if (contesto.timerCaricaFino) {
          clearTimeout(contesto.timerCaricaFino);
          contesto.timerCaricaFino = 0;
        }
        resolve(esito);
      };

      const caricaUnBlocco = () => {
        if (finito) return;
        if (token !== contesto.tokenScroll) return;

        const giaOra = contesto.righeDemo.some(
          (r: any) => String(r?.idCategoria) === id,
        );
        if (giaOra) return chiudi(true);
        if (!contesto.haAltreRighe) return chiudi(false);

        if (contesto.caricamentoRighe) {
          if (contesto.timerCaricaFino) clearTimeout(contesto.timerCaricaFino);
          contesto.timerCaricaFino = setTimeout(caricaUnBlocco, 50);
          return;
        }

        contesto.caricamentoRighe = true;
        const offset = contesto.offsetRighe;
        const limiteJump = contesto.limiteRighe;

        contesto.api
          .getCatalogoRighe(lingua, tipo, limiteJump, offset)
          .pipe(take(1))
          .subscribe({
            next: (ris: any) => {
              const items = Array.isArray(ris?.data?.items) ? ris.data.items : [];

              const nuoveRighe = items
                .map((x: any) => {
                  const idCategoriaRiga = String(x?.idCategoria || '');

                  let locandine = (Array.isArray(x?.locandine) ? x.locandine : [])
                    .map((p: any) => ({
                      src: String(p?.src || ''),
                      titolo: String(p?.titolo || ''),
                      sottotitolo: String(p?.sottotitolo || ''),
                      tipo: String(p?.tipo || ''),
                      id_media: String(p?.id_media || ''),
                    }))
                    .filter((p: any) => !!p.src);

                  if (
                    contesto.tipoSelezionato === 'film_serie' &&
                    locandine.length
                  ) {
                    locandine = mescolaDeterministicaLocandine(
                      locandine as any,
                      idCategoriaRiga,
                    ) as any;
                  }

                  return {
                    idCategoria: idCategoriaRiga,
                    category: String(x?.category || ''),
                    locandine: locandine.length
                      ? (locandine as any)
                      : contesto.locandineDemo,
                  };
                })
                .filter((x: any) => !!x.idCategoria);

              contesto.precaricaImmaginiRighe(nuoveRighe);

              const giaMap: Record<string, boolean> = {};
              for (const r of contesto.righeDemo) {
                giaMap[String(r.idCategoria)] = true;
              }

              const soloNuove = nuoveRighe.filter(
                (r: any) => !giaMap[String(r.idCategoria)],
              );

              contesto.righeDemo.push(...soloNuove);
              contesto.offsetRighe += nuoveRighe.length;

              contesto.haAltreRighe = nuoveRighe.length === limiteJump;
              if (!contesto.haAltreRighe) contesto.hoFinitoTutto = true;

              contesto.caricamentoRighe = false;

              try {
                (window as any).ScrollTrigger?.refresh?.();
              } catch {}

              const trovataOra = contesto.righeDemo.some(
                (r: any) => String(r?.idCategoria) === id,
              );
              if (trovataOra) return chiudi(true);
              if (!contesto.haAltreRighe) return chiudi(false);

              if (contesto.timerCaricaFino) clearTimeout(contesto.timerCaricaFino);
              contesto.timerCaricaFino = setTimeout(caricaUnBlocco, 0);
            },
            error: () => {
              contesto.caricamentoRighe = false;
              contesto.haAltreRighe = false;
              contesto.hoFinitoTutto = true;
              contesto.scorrimentoCatalogo.impostaSpinnerScroll(false);
              chiudi(false);
            },
          });
      };

      caricaUnBlocco();
    });
  }
}
