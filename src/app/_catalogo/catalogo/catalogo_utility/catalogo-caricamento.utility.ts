// Utility che gestisce il caricamento delle righe del catalogo da API, sia iniziale sia incrementale, includendo preload immagini, aggiornamento stato sentinella e caricamento mirato fino a una categoria.

import { forkJoin, take } from 'rxjs';
import { mescolaDeterministicaLocandine } from 'src/app/_helpers_globali/helpers';

export class CatalogoCaricamentoUtility {
  /**
   * Carica da API il primo blocco di righe del catalogo, oppure ricarica le righe gia' presenti.
   * - Calcola l'id del ciclo corrente per invalidare eventuali caricamenti obsoleti
   * - Salva e ripristina la posizione di scroll precedente al cambio
   * - Ricostruisce le richieste necessarie in blocchi della dimensione limite
   * - Normalizza le righe ricevute e precarica le immagini prima di applicarle
   * - Aggiorna sentinella, flag di fine e notifica opzionale del tipo applicato
   *
   * @param contesto Contesto componente che espone stato, servizi e metodi usati dalla utility.
   * @param idForzato Id ciclo opzionale da usare al posto di quello incrementale automatico.
   * @param notificaTipoApplicato Se true notifica al servizio che il tipo selezionato e' stato applicato.
   * @returns void
   */
  static caricaPrimeRigheDaApi(
    contesto: any,
    idForzato: number = 0,
    notificaTipoApplicato: boolean = false,
  ): void {
    const id = idForzato ? idForzato : contesto.idCicloRighe + 1; // ricavo l'id del ciclo corrente usando quello forzato oppure incrementando il ciclo attuale
    if (!idForzato) contesto.idCicloRighe = id; // se l'id non e' stato forzato aggiorno il ciclo corrente del contesto

    contesto.scrollYPrimaCambio = window.scrollY || 0; // salvo la posizione di scroll corrente prima del cambio righe

    if (contesto.scrollYPrimaCambio === 0) {
      contesto.servizioAnimazioni.scrollaA(0, 0);
    } // se sono gia' in cima forzo comunque uno scroll pulito a zero

    const eroFinitoPrimaDelCambio = contesto.hoFinitoTutto; // mi salvo se prima del cambio avevo gia' finito tutto il catalogo

    if (contesto.timerSentinella) {
      clearTimeout(contesto.timerSentinella); // se esiste un timer della sentinella lo annullo
      contesto.timerSentinella = 0; // azzero il riferimento numerico del timer della sentinella
    }

    try {
      contesto.osservatoreSentinella?.disconnect();
    } catch {} // provo a disconnettere l'osservatore della sentinella senza rompere il flusso
    contesto.osservatoreSentinella = null; // azzero il riferimento all'osservatore della sentinella

    const totaleDaRicaricare =
      contesto.offsetRighe > 0 ? contesto.offsetRighe : contesto.limiteRighe; // decido quante righe ricaricare: quelle gia' note oppure almeno un blocco iniziale

    const lingua = contesto.cambioLingua.leggiCodiceLingua(); // leggo la lingua corrente da usare per la chiamata API
    const tipo = contesto.tipoSelezionato; // leggo il tipo di contenuto selezionato da usare per la chiamata API

    contesto.haAltreRighe = true; // preparo lo stato assumendo temporaneamente che ci siano ancora altre righe
    contesto.hoFinitoTutto = false; // resetto il flag di completamento totale
    contesto.caricamentoRighe = true; // segno che il caricamento righe e' in corso
    contesto.sentinellaPronta = false; // disattivo temporaneamente la sentinella finche' il caricamento non e' completato
    contesto.utenteHaScrollato = false; // resetto il flag che indica scroll utente

    const richieste: any[] = []; // preparo l'array che conterra' tutte le richieste API da eseguire in parallelo
    for (let off = 0; off < totaleDaRicaricare; off += contesto.limiteRighe) {
      const lim = Math.min(contesto.limiteRighe, totaleDaRicaricare - off); // calcolo il limite del singolo blocco tenendo conto dell'ultimo blocco parziale
      richieste.push(
        contesto.api.getCatalogoRighe(lingua, tipo, lim, off).pipe(take(1)),
      ); // aggiungo la richiesta del blocco corrente prendendo una sola emissione
    }

    forkJoin(richieste).subscribe((risposte: any[]) => {
      // eseguo tutte le richieste in parallelo e proseguo quando tutte hanno risposto
      const itemsTotali: any[] = []; // preparo un array unico dove unire tutti gli items ricevuti
      for (const ris of risposte || []) {
        const items = Array.isArray(ris?.data?.items) ? ris.data.items : []; // estraggo in modo sicuro gli items della singola risposta
        itemsTotali.push(...items); // accodo gli items della risposta corrente all'array totale
      }

      const nuoveRighe = itemsTotali
        .map((x: any) => {
          // trasformo ogni item API nella struttura di riga usata dal catalogo
          const idCategoria = String(x?.idCategoria || ''); // normalizzo l'id categoria come stringa

          let locandine = (Array.isArray(x?.locandine) ? x.locandine : [])
            .map((p: any) => ({
              src: String(p?.src || ''), // normalizzo il path della locandina
              titolo: String(p?.titolo || ''), // normalizzo il titolo della locandina
              sottotitolo: String(p?.sottotitolo || ''), // normalizzo il sottotitolo della locandina
              tipo: String(p?.tipo || ''), // normalizzo il tipo associato alla locandina
              id_media: String(p?.id_media || ''), // normalizzo l'id media associato alla locandina
            }))
            .filter((p: any) => !!p.src); // tengo solo le locandine che hanno una src valida

          if (contesto.tipoSelezionato === 'film_serie' && locandine.length) {
            locandine = mescolaDeterministicaLocandine(
              locandine as any,
              idCategoria,
            ) as any;
          } // se sono nel tipo misto film_serie rimescolo deterministicamente le locandine della categoria

          return {
            idCategoria, // espongo l'id categoria normalizzato
            category: String(x?.category || ''), // normalizzo il codice/nome categoria
            locandine: locandine.length
              ? (locandine as any)
              : contesto.locandineDemo, // uso le locandine reali se presenti, altrimenti il fallback demo
          };
        })
        .filter((r: any) => !!r.idCategoria); // scarto eventuali righe senza id categoria valido

      contesto.precaricaImmaginiRighe(nuoveRighe).then(() => {
        // aspetto il preload delle immagini prima di applicare davvero le nuove righe
        if (id !== contesto.idCicloRighe) return; // se il ciclo nel frattempo e' cambiato ignoro questo risultato obsoleto

        contesto.righeDemo.splice(0, contesto.righeDemo.length, ...nuoveRighe); // sostituisco completamente le righe correnti con quelle nuove
        contesto.offsetRighe = nuoveRighe.length; // aggiorno l'offset in base al numero totale di righe ora caricate

        const ultimo =
          risposte && risposte.length ? risposte[risposte.length - 1] : null; // recupero l'ultima risposta per capire se ci sono altre righe
        const itemsUltimo = Array.isArray(ultimo?.data?.items)
          ? ultimo.data.items
          : []; // estraggo in modo sicuro gli items dell'ultima risposta
        const limUltimo = Math.min(
          contesto.limiteRighe,
          totaleDaRicaricare -
            Math.max(0, (risposte.length - 1) * contesto.limiteRighe),
        ); // calcolo quanti items mi aspettavo nell'ultimo blocco

        contesto.haAltreRighe = itemsUltimo.length === limUltimo; // considero che ci siano altre righe solo se l'ultimo blocco e' pieno
        contesto.hoFinitoTutto = !contesto.haAltreRighe; // se non ho altre righe segno che ho finito tutto
        contesto.caricamentoRighe = false; // segno che il caricamento iniziale/di ricarica e' terminato
        contesto.sentinellaPronta =
          contesto.haAltreRighe && !contesto.hoFinitoTutto; // aggiorno lo stato della sentinella in base alla disponibilita' di altre righe

        if (!contesto.haAltreRighe) {
          try {
            contesto.osservatoreSentinella?.disconnect();
          } catch {} // se non ci sono altre righe provo a disconnettere l'osservatore della sentinella
          contesto.osservatoreSentinella = null; // azzero il riferimento all'osservatore della sentinella
        }

        requestAnimationFrame(() => {
          // rimando al frame successivo il ripristino dello scroll e la riattivazione eventuale della sentinella
          window.scrollTo(0, contesto.scrollYPrimaCambio); // ripristino la posizione di scroll precedente al cambio
          if (eroFinitoPrimaDelCambio) contesto.hoFinitoTutto = true; // se prima avevo gia' finito tutto mantengo coerente quel flag

          contesto.sentinellaPronta =
            contesto.haAltreRighe && !contesto.hoFinitoTutto; // ricalcolo lo stato della sentinella dopo il ripristino finale dei flag

          if (contesto.sentinellaPronta) {
            contesto.inizializzaOsservatoreSentinella();
          } // se la sentinella deve essere attiva la inizializzo di nuovo

          if (contesto.hoFinitoTutto) {
            try {
              contesto.osservatoreSentinella?.disconnect();
            } catch {} // se ho finito tutto provo a disconnettere di nuovo l'osservatore per sicurezza
            contesto.osservatoreSentinella = null; // azzero definitivamente il riferimento all'osservatore della sentinella
          }
        });

        if (notificaTipoApplicato) {
          contesto.tipoContenuto.notificaCambioTipoApplicato(
            contesto.tipoSelezionato,
            id,
          );
        } // se richiesto notifico che il tipo contenuto e' stato applicato per questo ciclo
      });
    });
  }

  /**
   * Carica da API il blocco successivo di righe del catalogo.
   * - Interrompe subito se non ci sono altre righe o se e' gia' in corso un caricamento
   * - Recupera il blocco successivo a partire dall'offset corrente
   * - Normalizza le nuove righe, precarica le immagini e aggiunge solo quelle non ancora presenti
   * - Aggiorna offset, flag di fine e stato della sentinella
   *
   * @param contesto Contesto componente che espone stato, servizi e metodi usati dalla utility.
   * @returns void
   */
  static caricaAltreQuattroRigheDaApi(contesto: any): void {
    if (!contesto.haAltreRighe) return; // esco subito se so gia' che non ci sono altre righe da caricare
    if (contesto.caricamentoRighe) return; // esco subito se un caricamento righe e' gia' in corso

    contesto.caricamentoRighe = true; // segno che da questo momento e' iniziato un nuovo caricamento incrementale

    contesto.idCicloRighe += 1; // incremento l'id del ciclo per invalidare eventuali risposte precedenti ormai obsolete
    const id = contesto.idCicloRighe; // mi salvo l'id del ciclo corrente da confrontare dopo il preload

    const lingua = contesto.cambioLingua.leggiCodiceLingua(); // leggo la lingua corrente da usare nella chiamata API
    const tipo = contesto.tipoSelezionato; // leggo il tipo selezionato da usare nella chiamata API
    const offset = contesto.offsetRighe; // leggo l'offset corrente da cui partire per il blocco successivo

    contesto.api
      .getCatalogoRighe(lingua, tipo, contesto.limiteRighe, offset)
      .pipe(take(1))
      .subscribe((ris: any) => {
        // richiedo il prossimo blocco di righe e prendo una sola risposta
        const items = Array.isArray(ris?.data?.items) ? ris.data.items : []; // estraggo in modo sicuro gli items ricevuti

        const nuoveRighe = items
          .map((x: any) => {
            // trasformo ogni item API nel formato riga del catalogo
            const idCategoria = String(x?.idCategoria || ''); // normalizzo l'id categoria

            let locandine = (Array.isArray(x?.locandine) ? x.locandine : [])
              .map((p: any) => ({
                src: String(p?.src || ''), // normalizzo la src della locandina
                titolo: String(p?.titolo || ''), // normalizzo il titolo della locandina
                sottotitolo: String(p?.sottotitolo || ''), // normalizzo il sottotitolo della locandina
                tipo: String(p?.tipo || ''), // normalizzo il tipo della locandina
                id_media: String(p?.id_media || ''), // normalizzo l'id media della locandina
              }))
              .filter((p: any) => !!p.src); // tengo solo le locandine con src valida

            if (contesto.tipoSelezionato === 'film_serie' && locandine.length) {
              locandine = mescolaDeterministicaLocandine(
                locandine as any,
                idCategoria,
              ) as any;
            } // se il tipo selezionato e' film_serie applico il mescolamento deterministico per categoria

            return {
              idCategoria, // espongo l'id categoria normalizzato
              category: String(x?.category || ''), // normalizzo la category della riga
              locandine: locandine.length
                ? (locandine as any)
                : contesto.locandineDemo, // uso le locandine reali se presenti, altrimenti quelle demo
            };
          })
          .filter((r: any) => !!r.idCategoria); // scarto le righe che non hanno un id categoria valido

        contesto.precaricaImmaginiRighe(nuoveRighe).then(() => {
          // aspetto il preload delle immagini prima di inserire davvero le nuove righe
          if (id !== contesto.idCicloRighe) return; // se l'id del ciclo e' cambiato nel frattempo ignoro il risultato obsoleto

          const gia: Record<string, boolean> = {}; // preparo una mappa per capire quali categorie sono gia' presenti
          for (const r of contesto.righeDemo) {
            gia[String(r.idCategoria)] = true; // segno come presenti tutte le categorie gia' caricate
          }

          const soloNuove = nuoveRighe.filter(
            (r: any) => !gia[String(r.idCategoria)],
          ); // tengo solo le righe che non erano gia' presenti nel catalogo

          contesto.righeDemo.push(...soloNuove); // aggiungo in coda solo le righe davvero nuove
          contesto.offsetRighe += nuoveRighe.length; // avanzo l'offset in base al numero di righe ricevute dal server

          contesto.haAltreRighe = nuoveRighe.length === contesto.limiteRighe; // considero che ci siano altre righe solo se il blocco ricevuto e' pieno
          if (!contesto.haAltreRighe) contesto.hoFinitoTutto = true; // se il blocco non e' pieno segno che ho finito tutto

          contesto.caricamentoRighe = false; // segno che il caricamento incrementale e' terminato
          contesto.sentinellaPronta =
            contesto.haAltreRighe && !contesto.hoFinitoTutto; // aggiorno lo stato della sentinella

          if (!contesto.haAltreRighe) {
            try {
              contesto.osservatoreSentinella?.disconnect();
            } catch {} // se non ci sono altre righe provo a disconnettere l'osservatore della sentinella
            contesto.osservatoreSentinella = null; // azzero il riferimento all'osservatore della sentinella
          }
        });
      });
  }

  /**
   * Carica progressivamente blocchi di righe fino a trovare una categoria specifica oppure fino a esaurimento.
   * - Controlla subito se la categoria e' gia' presente o se non esistono altre righe
   * - Evita conflitti con altri caricamenti usando token e polling leggero sul flag di caricamento
   * - Aggiunge solo righe nuove, aggiorna offset e stato di fine
   * - Risolve la promise con true quando trova la categoria richiesta, altrimenti false
   *
   * @param contesto Contesto componente che espone stato, servizi e metodi usati dalla utility.
   * @param idCategoria Id della categoria che si vuole raggiungere caricando blocchi successivi.
   * @param token Token di validazione per interrompere il flusso se cambia lo scroll logico corrente.
   * @returns Promise<boolean> Promise risolta con true se la categoria viene trovata, false altrimenti.
   */
  static caricaFinoACategoria(
    contesto: any,
    idCategoria: string,
    token: number,
  ): Promise<boolean> {
    const id = String(idCategoria || '').trim(); // normalizzo l'id categoria richiesto come stringa ripulita
    if (!id) return Promise.resolve(false); // se l'id richiesto e' vuoto risolvo subito con false

    const gia = contesto.righeDemo.some(
      (r: any) => String(r?.idCategoria) === id,
    ); // verifico se la categoria richiesta e' gia' presente tra le righe attuali
    if (gia) return Promise.resolve(true); // se la categoria e' gia' presente risolvo subito con true
    if (!contesto.haAltreRighe) return Promise.resolve(false); // se non ci sono altre righe da caricare risolvo subito con false

    const lingua = contesto.cambioLingua.leggiCodiceLingua(); // leggo la lingua corrente per le chiamate API
    const tipo = contesto.tipoSelezionato; // leggo il tipo selezionato per le chiamate API

    return new Promise<boolean>((resolve) => {
      // creo una promise che si risolvera' quando trovero' la categoria oppure finiro' le righe
      let finito = false; // preparo un flag interno per impedire chiusure multiple della promise

      const chiudi = (esito: boolean) => {
        // chiudo in modo centralizzato il flusso di caricamento fino a categoria
        if (finito) return; // se ho gia' chiuso in precedenza esco subito
        finito = true; // segno che il flusso e' terminato
        if (contesto.timerCaricaFino) {
          clearTimeout(contesto.timerCaricaFino); // se esiste un timer di attesa per il prossimo blocco lo annullo
          contesto.timerCaricaFino = 0; // azzero il riferimento al timer del caricamento fino a categoria
        }
        resolve(esito); // risolvo la promise con l'esito finale
      };

      const caricaUnBlocco = () => {
        // provo a caricare un ulteriore blocco di righe per avvicinarmi alla categoria richiesta
        if (finito) return; // se il flusso e' gia' stato chiuso non faccio piu' nulla
        if (token !== contesto.tokenScroll) return; // se il token non coincide piu' abbandono il flusso perche' non e' piu' valido

        const giaOra = contesto.righeDemo.some(
          (r: any) => String(r?.idCategoria) === id,
        ); // ricontrollo se nel frattempo la categoria e' gia' comparsa
        if (giaOra) return chiudi(true); // se ora la categoria e' presente chiudo con successo
        if (!contesto.haAltreRighe) return chiudi(false); // se non ci sono piu' righe da caricare chiudo con fallimento

        if (contesto.caricamentoRighe) {
          // se un altro caricamento e' gia' in corso non sovrappongo una nuova chiamata
          if (contesto.timerCaricaFino) clearTimeout(contesto.timerCaricaFino); // annullo l'eventuale timer precedente di attesa
          contesto.timerCaricaFino = setTimeout(caricaUnBlocco, 50); // riprogrammo un tentativo poco dopo
          return; // esco aspettando che il caricamento in corso finisca
        }

        contesto.caricamentoRighe = true; // segno che sto iniziando un caricamento per il salto fino a categoria
        const offset = contesto.offsetRighe; // leggo l'offset corrente da cui richiedere il prossimo blocco
        const limiteJump = contesto.limiteRighe; // mi salvo il limite righe corrente usato per il blocco da caricare

        contesto.api
          .getCatalogoRighe(lingua, tipo, limiteJump, offset)
          .pipe(take(1))
          .subscribe({
            next: (ris: any) => {
              // entro qui quando il blocco richiesto arriva correttamente dal server
              const items = Array.isArray(ris?.data?.items)
                ? ris.data.items
                : []; // estraggo in modo sicuro gli items ricevuti

              const nuoveRighe = items
                .map((x: any) => {
                  // trasformo ogni item ricevuto nel formato riga del catalogo
                  const idCategoriaRiga = String(x?.idCategoria || ''); // normalizzo l'id categoria della riga corrente

                  let locandine = (
                    Array.isArray(x?.locandine) ? x.locandine : []
                  )
                    .map((p: any) => ({
                      src: String(p?.src || ''), // normalizzo la src della locandina
                      titolo: String(p?.titolo || ''), // normalizzo il titolo della locandina
                      sottotitolo: String(p?.sottotitolo || ''), // normalizzo il sottotitolo della locandina
                      tipo: String(p?.tipo || ''), // normalizzo il tipo della locandina
                      id_media: String(p?.id_media || ''), // normalizzo l'id media della locandina
                    }))
                    .filter((p: any) => !!p.src); // tengo solo le locandine con src valida

                  if (
                    contesto.tipoSelezionato === 'film_serie' &&
                    locandine.length
                  ) {
                    locandine = mescolaDeterministicaLocandine(
                      locandine as any,
                      idCategoriaRiga,
                    ) as any;
                  } // se il tipo selezionato e' film_serie applico il rimescolamento deterministico per la categoria corrente

                  return {
                    idCategoria: idCategoriaRiga, // espongo l'id categoria normalizzato
                    category: String(x?.category || ''), // normalizzo la category della riga
                    locandine: locandine.length
                      ? (locandine as any)
                      : contesto.locandineDemo, // uso le locandine reali se presenti, altrimenti il fallback demo
                  };
                })
                .filter((x: any) => !!x.idCategoria); // scarto le righe senza id categoria valido

              contesto.precaricaImmaginiRighe(nuoveRighe); // avvio il preload delle immagini senza attendere esplicitamente il completamento

              const giaMap: Record<string, boolean> = {}; // preparo una mappa delle categorie gia' presenti nel catalogo
              for (const r of contesto.righeDemo) {
                giaMap[String(r.idCategoria)] = true; // segno tutte le categorie gia' esistenti
              }

              const soloNuove = nuoveRighe.filter(
                (r: any) => !giaMap[String(r.idCategoria)],
              ); // tengo solo le righe che non erano gia' presenti

              contesto.righeDemo.push(...soloNuove); // aggiungo in coda le sole righe nuove
              contesto.offsetRighe += nuoveRighe.length; // aggiorno l'offset usando il numero di righe ricevute dal server

              contesto.haAltreRighe = nuoveRighe.length === limiteJump; // considero che ci siano altre righe solo se il blocco ricevuto e' pieno
              if (!contesto.haAltreRighe) contesto.hoFinitoTutto = true; // se il blocco non e' pieno segno che ho finito tutto

              contesto.caricamentoRighe = false; // segno che il caricamento del blocco corrente e' terminato

              try {
                (window as any).ScrollTrigger?.refresh?.();
              } catch {} // provo ad aggiornare eventuali trigger di scroll senza generare errori bloccanti

              const trovataOra = contesto.righeDemo.some(
                (r: any) => String(r?.idCategoria) === id,
              ); // verifico se dopo l'inserimento la categoria richiesta e' finalmente presente
              if (trovataOra) return chiudi(true); // se l'ho trovata chiudo subito con successo
              if (!contesto.haAltreRighe) return chiudi(false); // se non ci sono piu' righe da caricare chiudo con fallimento

              if (contesto.timerCaricaFino)
                clearTimeout(contesto.timerCaricaFino); // annullo l'eventuale timer precedente del prossimo blocco
              contesto.timerCaricaFino = setTimeout(caricaUnBlocco, 0); // pianifico immediatamente il caricamento del blocco successivo
            },
            error: () => {
              // entro qui se la chiamata API fallisce durante il caricamento fino a categoria
              contesto.caricamentoRighe = false; // segno che non sto piu' caricando righe
              contesto.haAltreRighe = false; // considero terminata la disponibilita' di altre righe
              contesto.hoFinitoTutto = true; // segno che il catalogo e' da considerarsi finito
              contesto.scorrimentoCatalogo.impostaSpinnerScroll(false); // spengo lo spinner di scroll del catalogo
              chiudi(false); // chiudo il flusso con esito negativo
            },
          });
      };

      caricaUnBlocco(); // faccio partire subito il primo tentativo di caricamento
    });
  }
}
