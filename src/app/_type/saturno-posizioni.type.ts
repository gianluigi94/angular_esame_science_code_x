export type SaturnoStatoChiave =
  | 'WELCOME_ALTO'   // posizione centrale, pagina benvenuto in alto
  | 'WELCOME_BASSO'  // posizione bassa, pagina benvenuto dopo lo scroll
  | 'CATALOGO_NASCOSTO' // posizione estremamente bassa, rimpiciolita, per catalogo
  | 'LOGIN_LATERALE'; // nuova posizione laterale per /login
