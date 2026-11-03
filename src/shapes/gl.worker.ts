/**
 * WebGL candidates: ONE shared WebGL context per page, living in a worker.
 * Every instance renders its program into the shared context, then the result is
 * copied into that instance's own 2D OffscreenCanvas. This avoids the per-page
 * WebGL context limit and pays shader compile cost once per program.
 */
import { run } from './loop';
import { BLOB, HEAD, RIBBON, TORUS } from './shaders';

const SRC: Record<string, string> = { blob: BLOB, torus: TORUS, ribbon: RIBBON };
const TONE: Record<string, number> = { paper: 0, dark: 1, accent: 2 };

let cv: OffscreenCanvas;
let gl: WebGLRenderingContext;
interface P {
  p: WebGLProgram;
  r: WebGLUniformLocation | null;
  t: WebGLUniformLocation | null;
  k: WebGLUniformLocation | null;
}
const progs: Record<string, P> = {};

function program(kind: string): P {
  const hit = progs[kind];
  if (hit) return hit;
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(
    p,
    sh(gl.VERTEX_SHADER, 'attribute vec2 a;void main(){gl_Position=vec4(a,0,1);}'),
  );
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, HEAD + (SRC[kind] ?? BLOB)));
  gl.bindAttribLocation(p, 0, 'a');
  gl.linkProgram(p);
  return (progs[kind] = {
    p,
    r: gl.getUniformLocation(p, 'R'),
    t: gl.getUniformLocation(p, 'T'),
    k: gl.getUniformLocation(p, 'K'),
  });
}

run<OffscreenCanvasRenderingContext2D>({
  init(i) {
    if (!gl) {
      cv = new OffscreenCanvas(1, 1);
      const ctx = cv.getContext('webgl', { antialias: false, premultipliedAlpha: true });
      // No WebGL: tell the host (it shows the poster) and end the worker.
      if (!ctx) {
        self.postMessage({ t: 'fail' });
        return self.close() as never;
      }
      gl = ctx;
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.clearColor(0, 0, 0, 0);
    }
    return i.c.getContext('2d')!;
  },
  frame(i, t) {
    const W = i.c.width;
    const H = i.c.height;
    if (cv.width < W) cv.width = W;
    if (cv.height < H) cv.height = H;
    const P = program(i.opt.gl ?? 'blob');
    gl.viewport(0, 0, W, H);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(P.p);
    gl.uniform2f(P.r, W, H);
    gl.uniform1f(P.t, t + i.id * 1.7);
    gl.uniform1f(P.k, TONE[i.opt.tone ?? 'paper'] ?? 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    i.s.clearRect(0, 0, W, H);
    i.s.drawImage(cv, 0, cv.height - H, W, H, 0, 0, W, H);
  },
});
