import gsap from 'gsap';

// ─── Funzioni pure – nessuna dipendenza Angular ─────────────────────────────

export function animaEntrata(): void {
  const titolo = document.querySelector('.titolo-animato') as HTMLElement;
  const labels = document.querySelectorAll('.label-sopra');
  const righe  = document.querySelectorAll('.campo-animato');

  gsap.set(titolo, { opacity: 0 });
  gsap.set(labels, { opacity: 0 });
  gsap.set(righe,  { opacity: 0, scaleX: 0, transformOrigin: 'center center' });

  gsap.to(titolo, { opacity: 1, delay: 0.35, duration: 2.2, ease: 'power2.out' });
  gsap.to(labels, { opacity: 1, duration: 2.2, ease: 'power2.out', stagger: 0.15 });
  gsap.to(righe,  { opacity: 1, scaleX: 1,   duration: 1.0, ease: 'power2.out', stagger: 0.15 });
}

export function animaEntrataStep2(): void {
  const titolo = document.querySelector('.titolo-animato') as HTMLElement;
  const labels = document.querySelectorAll('.label-sopra');
  const righe  = document.querySelectorAll('.campo-animato');

  gsap.to(titolo, { opacity: 1, delay: 0.1, duration: 2.0, ease: 'power2.out' });
  gsap.to(labels, { opacity: 1, duration: 1.8, ease: 'power2.out', stagger: 0.12 });
  gsap.to(righe,  { opacity: 1, scaleX: 1,   duration: 0.9, ease: 'power2.out', stagger: 0.12 });
}

/** Resetta visivamente titolo, labels e righe prima di animare il nuovo step. */
export function resetElementiStep(): void {
  const titolo = document.querySelector('.titolo-animato') as HTMLElement;
  const labels = document.querySelectorAll('.label-sopra');
  const righe  = document.querySelectorAll('.campo-animato');

  gsap.set(titolo, { opacity: 0 });
  gsap.set(labels, { opacity: 0 });
  gsap.set(righe,  { opacity: 0, scaleX: 0, transformOrigin: 'center center' });
}

/**
 * Animazione uscita (uguale per step 1 e step 2).
 * Risolve la Promise dopo 550 ms (tempo safe per il completamento GSAP).
 */
export function animaUscita(): Promise<void> {
  const titolo = document.querySelector('.titolo-animato') as HTMLElement | null;
  const labels = document.querySelectorAll('.label-sopra');
  const righe  = document.querySelectorAll('.campo-animato');

  return new Promise<void>((resolve) => {
    if (titolo) gsap.to(titolo, { opacity: 0, duration: 0.3, ease: 'power2.in' });
    gsap.to(labels, { opacity: 0,  duration: 0.35, ease: 'power2.in' });
    gsap.to(righe,  { opacity: 0, scaleX: 0, duration: 0.35, ease: 'power2.in', stagger: 0.05 });
    setTimeout(() => resolve(), 550);
  });
}

export function animaSfocatura(entra: boolean): Promise<void> {
  const sfocatura = document.querySelector('.sfocatura') as HTMLElement | null;
  if (!sfocatura) return Promise.resolve();

  return new Promise<void>((resolve) => {
    gsap.to(sfocatura, {
      opacity: entra ? 0.95 : 0,
      duration: 1.1,
      ease: 'power2.inOut',
      onComplete: resolve,
    });
  });
}
