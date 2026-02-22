import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription, take } from 'rxjs';
import { ApiService } from 'src/app/_servizi_globali/api.service';
import { IRispostaServer } from 'src/app/_interfacce/IRispostaServer.interface';
import { Authservice } from 'src/app/_benvenuto/login/_login_service/auth.service';

@Component({
  selector: 'app-dati-personali',
  templateUrl: './dati-personali.component.html',
  styleUrls: ['./dati-personali.component.scss'],
})
export class DatiPersonaliComponent implements OnInit, OnDestroy {
  visibile = false;

  mail: string = '';
  indirizzo: string = '';

  private sub = new Subscription();
  private onApri = () => {
    if (!this.isLoggato()) return;
    this.visibile = true;
    this.caricaDati();
  };
  constructor(
    private authService: Authservice,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    window.addEventListener('apri-dati-personali', this.onApri);

    // ✅ se durante la visualizzazione fai logout, chiudo
    this.sub.add(
      this.authService.leggiObsAuth().subscribe(() => {
       if (this.visibile && !this.isLoggato()) this.visibile = false;
      })
    );
  }

  ngOnDestroy(): void {
    window.removeEventListener('apri-dati-personali', this.onApri);
    this.sub.unsubscribe();
  }



  private isLoggato(): boolean {
    return !!this.authService.leggiObsAuth().value?.tk;
  }

  private caricaDati(): void {
    this.apiService.getDatiPersonali()
      .pipe(take(1))
      .subscribe((rit: IRispostaServer) => {
        const dato = rit?.data?.[0];
        this.mail = dato?.mail || '';
        this.indirizzo = dato?.indirizzo || '';
      });
  }
}
