import { getDocument } from "npm:pdfjs-dist@4.10.38/legacy/build/pdf.mjs";

export function publisherUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "christianfaithstories.org" || url.port || url.username || url.password || url.search || url.hash || !/^\/wp-content\/uploads\/\d{4}\/\d{2}\/[a-z0-9%._-]+\.pdf$/i.test(url.pathname)) return null;
    return url.href;
  } catch { return null; }
}

export async function readBounded(stream: ReadableStream<Uint8Array> | null, limit: number): Promise<Uint8Array> {
  if (!stream) throw Error("unavailable");
  const reader = stream.getReader(), chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > limit) { await reader.cancel(); throw Error("too_large"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}

export async function extractPublisherText(bytes: Uint8Array): Promise<string[]> {
  const task = getDocument({ data: bytes, isEvalSupported: false, useSystemFonts: false });
  const doc = await task.promise;
  try {
    if (doc.numPages < 1 || doc.numPages > 20) throw Error("invalid_pages");
    const pages: string[] = [];
    let total = 0;
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i), text = await page.getTextContent();
      const result = assembleTextItems(text.items.filter((item) => "str" in item));
      if (result.length + total > 100_000) throw Error("too_large");
      if (result) { pages.push(result); total += result.length; }
      page.cleanup();
    }
    if (!pages.length) throw Error("no_text");
    return pages;
  } finally { await task.destroy(); }
}

// PDF text items can split in the middle of a word. Preserve the source's
// spaces between items, and reflow visual lines using their vertical spacing.
export function assembleTextItems(items: { str?: string; transform?: number[]; height?: number }[]): string {
  let result = "", lastY: number | undefined, lastHeight = 12;
  for (const item of items) {
    if (typeof item.str !== "string" || !item.transform) continue;
    const y = item.transform[5], height = item.height || lastHeight;
    if (item.str.trim() && lastY !== undefined && Math.abs(y - lastY) > 2) {
      const paragraph = Math.abs(y - lastY) > Math.max(height, lastHeight) * 1.8;
      result = result.trimEnd() + (paragraph ? "\n\n" : " ");
    }
    result += item.str;
    if (item.str.trim()) { lastY = y; lastHeight = height; }
    if (result.length > 100_000) throw Error("too_large");
  }
  return result.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
