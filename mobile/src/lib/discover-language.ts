/** Feed language follows the app's language, independently of Bible settings. */
export function discoverEndpointFor(language: string) {
  return language === "pt" ? "discover_page_portuguese" : "discover_page_non_portuguese";
}

type StoryLanguage = {
  lang?: string;
  origin?: string;
  sourceCountry?: string;
  rightsStatus?: string;
  title?: Record<string, string>;
  summary?: Record<string, string>;
  body?: Record<string, string>;
};

export function isReadableBrazilianPublisher(item: StoryLanguage) {
  return (
    item.origin === "publisher" &&
    item.sourceCountry?.toUpperCase() === "BR" &&
    (item.rightsStatus === "licensed" ||
      item.rightsStatus === "public_domain") &&
    !!item.body?.pt?.trim()
  );
}

/** Use the same rules for recommendations as for the Portuguese story feed. */
export function isPortugueseDiscoverStory(item: StoryLanguage) {
  if (!["pt", "pt-br"].includes(item.lang?.toLowerCase() ?? "")) return false;
  if (!item.title?.pt?.trim() || !item.summary?.pt?.trim()) return false;
  return (
    item.origin === "community" ||
    (item.origin === "editorial" &&
      item.sourceCountry?.toUpperCase() === "BR") ||
    isReadableBrazilianPublisher(item)
  );
}
