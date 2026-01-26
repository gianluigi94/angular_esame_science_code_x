import { Component } from '@angular/core';

@Component({
  selector: 'app-sfondo',
  templateUrl: './sfondo.component.html',
  styleUrls: ['./sfondo.component.scss']
})
export class SfondoComponent {

  /**
   * Hook di inizializzazione del componente.
   *
   * Calcola l'1% dell'altezza visibile della finestra
   * e lo salva come variabile CSS '--vh'.
   *
   * La variabile viene aggiornata anche al resize
   * per gestire correttamente cambi di orientamento
   * e variazioni della UI del browser.
   */
  ngOnInit(): void {
    // calcolo l'1% dell'altezza visibile del dispositivo e lo salva come variabile CSS
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVH(); // chiamo la funzione
    window.addEventListener('resize', setVH); //agiorno le dimensioni
  }


}
