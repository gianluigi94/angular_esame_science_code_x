  // Componente che visualizza e gestisce la coda dei toast dell’app, mostrando i messaggi emessi dal servizio e chiudendoli automaticamente o su richiesta.

  import { Component, OnDestroy, OnInit } from '@angular/core';
  import { Subscription } from 'rxjs';
  import { ToastService} from 'src/app/_servizi_globali/toast.service';
  import { ToastMessage } from 'src/app/_type/toast-messaggio.type';
  @Component({
    selector: 'app-toast-container',
    templateUrl: './toast-container.component.html',
    styleUrls: ['./toast-container.component.scss'],
  })
  export class ToastContainerComponent implements OnInit, OnDestroy {
    toasts: ToastMessage[] = []; // mi tengo la lista dei toast attualmente visibili
    sub?: Subscription; // mi tengo la sottoscrizione principale che ascolta i nuovi toast
    subChiudi?: Subscription; // mi tengo la sottoscrizione che ascolta la richiesta di chiusura di un singolo toast
    subChiudiTutti?: Subscription; // mi tengo la sottoscrizione che ascolta la richiesta di chiusura di tutti i toast
    constructor(
      // preparo il componente ricevendo i servizi necessari
      private toastService: ToastService
    ) {}

    /**
     * Inizializza il componente e registra le sottoscrizioni
     * agli eventi del servizio dei toast.
     *
     * - aggiunge i nuovi toast alla lista
     * - rimuove automaticamente quelli non persistenti
     * - ascolta richieste di chiusura singola o totale
     */
    ngOnInit(): void {
      // inizializzo le sottoscrizioni quando il componente viene creato
      this.sub = this.toastService.toast$.subscribe((msg) => {
        console.log('[TOAST] nuovo toast:', msg.testo?.substring(0, 40), 'chiave:', msg.chiave);
        this.toasts.push(msg);

        if (msg.persistente) {
          // se il toast è persistente non lo rimuovo automaticamente
          return;
        }

        setTimeout(() => {
          // imposto una rimozione automatica dopo un certo tempo
          const idx = this.toasts.indexOf(msg); // cerco la posizione del toast nella lista attuale
          if (idx !== -1) {
            // continuo solo se il toast esiste ancora nella lista
            this.toasts.splice(idx, 1); // rimuovo il toast dalla lista così sparisce dall'interfaccia
          }
        }, 8000); // durata prima della chiusura automatica
      });

      this.subChiudi = this.toastService.chiudi$.subscribe((chiave) => {
        console.log('[TOAST] chiudi richiesto per chiave:', chiave);
        this.toasts = this.toasts.filter((t) => t.chiave !== chiave);
      });

      this.subChiudiTutti = this.toastService.chiudiTutti$.subscribe(() => {
        console.log('[TOAST] chiudiTutti richiesto');
        this.toasts = [];
      });
    }

    /**
     * Gestisce l'azione 'ripeti accesso' associata a toast persistenti.
     *
     * Forza il ricaricamento della pagina per riavviare
     * il flusso di autenticazione.
     *
     * @param event Evento di click del mouse.
     */
    onRipetiAccesso(event: MouseEvent): void {
      // gestisco il clic sul comando che forza un nuovo accesso
      event.preventDefault(); // evito il comportamento predefinito del click
      window.location.reload(); // ricarico la pagina per far ripartire il flusso di accesso
    }

    /**
     * Ripulisce tutte le sottoscrizioni attive quando
     * il componente viene distrutto.
     *
     */
    ngOnDestroy(): void {
      // ripulisco le risorse quando il componente viene distrutto da elementi (se presenti)
      this.sub?.unsubscribe(); // chiudo la sottoscrizione dei nuovi toast
      this.subChiudi?.unsubscribe(); // chiudo la sottoscrizione di chiusura singola
      this.subChiudiTutti?.unsubscribe(); // chiudo la sottoscrizione di chiusura totale
    }
  }
