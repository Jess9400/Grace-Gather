#!/usr/bin/env python3
"""Convert selected Bible Aquifer releases to small, per-book plain-text files.

Requires the original *-json.zip release assets in the directories below.
HTML markup and unconsumed metadata are removed; content, references and
source attribution are preserved. See public/study-notes/README.md.
"""
import html.parser
import json
import os
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/study-notes/v1'
SOURCES = [('aquifer', Path(os.environ.get('AQUIFER_ZIPS', '/tmp/grace-aquifer-notes'))),
           ('biblica', Path(os.environ.get('BIBLICA_ZIPS', '/tmp/grace-biblica-notes')))]
LANGUAGES = {'en': 'English', 'pt': 'Portuguese', 'es': 'Spanish', 'ru': 'Russian'}

class PlainText(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.hidden = 0
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'): self.hidden += 1
        if not self.hidden and tag in ('p', 'br', 'li', 'h1', 'h2', 'h3'):
            self.parts.append('\n\n' if tag != 'br' else '\n')
    def handle_endtag(self, tag):
        if tag in ('script', 'style'): self.hidden -= 1
    def handle_data(self, data):
        if not self.hidden: self.parts.append(data)
    def result(self):
        return re.sub(r'\n{3,}', '\n\n', ''.join(self.parts)).strip()

def text(value):
    parser = PlainText(); parser.feed(value or '')
    return parser.result()

def point(ref):
    if not re.fullmatch(r'\d{8}', ref or ''): return None
    return int(ref[2:5]) * 1000 + int(ref[5:8])

stats = {}
for lang, label in LANGUAGES.items():
    books = {}
    for source, path in SOURCES:
        with zipfile.ZipFile(path / (label + '-json.zip')) as archive:
            for name in sorted(archive.namelist()):
                if not re.fullmatch(r'json/\d{2}\.content\.json', name): continue
                for item in json.loads(archive.read(name)):
                    # Portuguese and Spanish are also offered as attributed
                    # references even when review information is missing.
                    if lang not in ('pt', 'es') and item.get('review_level') != 'Professional': continue
                    body = text(item.get('content', ''))
                    if not body: continue
                    for passage in item.get('associations', {}).get('passage', []):
                        match = re.match(r'^([1-3]?[A-Z]{2,3})\s', passage.get('start_ref_usfm', ''))
                        end_match = re.match(r'^([1-3]?[A-Z]{2,3})\s', passage.get('end_ref_usfm', ''))
                        start, end = point(passage.get('start_ref')), point(passage.get('end_ref'))
                        if not match or not end_match or match[1] != end_match[1] or start is None or end is None or end < start: continue
                        books.setdefault(match[1], []).append([start, end, text(item.get('title', '')), body, source, item.get('review_level', 'None')])
    target = OUT / lang; target.mkdir(parents=True, exist_ok=True)
    # Clear previously imported unreviewed files on repeat runs as well.
    for existing in target.glob('*.json'):
        if existing.stem not in books:
            existing.write_text('[]', encoding='utf-8')
    for book, entries in sorted(books.items()):
        (target / (book + '.json')).write_text(json.dumps(entries, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    stats[lang] = {'books':len(books), 'notes':sum(map(len, books.values()))}
print(json.dumps(stats, indent=2))
