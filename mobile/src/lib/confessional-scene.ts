// A small, self-contained mesh shared by Expo GL on iOS and WebGL on the web.
// Bundled walnut albedo; all geometry and lighting are local, with no runtime remote requests.
type Vec3 = [number, number, number];
type Material = {
  color: Vec3;
  kind: number;
  moving?: boolean;
  grain?: "horizontal";
};
export const MESH_STRIDE = 13;
export const DOOR_OPEN_MS = 1200;
export const SCENE_FADE_MS = 200;
export const THRESHOLD_MS = 250;
export const CROSSFADE_MS = 500;
export const ENTRANCE_MS =
  SCENE_FADE_MS + DOOR_OPEN_MS + THRESHOLD_MS + CROSSFADE_MS;
const ease = (progress: number) => {
  const t = Math.max(0, Math.min(1, progress));
  return t * t * (3 - 2 * t);
};
export function entranceFrame(elapsed: number) {
  const crossfade = ease(
    (elapsed - SCENE_FADE_MS - DOOR_OPEN_MS - THRESHOLD_MS) / CROSSFADE_MS,
  );
  return {
    open: doorProgress(elapsed - SCENE_FADE_MS),
    approach: crossfade,
    sceneOpacity: ease(elapsed / SCENE_FADE_MS),
    overlayOpacity: 1 - crossfade,
  };
}
export function doorProgress(elapsed: number) {
  return ease(elapsed / DOOR_OPEN_MS);
}
export const DOOR_HINGE: Vec3 = [-0.79, 0, 0.22];
export const DOOR_ANGLE = 1.48;
// Shared with the shader and geometry checks: the pivot stays on the jamb.
export function hingePoint(point: Vec3, progress: number): Vec3 {
  const angle = DOOR_ANGLE * Math.max(0, Math.min(1, progress));
  const x = point[0] - DOOR_HINGE[0],
    z = point[2] - DOOR_HINGE[2];
  return [
    DOOR_HINGE[0] + Math.cos(angle) * x + Math.sin(angle) * z,
    point[1],
    DOOR_HINGE[2] - Math.sin(angle) * x + Math.cos(angle) * z,
  ];
}
// Material colors tint the full-color photographic timber, retaining its
// reddish heartwood, dark pores and lighter growth rings.
const wood: Material = { color: [0.46, 0.285, 0.17], kind: 0 };
const dark: Material = { color: [0.29, 0.171, 0.095], kind: 0 };
const trim: Material = { color: [0.515, 0.33, 0.205], kind: 0 };
const brass: Material = { color: [0.43, 0.365, 0.265], kind: 1 };
// Same espresso as confessionColors.background, including the opaque GL clear.
const backdrop: Vec3 = [36 / 255, 29 / 255, 24 / 255];
const leaf = (m: Material): Material => ({ ...m, moving: true });
const rail = (m: Material): Material => ({ ...m, grain: "horizontal" });

export function buildConfessionalMesh() {
  // Interleaved position, normal, color, material, hinge membership, timber UV.
  const data: number[] = [];
  function triangle(a: Vec3, b: Vec3, c: Vec3, m: Material) {
    const u = b.map((v, i) => v - a[i]);
    const v = c.map((value, i) => value - a[i]);
    const n = [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    ];
    const length = Math.hypot(...n) || 1;
    for (const p of [a, b, c]) {
      // Side faces also carry grain. Rail grain runs along the joinery, rather
      // than projecting one continuous sheet over every piece of furniture.
      const across = Math.abs(n[2]) >= Math.abs(n[0]) ? p[0] : p[2];
      const uv =
        m.grain === "horizontal"
          ? [p[1] * 0.47 + 0.37, across * 0.31 + 0.51]
          : [across * 0.47 + 0.5, p[1] * 0.31 + 0.5];
      data.push(
        ...p,
        ...n.map((x) => x / length),
        ...m.color,
        m.kind,
        m.moving ? 1 : 0,
        ...uv,
      );
    }
  }
  function quad(a: Vec3, b: Vec3, c: Vec3, d: Vec3, m: Material) {
    triangle(a, b, c, m);
    triangle(a, c, d, m);
  }
  function box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    depth: number,
    m: Material,
  ) {
    const l = x - w / 2,
      r = x + w / 2,
      b = y - h / 2,
      t = y + h / 2,
      back = z - depth / 2,
      front = z + depth / 2;
    quad([l, b, front], [r, b, front], [r, t, front], [l, t, front], m);
    quad([r, b, back], [l, b, back], [l, t, back], [r, t, back], m);
    quad([l, b, back], [l, b, front], [l, t, front], [l, t, back], m);
    quad([r, b, front], [r, b, back], [r, t, back], [r, t, front], m);
    quad([l, t, front], [r, t, front], [r, t, back], [l, t, back], m);
    quad([l, b, back], [r, b, back], [r, b, front], [l, b, front], m);
  }
  function archOutline(
    radius: number,
    spring: number,
    bottom: number,
  ): [number, number][] {
    const points: [number, number][] = [
      [-radius, bottom],
      [radius, bottom],
    ];
    for (let i = 0; i <= 40; i++) {
      const angle = (Math.PI * i) / 40;
      points.push([
        Math.cos(angle) * radius,
        spring + Math.sin(angle) * radius,
      ]);
    }
    return points;
  }
  function ring(
    inner: number,
    outer: number,
    spring: number,
    bottom: number,
    z: number,
    depth: number,
    m: Material,
  ) {
    const inside = archOutline(inner, spring, bottom);
    const outside = archOutline(outer, spring, bottom);
    // Leave the threshold open: the first segment is the horizontal bottom edge.
    for (let i = 1; i < inside.length; i++) {
      const j = (i + 1) % inside.length;
      const a = inside[i],
        b = outside[i],
        c = outside[j],
        d = inside[j];
      quad(
        [a[0], a[1], z + depth / 2],
        [b[0], b[1], z + depth / 2],
        [c[0], c[1], z + depth / 2],
        [d[0], d[1], z + depth / 2],
        m,
      );
      quad(
        [b[0], b[1], z - depth / 2],
        [a[0], a[1], z - depth / 2],
        [d[0], d[1], z - depth / 2],
        [c[0], c[1], z - depth / 2],
        m,
      );
      quad(
        [a[0], a[1], z - depth / 2],
        [a[0], a[1], z + depth / 2],
        [d[0], d[1], z + depth / 2],
        [d[0], d[1], z - depth / 2],
        m,
      );
      quad(
        [b[0], b[1], z + depth / 2],
        [b[0], b[1], z - depth / 2],
        [c[0], c[1], z - depth / 2],
        [c[0], c[1], z + depth / 2],
        m,
      );
    }
  }
  function panel(y: number, w: number, h: number) {
    // A single cut-corner field, with genuinely sloped carved molding.
    const outline = (inset: number, z: number): Vec3[] => {
      const x = w / 2 - inset,
        height = h / 2 - inset,
        corner = 0.105;
      return [
        [-x + corner, y - height, z],
        [x - corner, y - height, z],
        [x, y - height + corner, z],
        [x, y + height - corner, z],
        [x - corner, y + height, z],
        [-x + corner, y + height, z],
        [-x, y + height - corner, z],
        [-x, y - height + corner, z],
      ];
    };
    const profiles = [
      [0, 0.283],
      [0.018, 0.307],
      [0.038, 0.313],
      [0.055, 0.289],
      [0.079, 0.302],
      [0.106, 0.322],
    ];
    profiles.slice(1).forEach(([inset, z], level) => {
      const previous = outline(profiles[level][0], profiles[level][1]);
      const next = outline(inset, z);
      for (let i = 0; i < 8; i++)
        quad(
          previous[i],
          previous[(i + 1) % 8],
          next[(i + 1) % 8],
          next[i],
          leaf(level === 2 ? dark : trim),
        );
    });
    const face = outline(0.106, 0.322);
    for (let i = 0; i < 8; i++)
      triangle([0, y, 0.322], face[i], face[(i + 1) % 8], leaf(wood));
  }
  function column(x: number) {
    const profile = [
      [-1.4, 0.075],
      [-1.32, 0.075],
      [-1.29, 0.062],
      [-1.25, 0.07],
      [-1.21, 0.058],
      [-1.16, 0.053],
      [-0.02, 0.047],
      [0.43, 0.055],
      [0.47, 0.068],
      [0.5, 0.068],
      [0.52, 0.055],
      [0.56, 0.075],
      [0.62, 0.075],
    ];
    for (let j = 1; j < profile.length; j++) {
      const [lo, r1] = profile[j - 1],
        [hi, r2] = profile[j];
      for (let i = 0; i < 24; i++) {
        const a = (i * Math.PI) / 12,
          b = ((i + 1) * Math.PI) / 12;
        quad(
          [x + Math.cos(a) * r1, lo, 0.3 + Math.sin(a) * r1],
          [x + Math.cos(b) * r1, lo, 0.3 + Math.sin(b) * r1],
          [x + Math.cos(b) * r2, hi, 0.3 + Math.sin(b) * r2],
          [x + Math.cos(a) * r2, hi, 0.3 + Math.sin(a) * r2],
          j % 3 === 0 ? trim : wood,
        );
      }
    }
    box(x, -1.46, 0.25, 0.2, 0.19, 0.28, wood);
    box(x, -1.37, 0.27, 0.215, 0.045, 0.31, rail(trim));
    box(x, 0.64, 0.26, 0.205, 0.06, 0.3, rail(trim));
    box(x, 0.695, 0.245, 0.235, 0.045, 0.32, rail(wood));
  }
  function beam(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    z: number,
    width: number,
    m: Material,
  ) {
    const length = Math.hypot(bx - ax, by - ay);
    const nx = ((-(by - ay) / length) * width) / 2,
      ny = (((bx - ax) / length) * width) / 2;
    const a: Vec3 = [ax + nx, ay + ny, z],
      b: Vec3 = [ax - nx, ay - ny, z],
      c: Vec3 = [bx - nx, by - ny, z],
      d: Vec3 = [bx + nx, by + ny, z];
    quad(a, b, c, d, m);
    quad([a[0], a[1], z - 0.035], a, d, [d[0], d[1], z - 0.035], m);
    quad(b, [b[0], b[1], z - 0.035], [c[0], c[1], z - 0.035], c, m);
  }
  function knob(x: number, y: number) {
    const m = leaf(brass);
    for (let i = 0; i < 24; i++) {
      const a = (i * Math.PI) / 12,
        b = ((i + 1) * Math.PI) / 12;
      const p: Vec3 = [x + Math.cos(a) * 0.029, y + Math.sin(a) * 0.029, 0.37];
      const q: Vec3 = [x + Math.cos(b) * 0.029, y + Math.sin(b) * 0.029, 0.37];
      triangle([x, y, 0.38], p, q, m);
      quad([p[0], p[1], 0.34], [q[0], q[1], 0.34], q, p, m);
    }
  }

  // Deep warm-charcoal walls leave physical clearance for the entire inward swing.
  const plaster: Material = { color: [0.135, 0.125, 0.115], kind: 2 };
  box(0, 0, -2.5, 2.0, 3.4, 0.06, plaster);
  box(-0.98, 0, -1.15, 0.08, 3.4, 2.65, plaster);
  box(0.98, 0, -1.15, 0.08, 3.4, 2.65, plaster);
  box(0, -1.54, -1.1, 1.7, 0.06, 2.75, dark);
  box(0, -1.23, -1.95, 1.46, 0.09, 0.38, dark);
  box(0, -1.17, -1.94, 1.48, 0.035, 0.4, wood);
  // Recessed edge light, very dim and occluded by the door while closed.
  box(0.79, 0.03, -2.4, 0.012, 2.6, 0.018, {
    color: [0.31, 0.22, 0.13],
    kind: 3,
  });
  // The surrounding wall occludes the deep interior outside the arched opening.
  ring(0.94, 5, 0.6, -4, 0.195, 0.01, {
    color: backdrop,
    kind: 3,
  });
  ring(0.8, 0.99, 0.6, -1.55, 0.03, 0.32, dark);
  ring(0.815, 0.985, 0.6, -1.55, 0.2, 0.085, wood);
  ring(0.965, 1.012, 0.6, -1.55, 0.245, 0.04, trim);
  ring(0.927, 0.96, 0.6, -1.55, 0.235, 0.025, dark);
  ring(0.89, 0.926, 0.6, -1.55, 0.26, 0.035, trim);
  ring(0.803, 0.832, 0.6, -1.55, 0.255, 0.028, trim);
  for (const x of [-0.935, 0.935]) column(x);
  box(0, -1.58, 0.1, 2.14, 0.055, 0.55, rail(dark));
  box(0, -1.546, 0.25, 2.16, 0.025, 0.34, rail(trim));
  // A restrained carved cross at the crown, as in the reference furniture.
  box(0, 1.707, 0.22, 0.036, 0.215, 0.045, wood);
  box(0, 1.755, 0.22, 0.14, 0.034, 0.045, rail(wood));
  box(0, 1.606, 0.22, 0.115, 0.045, 0.065, dark);

  // Tall, fine, open lattice with alternating depth at the crossings.
  ring(0.555, 0.79, 0.6, -1.49, 0.21, 0.14, leaf(wood));
  ring(0.544, 0.588, 0.6, -0.35, 0.292, 0.028, leaf(trim));
  ring(0.592, 0.607, 0.6, -0.35, 0.282, 0.018, leaf(dark));
  for (const slope of [-1.45, 1.45]) {
    for (let intercept = -1.2; intercept < 2.1; intercept += 0.165) {
      // Clip each diagonal to the arched aperture before extruding it.
      const points: [number, number][] = [];
      for (let i = 0; i <= 300; i++) {
        const x = -0.555 + (i * 1.11) / 300,
          y = slope * x + intercept;
        if (y >= -0.35 && y <= 0.6 + Math.sqrt(Math.max(0, 0.555 ** 2 - x * x)))
          points.push([x, y]);
      }
      if (points.length > 1) {
        const a = points[0],
          b = points[points.length - 1];
        beam(
          a[0],
          a[1],
          b[0],
          b[1],
          slope < 0 ? 0.278 : 0.305,
          0.022,
          leaf(trim),
        );
      }
    }
  }
  box(0, -0.96, 0.21, 1.56, 1.06, 0.14, leaf(wood));
  box(0, -0.43, 0.255, 1.56, 0.16, 0.18, leaf(rail(wood)));
  box(0, -0.366, 0.3, 1.16, 0.022, 0.05, leaf(rail(trim)));
  box(0, -1.44, 0.255, 1.56, 0.13, 0.18, leaf(rail(wood)));
  panel(-0.94, 1.12, 0.89);
  // Shallow nautical relief echoes the reference's hand-carved lower panel.
  const carving = leaf(trim);
  beam(0, -1.095, 0, -0.705, 0.345, 0.014, carving);
  triangle(
    [-0.02, -0.75, 0.342],
    [-0.245, -1.04, 0.342],
    [-0.02, -1.04, 0.352],
    carving,
  );
  triangle(
    [0.024, -0.83, 0.342],
    [0.024, -1.04, 0.352],
    [0.2, -1.04, 0.342],
    carving,
  );
  quad(
    [-0.27, -1.065, 0.342],
    [-0.17, -1.15, 0.348],
    [0.16, -1.15, 0.348],
    [0.26, -1.065, 0.342],
    carving,
  );
  for (let i = 0; i < 3; i++)
    beam(
      -0.27,
      -1.185 - i * 0.025,
      0.27,
      -1.185 - i * 0.025,
      0.333,
      0.007,
      carving,
    );
  // Small keystone above the lattice and discreet aged-brass hardware.
  quad(
    [-0.045, 1.235, 0.323],
    [-0.07, 1.13, 0.323],
    [0.07, 1.13, 0.323],
    [0.045, 1.235, 0.323],
    carving,
  );
  box(0.67, -0.39, 0.32, 0.041, 0.15, 0.014, leaf(brass));
  knob(0.67, -0.36);
  box(0.67, -0.435, 0.333, 0.007, 0.018, 0.004, leaf(dark));
  for (const y of [-1.14, 0.25]) {
    box(-0.815, y, 0.225, 0.045, 0.12, 0.012, brass);
    box(-0.762, y, 0.225, 0.045, 0.12, 0.012, leaf(brass));
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI) / 8,
        b = ((i + 1) * Math.PI) / 8;
      const x1 = DOOR_HINGE[0] + Math.cos(a) * 0.018,
        z1 = DOOR_HINGE[2] + Math.sin(a) * 0.018;
      const x2 = DOOR_HINGE[0] + Math.cos(b) * 0.018,
        z2 = DOOR_HINGE[2] + Math.sin(b) * 0.018;
      quad(
        [x1, y - 0.065, z1],
        [x2, y - 0.065, z2],
        [x2, y + 0.065, z2],
        [x1, y + 0.065, z1],
        brass,
      );
    }
  }
  return new Float32Array(data);
}

const VERTEX = `
precision highp float;
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec3 aColor;
attribute float aKind;
attribute float aMoving;
attribute vec2 aUV;
uniform float uOpen;
uniform float uAspect;
uniform float uApproach;
varying vec3 vWorld;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vColor;
varying float vKind;
varying vec2 vUV;
mat3 rotateY(float a) { return mat3(cos(a),0.,-sin(a), 0.,1.,0., sin(a),0.,cos(a)); }
void main() {
  vec3 p=aPosition, n=aNormal;
  vPosition=p; vColor=aColor; vKind=aKind; vUV=aUV;
  if(aMoving>.5) {
    mat3 hinge=rotateY(uOpen*${DOOR_ANGLE});
    p=hinge*(p-vec3(${DOOR_HINGE.join(",")}))+vec3(${DOOR_HINGE.join(",")});
    n=hinge*n;
  }
  vNormal=n; vWorld=p;
  // Eye-level doorway, filling a portrait viewport. Move through the threshold
  // only after the leaf has opened, revealing the illuminated room behind it.
  float camera=mix(3.85,3.58,uApproach);
  float distance=camera-p.z;
  float focal=min(1.76,uAspect*3.2);
  gl_Position=vec4(p.x*focal/uAspect,(p.y-.045)*focal,(distance-0.1)*1.01-0.202,distance);
}`;
const FRAGMENT = `
precision highp float;
uniform sampler2D uWood;
uniform float uOpen;
varying vec3 vPosition;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vColor;
varying float vKind;
varying vec2 vUV;
float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
void main() {
  vec3 n=normalize(vNormal);
  if(!gl_FrontFacing) n=-n;
  vec3 light=normalize(vec3(-.45,.75,1.8));
  float diffuse=max(dot(n,light),0.);
  vec3 color=vColor;
  if(vKind<.5) {
    vec2 uv=fract(vUV);
    vec3 timber=texture2D(uWood,uv).rgb;
    float grain=dot(timber,vec3(.30,.59,.11));
    float nearby=dot(texture2D(uWood,uv+vec2(.00195,0.)).rgb,vec3(.30,.59,.11));
    // Retain photographic color variation, instead of reducing timber to gray
    // grain on a flat brown material. Pore relief is deliberately restrained.
    color=timber*vec3(.91,.99,1.14)*(vColor/vec3(.46,.285,.17));
    color*=.72+diffuse*.31+clamp((grain-nearby)*.65,-.035,.035);
    color*=.87+.13*smoothstep(-1.6,.8,vPosition.y);
    vec3 eye=normalize(vec3(0.,.045,3.85)-vWorld);
    float satin=pow(max(dot(n,normalize(light+eye)),0.),28.);
    color+=vec3(.021,.015,.009)*satin;
  } else if(vKind<1.5) {
    float patina=hash(floor(vPosition.xy*340.));
    color*=.66+diffuse*.32+patina*.04;
    color+=vec3(.025,.022,.016)*pow(max(dot(reflect(-light,n),vec3(0,0,1)),0.),8.);
  } else if(vKind<2.5) {
    float edge=exp(-pow((vWorld.x-.77)*6.,2.));
    float lightPool=exp(-pow((vWorld.y-.1)*.6,2.));
    color*=.80+diffuse*.16;
    color+=vec3(.042,.026,.012)*edge*lightPool;
    // Soft door occlusion recedes naturally as it opens.
    color*=.70+.30*uOpen;
  }
  gl_FragColor=vec4(color,1.);
}`;

export function createConfessionalRenderer(
  gl: WebGLRenderingContext,
  woodImage: TexImageSource,
) {
  const shaders: WebGLShader[] = [];
  let buffer: WebGLBuffer | null = null,
    program: WebGLProgram | null = null,
    texture: WebGLTexture | null = null;
  const dispose = () => {
    if (buffer) gl.deleteBuffer(buffer);
    if (texture) gl.deleteTexture(texture);
    if (program) gl.deleteProgram(program);
    shaders.forEach((s) => gl.deleteShader(s));
  };
  try {
    for (const [type, source] of [
      [gl.VERTEX_SHADER, VERTEX],
      [gl.FRAGMENT_SHADER, FRAGMENT],
    ] as const) {
      const shader = gl.createShader(type);
      if (!shader) throw Error("Door shader unavailable");
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw Error("Door shader could not compile");
    }
    program = gl.createProgram();
    if (!program) throw Error("Door program unavailable");
    shaders.forEach((s) => gl.attachShader(program!, s));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw Error("Door program could not link");
    gl.useProgram(program);
    texture = gl.createTexture();
    if (!texture) throw Error("Walnut texture unavailable");
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      woodImage,
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl.LINEAR_MIPMAP_LINEAR,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.uniform1i(gl.getUniformLocation(program, "uWood"), 0);
    const mesh = buildConfessionalMesh();
    buffer = gl.createBuffer();
    if (!buffer) throw Error("Door mesh unavailable");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);
    let offset = 0;
    for (const [name, size] of [
      ["aPosition", 3],
      ["aNormal", 3],
      ["aColor", 3],
      ["aKind", 1],
      ["aMoving", 1],
      ["aUV", 2],
    ] as const) {
      const location = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(
        location,
        size,
        gl.FLOAT,
        false,
        MESH_STRIDE * 4,
        offset * 4,
      );
      offset += size;
    }
    const open = gl.getUniformLocation(program, "uOpen"),
      aspect = gl.getUniformLocation(program, "uAspect"),
      approach = gl.getUniformLocation(program, "uApproach");
    return {
      draw(progress: number, entry = 0) {
        gl.useProgram(program);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clearColor(...backdrop, 1);
        gl.clearDepth(1);
        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.uniform1f(open, Math.max(0, Math.min(1, progress)));
        gl.uniform1f(aspect, gl.drawingBufferWidth / gl.drawingBufferHeight);
        gl.uniform1f(approach, Math.max(0, Math.min(1, entry)));
        gl.drawArrays(gl.TRIANGLES, 0, mesh.length / MESH_STRIDE);
        gl.flush();
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
