// Small geometry and matrix helpers shared by the church entrance and church
// interior scenes. Pure TypeScript with no React Native imports, so the scenes
// can be rendered by Expo GL on devices and by WebGL in the browser preview.
export type Vec3 = [number, number, number];
export type Material = { color: Vec3; kind: number; part?: number };

// Interleaved position, normal, color, material kind and moving part.
export const STRIDE = 11;

export class MeshBuilder {
  data: number[] = [];

  triangle(a: Vec3, b: Vec3, c: Vec3, m: Material) {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    ];
    const length = Math.hypot(n[0], n[1], n[2]) || 1;
    for (const p of [a, b, c])
      this.data.push(
        p[0],
        p[1],
        p[2],
        n[0] / length,
        n[1] / length,
        n[2] / length,
        m.color[0],
        m.color[1],
        m.color[2],
        m.kind,
        m.part ?? 0,
      );
  }

  quad(a: Vec3, b: Vec3, c: Vec3, d: Vec3, m: Material) {
    this.triangle(a, b, c, m);
    this.triangle(a, c, d, m);
  }

  box(
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
    this.quad([l, b, front], [r, b, front], [r, t, front], [l, t, front], m);
    this.quad([r, b, back], [l, b, back], [l, t, back], [r, t, back], m);
    this.quad([l, b, back], [l, b, front], [l, t, front], [l, t, back], m);
    this.quad([r, b, front], [r, b, back], [r, t, back], [r, t, front], m);
    this.quad([l, t, front], [r, t, front], [r, t, back], [l, t, back], m);
    this.quad([l, b, back], [r, b, back], [r, b, front], [l, b, front], m);
  }

  // Extrudes a convex outline in the XY plane between two depths.
  prism(outline: [number, number][], back: number, front: number, m: Material) {
    const cx = outline.reduce((s, p) => s + p[0], 0) / outline.length;
    const cy = outline.reduce((s, p) => s + p[1], 0) / outline.length;
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i],
        b = outline[(i + 1) % outline.length];
      this.triangle(
        [cx, cy, front],
        [a[0], a[1], front],
        [b[0], b[1], front],
        m,
      );
      this.triangle([cx, cy, back], [b[0], b[1], back], [a[0], a[1], back], m);
      this.quad(
        [a[0], a[1], back],
        [b[0], b[1], back],
        [b[0], b[1], front],
        [a[0], a[1], front],
        m,
      );
    }
  }

  // A vertical cylinder (columns, candles, posts).
  cylinder(
    x: number,
    z: number,
    bottom: number,
    top: number,
    radius: number,
    m: Material,
    segments = 20,
    radiusTop = radius,
  ) {
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2,
        b = ((i + 1) / segments) * Math.PI * 2;
      const p0: Vec3 = [
        x + Math.cos(a) * radius,
        bottom,
        z + Math.sin(a) * radius,
      ];
      const p1: Vec3 = [
        x + Math.cos(b) * radius,
        bottom,
        z + Math.sin(b) * radius,
      ];
      const p2: Vec3 = [
        x + Math.cos(b) * radiusTop,
        top,
        z + Math.sin(b) * radiusTop,
      ];
      const p3: Vec3 = [
        x + Math.cos(a) * radiusTop,
        top,
        z + Math.sin(a) * radiusTop,
      ];
      this.quad(p0, p1, p2, p3, m);
      this.triangle([x, top, z], p3, p2, m);
      this.triangle([x, bottom, z], p1, p0, m);
    }
  }

  // A horizontal ring lying in the XZ plane (wreaths, candle cups).
  torus(
    x: number,
    y: number,
    z: number,
    radius: number,
    tube: number,
    m: Material,
    segments = 28,
    sides = 8,
  ) {
    const point = (i: number, j: number): Vec3 => {
      const a = (i / segments) * Math.PI * 2,
        b = (j / sides) * Math.PI * 2;
      const r = radius + Math.cos(b) * tube;
      return [x + Math.cos(a) * r, y + Math.sin(b) * tube, z + Math.sin(a) * r];
    };
    for (let i = 0; i < segments; i++)
      for (let j = 0; j < sides; j++)
        this.quad(
          point(i, j),
          point(i + 1, j),
          point(i + 1, j + 1),
          point(i, j + 1),
          m,
        );
  }

  // A ring around an arched opening, open at the bottom: wall faces, archivolts.
  archRing(
    inner: number,
    outer: number,
    spring: number,
    bottom: number,
    back: number,
    front: number,
    m: Material,
    cx = 0,
  ) {
    const inside = archOutline(inner, spring, bottom, cx);
    const outside = archOutline(outer, spring, bottom, cx);
    for (let i = 0; i < inside.length - 1; i++) {
      const a = inside[i],
        b = outside[i],
        c = outside[i + 1],
        d = inside[i + 1];
      this.quad(
        [a[0], a[1], front],
        [b[0], b[1], front],
        [c[0], c[1], front],
        [d[0], d[1], front],
        m,
      );
      this.quad(
        [b[0], b[1], back],
        [a[0], a[1], back],
        [d[0], d[1], back],
        [c[0], c[1], back],
        m,
      );
      this.quad(
        [a[0], a[1], back],
        [a[0], a[1], front],
        [d[0], d[1], front],
        [d[0], d[1], back],
        m,
      );
    }
  }

  build() {
    return new Float32Array(this.data);
  }
}

// Left jamb bottom, up the jamb, over the semicircle, down the right jamb.
export function archOutline(
  radius: number,
  spring: number,
  bottom: number,
  cx = 0,
): [number, number][] {
  const points: [number, number][] = [[cx - radius, bottom]];
  for (let i = 0; i <= 48; i++) {
    const angle = Math.PI - (Math.PI * i) / 48;
    points.push([
      cx + Math.cos(angle) * radius,
      spring + Math.sin(angle) * radius,
    ]);
  }
  points.push([cx + radius, bottom]);
  return points;
}

export type Mat4 = Float32Array;

export function perspective(
  fovy: number,
  aspect: number,
  near: number,
  far: number,
): Mat4 {
  const f = 1 / Math.tan(fovy / 2),
    nf = 1 / (near - far);
  const out = new Float32Array(16);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[14] = 2 * far * near * nf;
  return out;
}

export function lookAt(eye: Vec3, target: Vec3, up: Vec3 = [0, 1, 0]): Mat4 {
  let zx = eye[0] - target[0],
    zy = eye[1] - target[1],
    zz = eye[2] - target[2];
  let len = Math.hypot(zx, zy, zz) || 1;
  zx /= len;
  zy /= len;
  zz /= len;
  let xx = up[1] * zz - up[2] * zy,
    xy = up[2] * zx - up[0] * zz,
    xz = up[0] * zy - up[1] * zx;
  len = Math.hypot(xx, xy, xz) || 1;
  xx /= len;
  xy /= len;
  xz /= len;
  const yx = zy * xz - zz * xy,
    yy = zz * xx - zx * xz,
    yz = zx * xy - zy * xx;
  const out = new Float32Array(16);
  out[0] = xx;
  out[1] = yx;
  out[2] = zx;
  out[4] = xy;
  out[5] = yy;
  out[6] = zy;
  out[8] = xz;
  out[9] = yz;
  out[10] = zz;
  out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
  out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
  out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
  out[15] = 1;
  return out;
}

export function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col++)
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[col * 4 + k];
      out[col * 4 + row] = sum;
    }
  return out;
}

// Projects a world point to 0..1 screen coordinates (y down), or null if behind.
export function project(m: Mat4, p: Vec3): { x: number; y: number } | null {
  const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12];
  const y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13];
  const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
  if (w <= 0.0001) return null;
  return { x: (x / w + 1) / 2, y: 1 - (y / w + 1) / 2 };
}

export function compile(
  gl: WebGLRenderingContext,
  vertex: string,
  fragment: string,
): { program: WebGLProgram; shaders: WebGLShader[] } {
  const shaders: WebGLShader[] = [];
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vertex],
    [gl.FRAGMENT_SHADER, fragment],
  ] as const) {
    const shader = gl.createShader(type);
    if (!shader) throw Error("Shader unavailable");
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      throw Error("Shader could not compile: " + gl.getShaderInfoLog(shader));
  }
  const program = gl.createProgram();
  if (!program) throw Error("Program unavailable");
  shaders.forEach((s) => gl.attachShader(program, s));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw Error("Program could not link");
  return { program, shaders };
}

// Uploads a mesh (or rebinds an uploaded one) and points the attributes at it.
export function bindMesh(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  mesh: Float32Array,
  existing?: WebGLBuffer,
) {
  const buffer = existing ?? gl.createBuffer();
  if (!buffer) throw Error("Mesh buffer unavailable");
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  if (!existing) gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);
  let offset = 0;
  for (const [name, size] of [
    ["aPosition", 3],
    ["aNormal", 3],
    ["aColor", 3],
    ["aKind", 1],
    ["aPart", 1],
  ] as const) {
    const location = gl.getAttribLocation(program, name);
    if (location >= 0) {
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(
        location,
        size,
        gl.FLOAT,
        false,
        STRIDE * 4,
        offset * 4,
      );
    }
    offset += size;
  }
  return buffer;
}

// Shared GLSL helpers: value noise, fbm and a filmic tone curve.
export const GLSL_COMMON = `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}
vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
vec3 filmic(vec3 c) {
  c = c * (2.51 * c + 0.03) / (c * (2.43 * c + 0.59) + 0.14);
  return pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2));
}
`;
