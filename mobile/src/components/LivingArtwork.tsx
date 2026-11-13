import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet } from "react-native";
import { Asset } from "expo-asset";
import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { fragmentShader, vertexShader } from "../lib/living-art-shader";
import { releaseContext } from "../lib/gl-recovery";
import type { ChurchArt } from "../lib/church-art";

// A single textured quad keeps the sanctuary still while the fragment shader
// animates its flame shapes or natural window light.
export default function LivingArtwork({ art, source, running, night, still }: { art: ChurchArt; source: number; running: boolean; night: boolean; still: boolean }) {
  const context = useRef<ExpoWebGLRenderingContext | null>(null);
  const [ready, setReady] = useState(false);
  const frame = useRef<number | null>(null);
  const runningRef = useRef(running);
  const nightRef = useRef(night);
  const stillRef = useRef(still);
  const render = useRef<(() => void) | null>(null);
  const disposed = useRef(false);
  useEffect(() => { runningRef.current = running; if (running) render.current?.(); }, [running]);
  useEffect(() => { nightRef.current = night; stillRef.current = still; render.current?.(); }, [night, still]);
  useEffect(() => {
    disposed.current = false;
    return () => { disposed.current = true; if (frame.current !== null) cancelAnimationFrame(frame.current); releaseContext(context.current); context.current = null; };
  }, []);
  const create = useCallback(async (gl: ExpoWebGLRenderingContext) => {
    context.current = gl;
    try {
      const asset = Asset.fromModule(source);
      await asset.downloadAsync();
      if (disposed.current) return;
      let textureImage: TexImageSource;
      if (Platform.OS === "web") {
        const image = new window.Image(); image.src = asset.localUri || asset.uri;
        await image.decode(); textureImage = image;
      } else {
        if (!asset.localUri) throw new Error("Artwork unavailable");
        textureImage = { localUri: asset.localUri } as unknown as TexImageSource;
      }
      if (disposed.current) return;
      const compile = (type: number, code: string) => {
        const shader = gl.createShader(type); if (!shader) throw new Error("Shader unavailable");
        gl.shaderSource(shader, code); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error("Shader failed");
        return shader;
      };
      const vert = compile(gl.VERTEX_SHADER, vertexShader);
      const frag = compile(gl.FRAGMENT_SHADER, fragmentShader(art));
      const program = gl.createProgram(); if (!program) throw new Error("Program unavailable");
      gl.attachShader(program, vert); gl.attachShader(program, frag); gl.bindAttribLocation(program, 0, "position"); gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Artwork program failed");
      gl.useProgram(program);
      const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureImage);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform1i(gl.getUniformLocation(program, "picture"), 0);
      const visible = gl.getUniformLocation(program, "visible"), time = gl.getUniformLocation(program, "time"), nightUniform = gl.getUniformLocation(program, "night");
      let previous = 0, displayed = false;
      const tick = (now: number) => {
        frame.current = null;
        if (disposed.current || !runningRef.current) return;
        if (stillRef.current || now - previous >= 40) {
          previous = now;
          const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
          const scale = Math.max(w / 869, h / 1810);
          gl.viewport(0, 0, w, h); gl.uniform2f(visible, w / (869 * scale), h / (1810 * scale));
          gl.uniform1f(time, stillRef.current ? 0 : now / 1000); gl.uniform1f(nightUniform, nightRef.current ? 1 : 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.endFrameEXP();
          if (!displayed) { displayed = true; setReady(true); }
        }
        if (!stillRef.current) frame.current = requestAnimationFrame(tick);
      };
      render.current = () => { if (frame.current === null && runningRef.current) frame.current = requestAnimationFrame(tick); };
      render.current();
    } catch {
      // The original image underneath stays visible if the device cannot render GL.
    }
  }, [art, source]);
  return <GLView key={art} pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: ready ? 1 : 0 }]} onContextCreate={create} />;
}
