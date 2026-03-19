import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { UtilityService } from '../login/_login_service/login_utility.service';

const CHIAVE_PAGINA_REGISTRAZIONE = 'pagina_registrazione';

@Component({
  selector: 'app-iscrizione',
  templateUrl: './iscrizione.component.html',
  styleUrls: ['./iscrizione.component.scss']
})
export class IscrizioneComponent implements OnInit, AfterViewInit {

  saltaAnimazioneUscita: boolean = false;

  ngOnInit(): void {
  try { sessionStorage.setItem(CHIAVE_PAGINA_REGISTRAZIONE, '1'); } catch {}
}


  ngAfterViewInit(): void {
    UtilityService.nascondiSottotitoloEScrol();
  }



  animaUscita(): Promise<void> {
    return Promise.resolve();
  }
}
