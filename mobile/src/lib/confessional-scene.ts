// A small, self-contained mesh shared by Expo GL on iOS and WebGL on the web.
// All materials are procedural: no remote textures, models, or tracking requests.
type Vec3 = [number, number, number];
type Material = { color: Vec3; kind: number; moving?: boolean };
export const DOOR_OPEN_MS = 1150;
export const DOOR_HINGE: Vec3 = [-0.79, 0, 0.22];
export function doorProgress(elapsed: number) {
  const t = Math.max(0, Math.min(1, elapsed / DOOR_OPEN_MS));
  return t * t * (3 - 2 * t);
}
const wood: Material = { color: [0.37, 0.215, 0.115], kind: 0 };
const dark: Material = { color: [0.19, 0.095, 0.048], kind: 0 };
const trim: Material = { color: [0.49, 0.3, 0.155], kind: 0 };
const brass: Material = { color: [0.72, 0.53, 0.25], kind: 1 };
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
  function arch(
    radius: number,
    spring: number,
    bottom: number,
    z: number,
    depth: number,
    m: Material,
  ) {
    const points = archOutline(radius, spring, bottom);
    const center: Vec3 = [0, (bottom + spring) / 2, z + depth / 2];
    for (let i = 0; i < points.length; i++) {
      const p = points[i],
        q = points[(i + 1) % points.length];
      triangle(
        center,
        [p[0], p[1], z + depth / 2],
        [q[0], q[1], z + depth / 2],
        m,
      );
      triangle(
        [0, center[1], z - depth / 2],
        [q[0], q[1], z - depth / 2],
        [p[0], p[1], z - depth / 2],
        m,
      );
      quad(
        [p[0], p[1], z - depth / 2],
        [q[0], q[1], z - depth / 2],
        [q[0], q[1], z + depth / 2],
        [p[0], p[1], z + depth / 2],
        m,
      );
    }
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
    box(x, y, 0.23, w, h, 0.14, leaf(dark));
    box(x, y, 0.31, w - 0.035, h - 0.035, 0.06, leaf(trim));
    box(x, y, 0.345, w - 0.095, h - 0.095, 0.04, leaf(dark));
    box(x, y, 0.365, w - 0.14, h - 0.14, 0.035, leaf(wood));
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
      const p: Vec3 = [x + Math.cos(a) * 0.052, y + Math.sin(a) * 0.052, 0.48];
      const q: Vec3 = [x + Math.cos(b) * 0.052, y + Math.sin(b) * 0.052, 0.48];
      triangle([x, y, 0.505], p, q, m);
      quad([p[0], p[1], 0.4], [q[0], q[1], 0.4], q, p, m);
    }
  }

  // The actual room is behind the hinged leaf, with a lit plaster wall and a bench.
  arch(0.84, 0.6, -1.55, -0.48, 0.1, { color: [0.24, 0.13, 0.075], kind: 0 });
  arch(0.66, 0.6, -1.48, -0.42, 0.01, { color: [0.87, 0.72, 0.48], kind: 2 });
  box(0, -1.21, -0.22, 1.53, 0.16, 0.48, dark);
  box(0, -1.1, -0.21, 1.49, 0.065, 0.47, trim);
  ring(0.8, 1.05, 0.6, -1.55, -0.02, 0.44, dark);
  ring(0.85, 1.03, 0.6, -1.55, 0.19, 0.14, wood);
  ring(1.0, 1.06, 0.6, -1.55, 0.28, 0.09, trim);
  ring(0.815, 0.86, 0.6, -1.55, 0.28, 0.09, trim);
  ring(0.885, 0.905, 0.6, -1.55, 0.285, 0.02, brass);
  for (const x of [-0.94, 0.94]) {
    box(x, -1.35, 0.23, 0.27, 0.43, 0.24, wood);
    box(x, -1.55, 0.25, 0.32, 0.08, 0.3, trim);
    box(x, 0.55, 0.24, 0.26, 0.11, 0.22, trim);
  }
  box(0, -1.62, 0.11, 2.25, 0.12, 0.82, dark);
  box(0, -1.55, 0.13, 2.14, 0.055, 0.72, trim);

  // The upper aperture remains open between its diamond lattice bars.
  ring(0.54, 0.79, 0.6, -1.49, 0.21, 0.14, leaf(wood));
  ring(0.51, 0.565, 0.6, 0.05, 0.3, 0.055, leaf(trim));
  arch(
    0.52,
    0.6,
    0.07,
    0.16,
    0.01,
    leaf({ color: [0.64, 0.43, 0.2], kind: 2 }),
  );
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
        beam(a[0], a[1], b[0], b[1], 0.345, 0.025, leaf(dark));
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
  box(0.655, -0.13, 0.385, 0.095, 0.32, 0.025, leaf(brass));
  knob(0.655, -0.1);
  box(0.655, -0.22, 0.405, 0.013, 0.035, 0.01, leaf(dark));
  for (const y of [-1.13, 0.23]) box(-0.785, y, 0.32, 0.065, 0.19, 0.07, brass);
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
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vColor;
varying float vKind;
mat3 rotateY(float a) { return mat3(cos(a),0.,-sin(a), 0.,1.,0., sin(a),0.,cos(a)); }
void main() {
  vec3 p=aPosition, n=aNormal;
  vPosition=p; vColor=aColor; vKind=aKind;
  if(aMoving>.5) {
    mat3 hinge=rotateY(uOpen*1.72);
    p=hinge*(p-vec3(-.79,0.,.22))+vec3(-.79,0.,.22);
    n=hinge*n;
  }
  mat3 turn=rotateY(-.13);
  p=turn*p; n=turn*n;
  float tilt=-.045;
  mat3 pitch=mat3(1.,0.,0., 0.,cos(tilt),sin(tilt), 0.,-sin(tilt),cos(tilt));
  p=pitch*p; vNormal=pitch*n;
  float distance=6.4-p.z;
  float focal=3.25;
  gl_Position=vec4(p.x*focal/uAspect,p.y*focal,(distance-0.1)*1.01-0.202,distance);
}`;
const FRAGMENT = `
precision highp float;
varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vColor;
varying float vKind;
float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p) {
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
void main() {
  vec3 n=normalize(vNormal);
  if(!gl_FrontFacing) n=-n;
  vec3 light=normalize(vec3(-.65,.85,1.4));
  float diffuse=max(dot(n,light),0.);
  vec3 color=vColor;
  if(vKind<.5) {
    vec2 p=vPosition.xy;
    float warp=noise(vec2(p.x*3.,p.y*.8))*2.8+noise(p*vec2(8.,1.4))*.45;
    float grain=sin(p.x*150.+warp*9.+sin(p.y*1.7+p.x*5.)*2.);
    float fine=noise(vec2(p.x*380.,p.y*23.));
    color*=.88+.045*grain+.12*fine;
    color*=.72+diffuse*.59;
    float sheen=pow(max(dot(reflect(-light,n),vec3(0,0,1)),0.),25.);
    color+=vec3(.12,.08,.035)*sheen;
  } else if(vKind<1.5) {
    float spec=pow(max(dot(reflect(-light,n),vec3(0,0,1)),0.),36.);
    color*=.58+diffuse*.65;
    color+=vec3(.60,.46,.24)*spec;
  } else {
    float glow=1.-smoothstep(0.,1.4,length(vPosition.xy-vec2(-.2,.65)));
    color*=.70+glow*.34;
  }
  // Soft ambient occlusion toward the base of the booth.
  color*=.86+.14*smoothstep(-1.6,.6,vPosition.y);
  gl_FragColor=vec4(color,1.);
}`;

export function createConfessionalRenderer(gl: WebGLRenderingContext) {
  const shaders: WebGLShader[] = [];
  let buffer: WebGLBuffer | null = null,
    program: WebGLProgram | null = null;
  const dispose = () => {
    if (buffer) gl.deleteBuffer(buffer);
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
      aspect = gl.getUniformLocation(program, "uAspect");
    return {
      draw(progress: number) {
        gl.useProgram(program);
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clearColor(0, 0, 0, 0);
        gl.clearDepth(1);
        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.uniform1f(open, Math.max(0, Math.min(1, progress)));
        gl.uniform1f(aspect, gl.drawingBufferWidth / gl.drawingBufferHeight);
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
