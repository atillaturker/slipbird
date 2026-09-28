import { limitPages, longEdgeResize, pagePath, thumbnailPath } from '../image-paths';

describe('image paths', () => {
  it('lays out pages and thumbnail per receipt', () => {
    expect(pagePath('abc', 1)).toBe('receipts/abc/1.jpg');
    expect(thumbnailPath('abc')).toBe('receipts/abc/thumb.jpg');
  });
});

describe('longEdgeResize', () => {
  it('shrinks the long edge only', () => {
    expect(longEdgeResize(3000, 4000, 1600)).toEqual({ height: 1600 });
    expect(longEdgeResize(4000, 3000, 1600)).toEqual({ width: 1600 });
    expect(longEdgeResize(2000, 2000, 200)).toEqual({ width: 200 });
  });

  it('leaves small images alone', () => {
    expect(longEdgeResize(1200, 1600, 1600)).toBeNull();
  });
});

describe('limitPages', () => {
  it('keeps the first 3 pages and reports drops', () => {
    expect(limitPages(['a', 'b'])).toEqual({ pages: ['a', 'b'], dropped: false });
    expect(limitPages(['a', 'b', 'c', 'd'])).toEqual({ pages: ['a', 'b', 'c'], dropped: true });
  });
});
