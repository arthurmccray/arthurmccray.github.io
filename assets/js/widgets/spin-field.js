// spin-field.js — a small interactive field of magnetic moments for the home page (anywidget-style ES module).
//
// Each arrow is a spin in a ferromagnetic film magnetized out of the plane. A Bloch skyrmion follows the pointer, and
// clicking (or tapping) leaves one behind. Skyrmions repel each other at short range (overdamped dynamics; stray
// fields and dipolar energy are ignored), so the pointer skyrmion pushes the others around. With no pointer the
// skyrmion drifts slowly, unless the visitor prefers reduced motion. Animation pauses whenever the strip is off screen.
//
// Author: Arthur McCray.

const SPACING = 16; // px between spins
const MAX_PINNED = 8;

function render({ model, el }) {
  const opt = (k, d) => {
    try {
      const v = model && model.get && model.get(k);
      return v == null ? d : v;
    } catch (e) {
      return d;
    }
  };
  const height = opt("height", 150);
  const radius = opt("radius", 42); // skyrmion radius (px)

  const wrap = document.createElement("div");
  wrap.style.cssText = "position: relative; margin: 1.5rem 0 0.5rem;";
  const canvas = document.createElement("canvas");
  canvas.style.cssText = `width: 100%; height: ${height}px; display: block; touch-action: pan-y; cursor: crosshair;`;
  canvas.setAttribute("role", "img");
  canvas.setAttribute(
    "aria-label",
    "A field of magnetic moments drawn as arrows. A magnetic skyrmion follows your cursor, and clicking leaves one behind."
  );
  const caption = document.createElement("div");
  caption.style.cssText = "font-size: 0.8rem; opacity: 0.65; margin-top: 0.35rem;";
  caption.innerHTML =
    "Each arrow is a magnetic moment. Move your cursor to push a <a href='https://en.wikipedia.org/wiki/Magnetic_skyrmion'>skyrmion</a> through the film. Click to leave one behind, then push them around.";
  wrap.appendChild(canvas);
  wrap.appendChild(caption);
  el.appendChild(wrap);

  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W = 0;
  let H = 0;
  let dpr = 1;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    W = canvas.clientWidth;
    H = height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(performance.now());
  }

  // Skyrmion state: a pointer-driven one plus the ones left behind (which can be pushed around).
  const cursor = { x: null, y: null, sx: 0, sy: 0, active: false };
  const pinned = [];
  let lastInteraction = -1e9;

  function themeColor() {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--global-text-color").trim();
    return v || "#888";
  }

  // Polar angle profile (pi at the core, 0 far away).
  const w = radius * 0.4;
  const theta = (r) => 2 * Math.atan2(Math.sinh(radius / w), Math.sinh(r / w));

  // Short-range skyrmion-skyrmion repulsion with overdamped motion: each step moves a skyrmion along the net force.
  // The pointer skyrmion feels the others too, but less strongly, since it is being dragged.
  const RANGE = radius * 2.4; // interaction cutoff (px)
  const PUSH = 7; // max displacement per substep (px)
  function relax() {
    if (!pinned.length) return;
    const pts = [[cursor.sx, cursor.sy], ...pinned];
    for (let sub = 0; sub < 3; sub++) {
      const fx = new Float64Array(pts.length);
      const fy = new Float64Array(pts.length);
      for (let a = 0; a < pts.length; a++) {
        for (let b = a + 1; b < pts.length; b++) {
          let dx = pts[a][0] - pts[b][0];
          let dy = pts[a][1] - pts[b][1];
          let d = Math.hypot(dx, dy);
          if (d >= RANGE) continue;
          if (d < 1e-3) {
            dx = Math.random() - 0.5;
            dy = Math.random() - 0.5;
            d = Math.hypot(dx, dy);
          }
          const f = PUSH * (1 - d / RANGE) ** 2;
          fx[a] += (f * dx) / d;
          fy[a] += (f * dy) / d;
          fx[b] -= (f * dx) / d;
          fy[b] -= (f * dy) / d;
        }
      }
      const m = radius * 0.5; // keep skyrmions mostly inside the strip
      for (let k = 0; k < pts.length; k++) {
        const gain = k === 0 ? 0.35 : 1;
        pts[k][0] = Math.min(W - m, Math.max(m, pts[k][0] + gain * fx[k]));
        pts[k][1] = Math.min(H - m, Math.max(m, pts[k][1] + gain * fy[k]));
      }
    }
    cursor.sx = pts[0][0];
    cursor.sy = pts[0][1];
  }

  function draw(t) {
    if (!W) return;
    ctx.clearRect(0, 0, W, H);
    const fg = themeColor();

    // Idle drift along a slow Lissajous path when nobody is interacting.
    if (!cursor.active && t - lastInteraction > 2500 && !reduceMotion) {
      const tx = W * (0.5 + 0.4 * Math.sin(t / 5200));
      const ty = H * (0.5 + 0.3 * Math.sin(t / 3100 + 1));
      cursor.sx += (tx - cursor.sx) * 0.02;
      cursor.sy += (ty - cursor.sy) * 0.02;
    } else if (cursor.active) {
      cursor.sx += (cursor.x - cursor.sx) * 0.25;
      cursor.sy += (cursor.y - cursor.sy) * 0.25;
    }
    relax();

    const sks = [[cursor.sx, cursor.sy], ...pinned];
    const nx = Math.ceil(W / SPACING);
    const ny = Math.ceil(H / SPACING);
    const ox = (W - (nx - 1) * SPACING) / 2;
    const oy = (H - (ny - 1) * SPACING) / 2;

    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const x = ox + i * SPACING;
        const y = oy + j * SPACING;
        // The nearest skyrmion sets the local texture.
        let best = Infinity;
        let bx = 0;
        let by = 0;
        for (const s of sks) {
          const d = (x - s[0]) ** 2 + (y - s[1]) ** 2;
          if (d < best) {
            best = d;
            bx = s[0];
            by = s[1];
          }
        }
        const r = Math.sqrt(best);
        const th = theta(r);
        const inPlane = Math.sin(th);
        const mz = Math.cos(th);
        const phi = Math.atan2(y - by, x - bx) + Math.PI / 2; // Bloch helicity

        if (inPlane < 0.08) {
          // Out-of-plane spin: a dot (up = faint, down = solid).
          ctx.globalAlpha = mz > 0 ? 0.22 : 0.85;
          ctx.fillStyle = fg;
          ctx.beginPath();
          ctx.arc(x, y, mz > 0 ? 1.3 : 2.4, 0, 2 * Math.PI);
          ctx.fill();
          continue;
        }
        const len = SPACING * 0.42 * inPlane;
        const dx = Math.cos(phi) * len;
        const dy = Math.sin(phi) * len;
        const hue = ((phi * 180) / Math.PI + 360) % 360;
        ctx.globalAlpha = 0.25 + 0.75 * inPlane;
        ctx.strokeStyle = ctx.fillStyle = `hsl(${hue}, 75%, 52%)`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x - dx, y - dy);
        ctx.lineTo(x + dx, y + dy);
        ctx.stroke();
        // Arrow head
        const hx = Math.cos(phi);
        const hy = Math.sin(phi);
        const hs = 3.2 * inPlane + 1;
        ctx.beginPath();
        ctx.moveTo(x + dx + hx * hs * 0.6, y + dy + hy * hs * 0.6);
        ctx.lineTo(x + dx - hx * hs * 0.6 - hy * hs * 0.6, y + dy - hy * hs * 0.6 + hx * hs * 0.6);
        ctx.lineTo(x + dx - hx * hs * 0.6 + hy * hs * 0.6, y + dy - hy * hs * 0.6 - hx * hs * 0.6);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  // Animation loop, only while visible.
  let visible = false;
  let raf = 0;
  function loop(t) {
    draw(t);
    raf = visible ? requestAnimationFrame(loop) : 0;
  }
  const io = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(loop);
  });
  io.observe(canvas);

  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  canvas.addEventListener("pointermove", (e) => {
    [cursor.x, cursor.y] = pos(e);
    cursor.active = true;
    lastInteraction = performance.now();
  });
  canvas.addEventListener("pointerleave", () => {
    cursor.active = false;
    lastInteraction = performance.now();
  });
  canvas.addEventListener("click", (e) => {
    const [x, y] = pos(e);
    pinned.push([x + (Math.random() - 0.5), y + (Math.random() - 0.5)]);
    if (pinned.length > MAX_PINNED) pinned.shift();
    lastInteraction = performance.now();
    if (!raf) draw(performance.now());
  });

  cursor.sx = W * 0.5;
  window.addEventListener("resize", resize);
  // Theme toggles change --global-text-color; redraw once if we are not animating.
  new MutationObserver(() => !raf && draw(performance.now())).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme", "class"],
  });
  requestAnimationFrame(() => {
    resize();
    cursor.sx = W * 0.3;
    cursor.sy = H * 0.5;
    draw(performance.now());
  });
}

export default { render };
