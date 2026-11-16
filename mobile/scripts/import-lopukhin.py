#!/usr/bin/env python3
"""Convert the public-domain Lopukhin commentary to small per-book files.

Source: «Толковая Библия, или Комментарий на все книги Св. Писания Ветхого и
Нового Завета», ed. A. P. Lopukhin and successors, St Petersburg, 1904–1913,
as transcribed in the OSIS file lopukhin_commentary.xml (Synodal numbering).

Only books whose commentator is clearly in the public domain are imported:
see docs/content-rights/lopukhin.md. Every other book is left out on purpose.

Usage: python3 scripts/import-lopukhin.py /path/to/lopukhin_commentary.xml
Writes public/study-notes/v1/lopukhin/<BOOK>.json as rows
[first, last, text], where first/last are chapter * 1000 + verse
(verse 0 is the chapter's introduction).
"""
import html
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/study-notes/v1/lopukhin'

# OSIS book -> the app's book code. Keep this list in step with
# docs/content-rights/lopukhin.md: commentator agreed in the sources, died
# before 1945, and no record of repression and posthumous rehabilitation.
BOOKS = {
    # Н. П. Розанов (d. 1941)
    'Mark': 'MRK', 'Luke': 'LUK', 'John': 'JHN', 'Rom': 'ROM',
    '1Cor': '1CO', '2Cor': '2CO', 'Gal': 'GAL', 'Eph': 'EPH', 'Phil': 'PHP',
    'Col': 'COL', '1Tim': '1TI', '2Tim': '2TI', 'Titus': 'TIT', 'Phlm': 'PHM',
    'Jer': 'JER', 'Lam': 'LAM', 'Mal': 'MAL',
    # прот. М. П. Фивейский (d. 1919)
    'Matt': 'MAT',
    # Ф. Г. Елеонский (d. 1906)
    'Josh': 'JOS',
    # И. Г. Троицкий (d. 1929)
    'Judg': 'JDG',
    # прот. А. В. Петровский (d. 1929)
    '1Chr': '1CH', 'Job': 'JOB', 'Dan': 'DAN',
    # В. Н. Мышцын (d. 1936)
    'Eccl': 'ECC',
    # В. П. Рыбинский (d. 1944)
    'Ezra': 'EZR', 'Neh': 'NEH', 'Hos': 'HOS', 'Joel': 'JOL', 'Amos': 'AMO',
    'Obad': 'OBA', 'Mic': 'MIC',
}

# Transcription slips found by comparing with the 1912 printing.
CORRECTIONS = {
    'Rom.8.28': [('христиан до конца, что Бог', 'христиан тем, что Бог')],
}
# A section introduction keyed to the wrong range in the transcription.
REKEY = {'Rom.8.28-29': 'Rom.8.28-39'}
# The app's Synodal Bible prints Daniel without the Greek additions: chapter 3
# skips the Prayer of Azariah and the Song of the Three (full-Synodal verses
# 24–90), so the commentary's 3:91–100 are the app's 3:24–33; chapters 13–14
# (Susanna, Bel) are absent. Checked verse by verse.
DANIEL_3_SKIPPED = 67


def place(code: str, first: int, last: int):
    """Move a note to the app's Synodal numbering, or None if not printed there."""
    if code == 'DAN':
        if first // 1000 >= 13:
            return None
        if first // 1000 == 3 and first % 1000 >= 24:
            if first % 1000 < 91:
                return None
            return first - DANIEL_3_SKIPPED, last - DANIEL_3_SKIPPED
        if last // 1000 == 3 and last % 1000 >= 24:
            last = 3023
    return first, last


def plain(fragment: str) -> str:
    text = re.sub(r'<lb\s*/>', '\n\n', fragment)
    text = re.sub(r'<figure[^>]*/>|<figure.*?</figure>', '', text, flags=re.S)
    text = re.sub(r'<[^>]+>', '', text)
    text = html.unescape(text)
    paragraphs = []
    for part in text.split('\n\n'):
        part = re.sub(r'\s+', ' ', part).strip()
        part = re.sub(r'^[.\s]+(?=\S)', '', part) if part.startswith('.') else part
        part = part.replace(' - ', ' — ')
        if part:
            paragraphs.append(part)
    return '\n\n'.join(paragraphs)


def key(chapter: str, verse: str) -> int:
    return int(chapter) * 1000 + int(verse)


def span(ref: str):
    """'John.3.16' or 'Gen.1.11-13' or 'Rom.8.28-9.2' -> (book, first, last)."""
    m = re.fullmatch(r'(\w+)\.(\d+)\.(\d+)(?:-(?:(\d+)\.)?(\d+))?', ref)
    if not m:
        return None
    book, c1, v1, c2, v2 = m.groups()
    first = key(c1, v1)
    last = key(c2 or c1, v2) if v2 else first
    return book, first, last


def main(source: Path):
    xml = source.read_text(encoding='utf-8-sig')
    rows = {}
    for ref, body in re.findall(
        r'<div type="section" annotateType="commentary" annotateRef="([^"]+)">(.*?)</div>',
        xml, flags=re.S):
        ref = REKEY.get(ref, ref)
        found = span(ref)
        if not found or found[0] not in BOOKS:
            continue
        book, first, last = found
        placed = place(BOOKS[book], first, last)
        if not placed:
            continue
        first, last = placed
        if last < first:
            last = first  # a reversed range in the transcription (Neh 9:27)
        if first % 1000 == 0 and first < 1000:
            continue  # book introduction: not a verse or chapter note
        text = plain(body)
        for wrong, right in CORRECTIONS.get(ref, []):
            assert wrong in text, (ref, wrong)
            text = text.replace(wrong, right)
        if len(text) < 2:
            continue
        rows.setdefault(BOOKS[book], []).append([first, last, text])
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob('*.json'):
        old.unlink()
    for code, book_rows in sorted(rows.items()):
        book_rows.sort(key=lambda r: (r[0], r[1]))
        (OUT / f'{code}.json').write_text(
            json.dumps(book_rows, ensure_ascii=False, separators=(',', ':')),
            encoding='utf-8')
    print(f'{sum(len(r) for r in rows.values())} notes in {len(rows)} books')


if __name__ == '__main__':
    main(Path(sys.argv[1]))
