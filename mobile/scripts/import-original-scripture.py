"""Reproducible, attributed STEP derivatives. No original-language data is sent to AI.
Run after downloading the six named TSVs into STEP_IMPORT_DIRECTORY (default /tmp).
"""
import os,re,json,hashlib,pathlib,collections
root=pathlib.Path(__file__).resolve().parents[1]
out=root/'public/study-original/v1';out.mkdir(parents=True,exist_ok=True)
source=pathlib.Path(os.environ.get('STEP_IMPORT_DIRECTORY','/tmp'))
book_codes='Gen:GEN Exo:EXO Lev:LEV Num:NUM Deu:DEU Jos:JOS Jdg:JDG Rut:RUT 1Sa:1SA 2Sa:2SA 1Ki:1KI 2Ki:2KI 1Ch:1CH 2Ch:2CH Ezr:EZR Neh:NEH Est:EST Job:JOB Psa:PSA Pro:PRO Ecc:ECC Sng:SNG Isa:ISA Jer:JER Lam:LAM Ezk:EZK Dan:DAN Hos:HOS Jol:JOL Amo:AMO Oba:OBA Jon:JON Mic:MIC Nam:NAM Hab:HAB Zep:ZEP Hag:HAG Zec:ZEC Mal:MAL Mat:MAT Mrk:MRK Luk:LUK Jhn:JHN Act:ACT Rom:ROM 1Co:1CO 2Co:2CO Gal:GAL Eph:EPH Php:PHP Col:COL 1Th:1TH 2Th:2TH 1Ti:1TI 2Ti:2TI Tit:TIT Phm:PHM Heb:HEB Jas:JAS 1Pe:1PE 2Pe:2PE 1Jn:1JN 2Jn:2JN 3Jn:3JN Jud:JUD Rev:REV'
codes=dict(x.split(':') for x in book_codes.split())
books=collections.defaultdict(lambda:collections.defaultdict(list));concordance=collections.defaultdict(set);sources=[]
for tag,parts in [('TAGNT',['Mat-Jhn','Act-Rev']),('TAHOT',['Gen-Deu','Jos-Est','Job-Sng','Isa-Mal'])]:
 for part in parts:
  path=source/f'{tag}-{part}.tsv';raw=path.read_bytes();sources.append({'file':path.name,'sha256':hashlib.sha256(raw).hexdigest()})
  for line in raw.decode('utf-8-sig').splitlines():
   row=line.split('\t');m=re.match(r'(\w+)\.(\d+)\.(\d+)([^#]*)#(\d+)=([^\t]+)',row[0])
   if not m:continue
   book,ch,verse,alternate,position,kind=m.groups();code=codes.get(book)
   if not code:raise ValueError(book)
   greek=tag=='TAGNT'
   # One reading, never concatenate all variants into a fabricated sentence.
   # N identifies the dataset's main NT reading; Q is the spoken Hebrew reading.
   if greek and not kind.startswith('N'):continue
   if not greek and not kind.startswith(('L','Q')):continue
   if greek:
    form=re.match(r'^(.*?)\s+\(([^)]*)\)\s*$',row[1])
    text,pron=(form.groups() if form else (row[1],''))
    pairs=[p.split('=',1) for p in row[3].split('+') if '=' in p]
    strongs=re.findall(r'G\d{4}[A-Z]?',row[3]);grammar=' + '.join(p[1] for p in pairs)
    lemma=row[4].split('=',1)[0];gloss=row[2]
   else:
    text=re.sub(r'[/\\]','',row[1]);pron=row[2];strongs=re.findall(r'H\d{4}[A-Z]?',row[4]);grammar=row[5];lemma='';gloss=row[3]
   strongs=list(dict.fromkeys(strongs))
   # compact tuple: displayed form, pronunciation/transliteration, lexical ids,
   # source morphology, contextual English gloss, dictionary form, source numbering.
   token=[text,pron,strongs,grammar,gloss,lemma,alternate]
   books[code][f'{int(ch)}.{int(verse)}'].append((len(books[code][f'{int(ch)}.{int(verse)}']),token))
for code,verses in books.items():
 chapters=collections.defaultdict(dict)
 for key,tokens in verses.items():
  ch,v=key.split('.');seen=set();ordered=[]
  for pos,token in sorted(tokens,key=lambda x:x[0]):
   if pos in seen:raise ValueError(f'duplicate main reading {code} {key} #{pos}')
   seen.add(pos);ordered.append(token)
   for strong in token[2]:
    concordance[strong].add(f'{code}.{key}')
    base=re.match(r'[GH]\d{4}',strong)[0]
    concordance[base].add(f'{code}.{key}')
  chapters[ch][v]=ordered
 for ch,verses in chapters.items():
  dest=out/'chapters'/code;dest.mkdir(parents=True,exist_ok=True)
  (dest/f'{ch}.json').write_text(json.dumps(verses,ensure_ascii=False,separators=(',',':')))
# Shard the concordance by Strong's hundreds (G30/H04), not 20k files or one huge download.
shards=collections.defaultdict(dict)
for strong,refs in concordance.items():
 shards[strong[:3]][strong]=sorted(refs,key=lambda r:(list(codes.values()).index(r.split('.')[0]),*[int(x) for x in r.split('.')[1:]]))
(out/'concordance').mkdir(exist_ok=True)
for shard,entries in shards.items():(out/'concordance'/f'{shard}.json').write_text(json.dumps(entries,separators=(',',':')))
manifest={'version':1,'source':'https://github.com/STEPBible/STEPBible-Data','license':'https://creativecommons.org/licenses/by/4.0/','attribution':'STEPBible.org, based on work at Tyndale House, Cambridge.','changes':'Chapter-sharded JSON; main N Greek reading only; L/Q Hebrew reading; variants excluded. Pronunciation is source transliteration, not recorded audio. English contextual glosses unchanged. Source numbering alternatives retained.','books':{code:sorted({int(k.split('.')[0]) for k in verses}) for code,verses in books.items()},'files':sources}
(root/'src/generated/study-original/manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(len(books),'books;',sum(len(v) for v in books.values()),'verses;',len(concordance),'lexical concordances')
