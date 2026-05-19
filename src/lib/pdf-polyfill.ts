// pdfjs-dist requires DOMMatrix at module load time, even for text-only extraction.
if (typeof globalThis.DOMMatrix === "undefined") {
  // @ts-expect-error — minimal stub, only used for text extraction in Node.js
  globalThis.DOMMatrix = class DOMMatrix {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;
  };
}
