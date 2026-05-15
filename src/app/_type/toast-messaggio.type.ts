import { TipoToast } from "./toast.type";
export interface ToastMessage {
  testo: string;
  tipo: TipoToast;
  persistente?: boolean;
  azione?: 'ripeti_accesso' | 'apri_reset' | 'cambio_password' | 'correggi_pagamento';
  caricamentoInCorso?: boolean;
  chiave?: string;
  mostraSpinner?: boolean;
}
