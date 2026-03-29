import gsap from 'gsap';

/**
 * Gestisce l'animazione di entrata iniziale degli elementi dello step corrente.
 * - Recupera dal DOM titolo, label e campi animati
 * - Imposta uno stato iniziale invisibile
 * - Avvia le animazioni di comparsa con tempi e ritardi diversi
 *
 * @returns void
 */
export function animaEntrata(): void {
  const titolo = document.querySelector('.titolo-animato') as HTMLElement; // recupero dal DOM il titolo principale che devo animare in entrata
  const labels = document.querySelectorAll('.label-sopra'); // recupero tutte le label sopra i campi del form
  const righe = document.querySelectorAll('.campo-animato'); // recupero tutte le righe o campi che devono comparire con animazione

  gsap.set(titolo, { opacity: 0 }); // imposto il titolo inizialmente invisibile
  gsap.set(labels, { opacity: 0 }); // imposto tutte le label inizialmente invisibili
  gsap.set(righe, { opacity: 0, scaleX: 0, transformOrigin: 'center center' }); // imposto i campi invisibili e chiusi orizzontalmente partendo dal centro

  gsap.to(titolo, {
    opacity: 1,
    delay: 0.35,
    duration: 2.2,
    ease: 'power2.out',
  }); // faccio comparire gradualmente il titolo con un piccolo ritardo iniziale
  gsap.to(labels, {
    opacity: 1,
    duration: 2.2,
    ease: 'power2.out',
    stagger: 0.15,
  }); // faccio comparire le label una dopo l'altra con un piccolo intervallo
  gsap.to(righe, {
    opacity: 1,
    scaleX: 1,
    duration: 1.0,
    ease: 'power2.out',
    stagger: 0.15,
  }); // apro e rendo visibili i campi in sequenza
}

/**
 * Gestisce l'animazione di entrata del secondo step.
 * - Recupera dal DOM titolo, label e campi animati
 * - Avvia le animazioni di comparsa con tempi leggermente piu' rapidi
 *   rispetto all'entrata iniziale del primo step
 *
 * @returns void
 */
export function animaEntrataStep2(): void {
  const titolo = document.querySelector('.titolo-animato') as HTMLElement; // recupero dal DOM il titolo principale anche per il secondo step
  const labels = document.querySelectorAll('.label-sopra'); // recupero tutte le label del secondo step
  const righe = document.querySelectorAll('.campo-animato'); // recupero tutti i campi animati del secondo step

  gsap.to(titolo, {
    opacity: 1,
    delay: 0.1,
    duration: 2.0,
    ease: 'power2.out',
  }); // faccio comparire il titolo con un delay piu' breve rispetto al primo step
  gsap.to(labels, {
    opacity: 1,
    duration: 1.8,
    ease: 'power2.out',
    stagger: 0.12,
  }); // mostro le label in sequenza con tempi leggermente piu' rapidi
  gsap.to(righe, {
    opacity: 1,
    scaleX: 1,
    duration: 0.9,
    ease: 'power2.out',
    stagger: 0.12,
  }); // apro e mostro i campi del secondo step con una transizione piu' veloce
}

/**
 * Reimposta visivamente gli elementi dello step allo stato iniziale.
 * - Recupera dal DOM titolo, label e campi animati
 * - Riporta tutto invisibile
 * - Richiude orizzontalmente i campi prima di una nuova entrata
 *
 * @returns void
 */
export function resetElementiStep(): void {
  const titolo = document.querySelector('.titolo-animato') as HTMLElement; // recupero il titolo per riportarlo allo stato iniziale
  const labels = document.querySelectorAll('.label-sopra'); // recupero le label da resettare visivamente
  const righe = document.querySelectorAll('.campo-animato'); // recupero i campi da riportare allo stato iniziale

  gsap.set(titolo, { opacity: 0 }); // nascondo di nuovo il titolo
  gsap.set(labels, { opacity: 0 }); // nascondo di nuovo tutte le label
  gsap.set(righe, { opacity: 0, scaleX: 0, transformOrigin: 'center center' }); // richiudo orizzontalmente i campi e li rendo invisibili
}

/**
 * Gestisce l'animazione di uscita degli elementi dello step corrente.
 * - Recupera dal DOM titolo, label e campi animati
 * - Avvia la loro scomparsa con una breve animazione
 * - Restituisce una Promise risolta quando il tempo di uscita e' terminato
 *
 * @returns Promise<void> Promise risolta quando l'uscita visiva e' conclusa.
 */
export function animaUscita(): Promise<void> {
  const titolo = document.querySelector(
    '.titolo-animato',
  ) as HTMLElement | null; // recupero il titolo da animare in uscita, se presente
  const labels = document.querySelectorAll('.label-sopra'); // recupero tutte le label da far sparire
  const righe = document.querySelectorAll('.campo-animato'); // recupero tutti i campi da chiudere e nascondere

  return new Promise<void>((resolve) => {
    // costruisco una promise per poter aspettare la fine visiva dell'animazione di uscita
    if (titolo)
      gsap.to(titolo, { opacity: 0, duration: 0.3, ease: 'power2.in' }); // se il titolo esiste lo faccio svanire rapidamente
    gsap.to(labels, { opacity: 0, duration: 0.35, ease: 'power2.in' }); // faccio sparire tutte le label
    gsap.to(righe, {
      opacity: 0,
      scaleX: 0,
      duration: 0.35,
      ease: 'power2.in',
      stagger: 0.05,
    }); // faccio sparire e richiudo i campi in sequenza
    setTimeout(() => resolve(), 550); // risolvo la promise dopo un tempo sicuro che copre il completamento dell'animazione
  });
}

/**
 * Gestisce l'animazione di comparsa o scomparsa dello strato di sfocatura.
 * - Recupera dal DOM l'elemento della sfocatura
 * - Se non esiste termina subito
 * - Se esiste anima la sua opacita' in entrata o in uscita
 *
 * @param entra boolean Se true mostra la sfocatura, se false la nasconde.
 * @returns Promise<void> Promise risolta quando l'animazione della sfocatura e' terminata.
 */
export function animaSfocatura(entra: boolean): Promise<void> {
  const sfocatura = document.querySelector('.sfocatura') as HTMLElement | null; // recupero dal DOM l'elemento che gestisce l'effetto di sfocatura
  if (!sfocatura) return Promise.resolve(); // se non trovo l'elemento non ho nulla da animare e termino subito

  return new Promise<void>((resolve) => {
    // costruisco una promise per segnalare quando l'animazione della sfocatura e' terminata
    gsap.to(sfocatura, {
      opacity: entra ? 0.95 : 0, // se entra aumento quasi al massimo l'opacita', altrimenti la porto a zero
      duration: 1.1, // imposto la durata dell'animazione della sfocatura
      ease: 'power2.inOut', // uso un easing morbido sia in entrata sia in uscita
      onComplete: resolve, // quando GSAP finisce risolvo la promise
    });
  });
}
