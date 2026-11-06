// The church entrance: a stepped stone portal at dusk with two oak doors that
// swing inward onto a warm, candlelit nave. Geometry, lighting and stained glass
// are generated in code; the only bundled image is the timber albedo.
import {
  MeshBuilder,
  Material,
  Vec3,
  archOutline,
  bindMesh,
  compile,
  lookAt,
  multiply,
  perspective,
  GLSL_COMMON,
} from "./gl-mesh";

export const DOOR_OPEN_MS = 1800;
export const APPROACH_START_MS = 950;
export const APPROACH_MS = 1750;
export const FADE_START_MS = 2150;
export const FADE_MS = 750;
export const ENTRANCE_MS = FADE_START_MS + FADE_MS;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};

// Progress of each part of the entrance, given milliseconds since the tap.
export function entranceFrame(elapsed: number) {
  const approach = clamp01((elapsed - APPROACH_START_MS) / APPROACH_MS);
  return {
    open: smooth(elapsed / DOOR_OPEN_MS),
    approach: approach * approach * (3 - 2 * approach),
    fade: smooth((elapsed - FADE_START_MS) / FADE_MS),
  };
}

const OPENING = 0.66; // door radius and half-width
const SPRING = 0.5; // where the semicircle starts
const SILL = -1.5; // threshold height
export const DOOR_Z = -0.38;
const LANTERN_X = 1.27;

const KIND = {
  wood: 0,
  iron: 1,
  stone: 2,
  flame: 3,
  brass: 4,
  interior: 5,
  lantern: 6,
  glass: 7,
};

export function buildChurchDoorMesh() {
  const mesh = new MeshBuilder();
  const stone: Material = { color: [0.72, 0.66, 0.58], kind: KIND.stone };
  const darkStone: Material = { color: [0.6, 0.55, 0.49], kind: KIND.stone };
  const pavement: Material = { color: [0.5, 0.47, 0.43], kind: KIND.stone };
  const iron: Material = { color: [0.09, 0.085, 0.08], kind: KIND.iron };

  // Facade wall with an arched opening, then three receding orders of stone.
  mesh.archRing(1.08, 7, SPRING, SILL, -0.02, 0.1, stone);
  mesh.archRing(0.94, 1.08, SPRING, SILL, -0.14, -0.02, darkStone);
  mesh.archRing(0.8, 0.94, SPRING, SILL, -0.26, -0.14, stone);
  mesh.archRing(OPENING, 0.8, SPRING, SILL, -0.48, -0.26, darkStone);
  // Slender shafts with capitals and bases in the corners of each order.
  for (const side of [-1, 1]) {
    for (const [x, z] of [
      [0.8, -0.26],
      [0.94, -0.14],
    ]) {
      mesh.cylinder(side * x, z, SILL, SPRING - 0.04, 0.042, stone, 18);
      mesh.box(side * x, SPRING - 0.01, z, 0.13, 0.07, 0.13, darkStone);
      mesh.box(side * x, SILL + 0.04, z, 0.12, 0.08, 0.12, darkStone);
    }
  }
  // A carved cross above the arch.
  mesh.box(0, 2.02, 0.13, 0.07, 0.5, 0.05, darkStone);
  mesh.box(0, 2.12, 0.13, 0.3, 0.07, 0.05, darkStone);
  // Steps and pavement.
  mesh.box(0, SILL - 0.1, 0.0, 2.7, 0.2, 0.96, darkStone);
  mesh.box(0, SILL - 0.3, 0.62, 3.2, 0.2, 0.56, stone);
  mesh.box(0, SILL - 0.5, 4.2, 14, 0.2, 7.6, pavement);

  // Wall lanterns on iron brackets.
  for (const side of [-1, 1]) {
    const x = side * LANTERN_X;
    mesh.box(x, 0.42, 0.18, 0.04, 0.04, 0.2, iron);
    mesh.box(x, 0.56, 0.3, 0.16, 0.025, 0.16, iron);
    mesh.box(x, 0.36, 0.3, 0.14, 0.025, 0.14, iron);
    mesh.box(x, 0.46, 0.3, 0.1, 0.18, 0.1, {
      color: [1, 0.7, 0.35],
      kind: KIND.lantern,
    });
    for (const [dx, dz] of [
      [-0.06, -0.06],
      [0.06, -0.06],
      [-0.06, 0.06],
      [0.06, 0.06],
    ])
      mesh.box(x + dx, 0.46, 0.3 + dz, 0.014, 0.2, 0.014, iron);
    mesh.box(x, 0.6, 0.3, 0.08, 0.05, 0.08, iron);
  }

  // The two leaves, each a convex quarter-arch slab.
  for (const part of [1, 2]) {
    const side = part === 1 ? -1 : 1;
    const wood: Material = { color: [0.4, 0.27, 0.17], kind: KIND.wood, part };
    const metal: Material = { ...iron, part };
    const brass: Material = {
      color: [0.66, 0.5, 0.26],
      kind: KIND.brass,
      part,
    };
    const outline: [number, number][] = [];
    const seam = 0.004;
    outline.push([side * seam, SILL]);
    outline.push([side * OPENING, SILL]);
    for (let i = 0; i <= 24; i++) {
      const a = Math.PI - (i / 24) * (Math.PI / 2);
      const x = Math.cos(a) * OPENING;
      outline.push([side * Math.abs(x), SPRING + Math.sin(a) * OPENING]);
    }
    outline.push([side * seam, SPRING + Math.sqrt(OPENING ** 2 - seam ** 2)]);
    if (side > 0) outline.reverse();
    mesh.prism(outline, DOOR_Z - 0.045, DOOR_Z + 0.045, wood);

    // Iron strap hinges with studs, running from the hinge toward the seam.
    for (const y of [-1.18, -0.42, 0.42]) {
      const length = y > 0.3 ? 0.46 : 0.56;
      const cx = side * (OPENING - length / 2);
      mesh.box(cx, y, DOOR_Z + 0.052, length, 0.052, 0.012, metal);
      const tip = side * (OPENING - length);
      mesh.box(tip, y, DOOR_Z + 0.052, 0.05, 0.1, 0.012, metal);
      for (let s = 0; s < 6; s++) {
        const sx = side * (OPENING - 0.05 - (s * (length - 0.08)) / 5);
        mesh.box(sx, y, DOOR_Z + 0.062, 0.018, 0.018, 0.012, metal);
      }
    }
    // Rows of studs on the lower half.
    for (const y of [-0.8, -0.05]) {
      for (let s = 0; s < 5; s++) {
        const sx = side * (0.08 + s * 0.12);
        mesh.box(sx, y, DOOR_Z + 0.05, 0.016, 0.016, 0.012, metal);
      }
    }
    // Ring pull on a round back plate, beside the seam.
    const hx = side * 0.1,
      hy = -0.28,
      hz = DOOR_Z + 0.06;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2,
        b = ((i + 1) / 16) * Math.PI * 2;
      mesh.triangle(
        [hx, hy + 0.01, hz],
        [hx + Math.cos(a) * 0.045, hy + 0.01 + Math.sin(a) * 0.045, hz],
        [hx + Math.cos(b) * 0.045, hy + 0.01 + Math.sin(b) * 0.045, hz],
        brass,
      );
    }
    for (let i = 0; i < 20; i++) {
      const a = -Math.PI / 2 + (i / 20) * Math.PI * 2,
        b = -Math.PI / 2 + ((i + 1) / 20) * Math.PI * 2;
      const r1 = 0.075,
        r2 = 0.059,
        cy = hy - 0.05;
      const p = (r: number, t: number, z: number): Vec3 => [
        hx + Math.cos(t) * r * 0.8,
        cy + Math.sin(t) * r,
        z,
      ];
      mesh.quad(
        p(r2, a, hz + 0.02),
        p(r1, a, hz + 0.02),
        p(r1, b, hz + 0.02),
        p(r2, b, hz + 0.02),
        brass,
      );
      mesh.quad(
        p(r1, a, hz + 0.005),
        p(r1, b, hz + 0.005),
        p(r1, b, hz + 0.02),
        p(r1, a, hz + 0.02),
        brass,
      );
    }
    // A slim astragal covers the seam on the right leaf.
    if (part === 2)
      mesh.box(0.012, -0.17, DOOR_Z + 0.05, 0.024, 2.6, 0.014, wood);
  }

  // The candlelit nave behind the doors.
  const plaster: Material = { color: [0.58, 0.5, 0.41], kind: KIND.interior };
  const floor: Material = { color: [0.55, 0.45, 0.35], kind: KIND.interior };
  const pew: Material = { color: [0.34, 0.21, 0.12], kind: KIND.interior };
  const linen: Material = { color: [0.92, 0.88, 0.8], kind: KIND.interior };
  const gilt: Material = { color: [0.86, 0.64, 0.3], kind: KIND.interior };
  mesh.box(0, SILL - 0.05, -3.8, 3.3, 0.1, 6.7, floor);
  mesh.box(-1.65, 0.8, -3.8, 0.1, 4.7, 6.7, plaster);
  mesh.box(1.65, 0.8, -3.8, 0.1, 4.7, 6.7, plaster);
  mesh.box(0, 0.8, -7.15, 3.3, 4.7, 0.1, plaster);
  mesh.box(0, 3.1, -3.8, 3.3, 0.1, 6.7, {
    color: [0.3, 0.24, 0.2],
    kind: KIND.interior,
  });
  for (const z of [-1.6, -3.4, -5.2])
    for (const x of [-1.22, 1.22])
      mesh.cylinder(x, z, SILL, 3.05, 0.13, plaster, 18);
  for (const z of [-2.0, -2.75, -3.5, -4.25, -5.0]) {
    for (const x of [-0.82, 0.82]) {
      mesh.box(x, SILL + 0.38, z, 1.0, 0.07, 0.34, pew);
      mesh.box(x, SILL + 0.62, z + 0.17, 1.0, 0.42, 0.05, pew);
      mesh.box(x, SILL + 0.2, z, 1.0, 0.36, 0.04, pew);
    }
  }
  mesh.box(0, SILL + 0.15, -6.35, 2.2, 0.3, 1.1, plaster);
  mesh.box(0, SILL + 0.62, -6.4, 1.3, 0.66, 0.55, linen);
  mesh.box(0, SILL + 0.6, -6.11, 0.42, 0.5, 0.02, gilt);
  for (const x of [-0.45, 0.45]) {
    mesh.cylinder(x, -6.4, SILL + 0.95, SILL + 1.2, 0.025, linen, 10);
    mesh.box(x, SILL + 1.25, -6.4, 0.03, 0.07, 0.03, {
      color: [1, 0.72, 0.32],
      kind: KIND.flame,
    });
  }
  mesh.box(0, 0.35, -7.08, 0.07, 0.8, 0.04, gilt);
  mesh.box(0, 0.52, -7.08, 0.4, 0.07, 0.04, gilt);
  const glass = archOutline(0.48, 1.55, 0.95);
  mesh.prism(glass, -7.11, -7.09, { color: [1, 1, 1], kind: KIND.glass });
  return mesh.build();
}

const VERTEX = `
precision highp float;
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec3 aColor;
attribute float aKind;
attribute float aPart;
uniform mat4 uMVP;
uniform float uOpen;
varying vec3 vWorld;
varying vec3 vLocal;
varying vec3 vLocalNormal;
varying vec3 vNormal;
varying vec3 vColor;
varying float vKind;
mat3 rotY(float a) { return mat3(cos(a), 0.0, -sin(a), 0.0, 1.0, 0.0, sin(a), 0.0, cos(a)); }
void main() {
  vec3 p = aPosition, n = aNormal;
  vLocal = p; vLocalNormal = n; vColor = aColor; vKind = aKind;
  if (aPart > 0.5) {
    float left = aPart < 1.5 ? 1.0 : -1.0;
    vec3 hinge = vec3(-left * ${OPENING.toFixed(3)}, 0.0, ${DOOR_Z.toFixed(3)});
    mat3 r = rotY(left * uOpen * 1.74);
    p = r * (p - hinge) + hinge;
    n = r * n;
  }
  vWorld = p; vNormal = n;
  gl_Position = uMVP * vec4(p, 1.0);
}`;

const FRAGMENT = `
precision highp float;
uniform sampler2D uWood;
uniform float uOpen;
uniform float uTime;
uniform vec3 uEye;
uniform vec2 uRes;
varying vec3 vWorld;
varying vec3 vLocal;
varying vec3 vLocalNormal;
varying vec3 vNormal;
varying vec3 vColor;
varying float vKind;
${GLSL_COMMON}
vec3 point(vec3 p, vec3 n, vec3 lp, vec3 color, float k) {
  vec3 d = lp - p;
  return color * max(dot(n, normalize(d)), 0.0) / (1.0 + k * dot(d, d));
}
float spec(vec3 p, vec3 n, vec3 lp, float power) {
  vec3 l = normalize(lp - p), v = normalize(uEye - p);
  return pow(max(dot(n, normalize(l + v)), 0.0), power);
}
vec2 planar(vec3 lp, vec3 ln) {
  vec3 a = abs(ln);
  if (a.y > a.x && a.y > a.z) return lp.xz;
  if (a.x > a.z) return lp.zy;
  return lp.xy;
}
void main() {
  vec3 n = normalize(vNormal);
  if (!gl_FrontFacing) n = -n;
  vec3 p = vWorld;
  float flick = 0.93 + 0.045 * sin(uTime * 7.3) + 0.025 * sin(uTime * 13.7 + 1.3);
  vec3 lanternL = vec3(-${LANTERN_X}, 0.46, 0.46), lanternR = vec3(${LANTERN_X}, 0.46, 0.46);
  vec3 lanternColor = vec3(1.0, 0.55, 0.22) * 2.1 * flick;
  vec3 hemi = mix(vec3(0.012, 0.011, 0.012), vec3(0.04, 0.046, 0.068), n.y * 0.5 + 0.5);
  vec3 moon = vec3(0.03, 0.036, 0.052) * max(dot(n, normalize(vec3(-0.45, 0.7, 0.55))), 0.0);
  vec3 doorGlow = point(p, n, vec3(0.0, -0.4, -1.5), vec3(1.0, 0.7, 0.4) * (0.09 + uOpen * 4.8), 0.7);
  vec3 light = hemi + moon + doorGlow
    + point(p, n, lanternL, lanternColor, 2.8) + point(p, n, lanternR, lanternColor, 2.8);
  float kind = vKind;
  vec3 color;
  if (kind < 0.5) {
    vec3 lp = vLocal;
    float plank = 0.165;
    float u = (lp.x + 0.66) / plank;
    float id = floor(u), fx = fract(u);
    float groove = smoothstep(0.0, 0.045, fx) * smoothstep(0.0, 0.045, 1.0 - fx);
    vec2 uv = vec2(fx * 0.16 + hash(vec2(id, 3.0)) * 0.8, lp.y * 0.24 + hash(vec2(id, 7.0)));
    if (abs(vLocalNormal.z) < 0.5) { uv = vec2(lp.z * 2.0 + 0.3, lp.y * 0.24); groove = 1.0; }
    vec3 timber = lin(texture2D(uWood, fract(uv)).rgb) * (0.8 + 0.32 * hash(vec2(id, 1.0)));
    timber = mix(timber, vec3(dot(timber, vec3(0.3, 0.59, 0.11))), 0.22);
    timber *= lin(vColor) / lin(vec3(0.5, 0.33, 0.2));
    color = timber * light * 3.1 * mix(0.22, 1.0, groove);
    color += vec3(1.0, 0.7, 0.4) * 0.035 * (spec(p, n, lanternL, 30.0) + spec(p, n, lanternR, 30.0));
  } else if (kind < 1.5 || (kind > 3.5 && kind < 4.5)) {
    bool brass = kind > 3.5;
    vec3 base = brass ? lin(vec3(0.72, 0.55, 0.28)) : lin(vec3(0.07, 0.066, 0.064));
    float sp = spec(p, n, lanternL, brass ? 48.0 : 20.0) + spec(p, n, lanternR, brass ? 48.0 : 20.0)
      + spec(p, n, vec3(0.0, -0.3, -1.4), 30.0) * uOpen * 2.0;
    color = base * light * 2.0 + (brass ? vec3(1.0, 0.72, 0.36) * 1.2 : vec3(0.55, 0.42, 0.3) * 0.32) * sp;
  } else if (kind < 2.5) {
    vec3 lp = vLocal;
    vec2 uv = planar(lp, vLocalNormal);
    float bh = 0.27;
    float row = floor(uv.y / bh);
    float bw = 0.5 + 0.26 * hash(vec2(row, 9.0));
    float x = uv.x + hash(vec2(row, 4.0)) * 0.9;
    vec2 cell = vec2(floor(x / bw), row);
    vec2 f = vec2(fract(x / bw) * bw, fract(uv.y / bh) * bh);
    float edge = min(min(f.x, bw - f.x), min(f.y, bh - f.y));
    float r = length(vec2(lp.x, lp.y - ${SPRING.toFixed(2)}));
    if (lp.y > ${SPRING.toFixed(2)} && r < 1.09 && abs(vLocalNormal.z) > 0.5) {
      float a = atan(lp.y - ${SPRING.toFixed(2)}, lp.x) / 3.14159 * 15.0;
      cell = vec2(floor(a), floor(r * 7.0));
      edge = min(fract(a), 1.0 - fract(a)) * r * 0.21;
    }
    float mortar = smoothstep(0.004, 0.01, edge);
    float bevel = smoothstep(0.004, 0.04, edge);
    float grain = fbm(uv * 6.0 + cell * 3.1);
    float fine = noise(uv * 70.0);
    vec3 tint = mix(vec3(1.0, 0.96, 0.9), vec3(0.92, 0.94, 1.0), hash(cell + 0.5));
    vec3 base = lin(vColor) * tint * (0.78 + 0.32 * hash(cell)) * (0.7 + 0.48 * grain) * (0.9 + 0.1 * fine);
    color = base * light * 2.5 * mix(0.45, 1.0, mortar) * (0.8 + 0.2 * bevel);
  } else if (kind < 3.5) {
    color = lin(vColor) * 6.0 * flick;
  } else if (kind < 5.5) {
    vec3 base = lin(vColor);
    if (vLocalNormal.y > 0.5 && vLocal.y < -1.3) {
      vec2 t = floor(vLocal.xz / 0.38);
      base *= mod(t.x + t.y, 2.0) < 1.0 ? 0.78 : 1.05;
    }
    float depth = max(0.0, -p.z - 0.45);
    float altar = exp(-pow(length(p - vec3(0.0, -0.6, -6.3)) * 0.42, 2.0));
    vec3 warm = vec3(1.0, 0.68, 0.38) * (0.55 + 1.1 * altar)
      * (0.5 + 0.5 * max(dot(n, normalize(vec3(0.0, 0.5, 1.0))), 0.0));
    color = base * warm * 1.05;
    color = mix(color, vec3(1.0, 0.64, 0.32) * 0.7, 1.0 - exp(-depth * 0.09));
  } else if (kind < 6.5) {
    color = vec3(1.0, 0.6, 0.26) * 4.0 * flick;
  } else {
    vec2 q = vec2(vLocal.x + vLocal.y, vLocal.x - vLocal.y) * 4.6;
    vec2 g = fract(q);
    float lead = smoothstep(0.035, 0.09, min(min(g.x, 1.0 - g.x), min(g.y, 1.0 - g.y)));
    float h = hash(floor(q));
    vec3 pane = h < 0.42 ? vec3(0.16, 0.3, 0.66) : h < 0.72 ? vec3(0.93, 0.7, 0.32)
      : h < 0.86 ? vec3(0.62, 0.16, 0.16) : vec3(0.22, 0.45, 0.5);
    color = lin(pane) * (1.5 + 0.5 * noise(vLocal.xy * 9.0)) * lead + vec3(0.01);
  }
  vec2 sc = gl_FragCoord.xy / uRes - 0.5;
  color *= 1.0 - 0.6 * dot(sc * vec2(1.3, 0.85), sc * vec2(1.3, 0.85));
  color = filmic(color);
  color += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0;
  gl_FragColor = vec4(color, 1.0);
}`;

// Soft additive light: lantern halos, candle halos and the doorway's glow.
const GLOW_VERTEX = `
precision highp float;
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec3 aColor;
attribute float aKind;
attribute float aPart;
uniform mat4 uMVP;
varying vec2 vUV;
varying vec3 vColor;
varying float vStrength;
varying float vPart;
void main() {
  vUV = aNormal.xy; vColor = aColor; vStrength = aKind; vPart = aPart;
  gl_Position = uMVP * vec4(aPosition, 1.0);
}`;
const GLOW_FRAGMENT = `
precision highp float;
uniform float uOpen;
uniform float uTime;
uniform float uApproach;
varying vec2 vUV;
varying vec3 vColor;
varying float vStrength;
varying float vPart;
void main() {
  float r2 = dot(vUV, vUV);
  float falloff = exp(-r2 * 3.2) * (1.0 - smoothstep(0.75, 1.0, sqrt(r2)));
  float flick = 0.9 + 0.07 * sin(uTime * 7.3) + 0.03 * sin(uTime * 13.7 + 1.3);
  float scale = vPart < 0.5 ? 1.0 : vPart < 1.5 ? uOpen : flick;
  gl_FragColor = vec4(vColor * falloff * vStrength * scale * (1.0 - 0.75 * uApproach), 1.0);
}`;

function buildGlowMesh() {
  const data: number[] = [];
  const quad = (
    center: Vec3,
    u: Vec3,
    v: Vec3,
    color: Vec3,
    strength: number,
    part: number,
  ) => {
    const corner = (a: number, b: number) => [
      center[0] + u[0] * a + v[0] * b,
      center[1] + u[1] * a + v[1] * b,
      center[2] + u[2] * a + v[2] * b,
      a,
      b,
      0,
      ...color,
      strength,
      part,
    ];
    for (const [a, b] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, -1],
      [1, 1],
      [-1, 1],
    ])
      data.push(...corner(a, b));
  };
  const warm: Vec3 = [1.0, 0.68, 0.36];
  // Behind the doors: hidden while they are closed, pouring out as they open.
  quad([0, -0.3, -0.6], [0.95, 0, 0], [0, 1.6, 0], warm, 0.85, 1);
  quad([0, SILL + 0.01, 0.25], [1.15, 0, 0], [0, 0, 0.9], warm, 0.5, 1);
  quad([0, -0.4, -2.6], [1.4, 0, 0], [0, 1.9, 0], warm, 0.35, 1);
  for (const side of [-1, 1]) {
    quad(
      [side * LANTERN_X, 0.46, 0.42],
      [0.42, 0, 0],
      [0, 0.42, 0],
      [1.0, 0.58, 0.26],
      0.6,
      2,
    );
    quad(
      [side * LANTERN_X, 0.3, 0.12],
      [0.75, 0, 0],
      [0, 1.05, 0],
      [1.0, 0.55, 0.24],
      0.16,
      2,
    );
    quad(
      [side * 0.45, SILL + 1.26, -6.38],
      [0.16, 0, 0],
      [0, 0.16, 0],
      [1.0, 0.7, 0.35],
      0.7,
      2,
    );
  }
  return new Float32Array(data);
}

export function doorCamera(aspect: number, approach: number, time: number) {
  const a = approach;
  const sway = (1 - a) * 0.035;
  const eye: Vec3 = [
    Math.sin(time * 0.31) * sway,
    -0.6 + Math.sin(time * 0.23) * sway * 0.5 + a * 0.15,
    5.1 - (5.1 + 1.5) * a * a,
  ];
  const target: Vec3 = [0, -0.1 - a * 0.2, -7 * a];
  const distance = Math.max(eye[2] - 0.1, 0.5);
  // Keep the whole portal and both lanterns in view on narrow screens.
  const horizontal = Math.atan(1.42 / distance);
  let vertical = 2 * Math.atan(Math.tan(horizontal) / aspect);
  vertical = Math.min(Math.max(vertical, 0.75), 1.25);
  if (a > 0) vertical = vertical + (1.1 - vertical) * a;
  const projection = perspective(vertical, aspect, 0.04, 60);
  return { matrix: multiply(projection, lookAt(eye, target)), eye };
}

export function createChurchDoorRenderer(
  gl: WebGLRenderingContext,
  woodImage: TexImageSource,
) {
  const buffers: WebGLBuffer[] = [];
  const programs: WebGLProgram[] = [];
  const shaders: WebGLShader[] = [];
  let texture: WebGLTexture | null = null;
  const dispose = () => {
    buffers.forEach((b) => gl.deleteBuffer(b));
    if (texture) gl.deleteTexture(texture);
    programs.forEach((p) => gl.deleteProgram(p));
    shaders.forEach((s) => gl.deleteShader(s));
  };
  try {
    const main = compile(gl, VERTEX, FRAGMENT);
    programs.push(main.program);
    shaders.push(...main.shaders);
    const glow = compile(gl, GLOW_VERTEX, GLOW_FRAGMENT);
    programs.push(glow.program);
    shaders.push(...glow.shaders);

    gl.useProgram(main.program);
    texture = gl.createTexture();
    if (!texture) throw Error("Timber texture unavailable");
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
    gl.uniform1i(gl.getUniformLocation(main.program, "uWood"), 0);

    const mesh = buildChurchDoorMesh();
    const meshBuffer = gl.createBuffer();
    const glowMesh = buildGlowMesh();
    const glowBuffer = gl.createBuffer();
    if (!meshBuffer || !glowBuffer) throw Error("Mesh buffer unavailable");
    buffers.push(meshBuffer, glowBuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, meshBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, glowBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, glowMesh, gl.STATIC_DRAW);

    const uniforms = (program: WebGLProgram) => ({
      mvp: gl.getUniformLocation(program, "uMVP"),
      open: gl.getUniformLocation(program, "uOpen"),
      time: gl.getUniformLocation(program, "uTime"),
      eye: gl.getUniformLocation(program, "uEye"),
      res: gl.getUniformLocation(program, "uRes"),
      approach: gl.getUniformLocation(program, "uApproach"),
    });
    const mainU = uniforms(main.program),
      glowU = uniforms(glow.program);
    return {
      draw(open: number, approach: number, time: number) {
        const width = gl.drawingBufferWidth,
          height = gl.drawingBufferHeight;
        const camera = doorCamera(width / Math.max(height, 1), approach, time);
        gl.viewport(0, 0, width, height);
        gl.clearColor(0.03, 0.028, 0.032, 1);
        gl.clearDepth(1);
        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(main.program);
        bindMesh(gl, main.program, mesh, meshBuffer);
        gl.uniformMatrix4fv(mainU.mvp, false, camera.matrix);
        gl.uniform1f(mainU.open, clamp01(open));
        gl.uniform1f(mainU.time, time);
        gl.uniform3f(mainU.eye, camera.eye[0], camera.eye[1], camera.eye[2]);
        gl.uniform2f(mainU.res, width, height);
        gl.drawArrays(gl.TRIANGLES, 0, mesh.length / 11);

        gl.useProgram(glow.program);
        bindMesh(gl, glow.program, glowMesh, glowBuffer);
        gl.uniformMatrix4fv(glowU.mvp, false, camera.matrix);
        gl.uniform1f(glowU.open, clamp01(open));
        gl.uniform1f(glowU.time, time);
        gl.uniform1f(glowU.approach, clamp01(approach));
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.depthMask(false);
        gl.drawArrays(gl.TRIANGLES, 0, glowMesh.length / 11);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
        gl.flush();
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
