import { Component, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-piano',
  templateUrl: './piano.component.html',
})
export class PianoComponent implements AfterViewInit {
  ngAfterViewInit(): void {
    sessionStorage.setItem('vengo_da_piano', 'true');
  }
}
