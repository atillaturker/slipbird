import { keyboardOverlap, keyboardTopEdge, scrollTargetFor } from '../keyboard';

describe('keyboardTopEdge', () => {
  it('trusts the reported edge on iOS', () => {
    expect(keyboardTopEdge({ screenY: 500, height: 336 }, 836, 34, false)).toBe(500);
  });

  it('uses the keyboard height on Android when the reported edge is the screen bottom (edge-to-edge)', () => {
    // 2400 px-tall display, 96 nav bar, 780 keyboard: top edge at 2400 - 780 - 96 = 1524.
    expect(keyboardTopEdge({ screenY: 2400, height: 780 }, 2400, 96, true)).toBe(1524);
  });

  it('keeps a correct reported edge on Android', () => {
    expect(keyboardTopEdge({ screenY: 1524, height: 780 }, 2400, 96, true)).toBe(1524);
  });

  it('never claims less clearance than the reported edge implies', () => {
    expect(keyboardTopEdge({ screenY: 1400, height: 780 }, 2400, 96, true)).toBe(1400);
  });
});

describe('keyboardOverlap', () => {
  it('is how far the keyboard covers the view bottom', () => {
    expect(keyboardOverlap(100, 700, 500)).toBe(300);
    expect(keyboardOverlap(0, 836, 500)).toBe(336);
  });

  it('is zero when the view already ends above the keyboard, or the keyboard is hidden', () => {
    expect(keyboardOverlap(100, 300, 500)).toBe(0);
    expect(keyboardOverlap(100, 700, 836)).toBe(0);
  });

  it('is zero for a view that was resized to fit already', () => {
    expect(keyboardOverlap(0, 500, 500)).toBe(0);
  });
});

describe('scrollTargetFor', () => {
  const viewport = { scrollY: 100, height: 400 };

  it('leaves a visible field alone', () => {
    expect(scrollTargetFor({ y: 200, height: 60 }, viewport, 16)).toBeNull();
  });

  it('scrolls up to a field above the viewport, leaving a margin', () => {
    expect(scrollTargetFor({ y: 60, height: 60 }, viewport, 16)).toBe(44);
    expect(scrollTargetFor({ y: 5, height: 60 }, viewport, 16)).toBe(0);
  });

  it('scrolls down to a field hidden below the viewport (behind the keyboard)', () => {
    // bottom of field 620 → needs scrollY 620 - 400 + 16 = 236
    expect(scrollTargetFor({ y: 560, height: 60 }, viewport, 16)).toBe(236);
  });

  it('aligns a field taller than the viewport to its top', () => {
    expect(scrollTargetFor({ y: 300, height: 500 }, viewport, 16)).toBe(284);
  });

  it('does nothing without a measured viewport', () => {
    expect(scrollTargetFor({ y: 300, height: 60 }, { scrollY: 0, height: 0 }, 16)).toBeNull();
  });
});
