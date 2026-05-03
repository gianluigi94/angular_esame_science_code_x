
import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { CambioLinguaService } from 'src/app/_servizi_globali/cambio-lingua.service';
import { IndirizzoFormService } from 'src/app/_servizi_globali/indirizzo-form.service';

@Component({
  selector: 'app-form-indirizzo',
  templateUrl: './form-indirizzo.component.html',
  styleUrls: ['./form-indirizzo.component.scss'],
})
export class FormIndirizzoComponent {

  @Input() form!: FormGroup;
  @Input() service!: IndirizzoFormService;
  @Input() formInviato = false;
  @Input() layout: 'registrazione' | 'profilo' = 'registrazione';

  constructor(public cambioLinguaService: CambioLinguaService) {}
}
