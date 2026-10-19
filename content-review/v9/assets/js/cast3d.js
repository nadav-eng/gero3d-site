// Interactive 3D view of a Gero short arm cast, using a cast model from the Gero app.
// Loaded only when the viewer scrolls into view.
import * as THREE from '/assets/js/three.module.min.js';

export async function mount(el) {
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
  camera.position.set(0, 0, 15.5);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8c2c8, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(4, 6, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.0);
  rim.position.set(-5, -2, -4);
  scene.add(rim);

  // The cast mesh comes from the Gero app's own cast preview: the cast shell, then the logo.
  // cast.bin holds, per mesh: vertex count, index count (uint32), positions (float32 xyz, mm),
  // triangle indices (uint16), padded to 4 bytes.
  const mat = new THREE.MeshStandardMaterial({ color: 0x8c9094, roughness: 0.7, metalness: 0.0, side: THREE.DoubleSide });
  const logo = new THREE.MeshStandardMaterial({ color: 0x44fc40, roughness: 0.6 });
  const cast = new THREE.Group();
  cast.scale.setScalar(0.034);
  cast.rotation.z = -Math.PI / 14;
  scene.add(cast);

  const buf = await (await fetch('/assets/models/cast.bin')).arrayBuffer();
  let off = 0;
  for (const m of [mat, logo]) {
    const [nv, ni] = new Uint32Array(buf, off, 2); off += 8;
    const pos = new Float32Array(buf, off, nv * 3); off += nv * 12;
    const idx = new Uint16Array(buf, off, ni); off += ni * 2 + (ni % 2) * 2;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    cast.add(new THREE.Mesh(geo, m));
  }

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
