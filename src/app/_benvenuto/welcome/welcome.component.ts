// Componente visibile se non 'autenticato' che gestisce lo stato di loading finché Saturno non termina il caricamento e, ascoltando le navigazioni del Router, abilita/disabilita animazioni di ingresso e scrol.

import { Component,  Output, EventEmitter, OnInit, OnDestroy} from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject, filter, takeUntil } from 'rxjs';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss'],
})
export class WelcomeComponent implements OnInit, OnDestroy {
  isLoading = true; // flag per mostrare lo stato di caricamento finche' Saturno non ha finito

  @Output() saturnLoadDone = new EventEmitter<void>(); // espongo un evento per avvisare il genitore quando Saturno ha completato il caricamento

  usaAnimazioniIngresso = true; // decido se usare le animazioni di ingresso e di default le abilito
  usaAnimazioniScroll = true; // decido se usare le animazioni legate allo scroll e di default le abilito

  distruggi$ = new Subject<void>(); // creo un segnale che usero' per chiudere le sottoscrizioni quando il componente viene distrutto

  constructor(private router: Router) {} // mi inietto il router per ascoltare i cambi di navigazione

/**
 * Metodo eseguito all'inizializzazione del componente.
 *
 * Ascolta gli eventi di navigazione del Router e, quando una navigazione termina,
 * abilita o disabilita le animazioni di ingresso e di scroll in base alla rotta corrente
 *
 * @returns void
 */
  ngOnInit(): void {
    // inizializzo la logica di ascolto quando il componente parte
    this.router.events // ascolto gli eventi del router per capire dove mi trovo
      .pipe(
        // compongo gli operatori per filtrare e gestire la chiusura
        filter((evento) => evento instanceof NavigationEnd), // considero solo gli eventi di fine navigazione
        takeUntil(this.distruggi$) // smetto di ascoltare quando emetto il segnale di distruzione
      )
      .subscribe((evento: any) => {
        // reagisco a ogni navigazione completata
        const url = evento.urlAfterRedirects || evento.url; // prendo l'url finale dopo eventuali reindirizzamenti
                const path = (url || '').split('?')[0].split('#')[0];
        const isLogin =
          path === '/benvenuto/login' ||
          path === '/benvenuto/login/' ||
          path === '/benvenuto/accedi' ||
          path === '/benvenuto/accedi/';

        this.usaAnimazioniIngresso = !isLogin; // disattivo le animazioni di ingresso quando sono sul login
        this.usaAnimazioniScroll = !isLogin; // disattivo le animazioni di scroll quando sono sul login
      });
  }

/**
 * Gestisce la notifica di completamento del caricamento di Saturno.
 *
 * Disattiva lo stato di loading e rilancia l'evento verso l'esterno
 * per informare il componente genitore che il caricamento e' concluso.
 *
 * @returns void
 */
  onSaturnLoadDone(): void {
    // gestisco l'evento che mi segnala che Saturno ha finito di caricarsi
    this.isLoading = false; // spengo lo stato di caricamento
    this.saturnLoadDone.emit(); // rilancio l'evento verso l'esterno per notificare che il caricamento e' completato
  }

/**
 * Metodo eseguito alla distruzione del componente.
 *
 * Emette e completa il segnale 'distruggi$' per chiudere tutte le sottoscrizioni
 * collegate tramite takeUntil ed evitare memory leak.
 *
 * @returns void
 */
  ngOnDestroy(): void {
    // gestisco la distruzione del componente per ripulire le risorse
    this.distruggi$.next(); // emetto il segnale che forza la chiusura delle sottoscrizioni collegate
    this.distruggi$.complete(); // completo il subject
  }
}
