// Per-panel crops. A crop is { zoom, fx, fy, flip }: zoom 1 just covers the panel, and (fx, fy) is the point of the
// photo (0..1 of its width and height) shown at the panel's centre, clamped so the photo always fills the panel.

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 6;

/** Varied starting crops, so one photo repeated across panels still gives each panel a different framing. */
const STARTING_CROPS = [
  { zoom: 1, fx: 0.5, fy: 0.45 },
  { zoom: 2.2, fx: 0.55, fy: 0.24 },
  { zoom: 1.5, fx: 0.35, fy: 0.55 },
  { zoom: 2.8, fx: 0.6, fy: 0.62 },
  { zoom: 1.3, fx: 0.7, fy: 0.35 },
  { zoom: 3.2, fx: 0.45, fy: 0.3 },
];

/** The starting crop for panel `index`. */
export function startingCrop(index) {
  return { ...STARTING_CROPS[index % STARTING_CROPS.length], flip: index % 4 === 3 };
}

const photoSize = (photo) => [photo.naturalWidth || photo.width, photo.naturalHeight || photo.height];

/** Where the photo lands for a crop in a panel rect: its scale and top-left corner relative to the rect. */
export function photoPlacement(photo, rect, crop) {
  const [iw, ih] = photoSize(photo);
  const scale = Math.max(rect.w / iw, rect.h / ih) * Math.max(MIN_ZOOM, crop.zoom);
  const halfW = rect.w / scale / iw / 2;
  const halfH = rect.h / scale / ih / 2;
  const fx = Math.min(1 - halfW, Math.max(halfW, crop.fx));
  const fy = Math.min(1 - halfH, Math.max(halfH, crop.fy));
  return { scale, left: rect.w / 2 - fx * iw * scale, top: rect.h / 2 - fy * ih * scale, fx, fy, iw, ih };
}

/** Pans a crop by (dx, dy) cover pixels, as if the photo were dragged under the panel. */
export function panCrop(crop, photo, rect, dx, dy) {
  const p = photoPlacement(photo, rect, crop);
  const sign = crop.flip ? -1 : 1;
  const next = { ...crop, fx: p.fx - (sign * dx) / (p.iw * p.scale), fy: p.fy - dy / (p.ih * p.scale) };
  const clamped = photoPlacement(photo, rect, next);
  return { ...next, fx: clamped.fx, fy: clamped.fy };
}

/** Zooms a crop by `factor`, keeping the centre point. */
export function zoomCrop(crop, photo, rect, factor) {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, crop.zoom * factor));
  const next = { ...crop, zoom };
  const p = photoPlacement(photo, rect, next);
  return { ...next, fx: p.fx, fy: p.fy };
}

/** Draws the cropped photo into a context whose origin is the panel's top-left corner. */
export function drawCroppedPhoto(ctx, photo, rect, crop) {
  const p = photoPlacement(photo, rect, crop);
  ctx.save();
  if (crop.flip) {
    ctx.translate(rect.w, 0);
    ctx.scale(-1, 1);
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(photo, p.left, p.top, p.iw * p.scale, p.ih * p.scale);
  ctx.restore();
}
