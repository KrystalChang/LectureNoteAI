import "./pdf-polyfill";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export async function extractPageTexts(buffer: Buffer): Promise<{
  pageCount: number;
  texts: string[];
}> {
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
        .trim();
      texts.push(text);
    }

    return { pageCount, texts };
  } finally {
    doc.destroy();
  }
}
