// Componente bottone preferiti che riceve un titolo esterno e gestisce localmente lo stato preferito dell'elemento.
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-bottone-preferiti',
  templateUrl: './bottone-preferiti.component.html',
  styleUrls: ['./bottone-preferiti.component.scss']
})
export class BottonePreferitiComponent {
  @Input() titolo = ''; // ricevo il titolo associato all'elemento corrente
  preferito = false; // tengo lo stato locale dei preferiti

  /**
   * Gestisce il cambio dello stato preferito dell'elemento.
   *
   * Inverte il valore corrente del flag preferito.
   *
   * @returns void
   */
  togglePreferito(): void {
    this.preferito = !this.preferito; // inverto lo stato preferito corrente
  }
}
