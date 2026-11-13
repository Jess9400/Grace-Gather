import { useEffect, useRef, useState } from "react";
import { backend } from "./backend";
import type { Language } from "./content";

export type TranslationItem = { id: string; text: string };

// Kept only in the mounted screen's memory; translations are never persisted.
export function useConversationTranslations(
  items: TranslationItem[],
  language: Language,
) {
  const [result, setResult] = useState<{
    scope: string;
    translations: Record<string, string>;
  }>({ scope: "", translations: {} });
  const [unavailable, setUnavailable] = useState(false);
  const cache = useRef(new Map<string, string>());
  const signature = JSON.stringify(items);
  const scope = JSON.stringify([language, signature]);
  useEffect(() => {
    let active = true;
    const current = JSON.parse(signature) as TranslationItem[];
    const wanted = current.filter(
      (item) => item.text.trim() && item.text.length <= 2000,
    );
    const missing = wanted.filter(
      (item) => !cache.current.has(JSON.stringify([language, item.text])),
    );
    const render = () => {
      if (!active) return;
      const next: Record<string, string> = {};
      for (const item of wanted) {
        const value = cache.current.get(JSON.stringify([language, item.text]));
        if (value !== undefined) next[item.id] = value;
      }
      setResult({ scope, translations: next });
    };
    void Promise.resolve().then(async () => {
      render();
      if (!missing.length) {
        if (active) setUnavailable(false);
        return;
      }
      if (!backend) {
        if (active) setUnavailable(true);
        return;
      }
      const client = backend;
      for (let index = 0; index < missing.length; index += 18) {
        if (!active) return;
        const chunks = [0, 6, 12]
          .map((offset) => missing.slice(index + offset, index + offset + 6))
          .filter((chunk) => chunk.length);
        try {
          const responses = await Promise.all(
            chunks.map((chunk) =>
              client.functions.invoke("translate-conversation", {
                body: { language, texts: chunk.map((item) => item.text) },
              }),
            ),
          );
          if (!active) return;
          responses.forEach((response, batch) => {
            if (
              response.error ||
              !Array.isArray(response.data?.translations) ||
              response.data.translations.length !== chunks[batch].length ||
              !response.data.translations.every(
                (value: unknown) => typeof value === "string",
              )
            )
              throw Error("unavailable");
            chunks[batch].forEach((item, i) =>
              cache.current.set(
                JSON.stringify([language, item.text]),
                response.data.translations[i],
              ),
            );
          });
          render();
        } catch {
          if (active) setUnavailable(true);
          return;
        }
      }
      if (active) setUnavailable(false);
    });
    return () => {
      active = false;
    };
  }, [signature, language, scope]);
  return {
    translations: result.scope === scope ? result.translations : {},
    unavailable,
  };
}

export function translationCopy(
  language: string,
  key: "notice" | "privateNotice" | "original" | "translated" | "unavailable",
) {
  const copy = {
    en: {
      notice: "Content is sent to Alibaba Qwen for automatic translation.",
      privateNotice:
        "Messages are automatically sent to Alibaba Qwen for translation.",
      original: "See original",
      translated: "See translation",
      unavailable: "Translation unavailable. Original shown.",
    },
    pt: {
      notice: "O conteúdo é enviado ao Alibaba Qwen para tradução automática.",
      privateNotice:
        "As mensagens são enviadas automaticamente ao Alibaba Qwen para tradução.",
      original: "Ver original",
      translated: "Ver tradução",
      unavailable: "Tradução indisponível. Texto original exibido.",
    },
    es: {
      notice:
        "El contenido se envía a Alibaba Qwen para su traducción automática.",
      privateNotice:
        "Los mensajes se envían automáticamente a Alibaba Qwen para su traducción.",
      original: "Ver original",
      translated: "Ver traducción",
      unavailable: "Traducción no disponible. Se muestra el original.",
    },
    ru: {
      notice:
        "Тексты отправляются в Alibaba Qwen для автоматического перевода.",
      privateNotice:
        "Сообщения автоматически отправляются в Alibaba Qwen для перевода.",
      original: "Показать оригинал",
      translated: "Показать перевод",
      unavailable: "Перевод недоступен. Показан оригинал.",
    },
  } as const;
  return (copy[language as keyof typeof copy] ?? copy.en)[key];
}
