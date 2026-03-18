import { Component, AfterViewInit } from '@angular/core';
import { UtilityService } from '../login/_login_service/login_utility.service';

@Component({
  selector: 'app-iscrizione',
  templateUrl: './iscrizione.component.html',
  styleUrls: ['./iscrizione.component.scss']
})
export class IscrizioneComponent implements AfterViewInit {

  ngAfterViewInit(): void {
    UtilityService.nascondiSottotitoloEScrol();
  }
}
