// spin-field.js — a small interactive field of magnetic moments for the home page (anywidget-style ES module).
//
// Each arrow is a spin in a ferromagnetic film magnetized out of the plane, with periodic boundaries in x and y. A Bloch
// skyrmion follows the pointer, and clicking (or tapping) drops it in place; a new one appears under the pointer once it
// moves clear of the others. Skyrmions repel each other at short range (overdamped dynamics; stray fields and dipolar
// energy are ignored), so the pointer skyrmion pushes the others around. Squeezed hard enough, two skyrmions merge, a
// cartoon of collapse over an energy barrier. Double-clicking removes the nearest one. With no pointer the skyrmion
// drifts slowly, unless the visitor prefers reduced motion. Animation pauses whenever the strip is off screen.
//
// Author: Arthur McCray.

const SPACING = 16; // px between spins

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
    "A field of magnetic moments drawn as arrows. A magnetic skyrmion follows your cursor, and clicking leaves it behind."
  );
  const caption = document.createElement("div");
  caption.style.cssText = "font-size: 0.8rem; opacity: 0.65; margin-top: 0.35rem;";
  caption.innerHTML =
    "Each arrow is a magnetic moment. Move your cursor to push a <a href='https://en.wikipedia.org/wiki/Magnetic_skyrmion'>skyrmion</a> through the film, and click to leave it behind.";
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
    if (W) for (const s of all()) wrapPos(s);
    draw(performance.now());
  }

  // Periodic boundaries: minimum-image displacement and wrapped positions.
  const mi = (d, L) => d - L * Math.round(d / L);
  const wrapPos = (s) => {
    s.x = ((s.x % W) + W) % W;
    s.y = ((s.y % H) + H) % H;
  };

  // Skyrmions are { x, y, s, ts }: s is the current size (fraction of `radius`), easing toward the target ts. They grow in
  // when created and shrink to nothing when destroyed. The pointer skyrmion is cursor.sk, or null after a click drops it.
  const newSk = (x, y) => ({ x, y, s: 0.15, ts: 1 });
  const cursor = { x: 0, y: 0, active: false, sk: null };
  const pinned = [];
  const all = () => (cursor.sk ? [cursor.sk, ...pinned] : pinned);
  const alive = (s) => s.ts > 0;
  let lastInteraction = -1e9;

  // Densest packing we allow, roughly one skyrmion per disk of radius 1.2R.
  const maxCount = () => Math.max(1, Math.floor((W * H) / (Math.PI * (1.2 * radius) ** 2)));

  function themeColor() {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--global-text-color").trim();
    return v || "#888";
  }

  // Polar angle profile (pi at the core, 0 far away) for a skyrmion of radius R.
  const w = radius * 0.4;
  const theta = (r, R) => 2 * Math.atan2(Math.sinh(R / w), Math.sinh(r / w));

  // A new pointer skyrmion appears only once the pointer is at least 2R from every placed one, and below the density cap.
  function maybeSpawnCursor(x, y) {
    if (cursor.sk || pinned.filter(alive).length >= maxCount()) return;
    for (const p of pinned) if (alive(p) && Math.hypot(mi(x - p.x, W), mi(y - p.y, H)) < 2 * radius) return;
    cursor.sk = newSk(x, y);
  }

  // Short-range skyrmion-skyrmion repulsion with overdamped motion: each step moves a skyrmion along the net force.
  // The pointer skyrmion feels the others too, but less strongly, since it is being dragged.
  const RANGE = radius * 2.4; // interaction cutoff (px)
  const PUSH = 7; // max displacement per substep (px)
  const MERGE = radius * 0.6; // closer than this and two skyrmions merge
  function relax() {
    const pts = all().filter(alive);
    if (pts.length < 2) return;
    for (let sub = 0; sub < 3; sub++) {
      const fx = new Float64Array(pts.length);
      const fy = new Float64Array(pts.length);
      for (let a = 0; a < pts.length; a++) {
        for (let b = a + 1; b < pts.length; b++) {
          let dx = mi(pts[a].x - pts[b].x, W);
          let dy = mi(pts[a].y - pts[b].y, H);
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
      for (let k = 0; k < pts.length; k++) {
        // Stiff enough to squeeze a crowd past MERGE when pushed fast (~600 px/s); gentle pushes only shove.
        const gain = pts[k] === cursor.sk ? 0.2 : 1;
        pts[k].x += gain * fx[k];
        pts[k].y += gain * fy[k];
        wrapPos(pts[k]);
      }
    }

    // Annihilation: a squeezed pair merges into one skyrmion. The pointer skyrmion always survives.
    for (let a = 0; a < pts.length; a++) {
      for (let b = a + 1; b < pts.length; b++) {
        if (!alive(pts[a]) || !alive(pts[b])) continue;
        const dx = mi(pts[b].x - pts[a].x, W);
        const dy = mi(pts[b].y - pts[a].y, H);
        if (Math.hypot(dx, dy) >= MERGE) continue;
        const withCursor = pts[a] === cursor.sk || pts[b] === cursor.sk;
        if (withCursor && !cursor.active) continue; // the idle drift never destroys placed skyrmions
        if (pts[b] === cursor.sk) {
          pts[a].ts = 0;
        } else {
          pts[b].ts = 0;
          if (pts[a] !== cursor.sk) {
            pts[a].x += dx / 2;
            pts[a].y += dy / 2;
            wrapPos(pts[a]);
          }
        }
      }
    }
  }

  function draw(t) {
    if (!W) return;
    ctx.clearRect(0, 0, W, H);
    const fg = themeColor();

    if (cursor.active) {
      maybeSpawnCursor(cursor.x, cursor.y);
      if (cursor.sk) {
        cursor.sk.x += mi(cursor.x - cursor.sk.x, W) * 0.25;
        cursor.sk.y += mi(cursor.y - cursor.sk.y, H) * 0.25;
        wrapPos(cursor.sk);
      }
    } else if (t - lastInteraction > 2500 && !reduceMotion) {
      // Idle drift along a slow Lissajous path when nobody is interacting.
      const tx = W * (0.5 + 0.4 * Math.sin(t / 5200));
      const ty = H * (0.5 + 0.3 * Math.sin(t / 3100 + 1));
      maybeSpawnCursor(tx, ty);
      if (cursor.sk) {
        cursor.sk.x += mi(tx - cursor.sk.x, W) * 0.02;
        cursor.sk.y += mi(ty - cursor.sk.y, H) * 0.02;
        wrapPos(cursor.sk);
      }
    }
    relax();

    // Ease sizes toward their targets and drop skyrmions that have finished collapsing.
    for (const s of all()) s.s += (s.ts - s.s) * (s.ts ? 0.12 : 0.2);
    for (let k = pinned.length - 1; k >= 0; k--) if (!pinned[k].ts && pinned[k].s < 0.03) pinned.splice(k, 1);
    if (cursor.sk && !cursor.sk.ts && cursor.sk.s < 0.03) cursor.sk = null;

    const sks = all();
    const nx = Math.ceil(W / SPACING);
    const ny = Math.ceil(H / SPACING);
    const ox = (W - (nx - 1) * SPACING) / 2;
    const oy = (H - (ny - 1) * SPACING) / 2;

    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const x = ox + i * SPACING;
        const y = oy + j * SPACING;
        // The nearest skyrmion (measured from its edge, so a shrinking one gives way) sets the local texture.
        let best = Infinity;
        let r = Infinity;
        let R = 0;
        let ddx = 0;
        let ddy = 0;
        for (const s of sks) {
          const dx = mi(x - s.x, W);
          const dy = mi(y - s.y, H);
          const d = Math.hypot(dx, dy);
          const Rs = radius * s.s;
          if (d - Rs < best) {
            best = d - Rs;
            r = d;
            R = Rs;
            ddx = dx;
            ddy = dy;
          }
        }
        const th = sks.length ? theta(r, R) : 0;
        const inPlane = Math.sin(th);
        const mz = Math.cos(th);
        const phi = Math.atan2(ddy, ddx) + Math.PI / 2; // Bloch helicity

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
  const track = (e) => {
    [cursor.x, cursor.y] = pos(e);
    cursor.active = true;
    lastInteraction = performance.now();
  };
  canvas.addEventListener("pointermove", track);
  canvas.addEventListener("pointerdown", track);
  canvas.addEventListener("pointerleave", () => {
    cursor.active = false;
    lastInteraction = performance.now();
  });
  // A click drops the pointer skyrmion where it is. If there is none (the pointer is still too close to a placed one),
  // the click does nothing.
  canvas.addEventListener("click", (e) => {
    const [x, y] = pos(e);
    maybeSpawnCursor(x, y);
    if (cursor.sk && alive(cursor.sk)) {
      cursor.sk.x = x;
      cursor.sk.y = y;
      pinned.push(cursor.sk);
      cursor.sk = null;
    }
    lastInteraction = performance.now();
    if (!raf) draw(performance.now());
  });
  // Double-click collapses the nearest placed skyrmion.
  canvas.addEventListener("dblclick", (e) => {
    const [x, y] = pos(e);
    let best = null;
    let bd = Infinity;
    for (const p of pinned) {
      const d = Math.hypot(mi(x - p.x, W), mi(y - p.y, H));
      if (alive(p) && d < bd) {
        bd = d;
        best = p;
      }
    }
    if (best) best.ts = 0;
    if (!raf) draw(performance.now());
  });

  window.addEventListener("resize", resize);
  // Theme toggles change --global-text-color; redraw once if we are not animating.
  new MutationObserver(() => !raf && draw(performance.now())).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme", "class"],
  });
  requestAnimationFrame(() => {
    resize();
    cursor.sk = newSk(W * 0.3, H * 0.5);
    cursor.sk.s = 1;
    draw(performance.now());
  });
}

export default { render };
