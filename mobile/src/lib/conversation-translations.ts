import { useEffect, useRef, useState } from "react";
import { backend } from "./backend";
import type { Language } from "./content";

export type TranslationItem = {
  id: string;
  text: string;
  source: "comment" | "community_title" | "community_body" | "friend_message";
  reference?: string;
};

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
      (item) => !cache.current.has(JSON.stringify([language, item.source, item.id, item.text])),
    );
    const render = () => {
      if (!active) return;
      const next: Record<string, string> = {};
      for (const item of wanted) {
        const value = cache.current.get(JSON.stringify([language, item.source, item.id, item.text]));
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
                body: { language, items: chunk.map((item) => ({source:item.source,id:item.reference ?? item.id})) },
              }),
            ),
          );
          if (!active) return;
          responses.forEach((response, batch) => {
            if (
              response.error ||
              !Array.isArray(response.data?.translations) ||
              !response.data.translations.every(
                (value: {id?:unknown;source?:unknown;text?:unknown}) => typeof value?.id === "string" && typeof value?.source === "string" && typeof value?.text === "string",
              )
            )
              throw Error("unavailable");
            chunks[batch].forEach((item) =>
              cache.current.set(
                JSON.stringify([language, item.source, item.id, item.text]),
                response.data.translations.find((value:{id:string;source:string}) => value.id === (item.reference ?? item.id) && value.source === item.source)?.text ?? item.text,
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
      notice: "Translations use an external AI service when people have agreed.",
      privateNotice:
        "Messages are translated when both people allow AI translation.",
      original: "See original",
      translated: "See translation",
      unavailable: "Translation unavailable. Original shown.",
    },
    pt: {
      notice: "As traduções usam um serviço externo de IA com a concordância das pessoas.",
      privateNotice:
        "As mensagens são traduzidas quando as duas pessoas permitem a tradução por IA.",
      original: "Ver original",
      translated: "Ver tradução",
      unavailable: "Tradução indisponível. Texto original exibido.",
    },
    es: {
      notice:
        "Las traducciones usan un servicio externo de IA con el consentimiento de las personas.",
      privateNotice:
        "Los mensajes se traducen cuando ambas personas permiten la traducción con IA.",
      original: "Ver original",
      translated: "Ver traducción",
      unavailable: "Traducción no disponible. Se muestra el original.",
    },
    ru: {
      notice:
        "Перевод с помощью внешнего ИИ используется с согласия участников.",
      privateNotice:
        "Сообщения переводятся, когда оба участника разрешили перевод с ИИ.",
      original: "Показать оригинал",
      translated: "Показать перевод",
      unavailable: "Перевод недоступен. Показан оригинал.",
    },
  } as const;
  return (copy[language as keyof typeof copy] ?? copy.en)[key];
}
