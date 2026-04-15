import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-piano-card',
  templateUrl: './piano-card.component.html',
  styleUrls: ['./piano-card.component.scss'],
})
export class PianoCardComponent {
  @Input() pianoSelezionato: 'base' | 'pro' | null = null; // piano attualmente selezionato
  @Input() prezzoBase: string = ''; // prezzo del piano base da mostrare barrato
  @Input() prezzoPremium: string = ''; // prezzo del piano premium da mostrare barrato
  @Output() pianoScelto = new EventEmitter<'base' | 'pro'>(); // emetto il piano scelto al click

  seleziona(piano: 'base' | 'pro'): void {
    this.pianoScelto.emit(piano); // notifico il componente padre del piano scelto
  }
}
