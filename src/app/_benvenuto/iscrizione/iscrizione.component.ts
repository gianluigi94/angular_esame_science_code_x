import { Component, AfterViewInit } from '@angular/core';
import { UtilityService } from '../login/_login_service/login_utility.service';

@Component({
  selector: 'app-iscrizione',
  templateUrl: './iscrizione.component.html',
  styleUrls: ['./iscrizione.component.scss']
})
export class IscrizioneComponent implements AfterViewInit {

  saltaAnimazioneUscita: boolean = false; // flag per il guard, per ora sempre false (nessuna animazione di uscita del pannello)

  ngAfterViewInit(): void {
    UtilityService.nascondiSottotitoloEScrol();
  }

  animaUscita(): Promise<void> {
    return Promise.resolve(); // la registrazione non ha un pannello animato in uscita, risolvo subito
  }
}
