// A single votive candle in a stone alcove. The flame is procedural and
// flickers; lighting it warms the wax, the brass dish and the stone around it.
import {
  MeshBuilder,
  Material,
  Vec3,
  bindMesh,
  compile,
  lookAt,
  multiply,
  perspective,
  GLSL_COMMON,
  STRIDE,
} from "./gl-mesh";

const KIND = { stone: 2, brass: 1, wax: 5, wick: 4 };

function buildCandleMesh() {
  const mesh = new MeshBuilder();
  const stone: Material = { color: [0.66, 0.6, 0.53], kind: KIND.stone };
  const deep: Material = { color: [0.5, 0.45, 0.4], kind: KIND.stone };
  const brass: Material = { color: [0.78, 0.6, 0.3], kind: KIND.brass };
  const wax: Material = { color: [0.97, 0.93, 0.84], kind: KIND.wax };
  mesh.archRing(0.95, 4, 0.55, -1.15, -0.5, -0.4, stone);
  mesh.archRing(0.95, 1.05, 0.55, -1.15, -1.25, -0.5, deep);
  mesh.box(0, 0.4, -1.27, 2.2, 3.6, 0.05, deep);
  mesh.box(0, -1.2, -0.75, 2.4, 0.1, 1.1, stone);
  mesh.box(0, -1.1, -0.15, 2.6, 0.12, 0.6, stone);
  mesh.cylinder(0, -0.75, -1.15, -1.1, 0.3, brass, 40, 0.34);
  mesh.cylinder(0, -0.75, -1.1, -1.03, 0.34, brass, 40, 0.36);
  mesh.cylinder(0, -0.75, -1.03, 0.22, 0.17, wax, 40);
  mesh.torus(0, 0.215, -0.75, 0.155, 0.018, wax, 40, 8);
  mesh.cylinder(
    0,
    -0.75,
    0.22,
    0.31,
    0.009,
    { color: [0.12, 0.08, 0.06], kind: KIND.wick },
    8,
    0.006,
  );
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
uniform float uLit;
uniform float uTime;
uniform vec3 uEye;
uniform vec2 uRes;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vColor;
varying float vKind;
${GLSL_COMMON}
void main() {
  vec3 n = normalize(vNormal);
  if (!gl_FrontFacing) n = -n;
  vec3 p = vWorld;
  float flick = 0.9 + 0.06 * sin(uTime * 8.3) + 0.04 * sin(uTime * 13.1 + 0.7);
  vec3 flame = vec3(0.0, 0.47, -0.72);
  vec3 d = flame - p;
  float fall = 1.0 / (1.0 + 2.2 * dot(d, d));
  vec3 warm = vec3(1.0, 0.6, 0.27) * uLit * flick * 2.6 * fall * max(dot(n, normalize(d)), 0.0);
  vec3 ambient = mix(vec3(0.05, 0.045, 0.045), vec3(0.16, 0.15, 0.14), n.y * 0.5 + 0.5) * mix(1.3, 0.6, uLit)
    + vec3(0.14, 0.13, 0.12) * max(dot(n, normalize(vec3(0.2, 0.5, 1.0))), 0.0) * mix(1.0, 0.45, uLit);
  vec3 light = ambient + warm;
  vec3 color;
  if (vKind > 1.5 && vKind < 2.5) {
    vec2 uv = abs(n.y) > 0.5 ? p.xz : abs(n.x) > 0.5 ? p.zy : p.xy;
    float bh = 0.26;
    float row = floor(uv.y / bh);
    float x = uv.x + hash(vec2(row, 3.0)) * 0.8;
    float bw = 0.52;
    vec2 f = vec2(fract(x / bw) * bw, fract(uv.y / bh) * bh);
    float edge = min(min(f.x, bw - f.x), min(f.y, bh - f.y));
    vec3 base = lin(vColor) * (0.8 + 0.25 * hash(vec2(floor(x / bw), row))) * (0.75 + 0.4 * fbm(uv * 6.0));
    color = base * light * 2.2 * mix(0.45, 1.0, smoothstep(0.003, 0.01, edge));
  } else if (vKind < 1.5) {
    vec3 v = normalize(uEye - p);
    float sp = pow(max(dot(n, normalize(normalize(d) + v)), 0.0), 40.0) * uLit * flick;
    color = lin(vColor) * light * 1.6 + vec3(1.0, 0.75, 0.4) * sp * 1.6;
  } else if (vKind > 4.5) {
    float glowTop = exp(-max(0.0, 0.22 - p.y) * 2.4) * uLit * flick;
    color = lin(vColor) * light * 1.5 + vec3(1.0, 0.62, 0.3) * glowTop * 0.9;
  } else {
    color = lin(vColor) * light;
  }
  vec2 sc = gl_FragCoord.xy / uRes - 0.5;
  color *= 1.0 - 0.7 * dot(sc, sc);
  color = filmic(color);
  color += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) / 255.0;
  gl_FragColor = vec4(color, 1.0);
}`;

const GLOW_VERTEX = `
precision highp float;
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute float aKind;
uniform mat4 uMVP;
varying vec2 vUV;
varying float vShape;
void main() {
  vUV = aNormal.xy; vShape = aKind;
  gl_Position = uMVP * vec4(aPosition, 1.0);
}`;
const GLOW_FRAGMENT = `
precision highp float;
uniform float uLit;
uniform float uTime;
varying vec2 vUV;
varying float vShape;
void main() {
  float flick = 0.9 + 0.06 * sin(uTime * 8.3) + 0.04 * sin(uTime * 13.1 + 0.7);
  vec3 color;
  if (vShape < 0.5) {
    float r2 = dot(vUV, vUV);
    color = vec3(1.0, 0.6, 0.26) * exp(-r2 * 3.0) * (1.0 - smoothstep(0.7, 1.0, sqrt(r2))) * 0.55 * flick;
  } else {
    float y = vUV.y;
    float sway = sin(uTime * 6.1 + y * 2.5) * 0.05 + sin(uTime * 11.3) * 0.025;
    float x = vUV.x - sway * (y + 1.0) * 0.5;
    float width = 0.55 * sqrt(clamp((1.0 - y) * 0.5, 0.0, 1.0)) * smoothstep(-1.08, -0.45, y) * (0.94 + 0.06 * sin(uTime * 9.0));
    float d = abs(x) / max(width, 0.001);
    float body = 1.0 - smoothstep(0.55, 1.0, d);
    float core = (1.0 - smoothstep(0.0, 0.5, d)) * smoothstep(-0.9, -0.2, y) * (1.0 - smoothstep(0.1, 0.7, y));
    float base = (1.0 - smoothstep(0.0, 0.8, d)) * (1.0 - smoothstep(-0.95, -0.55, y)) * step(-1.0, y);
    color = vec3(1.0, 0.48, 0.12) * body * 0.9 + vec3(1.0, 0.92, 0.7) * core * 1.1 + vec3(0.25, 0.35, 1.0) * base * 0.5;
    color *= flick;
  }
  gl_FragColor = vec4(color * uLit, 1.0);
}`;

function buildGlow() {
  const data: number[] = [];
  const quad = (center: Vec3, w: number, h: number, shape: number) => {
    for (const [a, b] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, -1],
      [1, 1],
      [-1, 1],
    ])
      data.push(
        center[0] + a * w,
        center[1] + b * h,
        center[2],
        a,
        b,
        0,
        1,
        1,
        1,
        shape,
        0,
      );
  };
  quad([0, 0.42, -0.7], 1.1, 1.1, 0);
  quad([0, 0.52, -0.74], 0.1, 0.22, 1);
  return new Float32Array(data);
}

export function createCandleRenderer(gl: WebGLRenderingContext) {
  const buffers: WebGLBuffer[] = [];
  const programs: WebGLProgram[] = [];
  const shaders: WebGLShader[] = [];
  const dispose = () => {
    buffers.forEach((b) => gl.deleteBuffer(b));
    programs.forEach((p) => gl.deleteProgram(p));
    shaders.forEach((s) => gl.deleteShader(s));
  };
  try {
    const main = compile(gl, VERTEX, FRAGMENT);
    const glow = compile(gl, GLOW_VERTEX, GLOW_FRAGMENT);
    programs.push(main.program, glow.program);
    shaders.push(...main.shaders, ...glow.shaders);
    const mesh = buildCandleMesh(),
      glowMesh = buildGlow();
    const meshBuffer = bindMesh(gl, main.program, mesh);
    const glowBuffer = bindMesh(gl, glow.program, glowMesh);
    buffers.push(meshBuffer, glowBuffer);
    const at = (program: WebGLProgram, name: string) =>
      gl.getUniformLocation(program, name);
    return {
      draw(lit: number, time: number) {
        const width = gl.drawingBufferWidth,
          height = gl.drawingBufferHeight;
        const aspect = width / Math.max(height, 1);
        const eye: Vec3 = [0, 0.05, 3.2];
        const vertical = Math.min(
          1.0,
          2 * Math.atan(Math.tan(Math.atan(1.05 / 3.6)) / aspect),
        );
        const matrix = multiply(
          perspective(vertical, aspect, 0.05, 30),
          lookAt(eye, [0, -0.25, -0.75]),
        );
        gl.viewport(0, 0, width, height);
        gl.clearColor(0.05, 0.04, 0.04, 1);
        gl.clearDepth(1);
        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(main.program);
        bindMesh(gl, main.program, mesh, meshBuffer);
        gl.uniformMatrix4fv(at(main.program, "uMVP"), false, matrix);
        gl.uniform1f(at(main.program, "uLit"), lit);
        gl.uniform1f(at(main.program, "uTime"), time);
        gl.uniform3f(at(main.program, "uEye"), eye[0], eye[1], eye[2]);
        gl.uniform2f(at(main.program, "uRes"), width, height);
        gl.drawArrays(gl.TRIANGLES, 0, mesh.length / STRIDE);
        if (lit > 0.001) {
          gl.useProgram(glow.program);
          bindMesh(gl, glow.program, glowMesh, glowBuffer);
          gl.uniformMatrix4fv(at(glow.program, "uMVP"), false, matrix);
          gl.uniform1f(at(glow.program, "uLit"), lit);
          gl.uniform1f(at(glow.program, "uTime"), time);
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.ONE, gl.ONE);
          gl.depthMask(false);
          gl.drawArrays(gl.TRIANGLES, 0, glowMesh.length / STRIDE);
          gl.depthMask(true);
          gl.disable(gl.BLEND);
        }
        gl.flush();
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
