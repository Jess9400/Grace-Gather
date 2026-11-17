#!/usr/bin/env python3
"""Clean machine-translation artifacts out of the published study notes.

Some Portuguese and Spanish rows in the upstream releases (review level
"None") have a title that is a chatbot refusal ("Lo siento, no puedo…") or a
whole pasted Bible passage, and a few rows were left in English. Run after
import-open-study-notes.py:

    python3 scripts/clean-study-notes.py

Titles that are not a short passage reference are emptied (the app then
shows only its own heading); rows whose text is in English inside another
language's file are dropped.
"""
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1] / 'public/study-notes/v1'
REFUSAL = re.compile(r"lo siento|no puedo|i'?m sorry|i cannot|desculpe|não posso|извините|не могу", re.I)
ENGLISH = re.compile(r"\b(the|and|of|that|this|with|was|were|his|their|they|is|to)\b", re.I)


def bad_title(title: str) -> bool:
    return '\n' in title or len(title) > 60 or bool(REFUSAL.search(title))


def english(text: str) -> bool:
    words = re.findall(r"[A-Za-zÀ-ÿА-Яа-яЁё']+", text[:600])
    return len(words) >= 12 and len(ENGLISH.findall(text[:600])) / len(words) > 0.18


def main():
    for language in ('es', 'pt', 'ru'):
        titles = dropped = 0
        for path in sorted((ROOT / language).glob('*.json')):
            rows = json.loads(path.read_text(encoding='utf-8'))
            kept = []
            for row in rows:
                if english(row[3]):
                    dropped += 1
                    continue
                if bad_title(row[2]):
                    row[2] = ''
                    titles += 1
                kept.append(row)
            path.write_text(json.dumps(kept, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        print(f'{language}: {titles} titles emptied, {dropped} English rows dropped')


if __name__ == '__main__':
    main()
