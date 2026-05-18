import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-bottone-aggiungi',
  templateUrl: './bottone-aggiungi.component.html',
  styleUrls: ['./bottone-aggiungi.component.scss']
})
export class BottoneAggiungiComponent {
  @Input() titolo = '';
  @Output() azione = new EventEmitter<void>();

  emettiAzione(): void {
    this.azione.emit();
  }
}
