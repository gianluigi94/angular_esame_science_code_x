import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { IscrizioneAccessoService } from '../_servizi_globali/iscrizione-accesso.service';
@Injectable({ providedIn: 'root' })
export class IscrizioneAccessoGuard implements CanActivate {

  constructor(
    private router: Router,
    private iscrizioneAccessoService: IscrizioneAccessoService,
  ) {}

  canActivate(): boolean | UrlTree {
    if (this.iscrizioneAccessoService.verificaEConsuma()) return true;
    return this.router.parseUrl('/');
  }
}
