// Coordinates are in the original 869 x 1810 images, measured from the top.
// Flame coordinates follow the photographed candles; the room remains still.
export const flameRegions = {
  catholic: [
    [348, 734, 18, 24],
    [521, 734, 18, 24],
    [53, 859, 10, 14],
    [87, 859, 10, 14],
    [119, 859, 10, 14],
    [153, 859, 10, 14],
    [35, 894, 10, 14],
    [63, 894, 10, 14],
    [91, 894, 10, 14],
    [130, 894, 10, 14],
    [162, 894, 10, 14],
    [30, 936, 10, 14],
    [63, 936, 10, 14],
    [98, 936, 10, 14],
    [128, 936, 10, 14],
    [156, 936, 10, 14],
  ],
  orthodox: [
    [30, 947, 16, 24],
    [43, 954, 14, 22],
    [55, 961, 14, 22],
    [66, 983, 14, 22],
    [90, 955, 17, 24],
    [109, 984, 14, 24],
    [131, 956, 16, 24],
    [139, 994, 12, 20],
    [164, 1008, 12, 20],
    [182, 1017, 10, 16],
    [197, 1022, 10, 16],
  ],
  protestant: [],
} as const;

export const vertexShader = `attribute vec2 position;
varying vec2 screenUV;
void main(){screenUV=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;

export function fragmentShader(art: keyof typeof flameRegions) {
  const regions = flameRegions[art]
    .map(([x, y, w, h], i) =>
      art === "orthodox"
        ? `
    {
      vec2 centre=vec2(${(x / 869).toFixed(6)},${(y / 1810).toFixed(6)});
      vec2 size=vec2(${(w / 869).toFixed(6)},${(h / 1810).toFixed(6)});
      vec2 p=(uv-centre)/size;
      if(abs(p.x)<.8 && abs(p.y)<.8){
        float phase=${(i * 1.73).toFixed(2)};
        float aboveWick=1.-smoothstep(.18,.27,p.y);
        float clear=(1.-smoothstep(.24,.60,length(p)))*aboveWick;
        // Reconstruct the small background behind the photographed flame,
        // leaving the wick and wax still. Then draw a new, changing flame.
        vec3 left=texture2D(picture,vec2(uv.x-size.x*.75,1.-uv.y)).rgb;
        vec3 right=texture2D(picture,vec2(uv.x+size.x*.75,1.-uv.y)).rgb;
        color.rgb=mix(color.rgb,mix(left,right,clamp(p.x+.5,0.,1.)),clear);
        float height=.91+.09*sin(time*5.1+phase)+.04*sin(time*9.2+phase);
        float y=(-p.y*2.+.12)/height;
        float sway=(sin(time*6.1+phase+y*2.5)*.13+sin(time*11.3+phase)*.05)*clamp((y+1.)*.5,0.,1.);
        float width=.54*sqrt(clamp((1.-y)*.5,0.,1.))*smoothstep(-1.08,-.45,y)*(0.94+.06*sin(time*9.+phase));
        float d=abs(p.x*2.-sway)/max(width,.001);
        float body=(1.-smoothstep(.45,1.,d))*smoothstep(-1.,-.7,y)*(1.-smoothstep(.74,1.,y));
        float core=(1.-smoothstep(0.,.5,d))*smoothstep(-.9,-.2,y)*(1.-smoothstep(.1,.75,y));
        float pulse=.90+.06*sin(time*8.3+phase)+.04*sin(time*13.1+phase);
        vec3 fire=vec3(1.,.48,.12)*body*.9+vec3(1.,.92,.7)*core*1.1;
        color.rgb=min(color.rgb+fire*pulse*aboveWick,vec3(1.));
      }
    }`
        : `
    {
      vec2 centre=vec2(${(x / 869).toFixed(6)},${(y / 1810).toFixed(6)});
      vec2 size=vec2(${(w / 869).toFixed(6)},${(h / 1810).toFixed(6)});
      vec2 p=(uv-centre)/size;
      if(abs(p.x)<1.0 && abs(p.y)<1.0){
      // Never move the wax below the wick, even when the flame leans.
      float aboveWick=1.-smoothstep(.18,.27,p.y);
      float mask=(1.-smoothstep(0.16,0.75,dot(p,p)))*aboveWick;
      float phase=${(i * 1.73).toFixed(2)};
      float wave=sin(time*4.8+phase)*.65+sin(time*8.2+phase)*.23;
      // The moving flame retains the colour and texture of the original image.
      sampleUV.x+=mask*size.x*wave*.24;
      sampleUV.y+=mask*size.y*sin(time*5.3+phase)*.10;
      light+=mask*wave*.045;
      // A narrow, tapering flame (adapted from the Light a Candle screen),
      // rather than a circular glow. Each candle moves independently.
      float y=-p.y*2.;
      float sway=(sin(time*6.1+phase+y*2.5)*.11+sin(time*10.3+phase)*.045)*(y+1.)*.5;
      float width=.34*sqrt(clamp((1.-y)*.5,0.,1.))*smoothstep(-1.08,-.45,y)*(0.94+.06*sin(time*8.0+phase));
      float d=abs(p.x*2.-sway)/max(width,.001);
      float body=(1.-smoothstep(.35,1.,d))*smoothstep(-1.,-.65,y)*(1.-smoothstep(.70,1.,y));
      float core=(1.-smoothstep(0.,.55,d))*smoothstep(-.9,-.2,y)*(1.-smoothstep(.15,.8,y));
      float pulse=.86+.09*sin(time*8.3+phase)+.05*sin(time*13.1+phase);
      flame+=(vec3(1.,.46,.12)*body*pulse*.24+vec3(1.,.91,.67)*core*pulse*.30)*aboveWick;
      }
    }`,
    )
    .join("");
  return `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D picture;
uniform vec2 visible;
uniform float time;
varying vec2 screenUV;
void main(){
    vec2 uv=vec2(.5)+vec2(screenUV.x-.5,.5-screenUV.y)*visible;
    vec2 sampleUV=uv; float light=0.; vec3 flame=vec3(0.);
    vec4 color=texture2D(picture,vec2(uv.x,1.-uv.y));
    ${regions}
    ${art === "orthodox" ? "" : "color=texture2D(picture,vec2(sampleUV.x,1.-sampleUV.y));"}
    // The actual light in the photograph breathes gently, without moving the room.
    vec2 sun=uv-vec2(.5,${art === "orthodox" ? ".29" : ".31"});
    float warmth=exp(-dot(sun,sun)*12.)*(.007+.007*sin(time*.7));
    ${
      art === "protestant"
        ? `
    // Let the rays travel slowly from the windows across the existing light
    // in the image, rather than simply pulsing the entire church.
    vec2 leftWindow=(uv-vec2(.085,.37))/vec2(.14,.19);
    vec2 rightWindow=(uv-vec2(.91,.37))/vec2(.14,.19);
    vec2 floorLight=(uv-vec2(.47,.65))/vec2(.4,.18);
    float daylight=exp(-dot(leftWindow,leftWindow)*2.)*.07*sin(time*.45)
      +exp(-dot(rightWindow,rightWindow)*2.)*.06*sin(time*.43+1.2)
      +exp(-dot(floorLight,floorLight)*2.)*.035*sin(time*.4+.5);
    warmth+=daylight;
    float drift=.055*sin(time*.72);
    float fromLeft=uv.x-(.08+(uv.y-.36)*1.20+drift);
    float fromRight=uv.x-(.92-(uv.y-.36)*1.12-drift*.8);
    float vertical=smoothstep(.32,.42,uv.y)*(1.-smoothstep(.66,.74,uv.y));
    float beam=(exp(-pow(fromLeft/.055,2.))*.30+exp(-pow(fromRight/.06,2.))*.22)*vertical;
    float litSurface=smoothstep(.23,.68,dot(color.rgb,vec3(.299,.587,.114)));
    flame+=vec3(1.,.76,.48)*beam*litSurface;`
        : ""
    }
    gl_FragColor=vec4(min(color.rgb*(1.+light+warmth)+flame,vec3(1.)),color.a);
  }`;
}
