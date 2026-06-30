import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { marked, type Token, type Tokens } from "marked";
import { IMAGE_PLACEHOLDER, type CompiledNotes } from "./export_notes";

/**
 * Build a .docx from compiled notes using the `docx` package. We only describe
 * the document model (headings, paragraphs, bullets, bold/italic runs); the
 * library handles the OOXML + ZIP packaging. Markdown coming from the AI
 * summaries / user notes is tokenised with `marked` and mapped to docx runs.
 */

type RunStyle = { bold?: boolean; italics?: boolean; strike?: boolean };

const HEADING_LEVELS = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
];

function headingLevel(depth: number) {
  const index = Math.min(Math.max(depth, 1), HEADING_LEVELS.length) - 1;
  return HEADING_LEVELS[index];
}

/** Flatten marked inline tokens into styled docx runs (recursive for nesting). */
function inlineRuns(tokens: Token[] | undefined, style: RunStyle = {}): TextRun[] {
  if (!tokens) return [];
  const runs: TextRun[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case "strong":
        runs.push(...inlineRuns((token as Tokens.Strong).tokens, { ...style, bold: true }));
        break;
      case "em":
        runs.push(...inlineRuns((token as Tokens.Em).tokens, { ...style, italics: true }));
        break;
      case "del":
        runs.push(...inlineRuns((token as Tokens.Del).tokens, { ...style, strike: true }));
        break;
      case "link":
        runs.push(...inlineRuns((token as Tokens.Link).tokens, style));
        break;
      case "paragraph":
        runs.push(...inlineRuns((token as Tokens.Paragraph).tokens, style));
        break;
      case "codespan":
        runs.push(new TextRun({ text: (token as Tokens.Codespan).text, font: "Consolas", ...style }));
        break;
      case "br":
        runs.push(new TextRun({ text: "", break: 1 }));
        break;
      case "text": {
        const text = token as Tokens.Text;
        if (text.tokens?.length) {
          runs.push(...inlineRuns(text.tokens, style));
        } else {
          runs.push(new TextRun({ text: text.text, ...style }));
        }
        break;
      }
      default: {
        const raw = "raw" in token ? (token as { raw: string }).raw : "";
        if (raw.trim()) runs.push(new TextRun({ text: raw, ...style }));
      }
    }
  }

  return runs;
}

/**
 * Convert a markdown string to docx paragraphs. `headingOffset` pushes inner
 * headings below the surrounding page heading so the outline stays nested.
 */
function markdownToParagraphs(markdown: string, headingOffset = 1): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  for (const token of marked.lexer(markdown)) {
    switch (token.type) {
      case "heading": {
        const heading = token as Tokens.Heading;
        paragraphs.push(
          new Paragraph({
            heading: headingLevel(heading.depth + headingOffset),
            children: inlineRuns(heading.tokens),
          }),
        );
        break;
      }
      case "paragraph": {
        paragraphs.push(new Paragraph({ children: inlineRuns((token as Tokens.Paragraph).tokens) }));
        break;
      }
      case "list": {
        for (const item of (token as Tokens.List).items) {
          paragraphs.push(new Paragraph({ bullet: { level: 0 }, children: inlineRuns(item.tokens) }));
        }
        break;
      }
      case "space":
        break;
      default: {
        const raw = "raw" in token ? (token as { raw: string }).raw.trim() : "";
        if (raw) paragraphs.push(new Paragraph({ children: [new TextRun(raw)] }));
      }
    }
  }

  return paragraphs.length ? paragraphs : [new Paragraph("")];
}

export async function buildDocx(compiled: CompiledNotes): Promise<Buffer> {
  const date = new Date(compiled.generatedAt).toLocaleString("zh-TW");
  const children: Paragraph[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(`${compiled.title} — 筆記`)] }),
    new Paragraph({ children: [new TextRun({ text: `由 LectureNoteAI 於 ${date} 整理`, italics: true, color: "666666" })] }),
  ];

  for (const page of compiled.pages) {
    children.push(
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(`第 ${page.pageNumber} 頁`)] }),
    );

    const summary = page.summary || (page.placeholder ? IMAGE_PLACEHOLDER : "（無摘要）");
    children.push(...markdownToParagraphs(summary));

    if (page.note) {
      children.push(
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("我的筆記")] }),
      );
      children.push(...markdownToParagraphs(page.note, 2));
    }
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}
