/** Pure geometry for keeping fields and the primary action visible above the keyboard. */

export type KeyboardMetrics = {
  /** Top edge of the keyboard in screen coordinates, as React Native reports it. */
  screenY: number;
  /** Keyboard height. On Android this excludes the navigation bar (React Native subtracts it). */
  height: number;
};

/**
 * Where the keyboard's top edge really is. iOS reports it reliably. On Android React Native derives `screenY` from
 * the visible-area frame, which an edge-to-edge window does not shrink, so it can point at the screen bottom;
 * the reported height is dependable there. Taking the higher of the two edges errs towards more clearance.
 */
export function keyboardTopEdge(metrics: KeyboardMetrics, screenHeight: number, bottomInset: number, isAndroid: boolean): number {
  if (!isAndroid) return metrics.screenY;
  return Math.min(metrics.screenY, screenHeight - metrics.height - bottomInset);
}

/** How far the keyboard covers the bottom of a view: the view's bottom edge minus the keyboard's top edge, never negative. */
export function keyboardOverlap(viewY: number, viewHeight: number, keyboardTop: number): number {
  return Math.max(0, Math.round(viewY + viewHeight - keyboardTop));
}

/**
 * The scroll offset that brings a field fully into view with `margin` to spare, or null when it already is.
 * A field taller than the viewport is aligned to its top edge.
 */
export function scrollTargetFor(
  field: { y: number; height: number },
  viewport: { scrollY: number; height: number },
  margin: number,
): number | null {
  if (viewport.height <= 0) return null;
  const top = viewport.scrollY;
  const bottom = top + viewport.height;
  const tooTall = field.height + 2 * margin > viewport.height;
  if (field.y < top + margin || tooTall) {
    const target = Math.max(0, field.y - margin);
    return Math.abs(target - top) < 1 ? null : target;
  }
  if (field.y + field.height > bottom - margin) return Math.max(0, field.y + field.height - viewport.height + margin);
  return null;
}
