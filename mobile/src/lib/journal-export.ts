import type { Entry, Language } from "./content";
import { journalCopy } from "./journal-library-copy";
import { jc, type JournalCopyKey } from "./journal-copy";
export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function validDateRange(from: string, to: string) {
  const valid = (value: string) =>
    !value ||
    (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
      dateKey(new Date(`${value}T12:00:00`)) === value);
  return valid(from) && valid(to) && (!from || !to || from <= to);
}
export function selectJournalExport(
  entries: Entry[],
  options: {
    from: string;
    to: string;
    includeConversations: boolean;
    entryId?: string;
    deletedChatId?: string;
  },
) {
  if (!validDateRange(options.from, options.to))
    throw Error("invalid_date_range");
  return entries
    .filter((e) => {
      if (
        e.sessionOnly ||
        (e.deletedAt && e.id !== options.entryId) ||
        (options.entryId && e.id !== options.entryId)
      )
        return false;
      const date = dateKey(new Date(e.createdAt));
      return (
        (!options.from || date >= options.from) &&
        (!options.to || date <= options.to)
      );
    })
    .map((e) => {
      const conversation = options.deletedChatId
        ? e.deletedConversations?.find((c) => c.id === options.deletedChatId)
            ?.messages
        : e.conversation;
      return {
        ...e,
        deletedAt: undefined,
        deletedConversations: undefined,
        chatCleanup: undefined,
        conversation: options.includeConversations ? conversation : undefined,
        conversationUpdatedAt: options.includeConversations
          ? e.conversationUpdatedAt
          : undefined,
      };
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function journalExportHtml(entries: Entry[], language: Language) {
  const t = (key: Parameters<typeof journalCopy>[1]) =>
    escape(journalCopy(language, key));
  const paragraph = (text: string, css = "") =>
    `<p class="${css}">${escape(text)}</p>`;
  const html = entries
    .map((entry) => {
      const response = entry.response,
        verse = response?.verse;
      return `<article><h2>${escape(new Date(entry.createdAt).toLocaleDateString(language, { dateStyle: "long" }))}</h2>
      ${paragraph(entry.text || journalCopy(language, "audio"), "writing")}
      ${verse ? `<section><h3>${t("verse")}</h3>${paragraph(verse.text, "verse")}${paragraph(`${verse.reference} · ${verse.editionName}`, "muted")}${paragraph(verse.attribution, "credit")}</section>` : ""}
      ${response && !entry.safety ? `<section><h3>${t("action")}</h3>${paragraph(response.invitation)}${paragraph(response.actionTitle, "action")}</section>` : ""}
      ${entry.reflection ? `<section><h3>${t("reflection")}</h3>${paragraph(entry.reflection)}</section>` : ""}
      ${entry.conversation?.length ? `<section><h3>${t("conversation")}</h3>${entry.conversation.map((m) => `<div class="message"><h4>${t(m.role === "user" ? "you" : "ai")}</h4>${paragraph(m.content)}${m.actionId ? `${m.actionExplanation ? paragraph(m.actionExplanation) : ""}${paragraph(jc(language, m.actionId as JournalCopyKey), "action")}` : ""}</div>`).join("")}</section>` : ""}
    </article>`;
    })
    .join("");
  return `<!DOCTYPE html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>Grace &amp; Gather - ${t("journal")}</title><style>
    @page { size: A4; margin: 20mm 19mm; }
    * { box-sizing: border-box; } body { font: 11pt/1.65 Georgia, 'Times New Roman', serif; color: #302C28; margin: 0; background: white; }
    main { max-width: 720px; margin: 0 auto; } header { margin: 0 0 26px; padding-bottom: 16px; border-bottom: 1px solid #D8CDB9; }
    header p { font: 9pt/1.4 Arial, sans-serif; letter-spacing: 2px; color: #806122; } h1 { font-size: 26pt; font-weight: normal; margin: 10px 0; }
    h2 { font-size: 19pt; font-weight: normal; margin: 0 0 24px; } h3 { font: 600 10pt/1.4 Arial, sans-serif; color: #806122; margin: 24px 0 10px; }
    h4 { font: 600 9pt/1.4 Arial, sans-serif; color: #746A60; margin: 16px 0 5px; } p { margin: 0 0 12px; white-space: pre-wrap; overflow-wrap: anywhere; widows: 3; orphans: 3; }
    article + article { break-before: page; } h2,h3,h4 { break-after: avoid; } .verse { font-size: 15pt; } .muted { color: #746A60; font-size: 10pt; } .credit { font-size: 8pt; color: #746A60; }
    .action { font: 600 10pt/1.5 Arial, sans-serif; padding: 10px 14px; background: #F5EFE2; border-radius: 8px; } .message { margin: 0 0 16px; } article { padding: 0 0 24px; }
    @media screen { body { padding: 32px 24px; background: #FFFCF3; } article { padding: 28px; margin: 24px 0; background: white; border-radius: 12px; } }
  </style></head><body><main><header><p>GRACE &amp; GATHER</p><h1>${t("journal")}</h1></header>${html}</main></body></html>`;
}
