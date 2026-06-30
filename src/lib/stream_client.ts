"use client";

/**
 * Client-side reader for the newline-delimited JSON streams produced by
 * `ndjsonResponse`. Calls `onMessage` for every complete JSON line as it
 * arrives.
 */
export type NdjsonHandler = (message: Record<string, unknown>) => void;

export async function readNdjsonStream(
  response: Response,
  onMessage: NdjsonHandler,
  signal?: AbortSignal,
): Promise<void> {
  if (!response.body) {
    throw new Error("Response has no body to stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel();
        return;
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex = buffer.indexOf("\n");
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (line) {
          try {
            onMessage(JSON.parse(line));
          } catch {
            // Ignore malformed partial lines.
          }
        }
        newlineIndex = buffer.indexOf("\n");
      }
    }

    const tail = buffer.trim();
    if (tail) {
      try {
        onMessage(JSON.parse(tail));
      } catch {
        // ignore
      }
    }
  } finally {
    reader.releaseLock();
  }
}
