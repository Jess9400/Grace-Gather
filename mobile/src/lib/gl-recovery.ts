import { Platform } from "react-native";

// Browsers allow only a limited number of WebGL contexts and may drop one
// (for example when a phone locks or the tab is in the background). These
// helpers let a scene notice a lost context and release its own on unmount.
export function contextLost(gl: WebGLRenderingContext | null) {
  try {
    return !!gl && typeof gl.isContextLost === "function" && gl.isContextLost();
  } catch {
    return false;
  }
}

export function releaseContext(gl: WebGLRenderingContext | null) {
  if (Platform.OS !== "web" || !gl) return;
  try {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    // Already released.
  }
}
