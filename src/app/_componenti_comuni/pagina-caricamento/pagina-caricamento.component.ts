import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-pagina-caricamento',
  templateUrl: './pagina-caricamento.component.html',
  styleUrls: ['./pagina-caricamento.component.scss'],
})
export class PaginaCaricamentoComponent {
  @Input() mostraSpinner = true; // mi faccio dire dall'esterno se devo mostrare lo spinner, e di default lo mostro
  @Input() stileAvvioCatalogo = false; // mi faccio dire dall'esterno se devo usare lo stile di avvio del catalogo, e di default non lo uso
  @Input() isFirefox = false; // mi faccio dire dall'esterno se sto girando su Firefox, e di default considero di no
}
