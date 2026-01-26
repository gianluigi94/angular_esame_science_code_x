import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-bottone-preferiti',
  templateUrl: './bottone-preferiti.component.html',
  styleUrls: ['./bottone-preferiti.component.scss']
})
export class BottonePreferitiComponent {
  @Input() titolo = '';
  preferito = false;

  togglePreferito(): void {
    this.preferito = !this.preferito;
  }
}
