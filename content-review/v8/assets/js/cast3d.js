// Interactive 3D illustration of a Gero short arm cast: an open rhombus lattice on a
// forearm-shaped shell. Loaded only when the viewer scrolls into view.
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
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.4, 11.5);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8c2c8, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 6, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.9);
  rim.position.set(-5, -2, -4);
  scene.add(rim);

  // Lattice mask: white = material, black = hole. Solid bands at both ends and a
  // solid seam where the two halves of the cast meet.
  const W = 2048, H = 2048, COLS = 12, ROWS = 12;
  const mask = document.createElement('canvas');
  mask.width = W; mask.height = H;
  const g = mask.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#000';
  const band = H * 0.07, seam = W * 0.035;
  const cw = (W - 2 * seam) / COLS, ch = (H - 2 * band) / ROWS, strut = 0.24;
  for (let r = 0; r <= ROWS; r++) {
    for (let c = 0; c <= COLS; c++) {
      const odd = r % 2;
      const cx = seam + (c + (odd ? 0.5 : 0)) * cw, cy = band + r * ch;
      const hw = cw * (0.5 - strut / 2), hh = ch * (1 - strut);
      if (cx - hw < seam || cx + hw > W - seam || cy - hh < band || cy + hh > H - band) continue;
      g.beginPath();
      g.moveTo(cx, cy - hh); g.lineTo(cx + hw, cy); g.lineTo(cx, cy + hh); g.lineTo(cx - hw, cy);
      g.closePath(); g.fill();
    }
  }
  // Second seam halfway round, where the two halves of the cast close.
  g.fillStyle = '#fff';
  g.fillRect(W / 2 - seam / 2, 0, seam, H);
  // Thumb opening near the palm end, with a solid border.
  const tx = W * 0.25, ty = H * 0.86;
  g.beginPath(); g.ellipse(tx, ty, W * 0.085, H * 0.075, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#000';
  g.beginPath(); g.ellipse(tx, ty, W * 0.06, H * 0.05, 0, 0, Math.PI * 2); g.fill();
  const alpha = new THREE.CanvasTexture(mask);
  alpha.anisotropy = 8;

  // Forearm-shaped shell: elliptical cross-sections that narrow toward the wrist
  // and widen and flatten over the palm.
  const LEN = 5.6, SEG_U = 160, SEG_V = 120;
  const prof = (t) => {
    const s = (a, b, x) => a + (b - a) * (x * x * (3 - 2 * x));
    if (t < 0.7) return [s(1.05, 0.78, t / 0.7), s(0.92, 0.55, t / 0.7)];
    return [s(0.78, 1.0, (t - 0.7) / 0.3), s(0.55, 0.42, (t - 0.7) / 0.3)];
  };
  function shell(scale) {
    const geo = new THREE.BufferGeometry();
    const pos = [], uv = [], idx = [];
    for (let j = 0; j <= SEG_V; j++) {
      const t = j / SEG_V, [a, b] = prof(t), y = (t - 0.5) * LEN;
      for (let i = 0; i <= SEG_U; i++) {
        const u = i / SEG_U, th = u * Math.PI * 2;
        pos.push(Math.cos(th) * a * scale, y, Math.sin(th) * b * scale);
        uv.push(u, t);
      }
    }
    for (let j = 0; j < SEG_V; j++) for (let i = 0; i < SEG_U; i++) {
      const p = j * (SEG_U + 1) + i, q = p + SEG_U + 1;
      idx.push(p, q, p + 1, p + 1, q, q + 1);
    }
    geo.setIndex(idx);
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.computeVertexNormals();
    return geo;
  }
  const mat = new THREE.MeshStandardMaterial({ color: 0x435fff, roughness: 0.62, metalness: 0.0, alphaMap: alpha, alphaTest: 0.5, side: THREE.DoubleSide });
  const cast = new THREE.Group();
  cast.add(new THREE.Mesh(shell(1), mat));
  cast.add(new THREE.Mesh(shell(0.94), mat));
  cast.rotation.z = Math.PI / 2.6;
  scene.add(cast);

  // Drag to rotate; slow auto-rotation when idle.
  let dragging = false, lastX = 0, lastY = 0, vy = 0.004, rx = 0.25, ry = 0;
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
