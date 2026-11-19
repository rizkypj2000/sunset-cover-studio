// Post sizes and the panel layouts for each. A layout is drawn on a cols x rows grid: `panels` are photo cells
// [x, y, w, h], and `title` is the caption's cell, either its own backdrop panel ('panel') or lettering laid over
// the photos ('overlay'). Gutters (the bold borders) are cut between cells when the geometry is computed.

export const SIZES = {
  landscape: { id: 'landscape', label: '1920 x 1080', hint: 'Banner / wallpaper', w: 1920, h: 1080 },
  portrait: { id: 'portrait', label: '1080 x 1350', hint: 'Portrait post', w: 1080, h: 1350 },
  square: { id: 'square', label: '1080 x 1080', hint: 'Square post', w: 1080, h: 1080 },
};

export const LAYOUTS = {
  landscape: [
    {
      id: 'mosaic', name: 'Mosaic', cols: 16, rows: 9,
      panels: [[0, 0, 5, 5], [5, 0, 6, 3], [11, 0, 5, 5], [5, 3, 6, 2], [0, 5, 4, 4], [12, 5, 4, 4]],
      title: { cell: [4, 5, 8, 4], mode: 'panel' },
    },
    {
      id: 'hero', name: 'Hero + Strip', cols: 16, rows: 9,
      panels: [[0, 0, 10, 9], [10, 0, 6, 3], [10, 3, 6, 3], [10, 6, 6, 3]],
      title: { cell: [0, 5.4, 10, 3.6], mode: 'overlay' },
    },
    {
      id: 'columns', name: 'Four Columns', cols: 16, rows: 9,
      panels: [[0, 0, 4, 9], [4, 0, 4, 9], [8, 0, 4, 9], [12, 0, 4, 9]],
      title: { cell: [0.5, 5.6, 15, 3.2], mode: 'overlay' },
    },
    {
      id: 'gallery', name: 'Gallery', cols: 16, rows: 9,
      panels: [[0, 0, 4, 4], [4, 0, 4, 4], [8, 0, 4, 4], [12, 0, 4, 4], [0, 4, 4, 5], [12, 4, 4, 5]],
      title: { cell: [4, 4, 8, 5], mode: 'panel' },
    },
  ],
  portrait: [
    {
      id: 'poster', name: 'Poster', cols: 8, rows: 10,
      panels: [[0, 0, 5, 4], [5, 0, 3, 4], [0, 6, 3, 4], [3, 6, 5, 2], [3, 8, 2, 2], [5, 8, 3, 2]],
      title: { cell: [0, 4, 8, 2], mode: 'panel' },
    },
    {
      id: 'hero', name: 'Hero Top', cols: 8, rows: 10,
      panels: [[0, 0, 8, 6.5], [0, 6.5, 4, 3.5], [4, 6.5, 4, 3.5]],
      title: { cell: [0, 3.9, 8, 2.6], mode: 'overlay' },
    },
    {
      id: 'split', name: 'Split', cols: 8, rows: 10,
      panels: [[0, 0, 4, 7], [4, 0, 4, 3.5], [4, 3.5, 4, 3.5]],
      title: { cell: [0, 7, 8, 3], mode: 'panel' },
    },
    {
      id: 'grid', name: 'Grid', cols: 8, rows: 10,
      panels: [[0, 0, 4, 4], [4, 0, 4, 4], [0, 6, 4, 4], [4, 6, 4, 4]],
      title: { cell: [0, 4, 8, 2], mode: 'panel' },
    },
  ],
  square: [
    {
      id: 'mosaic', name: 'Mosaic', cols: 6, rows: 6,
      panels: [[0, 0, 4, 4], [4, 0, 2, 2], [4, 2, 2, 2], [4, 4, 2, 2]],
      title: { cell: [0, 4, 4, 2], mode: 'panel' },
    },
    {
      id: 'quad', name: 'Quad Cross', cols: 6, rows: 6,
      panels: [[0, 0, 3, 3], [3, 0, 3, 3], [0, 3, 3, 3], [3, 3, 3, 3]],
      title: { cell: [0.2, 2, 5.6, 2], mode: 'overlay' },
    },
    {
      id: 'hero', name: 'Hero + Three', cols: 6, rows: 6,
      panels: [[0, 0, 6, 4], [0, 4, 2, 2], [2, 4, 2, 2], [4, 4, 2, 2]],
      title: { cell: [0, 2.2, 6, 1.8], mode: 'overlay' },
    },
    {
      id: 'strips', name: 'Three Strips', cols: 6, rows: 6,
      panels: [[0, 0, 2, 4], [2, 0, 2, 4], [4, 0, 2, 4]],
      title: { cell: [0, 4, 6, 2], mode: 'panel' },
    },
  ],
};

export const MAX_PANELS = 6;

/** Finds a layout of a size by id, falling back to the size's first layout. */
export function layoutFor(sizeId, layoutId) {
  const list = LAYOUTS[sizeId] ?? LAYOUTS.landscape;
  return list.find((l) => l.id === layoutId) ?? list[0];
}

/**
 * Turns a layout into pixel rectangles on a width x height cover with `gutter`-pixel borders: every cell is inset
 * by half a gutter from its neighbours and a full gutter from the cover's edge. An overlay title is not inset.
 */
export function layoutGeometry(layout, width, height, gutter) {
  const sx = width / layout.cols;
  const sy = height / layout.rows;
  const half = gutter / 2;
  const cellRect = ([x, y, w, h]) => {
    const left = x === 0 ? gutter : x * sx + half;
    const top = y === 0 ? gutter : y * sy + half;
    const right = x + w >= layout.cols ? width - gutter : (x + w) * sx - half;
    const bottom = y + h >= layout.rows ? height - gutter : (y + h) * sy - half;
    return { x: left, y: top, w: right - left, h: bottom - top };
  };
  const panels = layout.panels.map(cellRect);
  const [tx, ty, tw, th] = layout.title.cell;
  const title = layout.title.mode === 'panel'
    ? cellRect(layout.title.cell)
    : { x: tx * sx, y: ty * sy, w: tw * sx, h: th * sy };
  return { panels, title, titleMode: layout.title.mode };
}
