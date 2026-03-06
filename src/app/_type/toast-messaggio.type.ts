import { TipoToast } from "./toast.type";
export interface ToastMessage {
  testo: string;
  tipo: TipoToast;
  persistente?: boolean;
  azione?: 'ripeti_accesso';
  chiave?: string;
  mostraSpinner?: boolean;
}
