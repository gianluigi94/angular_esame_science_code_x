// Helper che gestisce l'animazione ciclica del clearcoat (alone di luce).
import { gsap } from 'gsap';

export interface ClearcoatMaterial {
  clearcoat: number; // rappresento il valore del clearcoat del materiale
}

export class AnimateClearcoatHelper {

  private clearcoatTimeline: gsap.core.Timeline | null = null; // mi tengo il riferimento alla timeline GSAP
  private readonly duration = 1.85; // durata di ogni fase dell'animazione
  private readonly delay    = 5; // pausa tra un ciclo e l'altro

  /**
   * Avvia l'animazione ciclica del clearcoat sul materiale(luce lampegiante circolare, punto luce).
   *
   * Se esiste una timeline precedente la interrompe e ne crea una nuova
   * con oscillazione continua tra due valori.
   *
   * @param material Materiale su cui animare il clearcoat.
   * @returns void
   */
  animateClearcoat(material: ClearcoatMaterial): void {
    if (this.clearcoatTimeline) { // controllo se esiste gia' una timeline attiva
      this.clearcoatTimeline.kill(); // la distruggo per evitare duplicati
      this.clearcoatTimeline = null; // azzero il riferimento
    }

    const tl = gsap.timeline({ repeat: -1, repeatDelay: this.delay }); // creo una timeline infinita con delay tra i cicli
    tl.to(material, { clearcoat: 0.5,   duration: this.duration, ease: 'power1.inOut' }) // aumento il clearcoat
      .to(material, { clearcoat: 0.155, duration: this.duration, ease: 'power1.inOut' }); // lo riporto al valore base

    this.clearcoatTimeline = tl; // salvo la timeline per controllarla dopo
  }

  /**
   * Mette in pausa l'animazione del clearcoat.
   *
   * @returns void
   */
  pauseClearcoat(): void {
    this.clearcoatTimeline?.pause(); // metto in pausa la timeline se esiste
  }

  /**
   * Riprende l'animazione del clearcoat.
   *
   * @returns void
   */
  resumeClearcoat(): void {
    this.clearcoatTimeline?.play(); // riprendo la timeline se esiste
  }

  /**
   * Distrugge completamente l'animazione del clearcoat.
   *
   * @returns void
   */
  kill(): void {
    if (this.clearcoatTimeline) { // controllo se esiste una timeline
      this.clearcoatTimeline.kill(); // la distruggo definitivamente
      this.clearcoatTimeline = null; // azzero il riferimento
    }
  }
}
