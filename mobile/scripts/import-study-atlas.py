"""Small offline terrain and Bible-place references. Never downloads map images/tiles at runtime.
Terrain: Mapzen Terrarium (USGS/NOAA/Copernicus attribution in metadata).
Land mask: Natural Earth, public domain. Places: OpenBible CC BY + OSM ODbL.
"""
import concurrent.futures, hashlib, io, json, math, re, urllib.request, xml.etree.ElementTree as ET
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'src/generated/study-atlas'; OUT.mkdir(exist_ok=True)
CACHE=Path('/tmp/gg-study-atlas-cache'); CACHE.mkdir(exist_ok=True)
def fetch(url):
 path=CACHE/hashlib.sha256(url.encode()).hexdigest()
 if not path.exists():
  req=urllib.request.Request(url,headers={'User-Agent':'GraceGatherStudyAtlas/1.0'})
  path.write_bytes(urllib.request.urlopen(req,timeout=45).read())
 return path.read_bytes()
html=fetch('https://www.openbible.info/geo/').decode()
urls={slug:url.replace('&amp;','&') for slug,url in re.findall(r'preview/([^"\s]+)"[^>]*>.*?href="(https://a.openbible.info/geo/kmls/[^"\s]+\.kml)"',html,re.S)}
links=json.loads((ROOT/'src/generated/study-original/maps.json').read_text()); ns={'k':'http://www.opengis.net/kml/2.2'}
def places(item):
 book,link=item; slug=link.rsplit('/',1)[-1]; url=urls.get(slug)
 if not url: return book,[]
 root=ET.fromstring(fetch(url)); rows=[]; seen=set()
 for point in root.findall('.//k:Placemark',ns):
  name=point.findtext('k:name','',ns); coord=point.findtext('k:Point/k:coordinates','',ns)
  if not coord:continue
  lon,lat=map(float,coord.strip().split(',')[:2]); key=(name,lon,lat)
  if key in seen:continue
  seen.add(key); rows.append({'name':name,'lon':lon,'lat':lat,'uncertain':'/' in name or 'representative' in point.findtext('k:styleUrl','',ns)})
 return book,rows
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: books=dict(pool.map(places,links.items()))
(OUT/'places.json').write_text(json.dumps(books,ensure_ascii=False,separators=(',',':')))
land=json.loads(fetch('https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson'))
polygons=[]
for feature in land['features']:
 g=feature['geometry']; polygons.extend(g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']])
def inside_ring(x,y,ring):
 hit=False; j=len(ring)-1
 for i,p in enumerate(ring):
  a,b=p; c,d=ring[j]
  if (b>y)!=(d>y) and x<(c-a)*(y-b)/(d-b)+a:hit=not hit
  j=i
 return hit
def is_land(x,y):return any(inside_ring(x,y,p[0]) and not any(inside_ring(x,y,h) for h in p[1:]) for p in polygons)
regions={'levant':[30,28,39,35],'east':[27,24,51,40],'mediterranean':[10,27,40,45]}; tiles={}
def height(lon,lat):
 n=32; fx=(lon+180)/360*n; fy=(1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*n; x,y=int(fx),int(fy)
 key=(x,y)
 if key not in tiles:tiles[key]=Image.open(io.BytesIO(fetch(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/5/{x}/{y}.png'))).convert('RGB')
 r,g,b=tiles[key].getpixel((min(255,int((fx-x)*256)),min(255,int((fy-y)*256))))
 return round(r*256+g+b/256-32768)
for name,bounds in regions.items():
 w,s,e,n=bounds; size=49; values=[];mask=[]
 for j in range(size):
  lat=n-(n-s)*j/(size-1)
  for i in range(size):
   lon=w+(e-w)*i/(size-1); on_land=is_land(lon,lat); values.append(height(lon,lat) if on_land else 0);mask.append(1 if on_land else 0)
 (OUT/f'{name}.json').write_text(json.dumps({'bounds':bounds,'size':size,'heights':values,'land':mask},separators=(',',':')))
 print(name,len(values))
metadata={'accessed':'2026-11-26','places':'OpenBible.info — CC BY; some coordinates © OpenStreetMap contributors — ODbL. Names, alternative identifications and modern coordinates retained. KML point features only; no verse-level location inference.','terrain':'Terrain Tiles (Mapzen) sampled and simplified from Terrarium elevation tiles; heights exaggerated in display. Global SRTM/GMTED2010 courtesy of USGS; Global ETOPO1 courtesy of NOAA; Europe terrain produced using Copernicus data and information funded by the European Union (EU-DEM).','land':'Natural Earth 1:110m land, public domain; simplified present-day coastlines, not reconstructed ancient shorelines.','sources':['https://www.openbible.info/geo/','https://creativecommons.org/licenses/by/4.0/','https://www.openstreetmap.org/copyright','https://registry.opendata.aws/terrain-tiles/','https://github.com/tilezen/joerd/blob/master/docs/attribution.md','https://www.naturalearthdata.com/about/terms-of-use/'],'books':len(books),'points':sum(map(len,books.values()))}
(OUT/'sources.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
print(metadata['books'],metadata['points'])
