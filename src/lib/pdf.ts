import type { TextItem } from "pdfjs-dist/types/src/display/api";

// Postgres text columns reject NUL bytes (0x00), which PDF text extraction can
// emit. SQLite tolerated them; Postgres does not. Built via fromCharCode to
// avoid a literal NUL / escape sequence in source.
const NUL = String.fromCharCode(0);

export async function extractPageTexts(buffer: Buffer): Promise<{
  pageCount: number;
  texts: string[];
}> {
  await import("./pdf-polyfill");
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const doc = await getDocument({ data: new Uint8Array(buffer) }).promise;
  try {
    const pageCount = doc.numPages;
    const texts: string[] = [];

    for (let i = 1; i <= pageCount; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .filter((item): item is TextItem => "str" in item)
        .map((item) => item.str)
        .join(" ")
        .split(NUL)
        .join("")
        .trim();
      texts.push(text);
    }

    return { pageCount, texts };
  } finally {
    doc.destroy();
  }
}
