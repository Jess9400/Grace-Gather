# The Protestant entrance artwork, drawn in a 390 x 844 frame: a simple modern
# church at dusk. Rendered plaster, a slim tower with a plain lit cross, wide
# warm windows, and glass double doors under a flat canopy. No stone, no arches.
DEFS='''<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1E2238"/><stop offset="0.55" stop-color="#4A3F58"/><stop offset="0.85" stop-color="#B9805A"/><stop offset="1" stop-color="#D89B62"/></linearGradient>
<linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4EFE6"/><stop offset="1" stop-color="#DCD3C4"/></linearGradient>
<linearGradient id="tower" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#E9E2D6"/><stop offset="1" stop-color="#D3C9B8"/></linearGradient>
<linearGradient id="inside" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBE3AE"/><stop offset="0.7" stop-color="#F2C474"/><stop offset="1" stop-color="#D99A4E"/></linearGradient>
<linearGradient id="window" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FCE6B4"/><stop offset="1" stop-color="#EDB866"/></linearGradient>
<radialGradient id="halo" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFD58A" stop-opacity="0.5"/><stop offset="1" stop-color="#FFD58A" stop-opacity="0"/></radialGradient>
<linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5A4536"/><stop offset="1" stop-color="#2A221D"/></linearGradient>
<linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF3D6" stop-opacity="0.55"/><stop offset="0.5" stop-color="#FFE2A6" stop-opacity="0.28"/><stop offset="1" stop-color="#FFF3D6" stop-opacity="0.45"/></linearGradient>
</defs>'''
# The doorway: x 150-240, y 596-736.
stars=''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#FFF4D6" opacity="{o}"/>' for x,y,r,o in [(40,70,1.2,.7),(92,140,1,.5),(150,40,1.4,.8),(250,96,1.1,.6),(330,52,1.3,.7),(362,170,1,.5),(60,230,1,.4),(300,210,1.2,.5),(205,150,0.9,.4)])
background=f'''<rect width="390" height="844" fill="url(#sky)"/>{stars}
<rect y="760" width="390" height="84" fill="url(#ground)"/>
<ellipse cx="195" cy="600" rx="220" ry="210" fill="url(#halo)"/>
<rect x="262" y="332" width="48" height="428" fill="url(#tower)"/>
<rect x="258" y="326" width="56" height="8" fill="#CFC4B1"/>
<path d="M281 360 H291 V392 H306 V402 H291 V454 H281 V402 H266 V392 H281 Z" fill="#FBE0A0"/>
<path d="M281 360 H291 V392 H306 V402 H291 V454 H281 V402 H266 V392 H281 Z" fill="none" stroke="#F2C474" stroke-width="1" opacity="0.8"/>
<path d="M34 520 L195 468 L356 520 Z" fill="url(#wall)"/>
<path d="M22 524 L195 466 L368 524" fill="none" stroke="#4A4038" stroke-width="9" stroke-linejoin="round"/>
<rect x="34" y="520" width="322" height="240" fill="url(#wall)"/>
<rect x="262" y="520" width="48" height="240" fill="url(#tower)"/>
<g><rect x="50" y="566" width="72" height="70" rx="2" fill="url(#window)"/>
<path d="M74 566 V636 M98 566 V636" stroke="#5B4A3C" stroke-width="2.5"/>
<rect x="50" y="566" width="72" height="70" rx="2" fill="none" stroke="#5B4A3C" stroke-width="3"/></g>
<g><rect x="318" y="566" width="28" height="70" rx="2" fill="url(#window)"/>
<rect x="318" y="566" width="28" height="70" rx="2" fill="none" stroke="#5B4A3C" stroke-width="3"/></g>
<rect x="150" y="596" width="90" height="140" fill="url(#inside)"/>
<path d="M190 620 H200 V636 H214 V644 H200 V690 H190 V644 H176 V636 H190 Z" fill="#B98A4A" opacity="0.55"/>
<g fill="#C08A4C" opacity="0.45"><rect x="156" y="700" width="78" height="5" rx="2"/><rect x="152" y="714" width="86" height="6" rx="2"/></g>
<rect x="146" y="592" width="98" height="148" fill="none" stroke="#4A4038" stroke-width="5"/>
<rect x="132" y="572" width="126" height="10" rx="2" fill="#4A4038"/>
<rect x="132" y="582" width="126" height="3" fill="#2E2823" opacity="0.6"/>
<g><rect x="132" y="612" width="6" height="12" rx="1.5" fill="#4A4038"/><circle cx="135" cy="630" r="10" fill="#FFD58A" opacity="0.25"/><rect x="133" y="624" width="4" height="7" fill="#FCE6B4"/></g>
<g><rect x="252" y="612" width="6" height="12" rx="1.5" fill="#4A4038"/><circle cx="255" cy="630" r="10" fill="#FFD58A" opacity="0.25"/><rect x="253" y="624" width="4" height="7" fill="#FCE6B4"/></g>
<rect x="116" y="740" width="158" height="9" fill="#E2D9CA"/>
<rect x="104" y="749" width="182" height="11" fill="#D3C8B6"/>
<ellipse cx="195" cy="768" rx="120" ry="16" fill="#FFD58A" opacity="0.18"/>
<g fill="#4E5A3E" opacity="0.9"><ellipse cx="60" cy="758" rx="22" ry="9"/><ellipse cx="330" cy="758" rx="20" ry="8"/></g>'''
def leaf(side):
    x = 150 if side=='left' else 195
    handle = x+38 if side=='left' else x+5
    return f'''<rect x="{x}" y="596" width="45" height="140" fill="url(#glass)"/>
<rect x="{x+1.5}" y="597.5" width="42" height="137" fill="none" stroke="#3B3632" stroke-width="3"/>
<path d="M{x+8} 612 L{x+18} 602 M{x+10} 628 L{x+30} 608" stroke="#FFFFFF" stroke-width="1.4" opacity="0.35"/>
<rect x="{handle}" y="640" width="3" height="46" rx="1.5" fill="#D9B974"/>'''
def svg(body, w=390, h=844, vb='0 0 390 844'):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="{vb}">{DEFS}{body}</svg>'
open('background.svg','w').write(svg(background))
open('door-left.svg','w').write(svg(leaf('left'),45,140,'150 596 45 140'))
open('door-right.svg','w').write(svg(leaf('right'),45,140,'195 596 45 140'))
open('preview.svg','w').write(svg(background+leaf('left')+leaf('right')))
