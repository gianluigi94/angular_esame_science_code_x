// Utility pure per calcolare i valori responsive del layout del titolo.

export function calcolaScaleTitle(): { scaleX: number; scaleY: number } {
  let scaleValue: number; // preparo il valore base della scala
  const w = window.innerWidth; // leggo la larghezza corrente della finestra
  if (w <= 375)      scaleValue = 0.225; // la scala per schermi molto piccoli
  else if (w <= 485) scaleValue = 0.21; // la scala per schermi piccoli
  else if (w <= 868) scaleValue = 0.17; // la scala per tablet o piccoli desktop
  else               scaleValue = 0.15; // la scala per schermi grandi
  return { scaleX: scaleValue, scaleY: scaleValue * 1.3 }; // restituisco la scala orizzontale e quella verticale corretta
}

/**
 * Calcola il valore left responsive del titolo.
 *
 * @returns number
 */
export function calcolaLeftValue(): number {
  if (window.matchMedia('(max-width: 900px) and (max-height: 460px) and (orientation: landscape)').matches) // verifico se sono in landscape molto basso
    return -22; // restituisco il left dedicato a questo caso
  if (window.matchMedia('(max-width: 1020px) and (max-height: 660px) and (orientation: landscape)').matches) // verifico se sono in landscape medio
    return 12; // restituisco il left dedicato a questo caso
  const w = window.innerWidth; // leggo la larghezza corrente della finestra
  if (w <= 560)       return 6; // restituisco il left per schermi piccoli
  if (w <= 868)       return 0; // restituisco il left per tablet
  if (w <= 1000)      return 25; // restituisco il left per desktop piccoli
  if (w <= 1200)      return 15; // restituisco il left per desktop medi
  if (w <= 1500)      return 10; // restituisco il left per desktop larghi
  return 25; // restituisco il left per schermi molto grandi
}

/**
 * Calcola il valore top responsive del titolo.
 *
 * @returns number
 */
export function calcolaTopValue(): number {
  if (window.matchMedia('(max-width: 900px) and (max-height: 460px) and (orientation: landscape)').matches) // verifico se sono in landscape molto basso
    return 16; // restituisco il top dedicato a questo caso
  if (window.matchMedia('(max-width: 1020px) and (max-height: 660px) and (orientation: landscape)').matches) // verifico se sono in landscape medio
    return 12; // restituisco il top dedicato a questo caso
  const w = window.innerWidth; // leggo la larghezza corrente della finestra
  if (w <= 560)  return 15; // restituisco il top per schermi piccoli
  if (w <= 900)  return 8; // restituisco il top per tablet e piccoli desktop
  if (w <= 1000) return 8; // mantengo lo stesso top anche per desktop piccoli
  return 11; // restituisco il top per schermi grandi
}

/**
 * Verifica se il device rientra nei casi speciali tablet/landscape.
 *
 * @returns boolean
 */
export function checkSpecialTablet(): boolean {
  return window.matchMedia( // verifico se la finestra rientra nei breakpoint speciali tablet
    '(orientation: landscape) and (min-aspect-ratio: 7/5) and (max-width: 985px), ' +
    '(orientation: landscape) and (max-width: 1020px) and (max-height: 560px)'
  ).matches; // restituisco true se almeno una condizione speciale combacia
}
