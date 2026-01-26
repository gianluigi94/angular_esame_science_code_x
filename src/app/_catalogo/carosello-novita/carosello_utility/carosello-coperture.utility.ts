// Utility che evita 'corse' tra caricamento e interazione, permettendo di capire (o attendere) quando gli overlay che coprono la pagina sono davvero spariti.

export class CaroselloCopertureUtility {

  /**
 * Controlla se esistono ancora coperture/overlay visibili sopra la pagina.
 *
 * Verifica la presenza e la visibilita' reale di una lista di selettori
 * (componenti e overlay) usando display, visibility e opacity.
 *
 * @returns true se almeno una copertura risulta visibile, false altrimenti
 */
  static copertureAncoraVisibili(): boolean {
    // Controllo se ci sono ancora coperture/overlay visibili sopra la pagina
    const selettori = [
      // Definisco i selettori degli elementi che sono 'coperture'
      'app-saturno', // Selettore del componente saturno
      'app-sfondo', // Selettore del componente sfondo
      '.loading-overlay', // Selettore di overlay di caricamento
    ];

    for (const sel of selettori) {
      // Scorro tutti i selettori da controllare
      const el = document.querySelector(sel) as HTMLElement | null; // Cerco l'elemento nel DOM
      if (!el) continue; // Se non disponibile, passo al selettore successivo

      const st = window.getComputedStyle(el); // Leggo lo stile calcolato per capire se e' visibile
      const op = Number(st.opacity || '1'); // Converto l'opacita' in numero con fallback a 1

      const visibile = // Calcolo una condizione unica di visibilita' reale
        st.display !== 'none' && // Deve essere renderizzato
        st.visibility !== 'hidden' && // Deve essere visibile
        op > 0.01; // Deve avere un'opacita' percepibile

      if (visibile) return true; // Se almeno una copertura e' visibile, ritorno true
    }

    return false; // Se nessuna copertura risulta visibile, ritorno false
  }

  /**
 * Attende che le coperture/overlay non siano piu' visibili oppure che scada il timeout massimo.
 *
 * Usa un controllo a frame (requestAnimationFrame) e un MutationObserver per reagire
 * a cambiamenti del DOM e risolvere appena le coperture spariscono.
 *
 * @param timeoutMs Tempo massimo di attesa in millisecondi (default: 8000)
 * @returns Promise risolta quando le coperture non sono piu' visibili o al timeout
 */
  static attendiCopertureNonVisibili(timeoutMs: number = 8000): Promise<void> {
    // Attendo che le coperture spariscano o scada un timeout
    return new Promise((resolve) => {
      // Ritorno una promise che si risolve quando le coperture non sono piu' visibili
      if (!CaroselloCopertureUtility.copertureAncoraVisibili())
        return resolve(); // Se gia' non ci sono coperture, risolvo subito

      let finito = false; // Uso un flag per evitare resolve/disconnect multipli
      const t0 = performance.now(); // Salvo il tempo di inizio per calcolare il timeout

      const stop = () => {
        // Definisco una funzione di stop che chiude tutto e risolve la promise
        if (finito) return; // Evito di eseguire stop piu' volte
        finito = true; // Segno che ho finito
        try {
          obs.disconnect();
        } catch {} // Disconnetto l'observer se possibile
        resolve(); // Risolvo la promise
      };

      const check = () => {
        // Definisco un loop di controllo via requestAnimationFrame
        if (finito) return; // Esco se ho gia' finito

        const elapsed = performance.now() - t0; // Calcolo il tempo trascorso
        if (elapsed >= timeoutMs) return stop(); // Se supero il timeout, chiudo comunque come fallback

        if (!CaroselloCopertureUtility.copertureAncoraVisibili()) return stop(); // Se le coperture sono sparite, chiudo

        requestAnimationFrame(check); // Altrimenti ricontrollo al prossimo frame
      };

      const obs = new MutationObserver(() => {
        // Creo un observer per reagire a cambi DOM/stili
        if (!finito && !CaroselloCopertureUtility.copertureAncoraVisibili())
          stop(); // Se con una mutazione spariscono le coperture, chiudo
      });

      try {
        // Provo ad attaccare l'observer al body in modo safe
        obs.observe(document.body, {
          // Osservo il body per cambi che possono influire sulla visibilita' delle coperture
          childList: true, // Osservo aggiunte/rimozioni di nodi figli
          subtree: true, // Osservo anche nel sottoalbero
          attributes: true, // Osservo cambi di attributi
          attributeFilter: ['class', 'style'], // class e style
        });
      } catch {} // Ignoro errori di observe per non bloccare

      requestAnimationFrame(check); // Avvio il primo controllo al prossimo frame
    });
  }
}
