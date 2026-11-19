// Pointer handling on the live preview: click selects a panel, dragging pans its photo, the wheel zooms it,
// double-click resets its crop, and photo files dropped on a panel go into that panel. Positions are converted
// to the preview canvas's own pixels before the handlers see them.

/** Converts a pointer event's position to canvas pixels. */
function canvasPoint(canvas, event) {
  const box = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - box.left) * canvas.width) / box.width,
    y: ((event.clientY - box.top) * canvas.height) / box.height,
  };
}

/**
 * Wires the gestures. `handlers.hitTest(x, y)` returns a panel index, 'title' or null; the others are
 * onSelect(target), onPan(index, dx, dy), onZoom(index, factor), onReset(index), onDropFiles(target, files).
 */
export function attachPanelGestures(canvas, handlers) {
  let drag = null;

  canvas.addEventListener('pointerdown', (event) => {
    const p = canvasPoint(canvas, event);
    const target = handlers.hitTest(p.x, p.y);
    if (target === null) return;
    handlers.onSelect(target);
    if (typeof target !== 'number') return;
    drag = { index: target, x: p.x, y: p.y, id: event.pointerId };
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('dragging');
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const p = canvasPoint(canvas, event);
    handlers.onPan(drag.index, p.x - drag.x, p.y - drag.y);
    drag.x = p.x;
    drag.y = p.y;
  });

  const endDrag = (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    drag = null;
    canvas.classList.remove('dragging');
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  canvas.addEventListener('wheel', (event) => {
    const p = canvasPoint(canvas, event);
    const target = handlers.hitTest(p.x, p.y);
    if (typeof target !== 'number') return;
    event.preventDefault();
    handlers.onSelect(target);
    handlers.onZoom(target, Math.exp(-event.deltaY * 0.0015));
  }, { passive: false });

  canvas.addEventListener('dblclick', (event) => {
    const p = canvasPoint(canvas, event);
    const target = handlers.hitTest(p.x, p.y);
    if (typeof target === 'number') handlers.onReset(target);
  });

  canvas.addEventListener('dragover', (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  });
  canvas.addEventListener('drop', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const p = canvasPoint(canvas, event);
    handlers.onDropFiles(handlers.hitTest(p.x, p.y), event.dataTransfer.files);
  });
}
