#!/usr/bin/env python3
"""Import pinned eBible USFX texts. Scripture wording and verse labels stay intact."""
import argparse
import hashlib
import json
import re
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
PINNED = {
    'dra': 'f6560ec0cb95e8ed97207ca83298f0bda5c32261b9188844b2d7ecb6bfb67adb',
    'brenton': '363300189c61b0378a13d75daa170e00dd6850057c65ee28c82c46a78f8a3554',
    'webu': 'd9a571c1c7e0458e62aa8dab52e68d004e8a0533c075ab9be01b35d0e0ea6f12',
}
DRA_ORDER = 'GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH TOB JDT EST 1MA 2MA JOB PSA PRO ECC SNG WIS SIR ISA JER LAM BAR EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV'.split()
NT_CODES = DRA_ORDER[-27:]
BRENTON_ORDER = 'GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH JOB PSA PRO ECC SNG ISA JER LAM EZK HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL TOB JDT ESG DAG WIS SIR BAR LJE SUS BEL 1MA 2MA 1ES MAN 3MA 4MA'.split()
SOURCES = {
    'dra': {
        'id': 'dra', 'language': 'en', 'tradition': 'catholic',
        'edition': 'Douay-Rheims 1899',
        'source': 'https://ebible.org/Scriptures/engDRA_usfx.zip',
        'sourceBaseUrl': 'https://ebible.org/engDRA/',
        'rights': 'https://ebible.org/engDRA/copyright.htm',
        'attribution': 'Douay-Rheims American Edition, 1899. Public domain. Text supplied by eBible.org.',
        'coverageNote': 'Complete 73-book Catholic collection. Esther and Daniel include their longer passages. Psalm numbering follows this Vulgate-based edition.',
    },
    'brenton': {
        'id': 'brenton', 'language': 'en', 'tradition': 'orthodox',
        'edition': 'Brenton Septuagint + WEB NT and supplement',
        'source': 'https://ebible.org/Scriptures/eng-Brenton_usfx.zip',
        'sourceBaseUrl': 'https://ebible.org/eng-Brenton/',
        'rights': 'https://ebible.org/eng-Brenton/copyright.htm',
        'attribution': 'Brenton Septuagint, 1851, with World English Bible New Testament and 2 Esdras supplement. All public domain. Texts supplied by eBible.org.',
        'coverageNote': 'Brenton Septuagint Old Testament with longer books, plus a separately labelled World English Bible New Testament and WEB 2 Esdras supplement. An app collection, not a church-approved Orthodox edition or a universal Orthodox canon. Book and Psalm numbering follow the source editions. A separate Odes collection is not included.',
    },
}


def clean(text):
    return re.sub(r'\s+', ' ', text).strip()


def parse_book(book, code, empty_note=None, include_book_tails=False):
    """Read mixed-content USFX while keeping footnotes outside verse wording."""
    chapters, chapter, current, fragments = {}, 0, None, []

    def flush():
        nonlocal current, fragments
        if current is not None:
            current['text'] = clean(''.join(fragments))
            if not current['text'] and not current['notes']:
                if empty_note:
                    current["notes"].append(empty_note)
                else:
                    raise ValueError(f"Empty source verse {current['id']}")
            chapters[str(chapter)].append(current)
        current, fragments = None, []

    def walk(el):
        nonlocal chapter, current
        if el.tag == 'c':
            flush()
            chapter = int(el.attrib['id'])
            if str(chapter) in chapters:
                raise ValueError(f'Duplicate chapter {code}.{chapter}')
            chapters[str(chapter)] = []
        elif el.tag == 'v':
            flush()
            number = el.attrib['id']
            current = {'id': f'{code}.{chapter}.{number}', 'number': number, 'text': '', 'notes': []}
        elif el.tag == 've':
            flush()
        elif el.tag in ('f', 'x'):
            if current is not None:
                note = clean(' '.join(''.join(child.itertext()) for child in el if child.tag not in ('fr', 'xo')))
                if note:
                    current['notes'].append(note)
        elif (
            el.tag in ('d', 's', 'r', 'toc', 'h', 'id', 'ide')
            # A psalm or prophecy title that carries a verse number is part of
            # that verse in this numbering (Brenton: "1 A Psalm of David. The
            # Lord tends me as a shepherd..."), so it is read, not skipped.
            and not (el.tag == 'd' and el.find('v') is not None)
        ) or (el.tag == 'p' and el.attrib.get('sfm', '').startswith(('mt', 'is', 'ip'))):
            pass
        else:
            if current is not None and el.text:
                fragments.append(el.text)
            for child in el:
                walk(child)
                if current is not None and child.tail:
                    fragments.append(child.tail)
            if current is not None and el.tag in ('p', 'q'):
                fragments.append(' ')

    for node in book:
        walk(node)
        if include_book_tails and current is not None and node.tail:
            fragments.append(node.tail)
    flush()
    assert chapters and all(chapters.values()), code
    ids = [verse['id'] for verses in chapters.values() for verse in verses]
    assert len(ids) == len(set(ids)), f'Duplicate verse IDs: {code}'
    assert list(chapters) == [str(i) for i in range(1, len(chapters) + 1)], code
    return chapters


def write_json(path, value, pretty=False):
    path.write_text(json.dumps(value, ensure_ascii=True, indent=2 if pretty else None, separators=None if pretty else (',', ':')) + '\n')


def import_collection(key, archive, output_root, web_archive=None):
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    if digest != PINNED[key]:
        raise ValueError(f'{key} archive differs from the reviewed publisher snapshot. Review coverage and update the pin explicitly before importing.')
    out = output_root / f'bible-{key}'
    out.mkdir(parents=True, exist_ok=True)
    source = SOURCES[key]
    with ZipFile(archive) as z:
        root = ET.fromstring(z.read(next(name for name in z.namelist() if name.endswith('_usfx.xml'))))
        books = {book.attrib['id']: book for book in root.findall('book')}
        names = {book.attrib['code']: book.attrib['short'] for book in ET.fromstring(z.read('BookNames.xml'))}
        # Preserve the publisher's exact rights notice alongside normalized text.
        (out / 'publisher-rights.html').write_bytes(z.read('copr.htm'))
    order = DRA_ORDER if key == 'dra' else BRENTON_ORDER
    metadata = []
    loaders = []
    for code in order:
        source_offset = 0
        source_code = code
        chapters = parse_book(books[code], code)
        if key == 'brenton' and code == 'EZR':
            # The combined source has different numbering and transcription from
            # the separate NEH copy. Use the combined source consistently.
            assert len(chapters) == 23
            chapters = {str(n): chapters[str(n)] for n in range(1, 11)}
        elif key == 'brenton' and code == 'NEH':
            combined = parse_book(books['EZR'], 'EZR')
            chapters = {}
            for n in range(1, 14):
                chapters[str(n)] = [dict(verse, id=f"NEH.{n}.{verse['number']}") for verse in combined[str(n + 10)]]
            source_code, source_offset = 'EZR', 10
        item = {
            'code': code, 'name': names[code], 'chapters': len(chapters),
            'verses': sum(len(verses) for verses in chapters.values()),
            'sourceEdition': source['edition'] if key == 'dra' else 'Brenton Septuagint, 1851',
            'sourceBookCode': source_code, 'sourceChapterOffset': source_offset,
            'sourceChapterDigits': 3 if code == 'PSA' else 2,
            'sourceBaseUrl': source['sourceBaseUrl'],
            'attribution': SOURCES[key]['attribution'] if key == 'dra' else 'Brenton Septuagint, 1851. Public domain. Text supplied by eBible.org.',
            'licenseUrl': source['rights'],
            'sourceLicenseUrl': source['rights'],
        }
        item['sourceAttribution'] = item['attribution']
        if key == 'brenton' and code == 'EZR':
            item['name'] = 'Ezra'
        write_json(out / f'{code}.json', {'book': item, 'chapters': chapters})
        metadata.append(item)
        loaders.append(f' "{code}":()=>require("./{code}.json") as BibleBook,')
    extras = {}
    if key == 'brenton':
        if web_archive is None:
            raise ValueError('The reviewed WEB Updated archive is required for 2 Esdras.')
        web_digest = hashlib.sha256(web_archive.read_bytes()).hexdigest()
        if web_digest != PINNED['webu']:
            raise ValueError('WEB Updated supplement archive differs from the reviewed snapshot.')
        with ZipFile(web_archive) as z:
            supplement_root = ET.fromstring(z.read(next(name for name in z.namelist() if name.endswith('_usfx.xml'))))
            supplement_book = next(book for book in supplement_root.findall('book') if book.attrib['id'] == '2ES')
            (out / 'web-supplement-publisher-rights.html').write_bytes(z.read('copr.htm'))
        supplement_chapters = parse_book(supplement_book, '2ES')
        supplement = {
            'code': '2ES', 'name': '2 Esdras (WEB supplement)',
            'chapters': len(supplement_chapters),
            'verses': sum(len(verses) for verses in supplement_chapters.values()),
            'sourceEdition': 'World English Bible Updated',
            'sourceBookCode': '2ES', 'sourceChapterOffset': 0, 'sourceChapterDigits': 2,
            'sourceBaseUrl': 'https://ebible.org/engwebu/',
            'attribution': 'World English Bible Updated. Public domain. Text supplied by eBible.org.',
            'sourceAttribution': 'World English Bible Updated. Public domain. Text supplied by eBible.org.',
            'licenseUrl': 'https://ebible.org/engwebu/copyright.htm',
            'sourceLicenseUrl': 'https://ebible.org/engwebu/copyright.htm',
            'isSupplement': True,
            'coverageNote': 'English 2 Esdras, known as 3 Esdras in the Slavonic Bible. WEB text, not Brenton or a text found in the Greek Septuagint. Included as a clearly labelled supplement; canonical status varies.',
        }
        write_json(out / '2ES.json', {'book': supplement, 'chapters': supplement_chapters})
        metadata.append(supplement)
        loaders.append(' "2ES":()=>require("./2ES.json") as BibleBook,')
        web = json.loads((output_root / 'bible/index.json').read_text())
        for code in NT_CODES:
            item = dict(next(book for book in web['books'] if book['code'] == code))
            item.update({
                'sourceEdition': 'World English Bible, Protestant Edition',
                'sourceBookCode': code, 'sourceChapterOffset': 0, 'sourceChapterDigits': 2,
                'sourceBaseUrl': 'https://ebible.org/engwebp/',
                'attribution': 'World English Bible. Public domain. Text supplied by eBible.org.',
                'licenseUrl': 'https://ebible.org/engwebp/copyright.htm',
                'sourceLicenseUrl': 'https://ebible.org/engwebp/copyright.htm',
                'sourceAttribution': 'World English Bible. Public domain. Text supplied by eBible.org.',
            })
            metadata.append(item)
            loaders.append(f' "{code}":()=>require("../bible/{code}.json") as BibleBook,')
        extras = {
            'isComposite': True,
            'newTestamentSource': {k: web[k] for k in ('edition', 'source', 'rights', 'archive_sha256')},
            'oldTestamentBookEntries': len(order), 'newTestamentBookEntries': 27,
            'supplementBookEntries': 1,
            'supplementSources': [{
                'bookCode': '2ES', 'edition': 'World English Bible Updated',
                'source': 'https://ebible.org/Scriptures/engwebu_usfx.zip',
                'rights': 'https://ebible.org/engwebu/copyright.htm',
                'archive_sha256': web_digest,
            }],
            'coverageLimitations': [
                'This 81-entry collection is not a statement that Orthodox churches have an 81-book canon. Separate Greek Esther, Greek Daniel, Letter of Jeremiah, Susanna and Bel entries affect the entry count. One entry is explicitly a supplemental WEB translation of 2 Esdras.',
                '4 Maccabees is included as source material; its canonical status varies.',
                'Brenton does not supply Slavonic 3 Esdras (often called 2 Esdras in English); it is supplied separately from WEB Updated as a labelled supplement. No verified separately reusable English Odes edition was found in the checked official sources, so Odes is not invented or assembled.',
                'The New Testament is WEB, not Brenton and not an Orthodox-specific translation.',
                'Publisher introductions, appendix, errata and other non-scriptural front/back matter are excluded.',
            ],
            'normalizationNotes': ['The publisher has differing Nehemiah copies in EZR chapters 11-23 and NEH chapters 1-13. This collection consistently uses the combined EZR source: Ezra chapters 1-10 and Nehemiah chapters 1-13 mapped from EZR 11-23. Verse wording and numbering stay as in the combined source; chapter source links preserve the offset. The separate NEH transcription is excluded.'],
        }
    note_only = []
    for item in metadata:
        path = out / f"{item['code']}.json"
        if key == 'brenton' and item['code'] in NT_CODES:
            path = output_root / 'bible' / f"{item['code']}.json"
        for verses in json.loads(path.read_text())['chapters'].values():
            note_only.extend(verse['id'] for verse in verses if not verse['text'])
    index = {**source, **extras, 'licenseUrl': source['rights'], 'imported': '2026-11-04', 'archive_sha256': digest, 'books': metadata,
             'noteOnlyVerseIds': note_only, 'scriptureVerseCount': sum(book['verses'] for book in metadata) - len(note_only),
             'verseCount': sum(book['verses'] for book in metadata), 'chapterCount': sum(book['chapters'] for book in metadata)}
    write_json(out / 'index.json', index, pretty=True)
    (out / 'loaders.ts').write_text('import type {BibleBook} from "../../lib/bible";\nexport const bookLoaders:Record<string,()=>BibleBook>={\n' + '\n'.join(loaders) + '\n};\n')
    return {'edition': key, 'books': len(metadata), 'chapters': index['chapterCount'], 'verses': index['verseCount']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dra', type=Path, required=True)
    parser.add_argument('--brenton', type=Path, required=True)
    parser.add_argument('--webu', type=Path, required=True, help='Pinned WEB Updated archive for the 2 Esdras supplement')
    parser.add_argument('--output-root', type=Path, default=ROOT / 'mobile/src/generated')
    args = parser.parse_args()
    for key in ('dra', 'brenton'):
        print(json.dumps(import_collection(key, getattr(args, key), args.output_root, args.webu)))


if __name__ == '__main__':
    main()
