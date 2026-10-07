// ltem-sim.js — interactive Lorentz TEM demo (anywidget-style ES module: `export default { render({ model, el }) }`).
//
// Pipeline (all live in the browser on a 256 x 256 grid, uniform magnetization through the film thickness):
//   1. Build a magnetization texture m(x, y) (skyrmion, antiskyrmion, skyrmion lattice, vortex, helix).
//   2. Tilt the sample about the x axis: the beam sees m_y cos(a) + m_z sin(a) as the in-plane y component.
//   3. Magnetic phase via the Mansuroglu / Beleggia Fourier method (as in PyLorentz):
//        phi(k) = i * pi * B0 * t / Phi0 * (m_x k_y - m_y k_x) / k^2
//   4. Fresnel images at +/- defocus: I = |F^-1[ F[exp(i phi)] * exp(-i pi lambda df k^2) * E(k) ]|^2, plus shot noise.
//   5. Transport-of-intensity (TIE) reconstruction of the phase from the +/- defocus pair, shown as an induction map.
//
// Author: Arthur McCray. Physics core is exported (`simulate`, `makeTexture`, ...) for testing.

// ---------------------------------------------------------------------------
// Constants and grid
// ---------------------------------------------------------------------------
const N = 256; // grid size (pixels)
const DX = 2e-9; // pixel size (m)
const PHI0 = 2.067833848e-15; // magnetic flux quantum h/2e (T m^2)
const B0 = 0.3; // saturation induction mu0 * Ms (T)
const THICKNESS = 40e-9; // film thickness (m)
const LAMBDA = 2.508e-12; // electron wavelength at 200 kV (m)
const THETA_C = 5e-6; // beam divergence (rad), damps high frequencies at large defocus
const TIE_QC = 0.15 / (N * DX); // Tikhonov regularization for the TIE inverse Laplacian (1/m)

// ---------------------------------------------------------------------------
// FFT: radix-2, in place, split real/imaginary arrays, precomputed twiddles
// ---------------------------------------------------------------------------
const REV = new Uint32Array(N);
for (let i = 1, j = 0; i < N; i++) {
  let bit = N >> 1;
  for (; j & bit; bit >>= 1) j ^= bit;
  j ^= bit;
  REV[i] = j;
}
const COS = new Float64Array(N / 2);
const SIN = new Float64Array(N / 2);
for (let i = 0; i < N / 2; i++) {
  COS[i] = Math.cos((-2 * Math.PI * i) / N);
  SIN[i] = Math.sin((-2 * Math.PI * i) / N);
}

function fft1(re, im, off, stride, inverse) {
  for (let i = 0; i < N; i++) {
    const j = REV[i];
    if (i < j) {
      const a = off + i * stride;
      const b = off + j * stride;
      let t = re[a];
      re[a] = re[b];
      re[b] = t;
      t = im[a];
      im[a] = im[b];
      im[b] = t;
    }
  }
  const sgn = inverse ? -1 : 1;
  for (let len = 2; len <= N; len <<= 1) {
    const half = len >> 1;
    const step = N / len;
    for (let i = 0; i < N; i += len) {
      for (let j = 0; j < half; j++) {
        const wr = COS[j * step];
        const wi = sgn * SIN[j * step];
        const a = off + (i + j) * stride;
        const b = off + (i + j + half) * stride;
        const tr = wr * re[b] - wi * im[b];
        const ti = wr * im[b] + wi * re[b];
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
      }
    }
  }
}

export function fft2(re, im, inverse = false) {
  for (let r = 0; r < N; r++) fft1(re, im, r * N, 1, inverse);
  for (let c = 0; c < N; c++) fft1(re, im, c, N, inverse);
  if (inverse) {
    const s = 1 / (N * N);
    for (let i = 0; i < N * N; i++) {
      re[i] *= s;
      im[i] *= s;
    }
  }
}

// Spatial frequencies (1/m) in FFT order.
const KF = new Float64Array(N);
for (let i = 0; i < N; i++) KF[i] = (i < N / 2 ? i : i - N) / (N * DX);

// ---------------------------------------------------------------------------
// Magnetization textures
// ---------------------------------------------------------------------------

// Polar angle of a skyrmion with radius R and wall width w: pi in the core, 0 outside.
function skTheta(r, R, w) {
  return 2 * Math.atan2(Math.sinh(R / w), Math.sinh(r / w));
}

/**
 * Build a magnetization texture. Returns { mx, my, mz } as Float64Array(N*N), row-major (y, x).
 * opts: { texture, radius (m), helicity (rad), cx, cy (m, offset from center) }
 */
export function makeTexture(opts) {
  const { texture = "skyrmion", radius = 60e-9, helicity = Math.PI / 2, cx = 0, cy = 0 } = opts;
  const mx = new Float64Array(N * N);
  const my = new Float64Array(N * N);
  const mz = new Float64Array(N * N);
  const w = Math.max(radius * 0.35, 4e-9);
  const L = N * DX;

  // Hexagonal lattice sites inside a circular patch (uniform background outside avoids periodic seams).
  let sites = null;
  if (texture === "lattice") {
    const a = radius * 2.7;
    const patch = 0.42 * L;
    sites = [];
    const nr = Math.ceil(patch / ((a * Math.sqrt(3)) / 2)) + 1;
    for (let j = -nr; j <= nr; j++) {
      for (let i = -nr - 1; i <= nr + 1; i++) {
        const sx = (i + (j & 1 ? 0.5 : 0)) * a + cx;
        const sy = (j * a * Math.sqrt(3)) / 2 + cy;
        if (Math.hypot(sx - cx, sy - cy) < patch) sites.push([sx, sy]);
      }
    }
  }

  for (let iy = 0; iy < N; iy++) {
    const y = (iy - N / 2) * DX;
    for (let ix = 0; ix < N; ix++) {
      const x = (ix - N / 2) * DX;
      const p = iy * N + ix;
      let theta = 0;
      let phi = 0;
      if (texture === "skyrmion" || texture === "antiskyrmion") {
        const dx = x - cx;
        const dy = y - cy;
        const r = Math.hypot(dx, dy);
        theta = skTheta(r, radius, w);
        const az = Math.atan2(dy, dx);
        phi = (texture === "antiskyrmion" ? -az : az) + helicity;
      } else if (texture === "lattice") {
        let best = Infinity;
        let bx = 0;
        let by = 0;
        for (const s of sites) {
          const d = (x - s[0]) ** 2 + (y - s[1]) ** 2;
          if (d < best) {
            best = d;
            bx = s[0];
            by = s[1];
          }
        }
        const r = Math.sqrt(best);
        // Outside the patch the nearest site is far away and the profile decays to the uniform background.
        theta = skTheta(r, radius, w);
        phi = Math.atan2(y - by, x - bx) + helicity;
      } else if (texture === "vortex") {
        const dx = x - cx;
        const dy = y - cy;
        const r = Math.hypot(dx, dy);
        const Rd = Math.max(radius * 3, 60e-9);
        if (r > Rd) continue; // nonmagnetic outside the disk
        const rc = 10e-9; // vortex core radius
        theta = Math.PI / 2 - (Math.PI / 2) * Math.exp(-(r * r) / (rc * rc)); // core points up
        phi = Math.atan2(dy, dx) + helicity;
      } else if (texture === "helix") {
        // Bloch-type helix propagating along x, snapped to a commensurate period.
        const period = L / Math.max(1, Math.round(L / (radius * 3)));
        const ang = (2 * Math.PI * (x - cx)) / period;
        mx[p] = Math.sin(ang) * Math.cos(helicity); // gamma = 0: Neel-type cycloid
        my[p] = Math.sin(ang) * Math.sin(helicity); // gamma = 90 deg: Bloch-type helix
        mz[p] = Math.cos(ang);
        continue;
      }
      const st = Math.sin(theta);
      mx[p] = st * Math.cos(phi);
      my[p] = st * Math.sin(phi);
      mz[p] = Math.cos(theta);
    }
  }
  return { mx, my, mz };
}

// ---------------------------------------------------------------------------
// Physics
// ---------------------------------------------------------------------------

/** Magnetic phase shift (rad) of a texture tilted by `tilt` (rad) about the x axis. */
export function magneticPhase(m, tilt = 0) {
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  const are = new Float64Array(N * N);
  const aim = new Float64Array(N * N);
  const bre = new Float64Array(N * N);
  const bim = new Float64Array(N * N);
  for (let i = 0; i < N * N; i++) {
    are[i] = m.mx[i];
    bre[i] = m.my[i] * ct + m.mz[i] * st;
  }
  fft2(are, aim);
  fft2(bre, bim);
  const pre = (Math.PI * B0 * THICKNESS) / PHI0 / Math.max(ct, 0.2); // longer path through a tilted film
  const ore = new Float64Array(N * N);
  const oim = new Float64Array(N * N);
  for (let iy = 0; iy < N; iy++) {
    const ky = KF[iy];
    for (let ix = 0; ix < N; ix++) {
      const kx = KF[ix];
      const k2 = kx * kx + ky * ky;
      const p = iy * N + ix;
      if (k2 === 0) continue;
      // c = (m_x k_y - m_y k_x) / k^2 ; phi = i * pre * c
      const cre = (are[p] * ky - bre[p] * kx) / k2;
      const cim = (aim[p] * ky - bim[p] * kx) / k2;
      ore[p] = -pre * cim;
      oim[p] = pre * cre;
    }
  }
  fft2(ore, oim, true);
  return ore; // real part is the phase
}

/** Fourier transform of the exit wave exp(i phi). */
export function exitWaveFT(phase) {
  const re = new Float64Array(N * N);
  const im = new Float64Array(N * N);
  for (let i = 0; i < N * N; i++) {
    re[i] = Math.cos(phase[i]);
    im[i] = Math.sin(phase[i]);
  }
  fft2(re, im);
  return { re, im };
}

/** Defocused intensity from the exit-wave FT. `df` in meters. */
export function fresnelImage(W, df) {
  const re = new Float64Array(N * N);
  const im = new Float64Array(N * N);
  for (let iy = 0; iy < N; iy++) {
    const ky = KF[iy];
    for (let ix = 0; ix < N; ix++) {
      const kx = KF[ix];
      const k2 = kx * kx + ky * ky;
      const p = iy * N + ix;
      const chi = -Math.PI * LAMBDA * df * k2;
      const env = Math.exp(-((Math.PI * THETA_C * df) ** 2) * k2);
      const c = Math.cos(chi) * env;
      const s = Math.sin(chi) * env;
      re[p] = W.re[p] * c - W.im[p] * s;
      im[p] = W.re[p] * s + W.im[p] * c;
    }
  }
  fft2(re, im, true);
  const I = new Float64Array(N * N);
  for (let i = 0; i < N * N; i++) I[i] = re[i] * re[i] + im[i] * im[i];
  return I;
}

// Small seeded PRNG so noise is stable while dragging other sliders.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Add shot noise for `dose` electrons per pixel (Gaussian approximation to Poisson). Infinite dose = no noise. */
export function addNoise(I, dose, seed = 1) {
  if (!isFinite(dose)) return I;
  const rand = mulberry32(seed);
  const out = new Float64Array(I.length);
  for (let i = 0; i < I.length; i += 2) {
    const u1 = Math.max(rand(), 1e-12);
    const u2 = rand();
    const r = Math.sqrt(-2 * Math.log(u1));
    const g0 = r * Math.cos(2 * Math.PI * u2);
    const g1 = r * Math.sin(2 * Math.PI * u2);
    out[i] = Math.max(0, I[i] + g0 * Math.sqrt(Math.max(I[i], 0) / dose));
    if (i + 1 < I.length) out[i + 1] = Math.max(0, I[i + 1] + g1 * Math.sqrt(Math.max(I[i + 1], 0) / dose));
  }
  return out;
}

/**
 * TIE phase reconstruction from images at +df and -df, assuming roughly uniform in-focus intensity:
 *   lap(phi) = -(2 pi / lambda) dI/dz / I0   ->   phi(k) = (2 pi / lambda) F[dI/dz] / (I0 * 4 pi^2 (k^2 + qc^2))
 */
export function tiePhase(Ip, Im, df) {
  let I0 = 0;
  for (let i = 0; i < N * N; i++) I0 += Ip[i] + Im[i];
  I0 /= 2 * N * N;
  const re = new Float64Array(N * N);
  const im = new Float64Array(N * N);
  for (let i = 0; i < N * N; i++) re[i] = (Ip[i] - Im[i]) / (2 * df);
  fft2(re, im);
  const k0 = (2 * Math.PI) / LAMBDA;
  const q2 = TIE_QC * TIE_QC;
  for (let iy = 0; iy < N; iy++) {
    const ky = KF[iy];
    for (let ix = 0; ix < N; ix++) {
      const kx = KF[ix];
      const k2 = kx * kx + ky * ky;
      const p = iy * N + ix;
      if (k2 === 0) {
        re[p] = 0;
        im[p] = 0;
        continue;
      }
      const f = (k0 * k2) / (I0 * 4 * Math.PI * Math.PI * (k2 + q2) * (k2 + q2));
      re[p] *= f;
      im[p] *= f;
    }
  }
  fft2(re, im, true);
  return re;
}

/** In-plane induction (arbitrary units) from a phase map: B ~ (-d(phi)/dy, d(phi)/dx), central differences. */
export function inductionFromPhase(phase) {
  const bx = new Float64Array(N * N);
  const by = new Float64Array(N * N);
  for (let iy = 0; iy < N; iy++) {
    const yp = ((iy + 1) % N) * N;
    const ym = ((iy - 1 + N) % N) * N;
    for (let ix = 0; ix < N; ix++) {
      const xp = (ix + 1) % N;
      const xm = (ix - 1 + N) % N;
      const p = iy * N + ix;
      bx[p] = -(phase[yp + ix] - phase[ym + ix]) / 2;
      by[p] = (phase[iy * N + xp] - phase[iy * N + xm]) / 2;
    }
  }
  return { bx, by };
}

/** Full forward simulation and reconstruction. */
export function simulate(params) {
  const { tilt = 0, defocus = 1e-3, dose = Infinity } = params;
  const m = makeTexture(params);
  const phase = magneticPhase(m, tilt);
  const W = exitWaveFT(phase);
  const df = Math.abs(defocus) || 1e-6;
  const Ip = addNoise(fresnelImage(W, df), dose, 11);
  const Im = addNoise(fresnelImage(W, -df), dose, 23);
  const image = defocus >= 0 ? Ip : Im;
  const tie = tiePhase(Ip, Im, df);
  return { m, phase, image, tie, B: inductionFromPhase(tie), Btrue: inductionFromPhase(phase) };
}

// ---------------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------------
function hsl2rgb(h, s, l) {
  // h in [0, 1)
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h * 12) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

function hsv2rgb(h, s, v) {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  const c = [
    [v, t, p],
    [q, v, p],
    [p, v, t],
    [p, q, v],
    [t, p, v],
    [v, p, q],
  ][((i % 6) + 6) % 6];
  return [c[0] * 255, c[1] * 255, c[2] * 255];
}

const TAU = 2 * Math.PI;
const hueOf = (x, y) => (((Math.atan2(y, x) / TAU) % 1) + 1) % 1;

function drawMagnetization(ctx, m) {
  const img = ctx.createImageData(N, N);
  for (let i = 0; i < N * N; i++) {
    const inPlane = Math.hypot(m.mx[i], m.my[i]);
    const mag = Math.hypot(inPlane, m.mz[i]);
    let rgb;
    if (mag < 1e-6) rgb = [128, 128, 128];
    else rgb = hsl2rgb(hueOf(m.mx[i], m.my[i]), 1, (1 + m.mz[i]) / 2);
    img.data.set([rgb[0], rgb[1], rgb[2], 255], 4 * i);
  }
  ctx.putImageData(img, 0, 0);
}

function percentile(arr, q) {
  const s = Float64Array.from(arr).sort();
  return s[Math.min(s.length - 1, Math.max(0, Math.floor(q * (s.length - 1))))];
}

function drawGray(ctx, a, lo, hi) {
  const img = ctx.createImageData(N, N);
  const span = hi - lo || 1;
  for (let i = 0; i < N * N; i++) {
    const v = Math.max(0, Math.min(255, ((a[i] - lo) / span) * 255));
    img.data.set([v, v, v, 255], 4 * i);
  }
  ctx.putImageData(img, 0, 0);
}

function drawInduction(ctx, B) {
  const mags = new Float64Array(N * N);
  for (let i = 0; i < N * N; i++) mags[i] = Math.hypot(B.bx[i], B.by[i]);
  const top = percentile(mags, 0.995) || 1;
  const img = ctx.createImageData(N, N);
  for (let i = 0; i < N * N; i++) {
    const rgb = hsv2rgb(hueOf(B.bx[i], B.by[i]), 1, Math.min(1, mags[i] / top));
    img.data.set([rgb[0], rgb[1], rgb[2], 255], 4 * i);
  }
  ctx.putImageData(img, 0, 0);
}

function drawScaleBar(ctx, nm) {
  const px = (nm * 1e-9) / DX;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(N - px - 14, N - 22, px + 10, 16);
  ctx.fillStyle = "#fff";
  ctx.fillRect(N - px - 9, N - 12, px, 3);
  ctx.font = "9px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${nm} nm`, N - px / 2 - 9, N - 14);
  ctx.restore();
}

function drawColorWheel(ctx, x0, y0, r, mode) {
  const img = ctx.getImageData(x0 - r, y0 - r, 2 * r, 2 * r);
  for (let j = 0; j < 2 * r; j++) {
    for (let i = 0; i < 2 * r; i++) {
      const dx = i - r + 0.5;
      const dy = j - r + 0.5;
      const d = Math.hypot(dx, dy) / r;
      if (d > 1) continue;
      const h = hueOf(dx, dy);
      const rgb = mode === "hsl" ? hsl2rgb(h, 1, 0.5) : hsv2rgb(h, 1, d);
      img.data.set([rgb[0], rgb[1], rgb[2], 255], 4 * (j * 2 * r + i));
    }
  }
  ctx.putImageData(img, x0 - r, y0 - r);
}

// ---------------------------------------------------------------------------
// Widget
// ---------------------------------------------------------------------------
const TEXTURES = [
  ["skyrmion", "Skyrmion"],
  ["lattice", "Skyrmion lattice"],
  ["antiskyrmion", "Antiskyrmion"],
  ["vortex", "Vortex (disk)"],
  ["helix", "Helical stripes"],
];

const CSS = `
.ltem { font-family: inherit; color: inherit; margin: 1rem 0 2rem; }
.ltem-controls { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 0.6rem 1.4rem; margin-bottom: 1rem; }
.ltem-controls label { display: flex; flex-direction: column; font-size: 0.85rem; gap: 0.15rem; }
.ltem-controls .ltem-val { opacity: 0.7; font-variant-numeric: tabular-nums; }
.ltem-controls input[type=range] { width: 100%; accent-color: var(--global-theme-color, #2698ba); }
.ltem-controls select { padding: 0.2rem; border-radius: 4px; border: 1px solid var(--global-divider-color, #ccc);
  background: var(--global-bg-color, #fff); color: inherit; }
.ltem-buttons { display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: end; }
.ltem-buttons button { font-size: 0.8rem; padding: 0.2rem 0.6rem; border-radius: 4px; cursor: pointer;
  border: 1px solid var(--global-theme-color, #2698ba); background: transparent; color: var(--global-theme-color, #2698ba); }
.ltem-buttons button:hover { background: var(--global-theme-color, #2698ba); color: #fff; }
.ltem-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.8rem; }
@media (min-width: 1100px) { .ltem-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.ltem-panel canvas { width: 100%; aspect-ratio: 1; display: block; border-radius: 4px; touch-action: none; }
.ltem-panel canvas.ltem-drag { cursor: grab; }
.ltem-panel .ltem-cap { font-size: 0.8rem; margin-top: 0.3rem; line-height: 1.3; }
.ltem-panel .ltem-cap b { display: block; font-size: 0.85rem; }
.ltem-note { font-size: 0.8rem; opacity: 0.75; margin-top: 0.6rem; min-height: 1.2em; }
`;

function render({ model, el }) {
  const opt = (k, d) => {
    try {
      const v = model && model.get && model.get(k);
      return v == null ? d : v;
    } catch (e) {
      return d;
    }
  };

  if (!document.getElementById("ltem-style")) {
    const style = document.createElement("style");
    style.id = "ltem-style";
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  const state = {
    texture: opt("texture", "skyrmion"),
    radius: 60e-9,
    helicity: Math.PI / 2,
    tilt: 0,
    defocus: 0.5e-3,
    logDose: 5, // 5 = noise-free
    cx: 0,
    cy: 0,
  };

  const root = document.createElement("div");
  root.className = "ltem";
  root.innerHTML = `
    <div class="ltem-controls">
      <label>Magnetic texture
        <select data-k="texture">${TEXTURES.map(([v, t]) => `<option value="${v}">${t}</option>`).join("")}</select>
      </label>
      <label>Helicity γ <span class="ltem-val" data-v="helicity"></span>
        <input type="range" data-k="helicity" min="0" max="360" step="5">
      </label>
      <label>Size <span class="ltem-val" data-v="radius"></span>
        <input type="range" data-k="radius" min="25" max="110" step="1">
      </label>
      <label>Sample tilt <span class="ltem-val" data-v="tilt"></span>
        <input type="range" data-k="tilt" min="-35" max="35" step="1">
      </label>
      <label>Defocus Δf <span class="ltem-val" data-v="defocus"></span>
        <input type="range" data-k="defocus" min="-2" max="2" step="0.05">
      </label>
      <label>Electron dose <span class="ltem-val" data-v="logDose"></span>
        <input type="range" data-k="logDose" min="1" max="5" step="0.1">
      </label>
      <div class="ltem-buttons">
        <button data-preset="bloch" title="γ = 90°: in-plane spins circulate around the core">Bloch</button>
        <button data-preset="neel" title="γ = 0°: in-plane spins point radially outward">Néel</button>
        <button data-preset="center">Recenter</button>
      </div>
    </div>
    <div class="ltem-grid">
      <div class="ltem-panel"><canvas data-c="m" class="ltem-drag" width="${N}" height="${N}"></canvas>
        <div class="ltem-cap"><b>Magnetization</b>Color: in-plane direction. White/black: pointing up/down. Drag to move.</div></div>
      <div class="ltem-panel"><canvas data-c="phase" width="${N}" height="${N}"></canvas>
        <div class="ltem-cap"><b>Electron phase shift</b>What the electron wave picks up passing through the film. Not directly visible.</div></div>
      <div class="ltem-panel"><canvas data-c="img" class="ltem-drag" width="${N}" height="${N}"></canvas>
        <div class="ltem-cap"><b>Lorentz TEM image</b>Fresnel contrast appears only out of focus. Flip the defocus sign and the contrast inverts.</div></div>
      <div class="ltem-panel"><canvas data-c="tie" width="${N}" height="${N}"></canvas>
        <div class="ltem-cap"><b>TIE reconstruction</b>Induction map recovered from the ±Δf image pair. Color: field direction.</div></div>
    </div>
    <div class="ltem-note"></div>`;
  el.appendChild(root);

  const $ = (s) => root.querySelector(s);
  const ctx = {};
  for (const c of ["m", "phase", "img", "tie"]) ctx[c] = $(`canvas[data-c="${c}"]`).getContext("2d");
  const note = $(".ltem-note");

  const inputs = {
    texture: $('[data-k="texture"]'),
    helicity: $('[data-k="helicity"]'),
    radius: $('[data-k="radius"]'),
    tilt: $('[data-k="tilt"]'),
    defocus: $('[data-k="defocus"]'),
    logDose: $('[data-k="logDose"]'),
  };
  const deg = (r) => (r * 180) / Math.PI;

  function syncInputs() {
    inputs.texture.value = state.texture;
    inputs.helicity.value = Math.round(deg(state.helicity));
    inputs.radius.value = Math.round(state.radius * 1e9);
    inputs.tilt.value = Math.round(deg(state.tilt));
    inputs.defocus.value = (state.defocus * 1e3).toFixed(2);
    inputs.logDose.value = state.logDose;
    labels();
  }

  function labels() {
    const h = Math.round(deg(state.helicity)) % 360;
    const kind = h % 180 === 0 ? " (Néel)" : h % 180 === 90 ? " (Bloch)" : "";
    root.querySelector('[data-v="helicity"]').textContent = `${h}°${kind}`;
    root.querySelector('[data-v="radius"]').textContent = `${Math.round(state.radius * 1e9)} nm`;
    root.querySelector('[data-v="tilt"]').textContent = `${Math.round(deg(state.tilt))}°`;
    const d = state.defocus * 1e3;
    root.querySelector('[data-v="defocus"]').textContent = Math.abs(d) < 0.01 ? "0 (in focus)" : `${d > 0 ? "+" : "−"}${Math.abs(d).toFixed(2)} mm`;
    root.querySelector('[data-v="logDose"]').textContent =
      state.logDose >= 5 ? "noise-free" : `${Math.round(10 ** state.logDose).toLocaleString()} e⁻/px`;
  }

  // Expensive stages are cached by the parameters they depend on.
  let cacheM = null;
  let keyM = "";
  let cacheW = null;
  let keyW = "";

  function compute() {
    const kM = [state.texture, state.radius, state.helicity, state.cx, state.cy].join();
    if (kM !== keyM) {
      cacheM = makeTexture(state);
      keyM = kM;
      keyW = "";
    }
    const kW = kM + "|" + state.tilt;
    let phase;
    if (kW !== keyW) {
      phase = magneticPhase(cacheM, state.tilt);
      cacheW = { phase, W: exitWaveFT(phase) };
      keyW = kW;
    }
    phase = cacheW.phase;
    const dose = state.logDose >= 5 ? Infinity : 10 ** state.logDose;
    const df = Math.max(Math.abs(state.defocus), 1e-6);
    const Ip = addNoise(fresnelImage(cacheW.W, df), dose, 11);
    const Im = addNoise(fresnelImage(cacheW.W, -df), dose, 23);
    const image = state.defocus >= 0 ? Ip : Im;

    drawMagnetization(ctx.m, cacheM);
    drawColorWheel(ctx.m, N - 18, 18, 13, "hsl");

    let pmin = Infinity;
    let pmax = -Infinity;
    for (let i = 0; i < N * N; i++) {
      if (phase[i] < pmin) pmin = phase[i];
      if (phase[i] > pmax) pmax = phase[i];
    }
    drawGray(ctx.phase, phase, pmin, pmax);
    const range = pmax - pmin;
    ctx.phase.save();
    ctx.phase.fillStyle = "rgba(0,0,0,0.55)";
    ctx.phase.fillRect(4, 4, 92, 16);
    ctx.phase.fillStyle = "#fff";
    ctx.phase.font = "10px system-ui, sans-serif";
    ctx.phase.fillText(`range ${range.toFixed(2)} rad`, 9, 15);
    ctx.phase.restore();

    let mean = 0;
    for (let i = 0; i < N * N; i++) mean += image[i];
    mean /= N * N;
    let sd = 0;
    for (let i = 0; i < N * N; i++) sd += (image[i] - mean) ** 2;
    sd = Math.sqrt(sd / (N * N)) || 1e-3;
    const half = Math.max(3 * sd, 0.02);
    drawGray(ctx.img, image, mean - half, mean + half);
    drawScaleBar(ctx.img, 100);

    if (Math.abs(state.defocus) < 0.01e-3) {
      ctx.tie.fillStyle = "#000";
      ctx.tie.fillRect(0, 0, N, N);
      ctx.tie.fillStyle = "#bbb";
      ctx.tie.font = "12px system-ui, sans-serif";
      ctx.tie.textAlign = "center";
      ctx.tie.fillText("Needs nonzero defocus", N / 2, N / 2);
      ctx.tie.textAlign = "start";
    } else {
      drawInduction(ctx.tie, inductionFromPhase(tiePhase(Ip, Im, df)));
      drawColorWheel(ctx.tie, N - 18, 18, 13, "hsv");
    }

    // Context-sensitive hints for the most instructive situations.
    const h = Math.round(deg(state.helicity)) % 180;
    const isNeelLike = (state.texture === "skyrmion" || state.texture === "lattice") && (h < 15 || h > 165);
    if (isNeelLike && Math.abs(deg(state.tilt)) < 3) {
      note.textContent =
        "Néel skyrmions are invisible in Lorentz TEM at zero tilt: their magnetic field has no curl along the beam. Try tilting the sample.";
    } else if (range < 0.05) {
      note.textContent = "This texture produces almost no phase shift in this geometry.";
    } else if (dose < 300) {
      note.textContent =
        "At low dose, shot noise in the images propagates straight into the reconstruction. This is one motivation for machine-learning priors.";
    } else {
      note.textContent = "";
    }
  }

  let pending = false;
  function schedule() {
    labels();
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      compute();
    });
  }

  inputs.texture.addEventListener("change", () => {
    state.texture = inputs.texture.value;
    if (state.texture === "lattice") state.radius = Math.min(state.radius, 35e-9);
    state.cx = 0;
    state.cy = 0;
    syncInputs();
    schedule();
  });
  inputs.helicity.addEventListener("input", () => {
    state.helicity = (+inputs.helicity.value * Math.PI) / 180;
    schedule();
  });
  inputs.radius.addEventListener("input", () => {
    state.radius = +inputs.radius.value * 1e-9;
    schedule();
  });
  inputs.tilt.addEventListener("input", () => {
    state.tilt = (+inputs.tilt.value * Math.PI) / 180;
    schedule();
  });
  inputs.defocus.addEventListener("input", () => {
    state.defocus = +inputs.defocus.value * 1e-3;
    schedule();
  });
  inputs.logDose.addEventListener("input", () => {
    state.logDose = +inputs.logDose.value;
    schedule();
  });
  root.querySelectorAll("[data-preset]").forEach((b) =>
    b.addEventListener("click", () => {
      const p = b.dataset.preset;
      if (p === "bloch") state.helicity = Math.PI / 2;
      if (p === "neel") state.helicity = 0;
      if (p === "center") {
        state.cx = 0;
        state.cy = 0;
      }
      syncInputs();
      schedule();
    })
  );

  // Drag the texture around on the magnetization or image panels.
  for (const c of root.querySelectorAll("canvas.ltem-drag")) {
    let drag = null;
    c.addEventListener("pointerdown", (e) => {
      c.setPointerCapture(e.pointerId);
      drag = { x: e.clientX, y: e.clientY, cx: state.cx, cy: state.cy };
    });
    c.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const scale = (N * DX) / c.getBoundingClientRect().width;
      const lim = 0.35 * N * DX;
      state.cx = Math.max(-lim, Math.min(lim, drag.cx + (e.clientX - drag.x) * scale));
      state.cy = Math.max(-lim, Math.min(lim, drag.cy + (e.clientY - drag.y) * scale));
      schedule();
    });
    const end = () => (drag = null);
    c.addEventListener("pointerup", end);
    c.addEventListener("pointercancel", end);
  }

  syncInputs();
  compute();
}

export default { render };
