# Journal verse fit: test library and scorecards

After someone writes in the journal, the app picks one of 29 situations, or *themes*, and shows that theme's verse. These scripts measure how often the right theme is picked.

## The test library

`mobile/tests/fixtures/journal-entries/{en,pt,es,ru}.json` holds 312 invented journal entries in English, Portuguese, Spanish and Russian. None of them is a real person's journal. Each entry has three labels:

- `expect`: the theme a thoughtful pastor would pick;
- `also`: other themes that would be a reasonable reply;
- `tricky`: true for the hard cases, such as words hidden inside other words, "not", mixed feelings and sarcasm.

The scores count three outcomes: **right** means the pick matched `expect`, **fair** means it matched one of the `also` themes, and **wrong** means anything else.

## The backup reader

This is the keyword reader the app uses when the AI is off or unavailable. Run from the repository root:

```bash
node scripts/journal-eval/score-backup.mjs
```

It prints the score and every miss, and saves `journal-backup-scorecard.json`.

## The AI picker

This scores the AI picker outside the app, so no one's daily AI allowance is used. It sends each test entry to the AI with exactly the instructions the live journal service uses; the script reads them from `supabase/functions/llm-journey/index.ts`. It needs the same Alibaba DashScope key as the journal service:

```bash
DASHSCOPE_API_KEY=... node scripts/journal-eval/eval-ai.mjs
```

- Add `--limit 40` for a quick trial.
- `QWEN_MODEL` and `QWEN_BASE_URL` work as on the server.

About 312 short requests run, one every half second. The script prints the score and every miss, and saves `journal-ai-scorecard.json`. That file contains only the test entries.
