// ─── scroll-welcome-layout.utils.ts ──────────────────────────────────────────
// Funzioni pure per calcolo valori responsive del titolo.
// Estratte dal blocco if/else in createScrollTriggers().

export function calcolaScaleTitle(): { scaleX: number; scaleY: number } {
  let scaleValue: number;
  const w = window.innerWidth;
  if (w <= 375)      scaleValue = 0.225;
  else if (w <= 485) scaleValue = 0.21;
  else if (w <= 868) scaleValue = 0.17;
  else               scaleValue = 0.15;
  return { scaleX: scaleValue, scaleY: scaleValue * 1.3 };
}

export function calcolaLeftValue(): number {
  if (window.matchMedia('(max-width: 900px) and (max-height: 460px) and (orientation: landscape)').matches)
    return -22;
  if (window.matchMedia('(max-width: 1020px) and (max-height: 660px) and (orientation: landscape)').matches)
    return 12;
  const w = window.innerWidth;
  if (w <= 560)       return 6;
  if (w <= 868)       return 0;
  if (w <= 1000)      return 25;
  if (w <= 1200)      return 15;
  if (w <= 1500)      return 10;
  return 25;
}

export function calcolaTopValue(): number {
  if (window.matchMedia('(max-width: 900px) and (max-height: 460px) and (orientation: landscape)').matches)
    return 16;
  if (window.matchMedia('(max-width: 1020px) and (max-height: 660px) and (orientation: landscape)').matches)
    return 12;
  const w = window.innerWidth;
  if (w <= 560)  return 15;
  if (w <= 900)  return 8;
  if (w <= 1000) return 8;
  return 11;
}

export function checkSpecialTablet(): boolean {
  return window.matchMedia(
    '(orientation: landscape) and (min-aspect-ratio: 7/5) and (max-width: 985px), ' +
    '(orientation: landscape) and (max-width: 1020px) and (max-height: 560px)'
  ).matches;
}
