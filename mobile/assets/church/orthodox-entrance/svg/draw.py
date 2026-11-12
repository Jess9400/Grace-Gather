# The Orthodox entrance artwork, drawn in a 390 x 844 frame.
DEFS='''<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1E2238"/><stop offset="0.55" stop-color="#4A3F58"/><stop offset="0.85" stop-color="#B9805A"/><stop offset="1" stop-color="#D89B62"/></linearGradient>
<linearGradient id="dome" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#A97E2E"/><stop offset="0.42" stop-color="#F6DA8E"/><stop offset="1" stop-color="#B8903C"/></linearGradient>
<linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBF5EA"/><stop offset="1" stop-color="#EBDFCB"/></linearGradient>
<radialGradient id="warm" cx="0.5" cy="0.62" r="0.7"><stop offset="0" stop-color="#FFF1C8"/><stop offset="0.6" stop-color="#F3C574"/><stop offset="1" stop-color="#C98A3E"/></radialGradient>
<radialGradient id="halo" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFD58A" stop-opacity="0.55"/><stop offset="1" stop-color="#FFD58A" stop-opacity="0"/></radialGradient>
<linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5A4536"/><stop offset="1" stop-color="#2A221D"/></linearGradient>
<linearGradient id="oak" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6E4630"/><stop offset="0.5" stop-color="#8C5C3C"/><stop offset="1" stop-color="#6A422C"/></linearGradient>
</defs>'''
DOOR='M150 736 V592 a45 45 0 0 1 90 0 V736 Z'
stars=''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#FFF4D6" opacity="{o}"/>' for x,y,r,o in [(40,70,1.2,.7),(92,140,1,.5),(150,40,1.4,.8),(250,96,1.1,.6),(330,52,1.3,.7),(362,170,1,.5),(60,230,1,.4),(300,210,1.2,.5),(205,150,0.9,.4)])
background=f'''<rect width="390" height="844" fill="url(#sky)"/>{stars}
<rect y="760" width="390" height="84" fill="url(#ground)"/>
<ellipse cx="195" cy="560" rx="200" ry="230" fill="url(#halo)"/>
<path d="M195 230 V278 M186 242 H204 M178 254 H212 M186 270 L204 264" stroke="#F6DA8E" stroke-width="4" stroke-linecap="round" fill="none"/>
<path d="M195 276 C188 294 148 308 148 342 C148 360 160 370 170 378 H220 C230 370 242 360 242 342 C242 308 202 294 195 276 Z" fill="url(#dome)"/>
<rect x="152" y="378" width="86" height="72" fill="url(#wall)"/>
<rect x="148" y="376" width="94" height="6" fill="#E3D6BE"/>
<path d="M168 438 V414 a8 8 0 0 1 16 0 V438 Z M206 438 V414 a8 8 0 0 1 16 0 V438 Z" fill="#F4C46E"/>
<path d="M70 760 V496 L195 448 L320 496 V760 Z" fill="url(#wall)"/>
<path d="M62 498 L195 446 L328 498" fill="none" stroke="#D9CBB1" stroke-width="5" stroke-linejoin="round"/>
<path d="M96 640 V590 a12 12 0 0 1 24 0 V640 Z M270 640 V590 a12 12 0 0 1 24 0 V640 Z" fill="#F4C46E"/>
<path d="M96 640 V590 a12 12 0 0 1 24 0 V640 M270 640 V590 a12 12 0 0 1 24 0 V640" fill="none" stroke="#D9CBB1" stroke-width="2"/>
<rect x="179" y="500" width="32" height="38" rx="2" fill="#C9A04A"/>
<rect x="183" y="504" width="24" height="30" rx="1" fill="#3A2A22"/>
<circle cx="195" cy="514" r="6" fill="#E9C878"/><circle cx="195" cy="515" r="3" fill="#F2DCC0"/><path d="M188 534 q7 -13 14 0 Z" fill="#9C3B32"/>
<path d="{DOOR}" fill="url(#warm)"/>
<rect x="160" y="612" width="70" height="124" fill="#D4A94F" opacity="0.85"/>
<g fill="#3A2A22" opacity="0.8"><rect x="164" y="618" width="12" height="16"/><rect x="180" y="618" width="12" height="16"/><rect x="198" y="618" width="12" height="16"/><rect x="214" y="618" width="12" height="16"/><rect x="164" y="642" width="18" height="60"/><rect x="208" y="642" width="18" height="60"/></g>
<path d="M186 736 V658 a9 9 0 0 1 18 0 V736 Z" fill="#F7DC94"/>
<path d="{DOOR}" fill="none" stroke="#C9B48C" stroke-width="5"/>
<rect x="124" y="736" width="142" height="12" fill="#E8DECB"/>
<rect x="108" y="748" width="174" height="14" fill="#D9CCB4"/>'''
def leaf(side):
    if side=='left':
        path='M150 736 V592 a45 45 0 0 1 45 -45 V736 Z'; knob=187; panels='M158 604 a37 37 0 0 1 30 -36 V660 H158 Z M158 672 H188 V728 H158 Z'
    else:
        path='M195 736 V547 a45 45 0 0 1 45 45 V736 Z'; knob=203; panels='M202 568 a37 37 0 0 1 30 36 V660 H202 Z M202 672 H232 V728 H202 Z'
    return f'''<path d="{path}" fill="url(#oak)"/><path d="{panels}" fill="none" stroke="#4A2E1E" stroke-width="2" opacity="0.6"/><circle cx="{knob}" cy="664" r="4.5" fill="#E0BE76"/><path d="{path}" fill="none" stroke="#3E2618" stroke-width="1.2" opacity="0.6"/>'''
def svg(body, w=390, h=844, vb='0 0 390 844'):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="{vb}">{DEFS}{body}</svg>'
open('background.svg','w').write(svg(background))
open('door-left.svg','w').write(svg(leaf('left'),45,189,'150 547 45 189'))
open('door-right.svg','w').write(svg(leaf('right'),45,189,'195 547 45 189'))
open('preview.svg','w').write(svg(background+leaf('left')+leaf('right')))
