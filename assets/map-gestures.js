(function (root) {
  'use strict';

  const distance = (first, second) => Math.hypot(first.x - second.x, first.y - second.y);
  const midpoint = (first, second) => ({ x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 });

  function panForAnchor({ base, anchor, point, content, viewport, zoom }) {
    const width = Math.max(1, content.width);
    const height = Math.max(1, content.height);
    const panWidth = Math.max(1, viewport.width);
    const panHeight = Math.max(1, viewport.height);
    const visibleWidth = base.w / zoom;
    const visibleHeight = base.h / zoom;
    const offsetX = Math.max(0, Math.min(1, (point.x - content.left) / width));
    const offsetY = Math.max(0, Math.min(1, (point.y - content.top) / height));
    const requestedX = anchor.x - offsetX * visibleWidth;
    const requestedY = anchor.y - offsetY * visibleHeight;
    return {
      x: (base.x + (base.w - visibleWidth) / 2 - requestedX) * panWidth / visibleWidth,
      y: (base.y + (base.h - visibleHeight) / 2 - requestedY) * panHeight / visibleHeight
    };
  }

  const api = Object.freeze({ distance, midpoint, panForAnchor });
  root.MaxSilverMapGestures = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : this);
