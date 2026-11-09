import { APIError, type PayloadRequest } from "payload";

// Plugin 3.92.1's generated endpoints use an unbounded req.text reader. Its
// own body parser cannot provide signed-byte/stream limits, so bound the native
// stream here and let the official handlers consume the validated stable text.
export async function readCommerceJSON(req: PayloadRequest): Promise<unknown> {
  if (req.headers.get("content-type")?.split(";")[0].trim() !== "application/json" || !req.body) throw new APIError("JSON body required", 415);
  const declared = req.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > 8192)) throw new APIError("Request too large", 413);
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => undefined); }, 5000);
  try {
    while (true) {
      const part = await reader.read();
      if (timedOut) throw new APIError("Body deadline exceeded", 408);
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 8192) throw new APIError("Request too large", 413);
      chunks.push(part.value);
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
  } finally { clearTimeout(timer); await reader.cancel().catch(() => undefined); reader.releaseLock(); }
}
