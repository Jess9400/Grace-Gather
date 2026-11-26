"""Render bundled, labelled 2D reference maps from Natural Earth public-domain geometry.
No map tiles or graphics context are needed on the user's device.
"""
import hashlib, json, math, urllib.request
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/study-maps'; OUT.mkdir(parents=True,exist_ok=True)
CACHE=Path('/tmp/gg-study-atlas-cache'); CACHE.mkdir(exist_ok=True)
def fetch(name):
 url=f'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_{name}.geojson'
 p=CACHE/hashlib.sha256(url.encode()).hexdigest()
 if not p.exists(): p.write_bytes(urllib.request.urlopen(url,timeout=90).read())
 return json.loads(p.read_bytes())
land,lakes,rivers=[fetch(n) for n in ['land','lakes','rivers_lake_centerlines']]
S=1
FONT='/System/Library/Fonts/Supplemental/Georgia.ttf'
ITALIC='/System/Library/Fonts/Supplemental/Georgia Italic.ttf'
# Ancient names on a present-day physical base. No ancient territorial lines or routes.
regions={
 'levant':{'bounds':[33.7,30.9,37.1,34.0],'size':[1050,1200],
 'title':['Galilee & Judea','Galileia e Judeia','Galilea y Judea','Галилея и Иудея'],
 'cities':[(35.207639,31.704306,['Bethlehem','Belém','Belén','Вифлеем'],(-260,60)),(35.444564,31.871719,['Jericho','Jericó','Jericó','Иерихон'],(40,-60)),(35.234167,31.776667,['Jerusalem','Jerusalém','Jerusalén','Иерусалим'],(-255,18)),(35.29769,32.70214,['Nazareth','Nazaré','Nazaret','Назарет'],(-250,-48)),(35.575,32.881111,['Capernaum','Cafarnaum','Cafarnaúm','Капернаум'],(-70,-100)),(35.196111,33.270833,['Tyre','Tiro','Tiro','Тир'],(-140,-28)),(36.30639,33.511112,['Damascus','Damasco','Damasco','Дамаск'],(-170,-65))],
 'waters':[(34.25,32.25,['Mediterranean\nSea','Mar\nMediterrâneo','Mar\nMediterráneo','Средиземное\nморе']),(36.35,32.6,['Sea of\nGalilee','Mar da\nGalileia','Mar de\nGalilea','Галилейское\nморе']),(36.0,31.45,['Dead Sea','Mar Morto','Mar Muerto','Мёртвое море'])]},
 'east':{'bounds':[28,25,51.5,40],'size':[1500,1100],
 'title':['Ancient Near East','Antigo Oriente Próximo','Antiguo Oriente Próximo','Древний Ближний Восток'],
 'cities':[(35.234167,31.776667,['Jerusalem','Jerusalém','Jerusalén','Иерусалим'],(20,15)),(36.30639,33.511112,['Damascus','Damasco','Damasco','Дамаск'],(-80,-65)),(43.1528,36.3594,['Nineveh','Nínive','Nínive','Ниневия'],(20,-60)),(44.422222,32.543333,['Babylon','Babilônia','Babilonia','Вавилон'],(-100,25)),(48.25778,32.18922,['Susa','Susã','Susa','Сузы'],(15,15)),(29.8965,31.1825,['Alexandria','Alexandria','Alejandría','Александрия'],(20,30))],
 'waters':[(30.6,34.4,['Mediterranean\nSea','Mar\nMediterrâneo','Mar\nMediterráneo','Средиземное\nморе']),(49.3,27.1,['Persian Gulf','Golfo Pérsico','Golfo Pérsico','Персидский залив']),(35,26.8,['Red Sea','Mar Vermelho','Mar Rojo','Красное море'])]},
 'mediterranean':{'bounds':[9,28,39,46],'size':[1500,1100],
 'title':['The Mediterranean world','O mundo mediterrâneo','El mundo mediterráneo','Мир Средиземноморья'],
 'cities':[(36.171743,36.226691,['Antioch','Antioquia','Antioquía','Антиохия'],(-100,-60)),(12.4852,41.8922,['Rome','Roma','Roma','Рим'],(20,-55)),(22.878741,37.905785,['Corinth','Corinto','Corinto','Коринф'],(-200,20)),(23.726738,37.971851,['Athens','Atenas','Atenas','Афины'],(-65,-70)),(27.3407,37.939125,['Ephesus','Éfeso','Éfeso','Эфес'],(20,20)),(35.234167,31.776667,['Jerusalem','Jerusalém','Jerusalén','Иерусалим'],(-160,-55)),(36.30639,33.511112,['Damascus','Damasco','Damasco','Дамаск'],(-180,-65)),(29.8965,31.1825,['Alexandria','Alexandria','Alejandría','Александрия'],(-270,40))],
 'waters':[(20.5,33.5,['Mediterranean Sea','Mar Mediterrâneo','Mar Mediterráneo','Средиземное море']),(32.7,43,['Black Sea','Mar Negro','Mar Negro','Чёрное море'])]}}
for region,c in regions.items():
 w,s,e,n=c['bounds']; W,H=c['size']; padding=64; top=150; bottom=85
 # Equirectangular map with longitude scaled at the region's central latitude.
 cos=math.cos(math.radians((s+n)/2)); scale=min((W-2*padding)/((e-w)*cos),(H-top-bottom)/(n-s))
 mw=(e-w)*cos*scale; mh=(n-s)*scale; left=(W-mw)/2; upper=top+(H-top-bottom-mh)/2
 def xy(p):return (left+(p[0]-w)*cos*scale,upper+(n-p[1])*scale)
 def visible(coords):return any(w-2<=p[0]<=e+2 and s-2<=p[1]<=n+2 for p in coords)
 base=Image.new('RGB',(W,H),'#eadfc7'); d=ImageDraw.Draw(base)
 for feature in land['features']:
  g=feature['geometry']; polys=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
  for poly in polys:
   if not visible(poly[0]):continue
   d.polygon([xy(p) for p in poly[0]],fill='#e9d6b0',outline='#8f967f',width=2)
   for hole in poly[1:]:d.polygon([xy(p) for p in hole],fill='#c2d7d7')
 # Sea background and coastlines via a mask, clipped to map window.
 mask=Image.new('L',(W,H)); md=ImageDraw.Draw(mask)
 for feature in land['features']:
  g=feature['geometry']; polys=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
  for poly in polys:
   if not visible(poly[0]):continue
   md.polygon([xy(p) for p in poly[0]],fill=255)
   for hole in poly[1:]:md.polygon([xy(p) for p in hole],fill=0)
 sea=Image.new('RGB',(W,H),'#c2d7d7'); base=Image.composite(base,sea,mask);d=ImageDraw.Draw(base)
 for f in lakes['features']:
  g=f['geometry']; polys=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
  for poly in polys:
   if visible(poly[0]):d.polygon([xy(p) for p in poly[0]],fill='#aac9cd',outline='#75969e',width=2)
 for f in rivers['features']:
  name=str(f['properties'].get('name_en') or f['properties'].get('name') or '')
  if not any(v in name for v in ['Nile','Jordan','Euphrates','Tigris','Orontes']):continue
  g=f['geometry']; lines=g['coordinates'] if g['type']=='MultiLineString' else [g['coordinates']]
  for line in lines:
   if visible(line):d.line([xy(p) for p in line],fill='#789faa',width=4)
 for langidx,lang in enumerate(['en','pt','es','ru']):
  im=base.copy(); d=ImageDraw.Draw(im)
  f=ImageFont.truetype(FONT,42 if region=='levant' else 47); water=ImageFont.truetype(ITALIC,38 if region=='levant' else 43)
  for lon,lat,names in c['waters']:
   x,y=xy((lon,lat));d.multiline_text((x,y),names[langidx],font=water,fill='#315c6b',anchor='mm',align='center',spacing=10,stroke_width=3,stroke_fill='#c2d7d7')
  for lon,lat,names,offset in c['cities']:
   x,y=xy((lon,lat));tx,ty=x+offset[0],y+offset[1]
   d.line((x,y,tx+8,ty+24),fill='#907547',width=2)
   d.ellipse((x-8,y-8,x+8,y+8),fill='#684c2e',outline='#fff4d9',width=3)
   d.text((tx,ty),names[langidx],font=f,fill='#3d3428',stroke_width=4,stroke_fill='#e9d6b0')
  # Framing is part of the image, with no political boundaries.
  d.rectangle((0,0,W,125),fill='#f4ebd8');d.text((W/2,58),c['title'][langidx],font=ImageFont.truetype(FONT,47 if region=='levant' else 52),fill='#55432f',anchor='mm')
  d.rectangle((0,H-60,W,H),fill='#f4ebd8');d.text((35,H-32),'N',font=ImageFont.truetype(FONT,28),fill='#55432f',anchor='lm');d.line((75,H-17,75,H-45),fill='#55432f',width=3);d.polygon([(75,H-49),(69,H-39),(81,H-39)],fill='#55432f')
  d.text((W-35,H-32),'Natural Earth · OpenBible.info',font=ImageFont.truetype(FONT,23),fill='#6d6557',anchor='rm')
  im.save(OUT/f'{region}-{lang}.png',optimize=True)
 print(region)
