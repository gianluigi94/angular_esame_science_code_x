// ─── player-buffer.utils.ts ──────────────────────────────────────────────────
// Funzioni pure (nessuna dipendenza Angular) estratte da player-video.component.ts

export function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

export function isInFullscreen(target: HTMLElement | null): boolean {
  const d = document as any;
  const fsEl: Element | null =
    document.fullscreenElement  ||
    d.webkitFullscreenElement   ||
    d.mozFullScreenElement      ||
    d.msFullscreenElement       || null;
  return !!(fsEl && target && (fsEl === target || target.contains(fsEl)));
}

export function waitForFullscreen(
  target: HTMLElement | null,
  timeoutMs = 2500,
): Promise<boolean> {
  if (isInFullscreen(target)) return Promise.resolve(true);
  return new Promise((resolve) => {
    let done = false;
    const d = document as any;

    const onChange = () => {
      if (done) return;
      if (isInFullscreen(target)) { done = true; cleanup(); resolve(true); }
    };
    const cleanup = () => {
      document.removeEventListener('fullscreenchange',      onChange);
      d.removeEventListener?.('webkitfullscreenchange',     onChange);
      d.removeEventListener?.('mozfullscreenchange',        onChange);
      d.removeEventListener?.('MSFullscreenChange',         onChange);
    };

    document.addEventListener('fullscreenchange',    onChange);
    d.addEventListener?.('webkitfullscreenchange',   onChange);
    d.addEventListener?.('mozfullscreenchange',      onChange);
    d.addEventListener?.('MSFullscreenChange',       onChange);

    setTimeout(() => {
      if (done) return;
      done = true; cleanup(); resolve(false);
    }, timeoutMs);
  });
}

export function calcolaBufferedEndCompat(player: any): number {
  try {
    const tech: any = player?.tech?.(true);
    const el        = tech?.el?.();
    const tr: TimeRanges | undefined = player?.buffered?.() ?? el?.buffered;
    const ct = Number(player?.currentTime?.() ?? 0);
    if (!tr || tr.length === 0) return ct;
    let end = Number(tr.end(tr.length - 1) ?? ct);
    for (let i = 0; i < tr.length; i++) {
      const s = Number(tr.start(i) ?? 0);
      const e = Number(tr.end(i)   ?? ct);
      if (s <= ct && ct <= e) { end = e; break; }
    }
    return end;
  } catch {
    return Number(player?.currentTime?.() ?? 0);
  }
}
