/**
 * Newline-delimited JSON streaming helper used by the summary and Q&A routes.
 * Each emitted object is serialised on its own line, which the client reads
 * incrementally. Common message shapes:
 *   { type: "meta", cached: boolean }
 *   { type: "delta", text: string }
 *   { type: "needsImage": true }
 *   { type: "done", ...payload }
 *   { type: "error", error: string }
 */
export type NdjsonMessage = Record<string, unknown>;

export function ndjsonResponse(
  producer: (emit: (msg: NdjsonMessage) => void) => Promise<void>,
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (msg: NdjsonMessage) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(msg)}\n`));
      };

      try {
        await producer(emit);
      } catch (error) {
        emit({
          type: "error",
          error: error instanceof Error ? error.message : "Streaming failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
