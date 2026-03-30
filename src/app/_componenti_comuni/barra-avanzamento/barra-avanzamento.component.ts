// Componente presentazionale della barra di avanzamento che espone dati e inoltra il click al componente padre.

import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-barra-avanzamento',
  templateUrl: './barra-avanzamento.component.html',
  styleUrls: ['./barra-avanzamento.component.scss'],
})
export class BarraAvanzamentoComponent {
  @Input() modalitaAd = false; // segno se la barra e' usata in modalita' advertising
  @Input() visibile = false; // segno se la barra deve essere visibile
  @Input() percentualeAvanzamento = 0; //la percentuale di avanzamento corrente
  @Input() percentualeBuffer = 0; //la percentuale di buffer corrente
  @Input() durataTotaleMs = 0; //la durata totale in millisecondi
  @Input() posizioneCorrenteMs = 0; //la posizione corrente in millisecondi
  @Input() tempoCorrenteTesto = '00:00'; //il testo del tempo corrente
  @Input() durataTotaleTesto = '00:00'; //il testo della durata totale
  @Input() ariaLabel = ''; //la label aria del controllo

  @Output() clickBarra = new EventEmitter<MouseEvent>(); // emetto il click sulla barra verso il padre

  /**
   * Inoltra al componente padre il click ricevuto sulla barra.
   * PER ORA NON FUNZIONANTE
   * @param evento Evento mouse generato dal click sulla barra.
   * @returns void
   */
  onClickBarra(evento: MouseEvent): void {
    this.clickBarra.emit(evento); // inoltro il click ricevuto al chiamante esterno
  }
}
