#!/usr/bin/env python3
"""Rebuild the experimental Matos study reader from the pinned source JSON.

This verifies file identity and structure, not the copyright status or the
accuracy of the underlying text. See docs/matos-soares-source-review.md.
"""
import hashlib
import json
import pathlib
import sys

root = pathlib.Path(__file__).resolve().parents[1]
source = pathlib.Path(sys.argv[1])
expected = 'a66118c41f02b1f589b25c792dd7fab247e93b0f8b94a17985b2c1ecb788ce82'
raw = source.read_bytes()
if hashlib.sha256(raw).hexdigest() != expected:
    raise SystemExit('Source differs from the reviewed snapshot')
data = json.loads(raw)
books = data['books']
assert len(books) == 73 and sum(len(b['chapters']) for b in books) == 1334
out = root / 'mobile/src/generated/bible-matos'
out.mkdir(parents=True, exist_ok=True)
index = {
    'id': 'matos', 'language': 'pt', 'tradition': 'catholic',
    'edition': 'Matos Soares', 'source': 'https://github.com/bibliacatolica/biblia',
    'attribution': 'Bíblia Sagrada, tradução do Pe. Manuel de Matos Soares. Texto digital: bibliacatolica/biblia.',
    'licenseUrl': 'https://github.com/bibliacatolica/biblia',
    'coverageNote': 'Edição católica em português, com 73 livros. A numeração segue a edição da fonte.',
    'sourceSha256': expected, 'books': [],
}
renames = {'EZE': 'EZK', 'JOE': 'JOL', 'NAH': 'NAM'}
lines = ['import type {BibleBook} from "../../lib/bible";', 'export const bookLoaders:Record<string,()=>BibleBook>={']
seen = set()
for book in books:
    code = renames.get(book['id'], book['id'])
    assert code not in seen
    seen.add(code)
    info = {'code': code, 'name': book['name'], 'chapters': len(book['chapters'])}
    chapters = {}
    for chapter, verses in book['chapters'].items():
        assert [v['v'] for v in verses] == list(range(1, len(verses) + 1))
        assert all(v['t'].strip() for v in verses)
        chapters[chapter] = [
            {'id': f'{code}.{chapter}.{v["v"]}', 'number': str(v['v']), 'text': v['t'], 'notes': []}
            for v in verses
        ]
    index['books'].append(info)
    (out / f'{code}.json').write_text(json.dumps({'book': info, 'chapters': chapters}, ensure_ascii=False, separators=(',', ':')))
    lines.append(f' "{code}":()=>require("./{code}.json") as BibleBook,')
lines.append('};')
(out / 'loaders.ts').write_text('\n'.join(lines) + '\n')
(out / 'index.json').write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n')
