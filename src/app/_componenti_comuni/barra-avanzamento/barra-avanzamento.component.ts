import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-barra-avanzamento',
  templateUrl: './barra-avanzamento.component.html',
  styleUrls: ['./barra-avanzamento.component.scss'],
})
export class BarraAvanzamentoComponent {
  @Input() modalitaAd = false;
  @Input() visibile = false;
  @Input() percentualeAvanzamento = 0;
  @Input() percentualeBuffer = 0;
  @Input() durataTotaleMs = 0;
  @Input() posizioneCorrenteMs = 0;
  @Input() tempoCorrenteTesto = '00:00';
  @Input() durataTotaleTesto = '00:00';
  @Input() ariaLabel = '';

  @Output() clickBarra = new EventEmitter<MouseEvent>();

  onClickBarra(evento: MouseEvent): void {
    this.clickBarra.emit(evento);
  }
}
