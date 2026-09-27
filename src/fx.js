import * as THREE from 'three';
import { getTex } from './textures.js';
// GPU-friendly particle bursts + ambient motes around the camera.
const VS = `attribute float size; attribute vec4 col; varying vec4 vCol;
void main(){ vCol = col; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * (300.0 / -mv.z); gl_Position = projectionMatrix * mv; }`;
const FS = `uniform sampler2D map; varying vec4 vCol; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(vCol.rgb, vCol.a * t.a); if (gl_FragColor.a < 0.01) discard; }`;
function pointsMat() {
  return new THREE.ShaderMaterial({ uniforms: { map: { value: getTex('glimspark') } }, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
}
export class FX {
  constructor(scene, max = 1200) {
    this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 3); this.col = new Float32Array(max * 4); this.size = new Float32Array(max);
    this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.maxLife = new Float32Array(max); this.grav = new Float32Array(max); this.base = new Float32Array(max * 4); this.sz0 = new Float32Array(max);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('col', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.points = new THREE.Points(g, pointsMat()); this.points.frustumCulled = false; scene.add(this.points);
    this.cursor = 0;
    // ambient motes
    const A = 500; this.A = A;
    this.apos = new Float32Array(A * 3); this.acol = new Float32Array(A * 4); this.asize = new Float32Array(A); this.aph = new Float32Array(A);
    for (let i = 0; i < A; i++) { this.apos[i * 3] = (Math.random() - 0.5) * 80; this.apos[i * 3 + 1] = (Math.random() - 0.5) * 40; this.apos[i * 3 + 2] = (Math.random() - 0.5) * 80; this.asize[i] = 0.2 + Math.random() * 0.5; this.aph[i] = Math.random() * 100; }
    const ag = new THREE.BufferGeometry();
    ag.setAttribute('position', new THREE.BufferAttribute(this.apos, 3).setUsage(THREE.DynamicDrawUsage));
    ag.setAttribute('col', new THREE.BufferAttribute(this.acol, 4).setUsage(THREE.DynamicDrawUsage));
    ag.setAttribute('size', new THREE.BufferAttribute(this.asize, 1));
    this.amb = new THREE.Points(ag, pointsMat()); this.amb.frustumCulled = false; scene.add(this.amb);
    this.ambColor = new THREE.Color(0xfff6a0);
  }
  spawn(p, v, color, size, life, grav = 0) {
    const i = this.cursor; this.cursor = (this.cursor + 1) % this.max;
    this.pos.set([p.x, p.y, p.z], i * 3); this.vel.set([v.x, v.y, v.z], i * 3);
    const c = color instanceof THREE.Color ? color : new THREE.Color(color);
    this.base.set([c.r, c.g, c.b, 1], i * 4); this.sz0[i] = size; this.life[i] = life; this.maxLife[i] = life; this.grav[i] = grav;
  }
  burst(p, color, n = 16, speed = 6, size = 0.6, life = 0.7, grav = -8) {
    const v = new THREE.Vector3();
    for (let k = 0; k < n; k++) {
      v.set(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.4 + Math.random() * 0.8));
      this.spawn(p, v, color, size * (0.6 + Math.random() * 0.8), life * (0.6 + Math.random() * 0.8), grav);
    }
  }
  ring(p, color, n = 24, speed = 8, size = 0.5, axisX, axisZ) {
    const v = new THREE.Vector3();
    for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; v.set(Math.cos(a) * axisX.x * speed, Math.sin(a) * speed * 0.2 + 0.5, Math.cos(a) * axisX.z * speed).addScaledVector(axisZ, Math.sin(a) * speed * 0.5); this.spawn(p, v, color, size, 0.5, 0); }
  }
  update(dt, cam) {
    const pos = this.pos, vel = this.vel, col = this.col;
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) { col[i * 4 + 3] = 0; this.size[i] = 0; continue; }
      this.life[i] -= dt; const k = Math.max(0, this.life[i] / this.maxLife[i]);
      vel[i * 3 + 1] += this.grav[i] * dt;
      vel[i * 3] *= 0.985; vel[i * 3 + 2] *= 0.985;
      pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      col[i * 4] = this.base[i * 4]; col[i * 4 + 1] = this.base[i * 4 + 1]; col[i * 4 + 2] = this.base[i * 4 + 2]; col[i * 4 + 3] = Math.min(1, k * 2);
      this.size[i] = this.sz0[i] * (0.4 + k * 0.6);
    }
    const g = this.points.geometry; g.attributes.position.needsUpdate = true; g.attributes.col.needsUpdate = true; g.attributes.size.needsUpdate = true;
    // ambient: wrap around camera
    const t = performance.now() / 1000, A = this.A, ap = this.apos, ac = this.acol, c = this.ambColor;
    for (let i = 0; i < A; i++) {
      let x = ap[i * 3], y = ap[i * 3 + 1], z = ap[i * 3 + 2];
      const ph = this.aph[i];
      x += Math.sin(t * 0.3 + ph) * dt * 0.6; y += Math.cos(t * 0.4 + ph) * dt * 0.4 + dt * 0.15; z += Math.cos(t * 0.25 + ph) * dt * 0.6;
      const dx = x - cam.x, dy = y - cam.y, dz = z - cam.z;
      if (dx > 40) x -= 80; else if (dx < -40) x += 80;
      if (dy > 20) y -= 40; else if (dy < -20) y += 40;
      if (dz > 40) z -= 80; else if (dz < -40) z += 80;
      ap[i * 3] = x; ap[i * 3 + 1] = y; ap[i * 3 + 2] = z;
      const tw = 0.4 + 0.6 * Math.max(0, Math.sin(t * 2 + ph * 3));
      ac[i * 4] = c.r; ac[i * 4 + 1] = c.g; ac[i * 4 + 2] = c.b; ac[i * 4 + 3] = tw * 0.8;
    }
    this.amb.geometry.attributes.position.needsUpdate = true; this.amb.geometry.attributes.col.needsUpdate = true;
  }
}
