import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpResponse,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, take } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { ToastService } from '../_servizi_globali/toast.service';
import { StatoPagamentoService } from '../_servizi_globali/stato-pagamento.service';

@Injectable()
export class PagamentoInterceptor implements HttpInterceptor {
  private toastAttivo = false;
  private readonly chiaveToast = 'toast_pagamento_fallito';

  constructor(
    private toastService: ToastService,
    private translate: TranslateService,
    private statoPagamento: StatoPagamentoService,
  ) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      tap((event) => {
        if (!(event instanceof HttpResponse)) return;

        const valore = event.headers.get('X-Pagamento-Fallito');
        if (valore === null) return;

        if (valore === '1' && !this.toastAttivo) {
          this.toastAttivo = true;
          this.statoPagamento.aggiorna(true);
          this.translate
            .get('ui.toast.pagamento_fallito')
            .pipe(take(1))
            .subscribe((testo) => {
              this.toastService.mostra(
                testo,
                'allarm',
                true,
                'correggi_pagamento',
                this.chiaveToast,
              );
            });
        }

        if (valore === '0' && this.toastAttivo) {
          this.toastAttivo = false;
          this.statoPagamento.aggiorna(false);
          this.toastService.chiudi(this.chiaveToast);
        }
      }),
    );
  }
}
