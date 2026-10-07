// ltem-sim.js — interactive Lorentz TEM demo (anywidget-style ES module: `export default { render({ model, el }) }`).
//
// Pipeline (all live in the browser on a 256 x 256 grid, uniform magnetization through the film thickness):
//   1. Build a magnetization texture m(x, y) (skyrmion, antiskyrmion, skyrmion lattice, helix).
//   2. Tilt the sample about the x axis: the beam sees m_y cos(a) - m_z sin(a) as the in-plane y component.
//   3. Magnetic phase via the Mansuripur Fourier-space algorithm (as in PyLorentz):
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
const B0 = 0.2; // saturation induction mu0 * Ms (T)
const THICKNESS = 40e-9; // film thickness (m)
const LAMBDA = 2.508e-12; // electron wavelength at 200 kV (m)
const THETA_C = 5e-6; // beam divergence (rad), damps high frequencies at large defocus
const TIE_QC = 0.15 / (N * DX); // Tikhonov regularization for the TIE inverse Laplacian (1/m)
const MAX_TILT_DEG = 35; // tilt slider limit
const MAX_TILT = (MAX_TILT_DEG * Math.PI) / 180;

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
    bre[i] = m.my[i] * ct - m.mz[i] * st; // PyLorentz convention for a counterclockwise tilt about x
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

// Uniform in (0, 1) from a hash of (seed, pixel index). Each pixel gets its own fixed draw, so the noise realization does not
// shift when the clean image changes (a sequential PRNG desynchronizes as soon as one pixel consumes a different number of draws).
function hashUniform(seed, i) {
  let h = Math.imul(seed, 0x9e3779b1) ^ Math.imul(i + 1, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  h ^= h >>> 16;
  return ((h >>> 0) + 0.5) / 4294967296;
}

// Inverse standard-normal CDF (Acklam's rational approximation, relative error < 1.2e-9).
function normInv(p) {
  const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
  const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
  const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
  const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
  const tail = (q) => (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  if (p < 0.02425) return tail(Math.sqrt(-2 * Math.log(p)));
  if (p > 1 - 0.02425) return -tail(Math.sqrt(-2 * Math.log(1 - p)));
  const q = p - 0.5;
  const r = q * q;
  return (
    ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  );
}

/**
 * Add shot noise for `dose` electrons per pixel: exact Poisson sampling at low counts, Gaussian approximation above.
 * Both use inverse-CDF sampling of one fixed uniform per pixel, so counts change smoothly with the clean image.
 * Returns intensity in the same units as I (counts / dose). Infinite dose = no noise.
 */
export function addNoise(I, dose, seed = 1) {
  if (!isFinite(dose)) return I;
  const out = new Float64Array(I.length);
  for (let i = 0; i < I.length; i++) {
    const lam = Math.max(I[i], 0) * dose;
    const u = hashUniform(seed, i);
    let n;
    if (lam < 30) {
      let p = Math.exp(-lam);
      let cdf = p;
      n = 0;
      while (u > cdf && n < 200) {
        n++;
        p *= lam / n;
        cdf += p;
      }
    } else {
      n = Math.max(0, lam + Math.sqrt(lam) * normInv(u));
    }
    out[i] = n / dose;
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

/** Background phase level: mean of the border pixels (uniform film there), or 0 for a helix, which fills the whole field. */
export function phaseBackground(texture, phase) {
  if (texture === "helix") return 0;
  let s = 0;
  for (let k = 0; k < N; k++) s += phase[k] + phase[(N - 1) * N + k] + phase[k * N] + phase[k * N + N - 1];
  return s / (4 * N);
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
      // hsl: radius maps to the polar angle (center = up/white, mid-ring = in-plane, rim = down/black)
      const rgb = mode === "hsl" ? hsl2rgb(h, 1, (1 + Math.cos(Math.PI * d)) / 2) : hsv2rgb(h, 1, d);
      img.data.set([rgb[0], rgb[1], rgb[2], 255], 4 * (j * 2 * r + i));
    }
  }
  ctx.putImageData(img, x0 - r, y0 - r);
}

function drawArrows(ctx, m, step = 11) {
  ctx.save();
  ctx.lineCap = "round";
  const start = Math.floor(step / 2);
  for (let iy = start; iy < N; iy += step) {
    for (let ix = start; ix < N; ix += step) {
      const p = iy * N + ix;
      const ip = Math.hypot(m.mx[p], m.my[p]);
      if (ip < 0.15) continue;
      const len = 0.48 * step * ip;
      const ux = m.mx[p] / ip;
      const uy = m.my[p] / ip;
      const x0 = ix - ux * len;
      const y0 = iy - uy * len;
      const x1 = ix + ux * len;
      const y1 = iy + uy * len;
      const hs = 2.2 + 1.8 * ip;
      for (const [color, width] of [
        ["rgba(255,255,255,0.85)", 2.6],
        ["rgba(0,0,0,0.9)", 1.1],
      ]) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.moveTo(x1 - ux * hs - uy * hs * 0.7, y1 - uy * hs + ux * hs * 0.7);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x1 - ux * hs + uy * hs * 0.7, y1 - uy * hs - ux * hs * 0.7);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Widget
// ---------------------------------------------------------------------------
const TEXTURES = [
  ["skyrmion", "Skyrmion"],
  ["lattice", "Skyrmion lattice"],
  ["antiskyrmion", "Antiskyrmion"],
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
.ltem-buttons label.ltem-check { flex-direction: row; align-items: center; gap: 0.3rem; font-size: 0.8rem; cursor: pointer; }
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

  const DEFAULT_RADIUS = { skyrmion: 60e-9, antiskyrmion: 60e-9, lattice: 30e-9, helix: 60e-9 };
  const NOISE_FREE = 5; // top of the log-dose slider
  const state = { texture: opt("texture", "skyrmion"), arrows: false };
  function resetState() {
    Object.assign(state, {
      radius: DEFAULT_RADIUS[state.texture] || 60e-9,
      helicity: Math.PI / 2,
      tilt: 0,
      defocus: 500e-6,
      logDose: NOISE_FREE,
      cx: 0,
      cy: 0,
    });
  }
  resetState();

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
        <input type="range" data-k="tilt" min="-${MAX_TILT_DEG}" max="${MAX_TILT_DEG}" step="1">
      </label>
      <label>Defocus Δf <span class="ltem-val" data-v="defocus"></span>
        <input type="range" data-k="defocus" min="-2000" max="2000" step="25">
      </label>
      <label>Electron dose <span class="ltem-val" data-v="logDose"></span>
        <input type="range" data-k="logDose" min="-1" max="5" step="0.1">
      </label>
      <div class="ltem-buttons">
        <button data-preset="bloch" title="γ = 90°: in-plane spins circulate around the core">Bloch</button>
        <button data-preset="neel" title="γ = 0°: in-plane spins point radially outward">Néel</button>
        <button data-preset="reset" title="Restore the default settings for this texture">Reset</button>
        <label class="ltem-check"><input type="checkbox" data-k="arrows"> Arrows</label>
      </div>
    </div>
    <div class="ltem-grid">
      <div class="ltem-panel"><canvas data-c="m" class="ltem-drag" width="${N}" height="${N}"></canvas>
        <div class="ltem-cap"><b>Magnetization</b>Color: in-plane direction. White/black: pointing up/down (out of plane). Drag to move.</div></div>
      <div class="ltem-panel"><canvas data-c="phase" width="${N}" height="${N}"></canvas>
        <div class="ltem-cap"><b>Electron phase shift</b>What the electron wave picks up passing through the film. Not directly visible. Fixed color scale per texture.</div></div>
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
    arrows: $('[data-k="arrows"]'),
  };
  const deg = (r) => (r * 180) / Math.PI;

  function syncInputs() {
    inputs.texture.value = state.texture;
    inputs.helicity.value = Math.round(deg(state.helicity));
    inputs.radius.value = Math.round(state.radius * 1e9);
    inputs.tilt.value = Math.round(deg(state.tilt));
    inputs.defocus.value = Math.round(state.defocus * 1e6);
    inputs.logDose.value = state.logDose;
    inputs.arrows.checked = state.arrows;
    labels();
  }

  function labels() {
    const h = Math.round(deg(state.helicity)) % 360;
    const kind = h % 180 === 0 ? " (Néel)" : h % 180 === 90 ? " (Bloch)" : "";
    root.querySelector('[data-v="helicity"]').textContent = `${h}°${kind}`;
    root.querySelector('[data-v="radius"]').textContent = `${Math.round(state.radius * 1e9)} nm`;
    root.querySelector('[data-v="tilt"]').textContent = `${Math.round(deg(state.tilt))}°`;
    const d = Math.round(state.defocus * 1e6);
    root.querySelector('[data-v="defocus"]').textContent = d === 0 ? "0 (in focus)" : `${d > 0 ? "+" : "−"}${Math.abs(d)} µm`;
    const dose = 10 ** state.logDose;
    root.querySelector('[data-v="logDose"]').textContent =
      state.logDose >= NOISE_FREE ? "noise-free" : `${dose < 10 ? dose.toFixed(dose < 1 ? 2 : 1) : Math.round(dose).toLocaleString()} e⁻/px`;
  }

  // Phase display: centered on the background level, with a fixed symmetric span per texture. A Bloch skyrmion's phase is a
  // one-sided bump, so a [min, max] range would clip antisymmetric phases (tilted Néel skyrmions, helices) on one side.
  const phaseSpan = {};
  function phaseRange(texture, phase) {
    if (!phaseSpan[texture]) {
      // Largest deviation from background over the default size: untilted Bloch, and Bloch and Néel at the maximum tilt.
      let dev = 0;
      for (const [helicity, tilt] of [
        [Math.PI / 2, 0],
        [Math.PI / 2, MAX_TILT],
        [0, MAX_TILT],
      ]) {
        const ref = magneticPhase(makeTexture({ texture, radius: DEFAULT_RADIUS[texture] || 60e-9, helicity }), tilt);
        const bg = phaseBackground(texture, ref);
        for (let i = 0; i < N * N; i++) dev = Math.max(dev, Math.abs(ref[i] - bg));
      }
      phaseSpan[texture] = 1.05 * dev;
    }
    const bg = phaseBackground(texture, phase);
    return [bg - phaseSpan[texture], bg + phaseSpan[texture]];
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
    const dose = state.logDose >= NOISE_FREE ? Infinity : 10 ** state.logDose;
    const df = Math.max(Math.abs(state.defocus), 1e-6);
    const Ip = addNoise(fresnelImage(cacheW.W, df), dose, 11);
    const Im = addNoise(fresnelImage(cacheW.W, -df), dose, 23);
    const image = state.defocus >= 0 ? Ip : Im;

    drawMagnetization(ctx.m, cacheM);
    if (state.arrows) drawArrows(ctx.m, cacheM);
    drawColorWheel(ctx.m, N - 24, 24, 20, "hsl");

    let pmin = Infinity;
    let pmax = -Infinity;
    for (let i = 0; i < N * N; i++) {
      if (phase[i] < pmin) pmin = phase[i];
      if (phase[i] > pmax) pmax = phase[i];
    }
    const [plo, phiHi] = phaseRange(state.texture, phase);
    drawGray(ctx.phase, phase, plo, phiHi);
    const range = pmax - pmin;
    ctx.phase.save();
    ctx.phase.fillStyle = "rgba(0,0,0,0.55)";
    ctx.phase.fillRect(4, 4, 98, 16);
    ctx.phase.fillStyle = "#fff";
    ctx.phase.font = "10px system-ui, sans-serif";
    ctx.phase.fillText(`Δφ = ${range.toFixed(2)} rad`, 9, 15);
    ctx.phase.restore();

    // Rescale each image to its own intensity range (robust percentiles once noise is on).
    const noisy = isFinite(dose);
    let ilo = noisy ? percentile(image, 0.002) : Infinity;
    let ihi = noisy ? percentile(image, 0.998) : -Infinity;
    if (!noisy) {
      for (let i = 0; i < N * N; i++) {
        if (image[i] < ilo) ilo = image[i];
        if (image[i] > ihi) ihi = image[i];
      }
    }
    if (ihi - ilo < 1e-3) {
      const c = (ihi + ilo) / 2;
      ilo = c - 0.05;
      ihi = c + 0.05;
    }
    drawGray(ctx.img, image, ilo, ihi);
    drawScaleBar(ctx.img, 100);

    if (Math.abs(state.defocus) < 1e-6) {
      ctx.tie.fillStyle = "#000";
      ctx.tie.fillRect(0, 0, N, N);
      ctx.tie.fillStyle = "#bbb";
      ctx.tie.font = "12px system-ui, sans-serif";
      ctx.tie.textAlign = "center";
      ctx.tie.fillText("Needs nonzero defocus", N / 2, N / 2);
      ctx.tie.textAlign = "start";
    } else {
      drawInduction(ctx.tie, inductionFromPhase(tiePhase(Ip, Im, df)));
      drawColorWheel(ctx.tie, N - 24, 24, 20, "hsv");
    }

    // Context-sensitive hints for the most instructive situations.
    const h = Math.round(deg(state.helicity)) % 180;
    const isNeelLike = (state.texture === "skyrmion" || state.texture === "lattice") && (h < 15 || h > 165);
    if (isNeelLike && Math.abs(deg(state.tilt)) < 3) {
      note.textContent =
        "A Néel skyrmion in a flat film gives no Lorentz contrast: its radial in-plane magnetization produces no net deflection of the beam. Tilt the sample so the out-of-plane core gains a component perpendicular to the beam.";
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
    state.radius = DEFAULT_RADIUS[state.texture] || state.radius;
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
    state.defocus = +inputs.defocus.value * 1e-6;
    schedule();
  });
  inputs.logDose.addEventListener("input", () => {
    state.logDose = +inputs.logDose.value;
    schedule();
  });
  inputs.arrows.addEventListener("change", () => {
    state.arrows = inputs.arrows.checked;
    schedule();
  });
  root.querySelectorAll("[data-preset]").forEach((b) =>
    b.addEventListener("click", () => {
      const p = b.dataset.preset;
      if (p === "bloch") state.helicity = Math.PI / 2;
      if (p === "neel") state.helicity = 0;
      if (p === "reset") resetState();
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
