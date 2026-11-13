import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = readFileSync(
  new URL("../src/lib/gl-mesh.ts", import.meta.url),
  "utf8",
);
const module = { exports: {} };
runInNewContext(
  ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  { module, exports: module.exports },
);

test("church mesh binds its attributes before linking and draws without synchronous location queries", () => {
  const calls = [];
  const program = {};
  const gl = {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    ARRAY_BUFFER: 5,
    STATIC_DRAW: 6,
    FLOAT: 7,
    createShader: () => ({}),
    shaderSource() {},
    compileShader() {},
    getShaderParameter: () => true,
    createProgram: () => program,
    attachShader() {},
    bindAttribLocation: (_program, index, name) =>
      calls.push(["bind", index, name]),
    linkProgram: () => calls.push(["link"]),
    getProgramParameter: () => true,
    createBuffer: () => ({}),
    bindBuffer() {},
    bufferData() {},
    enableVertexAttribArray: (index) => calls.push(["enable", index]),
    vertexAttribPointer: (index, size, _type, _normalized, stride, offset) =>
      calls.push(["pointer", index, size, stride, offset]),
    getAttribLocation: () => {
      throw new Error("unexpected synchronous query");
    },
  };
  const { compile, bindMesh } = module.exports;
  compile(gl, "vertex", "fragment");
  bindMesh(gl, program, new Float32Array(11));
  assert.deepEqual(calls.slice(0, 6), [
    ["bind", 0, "aPosition"],
    ["bind", 1, "aNormal"],
    ["bind", 2, "aColor"],
    ["bind", 3, "aKind"],
    ["bind", 4, "aPart"],
    ["link"],
  ]);
  assert.deepEqual(
    calls.filter(([type]) => type === "pointer"),
    [
      ["pointer", 0, 3, 44, 0],
      ["pointer", 1, 3, 44, 12],
      ["pointer", 2, 3, 44, 24],
      ["pointer", 3, 1, 44, 36],
      ["pointer", 4, 1, 44, 40],
    ],
  );
});
