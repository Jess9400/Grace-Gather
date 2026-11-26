import {
  MeshBuilder,
  bindMesh,
  compile,
  lookAt,
  multiply,
  perspective,
  project,
  STRIDE,
  type Vec3,
} from "./gl-mesh";
export type Terrain = {
  bounds: number[];
  size: number;
  heights: number[];
  land: number[];
};
export type AtlasPlace = {
  name: string;
  lon: number;
  lat: number;
  uncertain: boolean;
};
export type AtlasRegion = "levant" | "east" | "mediterranean";
export type AtlasCamera = { yaw: number; zoom: number; tilt: number };
export async function loadTerrain(region: AtlasRegion): Promise<Terrain> {
  if (region === "levant")
    return (await import("../generated/study-atlas/levant.json")).default;
  if (region === "east")
    return (await import("../generated/study-atlas/east.json")).default;
  return (await import("../generated/study-atlas/mediterranean.json")).default;
}
export async function loadAtlasPlaces(book: string, terrain: Terrain) {
  const all = (await import("../generated/study-atlas/places.json"))
    .default as Record<string, AtlasPlace[]>;
  const [w, s, e, n] = terrain.bounds;
  const grouped = new Map<string, AtlasPlace[]>();
  for (const p of all[book] ?? []) {
    if (p.lon < w || p.lon > e || p.lat < s || p.lat > n) continue;
    const name = p.name.split(" / ")[0];
    const rows = grouped.get(name) ?? [];
    if (!rows.some((r) => r.lon === p.lon && r.lat === p.lat))
      rows.push({ ...p });
    grouped.set(name, rows);
  }
  return [...grouped.values()]
    .flatMap((rows) => rows.map((p) => ({ ...p, uncertain: p.uncertain || rows.length > 1 })))
    .sort((a, b) => a.name.localeCompare(b.name));
}
export function terrainPoint(t: Terrain, lon: number, lat: number): Vec3 {
  const [w, s, e, n] = t.bounds;
  const x = Math.max(
    0,
    Math.min(t.size - 1, Math.round(((lon - w) / (e - w)) * (t.size - 1))),
  );
  const y = Math.max(
    0,
    Math.min(t.size - 1, Math.round(((n - lat) / (n - s)) * (t.size - 1))),
  );
  const metres = (e - w) * 111320 * Math.cos((((s + n) / 2) * Math.PI) / 180);
  return [
    ((lon - (w + e) / 2) / (e - w)) * 3,
    ((t.heights[y * t.size + x] ?? 0) / metres) * 3 * 12,
    (-(lat - (s + n) / 2) /
      (e - w) /
      Math.cos((((s + n) / 2) * Math.PI) / 180)) *
      3,
  ];
}
export function atlasMatrix(aspect: number, c: AtlasCamera) {
  const distance = 4.5 / c.zoom;
  return multiply(
    perspective(0.85, aspect, 0.1, 50),
    lookAt(
      [Math.sin(c.yaw) * distance, 2.3 + c.tilt, Math.cos(c.yaw) * distance],
      [0, 0, 0],
    ),
  );
}
export function atlasPlaceProjection(
  t: Terrain,
  p: AtlasPlace,
  aspect: number,
  c: AtlasCamera,
) {
  const point = terrainPoint(t, p.lon, p.lat);
  point[1] += 0.035;
  return project(atlasMatrix(aspect, c), point);
}
export function createAtlasRenderer(gl: WebGLRenderingContext, t: Terrain) {
  const mesh = new MeshBuilder();
  const [w, s, e, n] = t.bounds;
  const point = (x: number, y: number) =>
    terrainPoint(
      t,
      w + ((e - w) * x) / (t.size - 1),
      n - ((n - s) * y) / (t.size - 1),
    );
  for (let y = 0; y < t.size - 1; y++)
    for (let x = 0; x < t.size - 1; x++) {
      const index = y * t.size + x;
      const h = Math.max(0, Math.min(1, t.heights[index] / 2500));
      const color: Vec3 = t.land[index]
        ? [0.43 + h * 0.25, 0.37 + h * 0.2, 0.25 + h * 0.19]
        : [0.11, 0.22, 0.27];
      mesh.quad(
        point(x, y),
        point(x, y + 1),
        point(x + 1, y + 1),
        point(x + 1, y),
        { color, kind: 0 },
      );
    }
  const { program, shaders } = compile(
    gl,
    `attribute vec3 aPosition;attribute vec3 aNormal;attribute vec3 aColor;uniform mat4 uMVP;varying vec3 vColor;void main(){float light=.6+.4*max(0.,dot(normalize(aNormal),normalize(vec3(-.4,1.,.4))));vColor=aColor*light;gl_Position=uMVP*vec4(aPosition,1.);}`,
    `precision mediump float;varying vec3 vColor;void main(){gl_FragColor=vec4(vColor,1.);}`,
  );
  const data = new Float32Array(mesh.data);
  gl.useProgram(program);
  const buffer = bindMesh(gl, program, data);
  const mvp = gl.getUniformLocation(program, "uMVP");
  return {
    draw(width: number, height: number, c: AtlasCamera) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clearColor(0.106, 0.086, 0.071, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.useProgram(program);
      bindMesh(gl, program, data, buffer);
      gl.uniformMatrix4fv(mvp, false, atlasMatrix(width / height, c));
      gl.drawArrays(gl.TRIANGLES, 0, data.length / STRIDE);
      gl.flush();
    },
    dispose() {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      for (const shader of shaders) gl.deleteShader(shader);
    },
  };
}
