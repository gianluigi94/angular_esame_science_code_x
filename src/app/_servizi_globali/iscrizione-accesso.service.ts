import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class IscrizioneAccessoService {
  private accesso = false;

  autorizza(): void {
    this.accesso = true;
  }

  verificaEConsuma(): boolean {
    const ok = this.accesso;
    this.accesso = false;
    return ok;
  }
}
