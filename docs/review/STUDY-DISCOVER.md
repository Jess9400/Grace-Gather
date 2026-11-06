# Bible Study and Discover: review increment and remaining design

Status: draft code + design proposal. No merge or production deployment requested. Main already includes community testimony submission, moderation states and Discover interactions; preserve them.

## Implemented in this draft

- Bible reader → Explore a theme. New `/study` searches the localized curated topic labels, selected-edition references and passages. It is explicitly labeled a limited curated search, not full-Bible search or an AI answer.
- Topic/passages use the current Scripture language, edition and tradition selection. Missing editions stay unavailable, never silently fall back to English or a different tradition.
- Passages open the existing verse study page and its contextual notes. The current detailed authored notes remain English-only where translations do not exist; do not claim full translated historical scholarship.
- Topic CTA opens an editable Community composer, prefilling only a bounded title. No journal, confession or profile text is attached.
- Community topic submission requires a preview. Changing words, title, alias, perspective or verse context invalidates that preview. The subsequent existing explicit share/review action retains the existing moderation pipeline.
- Discover links to the existing Discussions screen. This is a navigation link in this increment, not yet a redesigned embedded Discussions feed.
- External STEP Bible and BibleProject resource links are identified by publisher. They may use a different language, Bible edition or theological perspective; the app's selected edition is unaffected. No third-party articles/audio copied or hosted.
- New interface strings are provided in EN/PT/ES/RU; native-speaker review remains requested.

## Discover product direction to implement next

Top-level sections: For you, Testimonies, Discussions. Keep detailed content filters within For you for good news, music, prayers, psalms and Bible stories. Keep the current Save/Like/Comment/Share behavior and do not invent member engagement.

Testimonies includes personal experiences with two distinct source labels: Community testimony (submitted by a member) and Sourced testimony (external publisher). Saints' lives, Bible stories and hymn/psalm background belong in Stories/Music/Scripture categories, not all under testimony. Show source, event date versus publication date, and tradition applicability. No "past 24 hours" claims for older news.

Community testimony composer must retain: display-name or anonymous-to-members choice, account linkage for moderation, paragraph formatting, optional tags, preview + explicit Publish, private rejection reason, author edit/delete, reporting and My testimonies in Profile. Editing published content should return to review as required by the server policy. Never copy a journal or confession into it automatically.

Discussions should reuse the existing backend and moderation rather than maintain a second post store. Embed the list/composer under Discover after extracting reusable UI from `/community`; keep existing deep links working. Bible Study can send an exact edition/reference and a user-approved question as draft context. User words remain unchanged. No auto-posting an AI conversation.

Private Chats and Notifications belong under the profile icon, as specified in draft #24; public Discussions are not private messages.

## Question-based Bible Study / AI (not implemented here)

The current `llm-journey` is a constrained journal classifier, not a general Bible-study assistant. Do not repurpose it into uncited theological answers or imply this draft connects Qwen for study.

Implement a separate authenticated, rate-limited study endpoint after provider availability and privacy review. Input: explicit question, chosen edition/Scripture language, interface language and optional selected passage IDs. No automatic transmission of unrelated journal/confession/history. Obtain the relevant AI consent and keep API secrets server-side.

Retrieve vetted material before generation: exact licensed Scripture passages; attributed historical context; licensed lexical resources. Keep Scripture quotation separate from AI explanation. Every factual historical/linguistic claim should cite a supplied source ID that the server validates against retrieved sources. Never accept an arbitrary model URL as a citation. If evidence is missing, say so rather than inventing authorship, dates, Hebrew roots or translations.

Use the user's tradition for contextual relevance, and label differences between Protestant, Catholic and Orthodox interpretations rather than presenting one as universal. Do not imply divine speech: "What Scripture says" / "One interpretation" is more accurate than claiming generated text is God's personal message.

Hebrew/Aramaic/Greek resources should show original spelling, transliteration where useful, verse context and lexical-source attribution. A root or etymology alone is not proof of a word's meaning in a passage. Treat textual variants and uncertain historical claims explicitly. Link externally until redistribution licenses are verified.

Q&A screen: question → cited response → related passages/resources → optional Start a community discussion. That action opens an editable draft and preview, not direct publication. Only chosen text enters the draft. Preserve the input on provider errors; show unavailable state without presenting a canned response as AI.

## Contributor acceptance checks

- All four interface languages with independent Scripture language; same-language search matches the curated text, unsupported editions show honest empty/unavailable states.
- Study reference opens the correct edition, including Orthodox Psalm numbering. Existing Bible reading and chapter selection are unchanged.
- Topic handoff preserves only the selected title/reference. A malicious title is plain text and cannot trigger navigation or publishing.
- Preview required; editing after preview disables submit; explicit action required; failures preserve the draft; moderation visibility enforced by existing backend.
- Public discussions versus private chats clearly distinguished; no test users/posts/likes shown as real engagement.
- For future AI release: citation validation, retrieval prompt injection, unsupported-language/edition handling, provider errors, rate limits and account isolation; theological/native-language editorial review.
- Mobile keyboard, larger text, screen readers, and offline behavior on physical iPhone. The current branch has automated validation but still needs that manual review.

## Validation for this increment

Typecheck, lint, 23 mobile tests and web export passed on the combined branch with #23. Local browser walkthrough verified theme filtering, the prefilled editable discussion title, and disabled submission while unauthenticated. Authenticated posting and physical iPhone checks remain pending. No database schema or production secrets changed. The AI endpoint, full-corpus question search, embedded Discussions feed and chat backend remain follow-up work, explicitly not shipped by this draft.
