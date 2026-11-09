// The church interior shown on Home: a candlelit nave seen from the back pews.
// Each place people can enter (candles, confession, Bible, Gather, the pews)
// is a real object in the scene; its anchor is projected to screen space so the
// app can place an accessible, tappable label over it.
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
  project,
  GLSL_COMMON,
  STRIDE,
} from "./gl-mesh";

const FLOOR = -1.5;
const KIND = {
  wood: 0,
  brass: 1,
  stone: 2,
  flame: 3,
  plaster: 4,
  cloth: 5,
  glass: 6,
  doorway: 7,
  floor: 8,
  foliage: 9,
  page: 10,
};

// Direction toward the sun: high and from the left, so light falls across the
// left half of the nave. Shared by the shader and the light-shaft geometry.
const SUN_DIR: Vec3 = (() => {
  const v: Vec3 = [-0.55, 0.8, 0.2];
  const l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l];
})();

export type ChurchPlace =
  "candles" | "confession" | "bible" | "gather" | "pews" | "wreath";
// The top of each object: a label with a small arrow points down at it.
const ANCHORS: Record<ChurchPlace, Vec3> = {
  candles: [-1.2, -0.45, -3.0],
  confession: [1.28, 0.42, -3.66],
  bible: [-0.72, -0.32, -4.3],
  gather: [-1.75, -0.08, -6.2],
  pews: [-0.6, -0.52, -0.5],
  wreath: [0.55, -0.42, -3.75],
};

export type ChurchOptions = {
  adventWeek: number;
  litVotives: number;
  protestant?: boolean;
  candlesAllowed?: boolean;
  orthodox?: boolean;
};

function sideWindow(mesh: MeshBuilder, x: number, z: number, m: Material) {
  // An arched lancet on a side wall (outline in the Z/Y plane).
  const outline = archOutline(0.32, 1.75, 0.35, z);
  const cz = outline.reduce((s, p) => s + p[0], 0) / outline.length;
  const cy = outline.reduce((s, p) => s + p[1], 0) / outline.length;
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i],
      b = outline[(i + 1) % outline.length];
    mesh.triangle([x, cy, cz], [x, a[1], a[0]], [x, b[1], b[0]], m);
  }
}

export function buildChurchMesh({
  adventWeek,
  litVotives,
  protestant = false,
  candlesAllowed = !protestant,
  orthodox = false,
}: ChurchOptions) {
  const mesh = new MeshBuilder();
  const stone: Material = { color: [0.78, 0.73, 0.65], kind: KIND.stone };
  const plaster: Material = { color: [0.9, 0.85, 0.76], kind: KIND.plaster };
  const vault: Material = { color: [0.8, 0.74, 0.65], kind: KIND.plaster };
  const wood: Material = { color: [0.42, 0.28, 0.18], kind: KIND.wood };
  const darkWood: Material = { color: [0.3, 0.19, 0.12], kind: KIND.wood };
  const brass: Material = { color: [0.78, 0.6, 0.3], kind: KIND.brass };
  const linen: Material = { color: [0.95, 0.92, 0.86], kind: KIND.cloth };
  const wax: Material = { color: [0.97, 0.94, 0.86], kind: KIND.cloth };
  const flame: Material = { color: [1.0, 0.72, 0.32], kind: KIND.flame };
  const glass: Material = {
    color: protestant ? [0.78, 0.85, 0.88] : [1, 1, 1],
    kind: protestant ? KIND.plaster : KIND.glass,
  };
  const advent = adventWeek > 0;
  const violet: Material = { color: [0.36, 0.25, 0.52], kind: KIND.cloth };

  // Floor, aisle runner, walls and a barrel vault with stone ribs.
  mesh.box(0, FLOOR - 0.05, -0.6, 5.0, 0.1, 12, {
    color: [0.86, 0.82, 0.74],
    kind: KIND.floor,
  });
  mesh.box(0, FLOOR + 0.004, 0.2, 0.7, 0.008, 9.2, {
    color: [0.42, 0.13, 0.12],
    kind: KIND.cloth,
  });
  mesh.box(-2.5, 1.2, -0.6, 0.1, 5.6, 12, plaster);
  mesh.box(2.5, 1.2, -0.6, 0.1, 5.6, 12, plaster);
  mesh.box(0, 1.2, -6.35, 5.0, 5.6, 0.1, plaster);
  const spring = 2.6,
    radius = 2.45;
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI,
      b = ((i + 1) / 18) * Math.PI;
    const p = (t: number, z: number): Vec3 => [
      Math.cos(t) * radius,
      spring + Math.sin(t) * radius,
      z,
    ];
    mesh.quad(p(a, 5.4), p(b, 5.4), p(b, -6.3), p(a, -6.3), vault);
  }
  for (const z of [3, 1, -1, -3, -5])
    mesh.archRing(
      radius - 0.14,
      radius,
      spring,
      spring,
      z - 0.09,
      z + 0.09,
      stone,
    );

  // Columns with bases and capitals; Advent banners hang on the inner faces.
  for (const z of [3, 1, -1, -3, -5])
    for (const side of [-1, 1]) {
      const x = side * 1.98;
      mesh.cylinder(x, z, FLOOR, spring - 0.1, 0.17, stone, 22);
      mesh.box(x, FLOOR + 0.08, z, 0.46, 0.16, 0.46, stone);
      mesh.box(x, spring - 0.05, z, 0.46, 0.14, 0.46, stone);
      if (advent && z > -4 && z < 2) {
        mesh.box(x - side * 0.19, 1.25, z, 0.02, 0.95, 0.3, violet);
        mesh.box(x - side * 0.19, 1.74, z, 0.03, 0.04, 0.34, brass);
      }
    }
  // Stained glass: lancets along both walls and a tall window above the altar.
  for (const z of [2, 0, -2, -4]) {
    sideWindow(mesh, -2.44, z, glass);
    sideWindow(mesh, 2.44, z, glass);
  }
  mesh.prism(archOutline(0.56, 2.05, 0.75), -6.3, -6.29, glass);
  mesh.archRing(0.56, 0.68, 2.05, 0.75, -6.3, -6.26, stone);

  // Sanctuary: steps, altar with frontal, candlesticks and cross.
  mesh.box(0, FLOOR + 0.1, -5.1, 3.6, 0.2, 2.5, stone);
  mesh.box(0, FLOOR + 0.25, -5.5, 2.8, 0.15, 1.7, stone);
  mesh.box(0, -0.78, -5.6, 1.7, 0.84, 0.72, protestant ? wood : linen);
  if (!protestant)
    mesh.box(
      0,
      -0.82,
      -5.235,
      0.72,
      0.66,
      0.02,
      advent ? violet : { color: [0.82, 0.62, 0.3], kind: KIND.cloth },
    );
  for (const x of protestant ? [] : [-0.6, 0.6]) {
    mesh.cylinder(x, -5.6, -0.36, -0.16, 0.05, brass, 14, 0.025);
    mesh.cylinder(x, -5.6, -0.16, 0.12, 0.028, wax, 12);
    mesh.cylinder(x, -5.6, 0.13, 0.22, 0.02, flame, 8, 0.0);
  }
  mesh.box(0, 0.32, -6.24, 0.07, 0.9, 0.05, brass);
  mesh.box(0, 0.5, -6.24, 0.46, 0.07, 0.05, brass);

  // Lectern with an open Bible and a ribbon.
  const lx = -0.72,
    lz = -4.3;
  mesh.cylinder(lx, lz, FLOOR + 0.2, -0.5, 0.05, brass, 14);
  mesh.box(lx, FLOOR + 0.24, lz, 0.34, 0.06, 0.34, brass);
  const slope = (x: number, y: number, z: number): Vec3 => [
    lx + x,
    y + z * 0.45,
    lz + z,
  ];
  mesh.quad(
    slope(-0.3, -0.48, 0.2),
    slope(0.3, -0.48, 0.2),
    slope(0.3, -0.48, -0.2),
    slope(-0.3, -0.48, -0.2),
    darkWood,
  );
  mesh.quad(
    slope(-0.3, -0.53, 0.2),
    slope(0.3, -0.53, 0.2),
    slope(0.3, -0.48, 0.2),
    slope(-0.3, -0.48, 0.2),
    darkWood,
  );
  const page: Material = { color: [0.98, 0.95, 0.88], kind: KIND.page };
  mesh.quad(
    slope(-0.25, -0.465, 0.16),
    slope(-0.01, -0.45, 0.16),
    slope(-0.01, -0.45, -0.16),
    slope(-0.25, -0.465, -0.16),
    page,
  );
  mesh.quad(
    slope(0.01, -0.45, 0.16),
    slope(0.25, -0.465, 0.16),
    slope(0.25, -0.465, -0.16),
    slope(0.01, -0.45, -0.16),
    page,
  );
  mesh.box(lx + 0.0, -0.56, lz + 0.2, 0.025, 0.14, 0.01, {
    color: [0.62, 0.12, 0.12],
    kind: KIND.cloth,
  });

  if (candlesAllowed) {
    // Votive stand: three brass tiers of small candles, some already lit.
    const vx = -1.2,
      vz = -3.0;
    for (const dx of [-0.36, 0.36])
      mesh.box(vx + dx, -1.12, vz, 0.03, 0.76, 0.03, brass);
    const tiers = [
      { y: -0.86, z: vz + 0.12, n: 6 },
      { y: -0.72, z: vz, n: 5 },
      { y: -0.58, z: vz - 0.12, n: 4 },
    ];
    let index = 0;
    for (const tier of tiers) {
      mesh.box(vx, tier.y, tier.z, 0.82, 0.03, 0.14, brass);
      for (let i = 0; i < tier.n; i++) {
        const x = vx - 0.34 + (0.68 * (i + 0.5)) / tier.n;
        mesh.cylinder(
          x,
          tier.z,
          tier.y + 0.015,
          tier.y + 0.06,
          0.03,
          { color: [0.75, 0.2, 0.16], kind: KIND.cloth },
          10,
        );
        mesh.cylinder(x, tier.z, tier.y + 0.02, tier.y + 0.075, 0.022, wax, 10);
        if (index < litVotives)
          mesh.cylinder(
            x,
            tier.z,
            tier.y + 0.078,
            tier.y + 0.13,
            0.013,
            flame,
            6,
            0,
          );
        index++;
      }
    }
  }

  if (!protestant && !orthodox) {
    // Confessional: a wooden booth with a panelled door, grille and curtain.
    const cx = 1.28,
      cz = -4.05;
    mesh.box(cx, -0.42, cz, 1.12, 2.16, 0.72, wood);
    mesh.box(cx, 0.7, cz, 1.24, 0.1, 0.8, darkWood);
    mesh.box(cx, 0.8, cz, 1.12, 0.1, 0.72, wood);
    mesh.box(cx, 0.98, cz + 0.2, 0.04, 0.26, 0.04, brass);
    mesh.box(cx, 1.03, cz + 0.2, 0.16, 0.04, 0.04, brass);
    mesh.box(cx - 0.24, -0.5, cz + 0.37, 0.46, 1.86, 0.03, darkWood);
    mesh.box(cx - 0.24, 0.08, cz + 0.39, 0.3, 0.3, 0.02, {
      color: [0.18, 0.11, 0.07],
      kind: KIND.wood,
    });
    mesh.box(cx - 0.06, -0.5, cz + 0.4, 0.03, 0.05, 0.03, brass);
    mesh.box(cx + 0.29, -0.52, cz + 0.37, 0.4, 1.8, 0.03, {
      color: [0.5, 0.13, 0.13],
      kind: KIND.cloth,
    });
    mesh.box(cx + 0.03, -0.42, cz + 0.38, 0.05, 2.1, 0.05, darkWood);
  } else {
    // Prayer corner: a wooden kneeler with an open Bible, before a plain cross.
    const kx = 1.28,
      kz = -3.95;
    mesh.box(kx, FLOOR + 0.06, kz + 0.18, 0.74, 0.1, 0.3, darkWood);
    mesh.box(kx, -1.06, kz - 0.06, 0.7, 0.84, 0.05, wood);
    for (const dx of [-0.34, 0.34])
      mesh.box(kx + dx, -1.06, kz + 0.04, 0.05, 0.88, 0.22, darkWood);
    const desk = (x: number, y: number, z: number): Vec3 => [
      kx + x,
      y + z * 0.4,
      kz + z,
    ];
    mesh.quad(
      desk(-0.38, -0.6, 0.08),
      desk(0.38, -0.6, 0.08),
      desk(0.38, -0.6, -0.16),
      desk(-0.38, -0.6, -0.16),
      darkWood,
    );
    const leaf: Material = { color: [0.98, 0.95, 0.88], kind: KIND.page };
    mesh.quad(
      desk(-0.2, -0.585, 0.05),
      desk(-0.01, -0.575, 0.05),
      desk(-0.01, -0.575, -0.13),
      desk(-0.2, -0.585, -0.13),
      leaf,
    );
    mesh.quad(
      desk(0.01, -0.575, 0.05),
      desk(0.2, -0.585, 0.05),
      desk(0.2, -0.585, -0.13),
      desk(0.01, -0.575, -0.13),
      leaf,
    );
    mesh.box(kx, FLOOR + 0.08, kz - 0.5, 0.42, 0.16, 0.42, stone);
    mesh.box(kx, -0.36, kz - 0.5, 0.09, 2.1, 0.09, darkWood);
    mesh.box(kx, 0.28, kz - 0.5, 0.66, 0.09, 0.09, darkWood);
  }

  // Side door to the gathering room, glowing warmly.
  mesh.prism(archOutline(0.34, -0.45, FLOOR, -1.75), -6.3, -6.295, {
    color: [1, 0.78, 0.48],
    kind: KIND.doorway,
  });
  mesh.archRing(0.34, 0.46, -0.45, FLOOR, -6.32, -6.24, stone, -1.75);

  // Pews in two blocks either side of the aisle.
  for (const z of [2.15, 1.3, 0.45, -0.4, -1.25]) {
    for (const side of [-1, 1]) {
      const x = side * 0.98;
      mesh.box(x, FLOOR + 0.42, z, 1.14, 0.06, 0.42, wood);
      mesh.box(x, FLOOR + 0.7, z + 0.2, 1.14, 0.48, 0.05, wood);
      mesh.box(x, FLOOR + 0.94, z + 0.2, 1.16, 0.04, 0.09, darkWood);
      for (const end of [-1, 1])
        mesh.box(
          x + end * 0.57,
          FLOOR + 0.42,
          z + 0.02,
          0.05,
          0.84,
          0.5,
          darkWood,
        );
    }
  }

  // Advent wreath on a brass stand beside the sanctuary steps.
  if (advent) {
    const wx = 0.55,
      wz = -3.75;
    mesh.cylinder(wx, wz, FLOOR + 0.2, -0.78, 0.035, brass, 12);
    mesh.cylinder(wx, wz, -0.8, -0.76, 0.26, brass, 20);
    mesh.torus(
      wx,
      -0.72,
      wz,
      0.2,
      0.06,
      { color: [0.2, 0.36, 0.22], kind: KIND.foliage },
      30,
      8,
    );
    const colors: Vec3[] = [
      [0.42, 0.28, 0.6],
      [0.42, 0.28, 0.6],
      [0.86, 0.55, 0.65],
      [0.42, 0.28, 0.6],
    ];
    for (let i = 0; i < 4; i++) {
      const a = Math.PI * 0.25 + (i * Math.PI) / 2;
      const x = wx + Math.cos(a) * 0.2,
        z = wz + Math.sin(a) * 0.2;
      mesh.cylinder(
        x,
        z,
        -0.72,
        -0.48,
        0.024,
        { color: colors[i], kind: KIND.cloth },
        12,
      );
      if (i < adventWeek)
        mesh.cylinder(x, z, -0.475, -0.41, 0.014, flame, 6, 0);
    }
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      mesh.box(
        wx + Math.cos(a) * 0.24,
        -0.68,
        wz + Math.sin(a) * 0.24,
        0.025,
        0.025,
        0.025,
        { color: [0.7, 0.1, 0.1], kind: KIND.cloth },
      );
    }
  }
  if (orthodox) {
    // Simplified original icon-screen geometry, not replicas of sacred artworks.
    const blue: Material = { color: [0.15, 0.24, 0.36], kind: KIND.cloth };
    const red: Material = { color: [0.46, 0.15, 0.14], kind: KIND.cloth };
    const gold: Material = { color: [0.65, 0.47, 0.2], kind: KIND.brass };
    const skin: Material = { color: [0.6, 0.4, 0.25], kind: KIND.cloth };
    const disk = (x: number, y: number, z: number, r: number, m: Material) => {
      for (let i = 0; i < 32; i++) {
        let a = (i * Math.PI) / 16,
          b = ((i + 1) * Math.PI) / 16;
        mesh.triangle(
          [x, y, z],
          [x + Math.cos(a) * r, y + Math.sin(a) * r, z],
          [x + Math.cos(b) * r, y + Math.sin(b) * r, z],
          m,
        );
      }
    };
    mesh.box(0, -0.3, -4.95, 3.7, 2.35, 0.16, darkWood);
    mesh.box(0, 0.92, -4.95, 3.9, 0.16, 0.24, gold);
    // Central royal doors; icon panels flank the opening.
    mesh.box(0, -0.49, -4.84, 0.76, 1.93, 0.08, wood);
    mesh.archRing(0.4, 0.47, 0.39, -1.45, -4.82, -4.75, gold);
    mesh.box(0, -0.5, -4.76, 0.035, 1.85, 0.035, gold);
    for (const x of [-1.43, -0.86, 0.86, 1.43]) {
      mesh.box(x, -0.28, -4.82, 0.49, 1.62, 0.08, gold);
      mesh.box(x, -0.28, -4.76, 0.42, 1.52, 0.03, blue);
      disk(x, 0.1, -4.73, 0.17, gold);
      mesh.triangle(
        [x, -0.04, -4.7],
        [x - 0.17, -0.91, -4.7],
        [x + 0.17, -0.91, -4.7],
        x < 0 ? red : blue,
      );
      disk(x, 0.07, -4.68, 0.09, skin);
      if (x === -0.86) {
        disk(x + 0.1, -0.24, -4.65, 0.09, gold);
        disk(x + 0.1, -0.25, -4.63, 0.05, skin);
      }
    }
    mesh.box(0, 1.17, -4.9, 0.05, 0.43, 0.05, gold);
    mesh.box(0, 1.24, -4.9, 0.25, 0.045, 0.05, gold);
    for (const x of [-1.25, 0, 1.25]) {
      mesh.cylinder(x, -4.5, 0.55, 2.3, 0.009, brass, 8);
      mesh.cylinder(x, -4.5, 0.42, 0.58, 0.09, brass, 16, 0.045);
      mesh.cylinder(x, -4.5, 0.48, 0.6, 0.04, flame, 12);
    }
  }
  return mesh.build();
}

const VERTEX = `
precision highp float;
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec3 aColor;
attribute float aKind;
uniform mat4 uMVP;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vColor;
varying float vKind;
void main() {
  vWorld = aPosition; vNormal = aNormal; vColor = aColor; vKind = aKind;
  gl_Position = uMVP * vec4(aPosition, 1.0);
}`;

const FRAGMENT = `
precision highp float;
uniform sampler2D uWood;
uniform float uTime;
uniform float uNight;
uniform float uVotive;
uniform vec3 uEye;
uniform vec2 uRes;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vColor;
varying float vKind;
${GLSL_COMMON}
const vec3 SUN = vec3(${SUN_DIR.map((c) => c.toFixed(4)).join(", ")});
vec3 point(vec3 p, vec3 n, vec3 lp, vec3 color, float k) {
  vec3 d = lp - p;
  return color * max(dot(n, normalize(d)), 0.0) / (1.0 + k * dot(d, d));
}
float spec(vec3 p, vec3 n, vec3 l, float power) {
  vec3 v = normalize(uEye - p);
  return pow(max(dot(n, normalize(l + v)), 0.0), power);
}
vec2 planar(vec3 p, vec3 n) {
  vec3 a = abs(n);
  if (a.y > a.x && a.y > a.z) return p.xz;
  if (a.x > a.z) return p.zy;
  return p.xy;
}
vec3 stained(vec2 q) {
  vec2 r = vec2(q.x + q.y, q.x - q.y) * 8.5;
  vec2 g = fract(r);
  float lead = smoothstep(0.04, 0.1, min(min(g.x, 1.0 - g.x), min(g.y, 1.0 - g.y)));
  float h = hash(floor(r));
  vec3 pane = h < 0.42 ? vec3(0.16, 0.3, 0.66) : h < 0.72 ? vec3(0.93, 0.7, 0.32)
    : h < 0.86 ? vec3(0.62, 0.16, 0.16) : vec3(0.22, 0.45, 0.5);
  return lin(mix(pane, vec3(0.9, 0.82, 0.68), 0.28)) * (0.85 + 0.3 * noise(q * 8.0)) * lead;
}
void main() {
  vec3 n = normalize(vNormal);
  if (!gl_FrontFacing) n = -n;
  vec3 p = vWorld;
  float night = uNight;
  float flick = 0.92 + 0.05 * sin(uTime * 7.1) + 0.03 * sin(uTime * 12.9 + 1.7);
  vec3 sun = SUN;
  // Sunlight entering through the left-hand lancets lands as warm patches,
  // faintly tinted by the stained glass it passed through.
  float t = (-2.44 - p.x) / sun.x;
  vec3 h = p + sun * t;
  float patch = 0.0;
  if (p.x > -2.4) {
    float inY = smoothstep(0.38, 0.55, h.y) * (1.0 - smoothstep(1.8, 2.02, h.y));
    for (int i = 0; i < 4; i++) {
      float zc = 2.0 - float(i) * 2.0;
      patch = max(patch, 1.0 - smoothstep(0.2, 0.31, abs(h.z - zc)));
    }
    patch *= inY;
  }
  vec3 tint = mix(vec3(1.0, 0.9, 0.7), clamp(stained(h.zy) * 6.0, 0.0, 1.4), 0.3);
  vec3 sunColor = vec3(1.0, 0.86, 0.62);
  vec3 day = sunColor * max(dot(n, sun), 0.0) * (0.5 + 2.6 * patch * tint)
    + vec3(1.0, 0.93, 0.82) * max(dot(n, normalize(vec3(0.25, 0.55, 0.8))), 0.0) * 0.42
    + mix(vec3(0.16, 0.125, 0.095), vec3(0.37, 0.32, 0.26), n.y * 0.5 + 0.5);
  vec3 dusk = vec3(0.16, 0.18, 0.28) * max(dot(n, sun), 0.0) * 0.25
    + mix(vec3(0.035, 0.03, 0.03), vec3(0.075, 0.072, 0.09), n.y * 0.5 + 0.5);
  vec3 candle = vec3(1.0, 0.62, 0.3) * flick;
  float candlePower = mix(0.7, 2.3, night);
  vec3 toEye = normalize(uEye - p);
  vec3 fill = vec3(0.09, 0.065, 0.05) * max(dot(n, toEye), 0.0) * night;
  vec3 lights = mix(day, dusk, night) + fill
    + point(p, n, vec3(-1.2, -0.45, -2.85), candle * candlePower * 1.4 * uVotive, 2.2)
    + point(p, n, vec3(0.0, 0.25, -5.3), candle * candlePower, 1.0)
    + point(p, n, vec3(-1.75, -0.8, -5.9), vec3(1.0, 0.7, 0.4) * candlePower * 0.9, 1.6)
    + point(p, n, vec3(0.55, -0.3, -3.65), candle * candlePower * 0.5, 3.0);
  float kind = vKind;
  vec3 color;
  if (kind < 0.5) {
    vec2 uv = planar(p, n) * vec2(0.42, 0.16);
    if (abs(n.x) > 0.5) uv = vec2(p.z * 0.42, p.y * 0.16);
    if (abs(n.y) > 0.5) uv = vec2(p.x * 0.16, p.z * 0.42);
    if (p.y < -0.45 && p.z > -2.0 && abs(n.z) > 0.5) uv = vec2(p.y * 0.42, p.x * 0.16);
    vec3 timber = lin(texture2D(uWood, fract(uv + 0.3)).rgb);
    timber = mix(timber, vec3(dot(timber, vec3(0.3, 0.59, 0.11))), 0.2);
    timber *= lin(vColor) / lin(vec3(0.42, 0.28, 0.18));
    color = timber * lights * 1.9;
    color += vec3(1.0, 0.85, 0.65) * 0.05 * spec(p, n, sun, 26.0) * (1.0 - night);
  } else if (kind < 1.5) {
    vec3 base = lin(vColor);
    float sp = spec(p, n, sun, 42.0) * (1.0 - night) + spec(p, n, normalize(vec3(-1.2, -0.45, -2.85) - p), 42.0) * 0.8;
    color = base * lights * 1.4 + vec3(1.0, 0.8, 0.45) * sp * 0.9;
  } else if (kind < 2.5 || (kind > 3.5 && kind < 4.5)) {
    vec2 uv = planar(p, n);
    float grain = fbm(uv * 3.0);
    vec3 base = lin(vColor) * (0.86 + 0.2 * grain);
    if (kind < 2.5) {
      float bh = 0.3;
      float row = floor(uv.y / bh);
      float x = uv.x + hash(vec2(row, 2.0)) * 0.7;
      float bw = 0.55;
      vec2 f = vec2(fract(x / bw) * bw, fract(uv.y / bh) * bh);
      float edge = min(min(f.x, bw - f.x), min(f.y, bh - f.y));
      base *= mix(0.72, 1.0, smoothstep(0.003, 0.012, edge)) * (0.9 + 0.14 * hash(vec2(floor(x / bw), row)));
    }
    color = base * lights * 1.15;
  } else if (kind < 3.5) {
    color = lin(vColor) * mix(4.0, 6.5, night) * flick;
  } else if (kind < 5.5) {
    color = lin(vColor) * lights * 1.2;
  } else if (kind < 6.5) {
    vec2 q = abs(n.x) > 0.5 ? p.zy : p.xy;
    color = stained(q) * mix(2.9, 0.55, night) + vec3(0.004);
  } else if (kind < 7.5) {
    float h = 1.0 - smoothstep(-1.5, -0.1, p.y);
    color = lin(vColor) * (1.4 + 1.3 * h) * mix(1.0, 1.25, night);
  } else if (kind < 8.5) {
    vec2 t = floor((p.xz + vec2(0.0, 0.2)) / 0.5);
    float checker = mod(t.x + t.y, 2.0);
    vec3 base = lin(checker < 1.0 ? vColor : vColor * vec3(0.62, 0.58, 0.55));
    base *= 0.9 + 0.12 * fbm(p.xz * 4.0);
    color = base * lights * 1.1;
    color += vec3(1.0, 0.9, 0.75) * 0.08 * spec(p, n, sun, 60.0) * (1.0 - night);
  } else if (kind < 9.5) {
    color = lin(vColor) * lights * (0.8 + 0.4 * noise(p.xz * 60.0 + p.y * 40.0));
  } else {
    float line = step(0.5, fract(p.z * 48.0)) * 0.08;
    color = lin(vColor) * lights * 1.3 * (1.0 - line);
  }
  float depth = length(p - uEye);
  color = mix(color, mix(vec3(1.0, 0.88, 0.68) * 0.62, vec3(0.08, 0.06, 0.06), night), (1.0 - exp(-depth * 0.035)) * mix(0.32, 0.6, night));
  vec2 sc = gl_FragCoord.xy / uRes - 0.5;
  color *= 1.0 - 0.42 * dot(sc * vec2(1.1, 0.9), sc * vec2(1.1, 0.9));
  color = filmic(color * mix(1.12, 1.15, night));
  color += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0;
  gl_FragColor = vec4(color, 1.0);
}`;

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
uniform float uTime;
uniform float uNight;
varying vec2 vUV;
varying vec3 vColor;
varying float vStrength;
varying float vPart;
void main() {
  float flick = 0.9 + 0.07 * sin(uTime * 7.1) + 0.03 * sin(uTime * 12.9 + 1.7);
  float f;
  float scale;
  if (vPart > 2.5) {
    f = (1.0 - vUV.x * vUV.x) * smoothstep(-1.0, 0.6, vUV.y) * (1.0 - smoothstep(0.85, 1.0, vUV.y));
    scale = (1.0 - uNight) * (0.85 + 0.15 * sin(uTime * 0.4 + vUV.y));
  } else {
    float r2 = dot(vUV, vUV);
    f = exp(-r2 * 3.2) * (1.0 - smoothstep(0.75, 1.0, sqrt(r2)));
    scale = vPart < 0.5 ? 1.0 : vPart < 1.5 ? mix(0.35, 1.0, uNight) : flick * mix(0.75, 1.35, uNight);
  }
  gl_FragColor = vec4(vColor * f * vStrength * scale, 1.0);
}`;

function buildGlowMesh({
  adventWeek,
  litVotives,
  protestant = false,
  candlesAllowed = !protestant,
}: ChurchOptions) {
  const data: number[] = [];
  const quad = (
    center: Vec3,
    u: Vec3,
    v: Vec3,
    color: Vec3,
    strength: number,
    part: number,
  ) => {
    for (const [a, b] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, -1],
      [1, 1],
      [-1, 1],
    ])
      data.push(
        center[0] + u[0] * a + v[0] * b,
        center[1] + u[1] * a + v[1] * b,
        center[2] + u[2] * a + v[2] * b,
        a,
        b,
        0,
        ...color,
        strength,
        part,
      );
  };
  const candle: Vec3 = [1.0, 0.62, 0.28];
  if (litVotives > 0 && candlesAllowed)
    quad(
      [-1.2, -0.62, -2.9],
      [0.62, 0, 0],
      [0, 0.42, 0],
      candle,
      0.28 + 0.02 * litVotives,
      2,
    );
  for (const x of protestant ? [] : [-0.6, 0.6])
    quad([x, 0.2, -5.55], [0.16, 0, 0], [0, 0.16, 0], candle, 0.55, 2);
  if (adventWeek > 0)
    quad(
      [0.55, -0.45, -3.7],
      [0.3, 0, 0],
      [0, 0.2, 0],
      candle,
      0.12 * adventWeek,
      2,
    );
  quad(
    [-1.75, -0.9, -6.2],
    [0.7, 0, 0],
    [0, 0.8, 0],
    [1.0, 0.72, 0.42],
    0.35,
    1,
  );
  quad([0, 1.55, -6.25], [1.1, 0, 0], [0, 1.2, 0], [0.9, 0.8, 0.65], 0.18, 0);
  // Daylight shafts falling from the left-hand windows across the nave.
  for (const z of [2, 0, -2, -4]) {
    const top: Vec3 = [-2.42, 1.2, z],
      drop = (1.2 - FLOOR) / SUN_DIR[1],
      bottom: Vec3 = [
        -2.42 - SUN_DIR[0] * drop,
        FLOOR + 0.02,
        z - SUN_DIR[2] * drop,
      ];
    const center: Vec3 = [
      (top[0] + bottom[0]) / 2,
      (top[1] + bottom[1]) / 2,
      (top[2] + bottom[2]) / 2,
    ];
    const v: Vec3 = [
      (top[0] - bottom[0]) / 2,
      (top[1] - bottom[1]) / 2,
      (top[2] - bottom[2]) / 2,
    ];
    quad(center, [0, 0, 0.3], v, [1.0, 0.88, 0.62], 0.16, 3);
  }
  return new Float32Array(data);
}

export type ChurchView = { dx: number; dy: number };

export function churchCamera(aspect: number, view: ChurchView) {
  const eye: Vec3 = [view.dx * 0.45, 1.28 + view.dy * 0.18, 3.7];
  const target: Vec3 = [view.dx * 0.1, -0.82, -4.6];
  const horizontal = Math.atan(1.95 / 7.6);
  let vertical = 2 * Math.atan(Math.tan(horizontal) / aspect);
  vertical = Math.min(Math.max(vertical, 0.45), 0.95);
  const projection = perspective(vertical, aspect, 0.05, 60);
  return { matrix: multiply(projection, lookAt(eye, target)), eye };
}

// Generous boxes around each object, so a tap anywhere on it opens the place.
export const PLACE_BOXES: Record<ChurchPlace, [Vec3, Vec3]> = {
  candles: [
    [-1.68, FLOOR, -3.25],
    [-0.72, -0.35, -2.7],
  ],
  confession: [
    [0.66, FLOOR, -4.45],
    [1.9, 1.12, -3.65],
  ],
  bible: [
    [-1.08, FLOOR, -4.6],
    [-0.36, -0.25, -4.0],
  ],
  gather: [
    [-2.25, FLOOR, -6.35],
    [-1.25, 0.05, -6.15],
  ],
  pews: [
    [-1.62, FLOOR, -1.6],
    [1.62, -0.48, 2.5],
  ],
  wreath: [
    [0.22, FLOOR, -4.05],
    [0.88, -0.36, -3.45],
  ],
};

// The place under a tap at (x, y) in 0..1 screen space, preferring the most
// specific (smallest) object when outlines overlap.
export function placeAt(
  aspect: number,
  view: ChurchView,
  x: number,
  y: number,
  places: ChurchPlace[],
): ChurchPlace | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const { matrix } = churchCamera(aspect, view);
  let best: ChurchPlace | null = null,
    bestArea = Infinity;
  for (const key of places) {
    const [a, b] = PLACE_BOXES[key];
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity,
      visible = true;
    for (const cx of [a[0], b[0]])
      for (const cy of [a[1], b[1]])
        for (const cz of [a[2], b[2]]) {
          const p = project(matrix, [cx, cy, cz]);
          if (!p) visible = false;
          else {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
          }
        }
    if (!visible || x < minX || x > maxX || y < minY || y > maxY) continue;
    const area = (maxX - minX) * (maxY - minY);
    if (area < bestArea) {
      best = key;
      bestArea = area;
    }
  }
  return best;
}

export function placeAnchors(protestant = false): Record<ChurchPlace, Vec3> {
  return protestant ? { ...ANCHORS, confession: [1.28, 0.72, -4.45] } : ANCHORS;
}

// Where the walk-in aims for each place: on the object itself (the open
// Bible, the candle tiers, the doorway, the front pews), not its label.
const FOCUS: Partial<Record<ChurchPlace, Vec3>> = {
  bible: [-0.72, -0.45, -4.3],
  candles: [-1.2, -0.72, -3.0],
  gather: [-1.75, -0.62, -6.25],
  pews: [0, -1.0, -1.6],
};
// Spots that are not tappable places but have a room: the tall window above
// the altar (Discover) and the altar itself (prayer requests).
const ROOM_SPOTS: Record<string, Vec3> = {
  window: [0, 1.7, -6.3],
  altar: [0, -0.4, -5.0],
};
export function projectFocus(aspect: number, view: ChurchView) {
  const { matrix } = churchCamera(aspect, view);
  const out = {} as Partial<Record<string, { x: number; y: number }>>;
  const spots: Record<string, Vec3> = { ...ROOM_SPOTS };
  (Object.keys(FOCUS) as ChurchPlace[]).forEach((key) => {
    spots[key] = FOCUS[key]!;
  });
  Object.entries(spots).forEach(([key, point]) => {
    const p = project(matrix, point);
    if (p) out[key] = p;
  });
  return out;
}

export function projectPlaces(
  aspect: number,
  view: ChurchView,
  protestant = false,
) {
  const anchors = placeAnchors(protestant);
  const { matrix } = churchCamera(aspect, view);
  const out = {} as Record<ChurchPlace, { x: number; y: number } | null>;
  (Object.keys(anchors) as ChurchPlace[]).forEach((key) => {
    out[key] = project(matrix, anchors[key]);
  });
  return out;
}

export function createChurchRenderer(
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
    const glow = compile(gl, GLOW_VERTEX, GLOW_FRAGMENT);
    programs.push(main.program, glow.program);
    shaders.push(...main.shaders, ...glow.shaders);
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

    const meshBuffer = gl.createBuffer(),
      glowBuffer = gl.createBuffer();
    if (!meshBuffer || !glowBuffer) throw Error("Mesh buffer unavailable");
    buffers.push(meshBuffer, glowBuffer);
    let mesh = new Float32Array(0),
      glowMesh = new Float32Array(0),
      built = "";
    const rebuild = (options: ChurchOptions) => {
      const key = `${options.adventWeek}:${options.litVotives}:${options.protestant ? 1 : 0}:${options.candlesAllowed ?? !options.protestant}:${options.orthodox ? 1 : 0}`;
      if (key === built) return;
      built = key;
      mesh = buildChurchMesh(options);
      glowMesh = buildGlowMesh(options);
      gl.bindBuffer(gl.ARRAY_BUFFER, meshBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, glowBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, glowMesh, gl.STATIC_DRAW);
    };
    const locate = (program: WebGLProgram) => ({
      mvp: gl.getUniformLocation(program, "uMVP"),
      time: gl.getUniformLocation(program, "uTime"),
      night: gl.getUniformLocation(program, "uNight"),
      votive: gl.getUniformLocation(program, "uVotive"),
      eye: gl.getUniformLocation(program, "uEye"),
      res: gl.getUniformLocation(program, "uRes"),
    });
    const mainU = locate(main.program),
      glowU = locate(glow.program);
    return {
      draw(
        time: number,
        night: number,
        view: ChurchView,
        options: ChurchOptions,
      ) {
        rebuild(options);
        const width = gl.drawingBufferWidth,
          height = gl.drawingBufferHeight;
        const camera = churchCamera(width / Math.max(height, 1), view);
        gl.viewport(0, 0, width, height);
        gl.clearColor(0.1, 0.08, 0.07, 1);
        gl.clearDepth(1);
        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(main.program);
        bindMesh(gl, main.program, mesh, meshBuffer);
        gl.uniformMatrix4fv(mainU.mvp, false, camera.matrix);
        gl.uniform1f(mainU.time, time);
        gl.uniform1f(mainU.night, night);
        gl.uniform1f(
          mainU.votive,
          (options.candlesAllowed ?? !options.protestant) ? 1 : 0,
        );
        gl.uniform3f(mainU.eye, camera.eye[0], camera.eye[1], camera.eye[2]);
        gl.uniform2f(mainU.res, width, height);
        gl.drawArrays(gl.TRIANGLES, 0, mesh.length / STRIDE);
        gl.useProgram(glow.program);
        bindMesh(gl, glow.program, glowMesh, glowBuffer);
        gl.uniformMatrix4fv(glowU.mvp, false, camera.matrix);
        gl.uniform1f(glowU.time, time);
        gl.uniform1f(glowU.night, night);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.depthMask(false);
        gl.drawArrays(gl.TRIANGLES, 0, glowMesh.length / STRIDE);
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
