// Interactive 3D illustration of a Gero short arm cast, modelled on the cast as the app
// designs it: a "cube" lattice (hexagons split into three rhombi), two halves joined by a
// solid stepped overlap band, two straps and a thumb opening. Loaded only when the viewer
// scrolls into view.
import * as THREE from '/assets/js/three.module.min.js';

export function mount(el) {
  const canvas = el.querySelector('canvas');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) {
    el.classList.add('no-webgl');
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, -0.35, 15.5);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8c2c8, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(4, 6, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.0);
  rim.position.set(-5, -2, -4);
  scene.add(rim);

  // Lattice mask (white = material, black = hole). u runs around the arm, v from elbow to palm.
  const W = 2048, H = 2048;
  const mask = document.createElement('canvas');
  mask.width = W; mask.height = H;
  const g = mask.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);

  // Cube pattern: pointy-top hexagons, each split into three rhombi; every rhombus is a hole
  // shrunk toward its centre, which leaves struts of even width. COLS divides W exactly so the
  // pattern wraps around the arm without a visible join.
  const COLS = 7, R = W / (COLS * Math.sqrt(3)), HOLE = 0.72;
  g.fillStyle = '#000';
  for (let row = -1; row * 1.5 * R < H + R; row++) {
    for (let col = -1; col <= COLS; col++) {
      const cx = Math.sqrt(3) * R * (col + (row & 1 ? 0.5 : 0)), cy = row * 1.5 * R;
      const v = [];
      for (let k = 0; k < 6; k++) {
        const a = (-90 + 60 * k) * Math.PI / 180;
        v.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]);
      }
      for (let r = 0; r < 3; r++) {
        const pts = [[cx, cy], v[2 * r], v[2 * r + 1], v[(2 * r + 2) % 6]];
        const mx = (pts[0][0] + pts[2][0]) / 2, my = (pts[0][1] + pts[2][1]) / 2;
        g.beginPath();
        pts.forEach(([x, y], i) => {
          const px = mx + (x - mx) * HOLE, py = my + (y - my) * HOLE;
          i ? g.lineTo(px, py) : g.moveTo(px, py);
        });
        g.closePath(); g.fill();
      }
    }
  }
  g.fillStyle = '#fff';
  // Solid rims at both ends.
  g.fillRect(0, 0, W, H * 0.035);
  g.fillRect(0, H * 0.955, W, H * 0.045);
  // Overlap bands where the two halves meet, on both sides, with the step seen on the real cast.
  const band = (x0, step) => {
    g.beginPath();
    for (let y = 0; y <= H; y += 8) {
      const t = y / H, s = Math.min(1, Math.max(0, (t - 0.4) / 0.2));
      const x = x0 + step * s * s * (3 - 2 * s);
      y ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.lineWidth = W * 0.05; g.strokeStyle = '#fff'; g.lineCap = 'butt'; g.stroke();
  };
  band(W * 0.21, W * 0.07);
  band(W * 0.71, -W * 0.07);
  // Solid pads under the straps and the logo.
  const STRAPS = [[0.1, 0.17], [0.79, 0.86]];
  for (const [a, b] of STRAPS) {
    g.fillRect(W * 0.14, H * (1 - b) - 8, W * 0.26, H * (b - a) + 16);
    g.fillRect(W * 0.64, H * (1 - b) - 8, W * 0.26, H * (b - a) + 16);
  }
  g.fillRect(W * 0.43, H * (1 - 0.115), W * 0.09, H * 0.075);
  // Thumb opening near the palm end, with a solid border.
  const tx = W * 0.0, ty = H * 0.1;
  for (const x of [tx, tx + W]) {
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(x, ty, W * 0.1, H * 0.085, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#000'; g.beginPath(); g.ellipse(x, ty, W * 0.07, H * 0.06, 0, 0, Math.PI * 2); g.fill();
  }
  const alpha = new THREE.CanvasTexture(mask);
  alpha.anisotropy = 8;

  // Forearm-shaped shell: elliptical cross-sections that narrow toward the wrist and widen
  // and flatten over the palm.
  const LEN = 5.8;
  const prof = (t) => {
    const s = (a, b, x) => a + (b - a) * (x * x * (3 - 2 * x));
    if (t < 0.68) return [s(0.92, 0.74, t / 0.68), s(0.8, 0.55, t / 0.68)];
    return [s(0.74, 1.02, (t - 0.68) / 0.32), s(0.55, 0.46, (t - 0.68) / 0.32)];
  };
  const at = (u, t, scale) => {
    const [a, b] = prof(t), th = u * Math.PI * 2;
    return [Math.cos(th) * a * scale, (t - 0.5) * LEN, Math.sin(th) * b * scale];
  };
  function patch(scale, u0, u1, t0, t1, su, sv, flipU) {
    const geo = new THREE.BufferGeometry();
    const pos = [], uv = [], idx = [];
    for (let j = 0; j <= sv; j++) for (let i = 0; i <= su; i++) {
      const u = u0 + (u1 - u0) * i / su, t = t0 + (t1 - t0) * j / sv;
      pos.push(...at(u, t, scale));
      uv.push(flipU ? 1 - i / su : (u - u0) / (u1 - u0 || 1), flipU ? j / sv : t);
    }
    for (let j = 0; j < sv; j++) for (let i = 0; i < su; i++) {
      const p = j * (su + 1) + i, q = p + su + 1;
      idx.push(p, q, p + 1, p + 1, q, q + 1);
    }
    geo.setIndex(idx);
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.computeVertexNormals();
    return geo;
  }
  const shell = (scale) => patch(scale, 0, 1, 0, 1, 180, 140);

  const mat = new THREE.MeshStandardMaterial({ color: 0x8c9094, roughness: 0.75, metalness: 0.0, alphaMap: alpha, alphaTest: 0.5, side: THREE.DoubleSide });
  const cast = new THREE.Group();
  cast.add(new THREE.Mesh(shell(1), mat));
  cast.add(new THREE.Mesh(shell(0.965), mat));

  // Straps across each overlap band, with a small loop at one end.
  const strapMat = new THREE.MeshStandardMaterial({ color: 0x4b4d50, roughness: 1, side: THREE.DoubleSide });
  for (const [a, b] of STRAPS) {
    for (const [u0, u1] of [[0.16, 0.38], [0.62, 0.84]]) {
      cast.add(new THREE.Mesh(patch(1.035, u0, u1, a, b, 24, 4), strapMat));
      const p = at(u1, (a + b) / 2, 1.06), loop = new THREE.Mesh(new THREE.BoxGeometry(0.1, (b - a) * LEN * 1.15, 0.12), strapMat);
      loop.position.set(...p);
      loop.lookAt(p[0] * 2, p[1], p[2] * 2);
      cast.add(loop);
    }
  }

  // Green G badge, like the logo printed on every cast.
  const lc = document.createElement('canvas');
  lc.width = lc.height = 256;
  const l = lc.getContext('2d');
  l.fillStyle = '#2fc46b'; l.beginPath(); l.arc(128, 128, 112, 0, Math.PI * 2); l.fill();
  l.fillStyle = '#fff'; l.font = '600 170px Outfit, Arial, sans-serif'; l.textAlign = 'center'; l.textBaseline = 'middle';
  l.fillText('G', 128, 138);
  const logo = new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(lc), transparent: true, alphaTest: 0.1, roughness: 0.8, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
  logo.map.colorSpace = THREE.SRGBColorSpace;
  cast.add(new THREE.Mesh(patch(1.004, 0.455, 0.505, 0.035 + 0.045, 0.035 + 0.115, 8, 8, true), logo));

  cast.rotation.z = -Math.PI / 14;
  scene.add(cast);

  // Drag to rotate; slow auto-rotation when idle.
  let dragging = false, lastX = 0, lastY = 0, vy = 0.004, rx = 0.18, ry = -0.6;
  canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    vy = (e.clientX - lastX) * 0.01; ry += vy;
    rx = Math.max(-1, Math.min(1, rx + (e.clientY - lastY) * 0.01));
    lastX = e.clientX; lastY = e.clientY;
  });
  const up = () => { dragging = false; };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);

  el.querySelectorAll('[data-color]').forEach((b) => b.addEventListener('click', () => {
    mat.color.set(b.dataset.color);
    el.querySelectorAll('[data-color]').forEach((x) => x.setAttribute('aria-pressed', x === b));
  }));

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function size() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(size).observe(canvas);
  size();

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(el);
  renderer.setAnimationLoop(() => {
    if (!visible) return;
    if (!dragging) { vy += ((reduce ? 0 : 0.004) - vy) * 0.03; ry += vy; }
    cast.rotation.y = ry;
    cast.rotation.x = rx;
    renderer.render(scene, camera);
  });
  el.classList.add('ready');
}
