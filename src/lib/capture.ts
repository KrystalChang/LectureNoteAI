"use client";

/**
 * Helpers for grabbing pixels out of the react-pdf rendered <canvas>.
 * Used for (a) vision summaries of image-dominant pages and (b) region-select
 * image Q&A. All work happens against the already-rendered canvas, so no
 * server-side PDF rasterisation is needed.
 */

const MAX_DIMENSION = 1400; // cap longest side to keep base64 payloads sane

export function getPageCanvas(pageNumber: number): HTMLCanvasElement | null {
  return document.querySelector<HTMLCanvasElement>(
    `[data-page="${pageNumber}"] canvas`,
  );
}

function toDataUrlScaled(
  source: HTMLCanvasElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
): string | null {
  if (sw <= 0 || sh <= 0) return null;

  const scale = Math.min(1, MAX_DIMENSION / Math.max(sw, sh));
  const dw = Math.round(sw * scale);
  const dh = Math.round(sh * scale);

  const out = document.createElement("canvas");
  out.width = dw;
  out.height = dh;
  const ctx = out.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, dw, dh);
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, dw, dh);

  try {
    return out.toDataURL("image/png");
  } catch {
    return null;
  }
}

/** Capture the whole rendered page as a PNG data URL. */
export function capturePageImage(pageNumber: number): string | null {
  const canvas = getPageCanvas(pageNumber);
  if (!canvas) return null;
  return toDataUrlScaled(canvas, 0, 0, canvas.width, canvas.height);
}

export type ClientRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/**
 * Capture a rectangular region (given in client/viewport coordinates) of a
 * page as a PNG data URL.
 */
export function captureRegionImage(
  pageNumber: number,
  region: ClientRect,
): string | null {
  const canvas = getPageCanvas(pageNumber);
  if (!canvas) return null;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  // Intersect the requested region with the canvas bounds.
  const left = Math.max(region.left, rect.left);
  const top = Math.max(region.top, rect.top);
  const right = Math.min(region.left + region.width, rect.right);
  const bottom = Math.min(region.top + region.height, rect.bottom);

  const sx = (left - rect.left) * scaleX;
  const sy = (top - rect.top) * scaleY;
  const sw = (right - left) * scaleX;
  const sh = (bottom - top) * scaleY;

  return toDataUrlScaled(canvas, sx, sy, sw, sh);
}
