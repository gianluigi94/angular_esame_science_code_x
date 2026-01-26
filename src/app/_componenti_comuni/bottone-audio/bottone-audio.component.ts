import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AudioGlobaleService } from './../../_servizi_globali/audio-globale.service';

@Component({
  selector: 'app-bottone-audio',
  templateUrl: './bottone-audio.component.html',
  styleUrls: ['./bottone-audio.component.scss'],
})
export class BottoneAudioComponent implements OnInit, OnDestroy {
  attivo = false;
  sottoscrizioneStato: Subscription | null = null;

  constructor(public audioGlobale: AudioGlobaleService) {}

  ngOnInit(): void {
    this.sottoscrizioneStato = this.audioGlobale.statoAudio$.subscribe(val => {
      this.attivo = val;
    });
  }

  ngOnDestroy(): void {
    if (this.sottoscrizioneStato) {
      try { this.sottoscrizioneStato.unsubscribe(); } catch {}
      this.sottoscrizioneStato = null;
    }
  }

  alClic(): void {
    this.audioGlobale.toggle();
  }
}
