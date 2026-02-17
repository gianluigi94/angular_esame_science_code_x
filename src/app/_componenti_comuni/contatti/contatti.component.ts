import { Component, AfterViewInit } from '@angular/core';
import { UtilityService } from 'src/app/_benvenuto/login/_login_service/login_utility.service';

@Component({
  selector: 'app-contatti',
  templateUrl: './contatti.component.html',
  styles: [`:host { display: block; }`],
})
export class ContattiComponent implements AfterViewInit {

  ngAfterViewInit(): void {
    UtilityService.nascondiSottotitoloEScrol();
  }
}
