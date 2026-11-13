// Coordinates are in the original 869 x 1810 images, measured from the top.
// Only the flame pixels are warped: the candle and the rest of the artwork stay still.
export const flameRegions = {
  catholic: [[348, 734, 24, 32], [521, 734, 24, 32], [53, 859, 14, 18], [87, 859, 14, 18], [119, 859, 14, 18], [151, 859, 14, 18]],
  orthodox: [[30, 947, 22, 31], [38, 936, 21, 29], [89, 955, 22, 30], [130, 954, 20, 29], [108, 973, 19, 23], [150, 1009, 16, 19]],
  protestant: [],
} as const;

export const vertexShader = `attribute vec2 position;
varying vec2 screenUV;
void main(){screenUV=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;

export function fragmentShader(art: keyof typeof flameRegions) {
  const regions = flameRegions[art].map(([x,y,w,h], i) => `
    {
      vec2 centre=vec2(${(x/869).toFixed(6)},${(y/1810).toFixed(6)});
      vec2 size=vec2(${(w/869).toFixed(6)},${(h/1810).toFixed(6)});
      vec2 p=(uv-centre)/size;
      float mask=1.-smoothstep(0.18,1.0,dot(p,p));
      float wave=sin(time*${(3.1+i*.29).toFixed(2)}+${i.toFixed(1)})*.5+sin(time*${(5.2+i*.17).toFixed(2)}+${(i*1.6).toFixed(1)})*.25;
      sampleUV.x+=mask*size.x*wave*.18;
      sampleUV.y+=mask*size.y*sin(time*${(2.7+i*.12).toFixed(2)}+${i.toFixed(1)})*.08;
      light+=mask*wave*.055;
    }`).join("");
  return `precision mediump float;
uniform sampler2D picture;
uniform vec2 visible;
uniform float time;
varying vec2 screenUV;
void main(){
    vec2 uv=vec2(.5)+vec2(screenUV.x-.5,.5-screenUV.y)*visible;
    vec2 sampleUV=uv; float light=0.;
    ${regions}
    vec4 color=texture2D(picture,vec2(sampleUV.x,1.-sampleUV.y));
    // The actual light in the photograph breathes gently, without moving the room.
    vec2 sun=uv-vec2(.5,${art === "orthodox" ? ".29" : ".31"});
    float warmth=exp(-dot(sun,sun)*12.)*(.007+.007*sin(time*.7));
    gl_FragColor=vec4(color.rgb*(1.+light+warmth),color.a);
  }`;
}
