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
    .map(
      ([x, y, w, h], i) => `
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
    ${regions}
    vec4 color=texture2D(picture,vec2(sampleUV.x,1.-sampleUV.y));
    // The actual light in the photograph breathes gently, without moving the room.
    vec2 sun=uv-vec2(.5,${art === "orthodox" ? ".29" : ".31"});
    float warmth=exp(-dot(sun,sun)*12.)*(.007+.007*sin(time*.7));
    gl_FragColor=vec4(min(color.rgb*(1.+light+warmth)+flame,vec3(1.)),color.a);
  }`;
}
