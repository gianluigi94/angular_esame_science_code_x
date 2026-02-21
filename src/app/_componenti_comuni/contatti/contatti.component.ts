import { Component, AfterViewInit, ViewChild, ElementRef, OnInit } from '@angular/core';
import { UtilityService } from 'src/app/_benvenuto/login/_login_service/login_utility.service';
import { LoginAnimazioniService } from 'src/app/_servizi_globali/animazioni_saturno/gsap/login_animazioni.service';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { IRispostaServer } from 'src/app/_interfacce/IRispostaServer.interface';
import { take } from 'rxjs';

@Component({
  selector: 'app-contatti',
  templateUrl: './contatti.component.html',
  styleUrls: ['./contatti.component.scss'],
})
export class ContattiComponent implements AfterViewInit, OnInit {
  @ViewChild('contattiContenuto', { static: true })
  contattiContenuto!: ElementRef<HTMLElement>;

  mail: string = '';           // Campo mail ricevuto dal server
  indirizzo: string = '';      // Campo indirizzo ricevuto dal server

  constructor(
    private loginAnimazioniService: LoginAnimazioniService,
    private apiService: ApiService                          // Inietto il servizio API
  ) {}

  ngOnInit(): void {
    this.apiService.getDatiPersonali().pipe( // Chiamo l'endpoint /dati-personali
      take(1)                                // Prendo solo la prima risposta e chiudo
    ).subscribe((rit: IRispostaServer) => {  // Mi sottoscrivo alla risposta del server
      const dato = rit.data[0];             // Prendo il primo record dell'array
      this.mail = dato.mail;               // Salvo la mail
      this.indirizzo = dato.indirizzo;     // Salvo l'indirizzo
    });
  }

  ngAfterViewInit(): void {
    sessionStorage.setItem('vengo_da_contatti', 'true');
    UtilityService.nascondiSottotitoloEScrol();
  }

  animaUscita(): Promise<void> {
    if (!this.contattiContenuto?.nativeElement) {
      return Promise.resolve();
    }
    return this.loginAnimazioniService.animaUscita(
      this.contattiContenuto.nativeElement
    );
  }
}
