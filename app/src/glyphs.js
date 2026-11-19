// "Boulevard Heavy": the studio's own heavy condensed display face, drawn as polygon outlines on a 100-unit cap
// height. Stems are 20 units wide, bars 17 units tall and outer corners chamfered, so the caption needs no font file
// and renders identically on every machine. Each glyph is { w, o: outer contours, h: hole contours }, every contour a
// flat [x0, y0, x1, y1, ...] list with y running down from the cap line.

export const CAP_HEIGHT = 100;
export const TRACKING = 5;

const box = (x, y, w, h) => [x, y, x + w, y, x + w, y + h, x, y + h];
const octagon = (x, y, w, h, c) => [
  x + c, y, x + w - c, y, x + w, y + c, x + w, y + h - c, x + w - c, y + h, x + c, y + h, x, y + h - c, x, y + c,
];

const RAW_GLYPHS = {
  A: { w: 58, o: [[0, 100, 0, 12, 12, 0, 46, 0, 58, 12, 58, 100, 38, 100, 38, 64, 20, 64, 20, 100]], h: [box(20, 17, 18, 30)] },
  B: { w: 58, o: [[0, 0, 46, 0, 58, 12, 58, 42, 52, 50, 58, 58, 58, 88, 46, 100, 0, 100]], h: [box(20, 17, 18, 24.5), box(20, 58.5, 18, 24.5)] },
  C: { w: 56, o: [[12, 0, 44, 0, 56, 12, 56, 34, 36, 34, 36, 17, 20, 17, 20, 83, 36, 83, 36, 66, 56, 66, 56, 88, 44, 100, 12, 100, 0, 88, 0, 12]] },
  D: { w: 58, o: [[0, 0, 46, 0, 58, 12, 58, 88, 46, 100, 0, 100]], h: [box(20, 17, 18, 66)] },
  E: { w: 50, o: [[0, 0, 50, 0, 50, 17, 20, 17, 20, 41.5, 44, 41.5, 44, 58.5, 20, 58.5, 20, 83, 50, 83, 50, 100, 0, 100]] },
  F: { w: 50, o: [[0, 0, 50, 0, 50, 17, 20, 17, 20, 41.5, 44, 41.5, 44, 58.5, 20, 58.5, 20, 100, 0, 100]] },
  G: { w: 58, o: [[12, 0, 46, 0, 58, 12, 58, 30, 38, 30, 38, 17, 20, 17, 20, 83, 38, 83, 38, 64, 30, 64, 30, 47, 58, 47, 58, 88, 46, 100, 12, 100, 0, 88, 0, 12]] },
  H: { w: 58, o: [[0, 0, 20, 0, 20, 41.5, 38, 41.5, 38, 0, 58, 0, 58, 100, 38, 100, 38, 58.5, 20, 58.5, 20, 100, 0, 100]] },
  I: { w: 20, o: [box(0, 0, 20, 100)] },
  J: { w: 54, o: [[34, 0, 54, 0, 54, 88, 42, 100, 12, 100, 0, 88, 0, 62, 20, 62, 20, 83, 34, 83]] },
  K: { w: 58, o: [[0, 0, 20, 0, 20, 38, 37, 0, 58, 0, 35, 50, 58, 100, 37, 100, 20, 63, 20, 100, 0, 100]] },
  L: { w: 48, o: [[0, 0, 20, 0, 20, 83, 48, 83, 48, 100, 0, 100]] },
  M: { w: 78, o: [[0, 100, 0, 0, 23, 0, 39, 40, 55, 0, 78, 0, 78, 100, 58, 100, 58, 44, 46, 72, 32, 72, 20, 44, 20, 100]] },
  N: { w: 60, o: [[0, 100, 0, 0, 20, 0, 40, 52, 40, 0, 60, 0, 60, 100, 40, 100, 20, 48, 20, 100]] },
  O: { w: 58, o: [octagon(0, 0, 58, 100, 12)], h: [octagon(20, 17, 18, 66, 4)] },
  P: { w: 58, o: [[0, 0, 46, 0, 58, 12, 58, 52, 46, 64, 20, 64, 20, 100, 0, 100]], h: [box(20, 17, 18, 30)] },
  Q: { w: 58, o: [[12, 0, 46, 0, 58, 12, 58, 84, 53, 89, 62, 106, 43, 108, 38, 100, 12, 100, 0, 88, 0, 12]], h: [octagon(20, 17, 18, 66, 4)] },
  R: { w: 58, o: [[0, 0, 46, 0, 58, 12, 58, 50, 50, 57, 58, 64, 58, 100, 38, 100, 38, 66, 20, 66, 20, 100, 0, 100]], h: [box(20, 17, 18, 32)] },
  S: { w: 56, o: [[12, 0, 44, 0, 56, 12, 56, 30, 36, 30, 36, 17, 20, 17, 20, 41.5, 44, 41.5, 56, 53.5, 56, 88, 44, 100, 12, 100, 0, 88, 0, 70, 20, 70, 20, 83, 36, 83, 36, 58.5, 12, 58.5, 0, 46.5, 0, 12]] },
  T: { w: 54, o: [[0, 0, 54, 0, 54, 17, 37, 17, 37, 100, 17, 100, 17, 17, 0, 17]] },
  U: { w: 58, o: [[0, 0, 20, 0, 20, 83, 38, 83, 38, 0, 58, 0, 58, 88, 46, 100, 12, 100, 0, 88]] },
  V: { w: 58, o: [[0, 0, 20, 0, 29, 66, 38, 0, 58, 0, 41, 100, 17, 100]] },
  W: { w: 82, o: [[0, 0, 19, 0, 24, 60, 32, 0, 50, 0, 58, 60, 63, 0, 82, 0, 72, 100, 51, 100, 41, 48, 31, 100, 10, 100]] },
  X: { w: 58, o: [[0, 0, 21, 0, 29, 32, 37, 0, 58, 0, 40, 50, 58, 100, 37, 100, 29, 68, 21, 100, 0, 100, 18, 50]] },
  Y: { w: 58, o: [[0, 0, 20, 0, 29, 38, 38, 0, 58, 0, 39, 60, 39, 100, 19, 100, 19, 60]] },
  Z: { w: 54, o: [[0, 0, 54, 0, 54, 17, 22, 83, 54, 83, 54, 100, 0, 100, 0, 83, 32, 17, 0, 17]] },
  0: { w: 54, o: [octagon(0, 0, 54, 100, 12)], h: [octagon(20, 17, 14, 66, 4)] },
  1: { w: 44, o: [[4, 12, 16, 0, 34, 0, 34, 83, 44, 83, 44, 100, 2, 100, 2, 83, 14, 83, 14, 26, 4, 26]] },
  2: { w: 58, o: [[0, 12, 12, 0, 46, 0, 58, 12, 58, 50, 49.5, 58.5, 20, 58.5, 20, 83, 58, 83, 58, 100, 0, 100, 0, 53, 11.5, 41.5, 38, 41.5, 38, 17, 20, 17, 20, 30, 0, 30]] },
  3: { w: 58, o: [[0, 12, 12, 0, 46, 0, 58, 12, 58, 42, 52, 50, 58, 58, 58, 88, 46, 100, 12, 100, 0, 88, 0, 70, 20, 70, 20, 83, 38, 83, 38, 58.5, 14, 58.5, 14, 41.5, 38, 41.5, 38, 17, 20, 17, 20, 30, 0, 30]] },
  4: { w: 56, o: [[0, 0, 20, 0, 20, 48, 36, 48, 36, 0, 56, 0, 56, 100, 36, 100, 36, 65, 0, 65]] },
  5: { w: 58, o: [[0, 0, 58, 0, 58, 17, 20, 17, 20, 41.5, 46, 41.5, 58, 53.5, 58, 88, 46, 100, 12, 100, 0, 88, 0, 70, 20, 70, 20, 83, 38, 83, 38, 58.5, 0, 58.5]] },
  6: { w: 58, o: [[12, 0, 46, 0, 58, 12, 58, 28, 38, 28, 38, 17, 20, 17, 20, 41.5, 46, 41.5, 58, 53.5, 58, 88, 46, 100, 12, 100, 0, 88, 0, 12]], h: [box(20, 58.5, 18, 24.5)] },
  7: { w: 58, o: [[0, 0, 58, 0, 58, 20, 34, 100, 13, 100, 36, 17, 0, 17]] },
  8: { w: 58, o: [[12, 0, 46, 0, 58, 12, 58, 42, 52, 50, 58, 58, 58, 88, 46, 100, 12, 100, 0, 88, 0, 58, 6, 50, 0, 42, 0, 12]], h: [box(20, 17, 18, 24.5), box(20, 58.5, 18, 24.5)] },
  9: { w: 58, o: [[12, 0, 46, 0, 58, 12, 58, 88, 46, 100, 12, 100, 0, 88, 0, 72, 20, 72, 20, 83, 38, 83, 38, 58.5, 12, 58.5, 0, 46.5, 0, 12]], h: [box(20, 17, 18, 24.5)] },
  ' ': { w: 26, o: [] },
  '.': { w: 20, o: [box(0, 80, 20, 20)] },
  ',': { w: 20, o: [[0, 80, 20, 80, 20, 100, 10, 116, 0, 116, 4, 100, 0, 100]] },
  '!': { w: 20, o: [[1, 0, 19, 0, 17, 70, 3, 70], box(0, 80, 20, 20)] },
  '?': { w: 58, o: [[0, 12, 12, 0, 46, 0, 58, 12, 58, 48, 46, 58, 39, 58, 39, 70, 19, 70, 19, 41.5, 38, 41.5, 38, 17, 20, 17, 20, 30, 0, 30], box(19, 80, 20, 20)] },
  '-': { w: 34, o: [box(0, 41, 34, 18)] },
  "'": { w: 16, o: [[0, 0, 16, 0, 16, 24, 6, 38, 0, 38]] },
  '"': { w: 38, o: [[0, 0, 16, 0, 16, 24, 6, 38, 0, 38], [22, 0, 38, 0, 38, 24, 28, 38, 22, 38]] },
  ':': { w: 20, o: [box(0, 24, 20, 20), box(0, 80, 20, 20)] },
  '/': { w: 40, o: [[24, 0, 40, 0, 16, 100, 0, 100]] },
  '+': { w: 46, o: [[15, 27, 31, 27, 31, 42, 46, 42, 46, 58, 31, 58, 31, 73, 15, 73, 15, 58, 0, 58, 0, 42, 15, 42]] },
  '*': { w: 46, o: [[23, 8, 30, 36, 46, 36, 33, 54, 38, 82, 23, 66, 8, 82, 13, 54, 0, 36, 16, 36]] },
};

/** Signed area of a flat contour; positive when it winds clockwise on a y-down canvas. */
function signedArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i += 2) {
    const j = (i + 2) % points.length;
    area += points[i] * points[j + 1] - points[j] * points[i + 1];
  }
  return area / 2;
}

/** Winds every outer contour clockwise and every hole counter-clockwise, so nonzero filling cuts the counters. */
function orientContours(contours, clockwise) {
  return contours.map((points) => {
    if (signedArea(points) > 0 === clockwise) return points;
    const reversed = [];
    for (let i = points.length - 2; i >= 0; i -= 2) reversed.push(points[i], points[i + 1]);
    return reversed;
  });
}

const GLYPHS = new Map(
  Object.entries(RAW_GLYPHS).map(([ch, g]) => [
    ch,
    { w: g.w, contours: [...orientContours(g.o, true), ...orientContours(g.h ?? [], false)] },
  ]),
);
GLYPHS.set('&', GLYPHS.get('+'));

/** Uppercases text, strips accents and drops characters the face does not draw. */
export function normalizeCaptionText(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .split('')
    .filter((ch) => GLYPHS.has(ch))
    .join('')
    .replace(/ +/g, ' ')
    .trim();
}

/** Width of a line of text in font units (cap height 100), not counting the slant's overhang. */
export function measureLineUnits(text, tracking = TRACKING) {
  let width = 0;
  const chars = [...text];
  chars.forEach((ch, i) => {
    width += GLYPHS.get(ch)?.w ?? 0;
    if (i < chars.length - 1) width += tracking;
  });
  return width;
}

/**
 * Appends a line of text to `path` with its cap line's left end at (left, top) and cap height `size` pixels.
 * `slant` shifts the cap line right by slant x cap height, an italic lean. Returns the drawn width in pixels.
 */
export function appendLineToPath(path, text, left, top, size, { slant = 0, tracking = TRACKING } = {}) {
  const k = size / CAP_HEIGHT;
  let cursor = 0;
  for (const ch of text) {
    const glyph = GLYPHS.get(ch);
    if (!glyph) continue;
    for (const points of glyph.contours) {
      for (let i = 0; i < points.length; i += 2) {
        const gx = cursor + points[i] + slant * (CAP_HEIGHT - points[i + 1]);
        const x = left + gx * k;
        const y = top + points[i + 1] * k;
        if (i === 0) path.moveTo(x, y);
        else path.lineTo(x, y);
      }
      path.closePath();
    }
    cursor += glyph.w + tracking;
  }
  return (measureLineUnits(text, tracking) + slant * CAP_HEIGHT) * k;
}
