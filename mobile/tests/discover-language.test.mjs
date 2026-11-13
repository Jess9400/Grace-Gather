import test from "node:test";
import assert from "node:assert/strict";
import {
  discoverEndpointFor,
  isPortugueseDiscoverStory,
  isReadableBrazilianPublisher,
} from "../src/lib/discover-language.ts";

test("Portuguese onboarding selects the Portuguese feed, independent of Bible language", () => {
  const profile = { language: "pt", scriptureLanguage: "en" };
  assert.equal(
    discoverEndpointFor(profile.language),
    "discover_page_portuguese",
  );
  assert.equal(discoverEndpointFor("en"), "discover_page");
});

test("Portuguese recommendations require original language and a Brazilian publisher with reading rights", () => {
  const story = {
    origin: "publisher",
    lang: "pt",
    sourceCountry: "BR",
    rightsStatus: "licensed",
    title: { pt: "Uma história" },
    summary: { pt: "Esperança" },
    body: { pt: "Texto" },
  };
  assert.equal(isPortugueseDiscoverStory(story), true);
  assert.equal(isReadableBrazilianPublisher(story), true);
  assert.equal(isPortugueseDiscoverStory({ ...story, lang: "en" }), false);
  assert.equal(
    isPortugueseDiscoverStory({ ...story, sourceCountry: "PT" }),
    false,
  );
  assert.equal(
    isPortugueseDiscoverStory({ ...story, rightsStatus: undefined }),
    false,
  );
  assert.equal(isPortugueseDiscoverStory({ ...story, body: {} }), false);
  assert.equal(
    isPortugueseDiscoverStory({
      ...story,
      origin: "community",
      sourceCountry: undefined,
    }),
    true,
  );
});
