// Componente bottone audio globale che riflette lo stato del servizio e permette il toggle dell'audio.
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AudioGlobaleService } from './../../_servizi_globali/audio-globale.service';

@Component({
  selector: 'app-bottone-audio',
  templateUrl: './bottone-audio.component.html',
  styleUrls: ['./bottone-audio.component.scss'],
})
export class BottoneAudioComponent implements OnInit, OnDestroy {
  attivo = false; //lo stato locale del bottone audio
  sottoscrizioneStato: Subscription | null = null; // mi salvo la sottoscrizione allo stato audio globale

  constructor(public audioGlobale: AudioGlobaleService) {}

  /**
   * Metodo eseguito all'inizializzazione del componente.
   *
   * Si sottoscrive allo stato audio globale per mantenere aggiornato
   * lo stato visivo del bottone.
   *
   * @returns void
   */
  ngOnInit(): void {
    this.sottoscrizioneStato = this.audioGlobale.statoAudio$.subscribe(val => {
      this.attivo = val; // aggiorno lo stato locale quando cambia lo stato audio globale
    });
  }

  /**
   * Metodo eseguito alla distruzione del componente.
   *
   * Rimuove la sottoscrizione allo stato audio globale se presente.
   *
   * @returns void
   */
  ngOnDestroy(): void {
    if (this.sottoscrizioneStato) {
      try { this.sottoscrizioneStato.unsubscribe(); } catch {} // provo a disiscrivermi senza rompere il flusso
      this.sottoscrizioneStato = null; // azzero il riferimento alla sottoscrizione
    }
  }

  /**
   * Gestisce il click sul bottone audio.
   *
   * Inverte lo stato audio globale tramite il servizio dedicato.
   *
   * @returns void
   */
  alClic(): void {
    this.audioGlobale.toggle(); // cambio lo stato audio globale al click
  }
}
