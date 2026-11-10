import { assembleTextItems, publisherUrl, readBounded } from "./publisher-reader.ts";

Deno.test("only publisher catalogue PDFs are accepted", () => {
  const valid = "https://christianfaithstories.org/wp-content/uploads/2026/08/An-Awesome-God.pdf";
  if (publisherUrl(valid) !== valid) throw Error("valid source rejected");
  for (const url of ["http://christianfaithstories.org/wp-content/uploads/2026/08/a.pdf", "https://christianfaithstories.org.evil.test/wp-content/uploads/2026/08/a.pdf", "https://christianfaithstories.org/wp-content/uploads/2026/08/a.pdf?x=1", "https://christianfaithstories.org/other/a.pdf"]) {
    if (publisherUrl(url)) throw Error("unsafe source accepted");
  }
});

Deno.test("streamed document has a strict size limit", async () => {
  const bytes = new Uint8Array([1, 2, 3]);
  const stream = () => new ReadableStream<Uint8Array>({ start(c) { c.enqueue(bytes); c.close(); } });
  if ((await readBounded(stream(), 3)).length !== 3) throw Error("valid stream rejected");
  let rejected = false;
  try { await readBounded(stream(), 2); } catch { rejected = true; }
  if (!rejected) throw Error("oversized stream accepted");
});

Deno.test("reflows wrapped lines without splitting words or losing paragraphs", () => {
  const item = (str: string, y: number) => ({ str, transform: [1, 0, 0, 1, 0, y], height: 12 });
  const text = assembleTextItems([item("You", 100), item("r ", 100), item("faith", 100), item("continues.", 85), item("Another paragraph.", 54)]);
  if (text !== "Your faith continues.\n\nAnother paragraph.") throw Error(text);
});
