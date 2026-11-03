// A small, self-contained mesh shared by Expo GL on iOS and WebGL on the web.
// Bundled walnut albedo; all geometry and lighting are local, with no runtime remote requests.
type Vec3 = [number, number, number];
type Material = { color: Vec3; kind: number; moving?: boolean };
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
const wood: Material = { color: [0.29, 0.245, 0.205], kind: 0 };
const dark: Material = { color: [0.19, 0.16, 0.135], kind: 0 };
const trim: Material = { color: [0.32, 0.275, 0.23], kind: 0 };
const brass: Material = { color: [0.43, 0.365, 0.265], kind: 1 };
const leaf = (m: Material): Material => ({ ...m, moving: true });

export function buildConfessionalMesh() {
  // Interleaved position, normal, color, material, hinge membership.
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
    for (const p of [a, b, c])
      data.push(
        ...p,
        ...n.map((x) => x / length),
        ...m.color,
        m.kind,
        m.moving ? 1 : 0,
      );
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
  function panel(x: number, y: number, w: number, h: number) {
    // Shallow joinery and a thin lip, not a stack of exaggerated bevels.
    box(x, y, 0.245, w, h, 0.11, leaf(dark));
    box(x, y, 0.292, w - 0.025, h - 0.025, 0.025, leaf(trim));
    box(x, y, 0.305, w - 0.065, h - 0.065, 0.018, leaf(wood));
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
    color: [30 / 255, 28 / 255, 26 / 255],
    kind: 3,
  });
  ring(0.8, 0.93, 0.6, -1.55, 0.03, 0.32, dark);
  ring(0.815, 0.925, 0.6, -1.55, 0.2, 0.085, wood);
  ring(0.915, 0.94, 0.6, -1.55, 0.25, 0.025, trim);
  ring(0.805, 0.827, 0.6, -1.55, 0.255, 0.025, trim);
  box(0, -1.58, 0.1, 1.94, 0.055, 0.55, dark);

  // The upper aperture remains open between its diamond lattice bars.
  ring(0.54, 0.79, 0.6, -1.49, 0.21, 0.14, leaf(wood));
  ring(0.51, 0.565, 0.6, 0.05, 0.28, 0.025, leaf(trim));
  for (const slope of [-1, 1]) {
    for (let intercept = -1; intercept < 2; intercept += 0.22) {
      // Clip each diagonal to the arched aperture before extruding it.
      const points: [number, number][] = [];
      for (let i = 0; i <= 300; i++) {
        const x = -0.52 + (i * 1.04) / 300,
          y = slope * x + intercept;
        if (y >= 0.07 && y <= 0.6 + Math.sqrt(Math.max(0, 0.52 ** 2 - x * x)))
          points.push([x, y]);
      }
      if (points.length > 1) {
        const a = points[0],
          b = points[points.length - 1];
        beam(a[0], a[1], b[0], b[1], 0.29, 0.019, leaf(wood));
      }
    }
  }
  box(0, -0.035, 0.255, 1.56, 0.18, 0.22, leaf(wood));
  box(0, -1.44, 0.255, 1.56, 0.13, 0.22, leaf(wood));
  box(0, -0.74, 0.255, 1.55, 0.095, 0.2, leaf(wood));
  for (const x of [-0.3, 0.3]) {
    panel(x, -0.4, 0.53, 0.51);
    panel(x, -1.09, 0.53, 0.54);
  }
  box(0, -0.75, 0.27, 0.065, 1.3, 0.19, leaf(wood));
  box(0.67, -0.13, 0.32, 0.048, 0.17, 0.014, leaf(brass));
  knob(0.67, -0.1);
  box(0.67, -0.18, 0.333, 0.008, 0.02, 0.004, leaf(dark));
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
uniform float uOpen;
uniform float uAspect;
uniform float uApproach;
varying vec3 vWorld;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vColor;
varying float vKind;
mat3 rotateY(float a) { return mat3(cos(a),0.,-sin(a), 0.,1.,0., sin(a),0.,cos(a)); }
void main() {
  vec3 p=aPosition, n=aNormal;
  vPosition=p; vColor=aColor; vKind=aKind;
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
  float focal=2.05;
  gl_Position=vec4(p.x*focal/uAspect,p.y*focal,(distance-0.1)*1.01-0.202,distance);
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
float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
void main() {
  vec3 n=normalize(vNormal);
  if(!gl_FrontFacing) n=-n;
  vec3 light=normalize(vec3(-.45,.75,1.8));
  float diffuse=max(dot(n,light),0.);
  vec3 color=vColor;
  if(vKind<.5) {
    vec2 uv=fract(vec2(vPosition.x*.49+.5, vPosition.y*.30+.5));
    vec3 timber=texture2D(uWood,uv).rgb;
    float grain=dot(timber,vec3(.30,.59,.11));
    color*=.62+grain*1.65;
    color*=.68+diffuse*.40;
    // Broad, low-contrast contact shadows in joinery and toward the threshold.
    color*=.86+.14*smoothstep(-1.6,.8,vPosition.y);
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
    ] as const) {
      const location = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, 44, offset * 4);
      offset += size;
    }
    const open = gl.getUniformLocation(program, "uOpen"),
      aspect = gl.getUniformLocation(program, "uAspect"),
      approach = gl.getUniformLocation(program, "uApproach");
    return {
      draw(progress: number, entry = 0) {
        gl.useProgram(program);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clearColor(0.118, 0.11, 0.102, 1);
        gl.clearDepth(1);
        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.uniform1f(open, Math.max(0, Math.min(1, progress)));
        gl.uniform1f(aspect, gl.drawingBufferWidth / gl.drawingBufferHeight);
        gl.uniform1f(approach, Math.max(0, Math.min(1, entry)));
        gl.drawArrays(gl.TRIANGLES, 0, mesh.length / 11);
        gl.flush();
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
