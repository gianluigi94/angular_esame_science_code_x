import { Component, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-ricevute',
  templateUrl: './ricevute.component.html',
  styleUrls: ['./ricevute.component.scss'],
})
export class RicevuteComponent implements AfterViewInit {
  ngAfterViewInit(): void {
    sessionStorage.setItem('vengo_da_ricevute', 'true');
  }
}
