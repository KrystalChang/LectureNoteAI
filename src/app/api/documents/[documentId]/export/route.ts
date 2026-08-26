import { compileNotes, notesToMarkdown } from "@/lib/export_notes";
import { buildDocx } from "@/lib/docx_export";
import { getUserId, userOwnsDocument } from "@/lib/auth_helpers";
import {
  AiQuotaLimitError,
  aiQuotaLimitResponse,
} from "@/lib/ai_quota_limit";

type RouteParams = {
  params: Promise<{ documentId: string }>;
};

function asciiFallbackName(title: string, ext: string) {
  // Content-Disposition filename* carries the UTF-8 name; this is the fallback.
  const ascii = title.replace(/[^\x20-\x7e]+/g, "_").replace(/["\\]/g, "") || "notes";
  return `${ascii}-notes.${ext}`;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { documentId } = await params;

  const userId = await getUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await userOwnsDocument(documentId, userId))) {
    return Response.json({ error: "Document not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const format = (searchParams.get("format") || "json").toLowerCase();

  let compiled;
  try {
    compiled = await compileNotes(documentId, userId);
  } catch (error) {
    if (error instanceof AiQuotaLimitError) {
      return aiQuotaLimitResponse(error);
    }
    console.error("Error compiling notes:", error);
    return Response.json({ error: "Failed to compile notes" }, { status: 500 });
  }
  if (!compiled) {
    return Response.json({ error: "Document not found" }, { status: 404 });
  }

  if (format === "json") {
    return Response.json(compiled);
  }

  if (format === "md" || format === "markdown") {
    const md = notesToMarkdown(compiled);
    const utf8 = encodeURIComponent(`${compiled.title}-筆記.md`);
    return new Response(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${asciiFallbackName(compiled.title, "md")}"; filename*=UTF-8''${utf8}`,
      },
    });
  }

  if (format === "docx") {
    const buffer = await buildDocx(compiled);
    const utf8 = encodeURIComponent(`${compiled.title}-筆記.docx`);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${asciiFallbackName(compiled.title, "docx")}"; filename*=UTF-8''${utf8}`,
      },
    });
  }

  return Response.json({ error: "Unsupported format" }, { status: 400 });
}
