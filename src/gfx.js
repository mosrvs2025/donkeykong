import * as THREE from 'three';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
// HD rendering layer: sky-matched image-based lighting, ambient occlusion, anti-aliasing
// and stable soft shadows. Everything here scales with the quality setting.
export class Gfx {
  constructor(game, isMobile) {
    this.game = game; this.isMobile = isMobile;
    const r = game.renderer;
    // image-based lighting: a tiny gradient-sky scene baked into a PMREM env map, re-baked as themes blend
    this.pmrem = new THREE.PMREMGenerator(r);
    this.envU = { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, gnd: { value: new THREE.Color() }, sun: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0.45, 0.7, 0.3).normalize() } };
    this.envScene = new THREE.Scene();
    this.envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, uniforms: this.envU,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 top, hor, gnd, sun, sunDir; varying vec3 vD;
        void main(){ float y = vD.y; vec3 c = y > 0.0 ? mix(hor, top, pow(y, 0.6)) : mix(hor, gnd, pow(-y, 0.4));
          float s = max(dot(normalize(vD), sunDir), 0.0); c += sun * (pow(s, 64.0) * 6.0 + pow(s, 6.0) * 0.5);
          gl_FragColor = vec4(c, 1.0); }`,
    })));
    this.envKey = new THREE.Color(-1, -1, -1); this.envT = 0; this.envRT = null;
    r.shadowMap.type = THREE.PCFShadowMap;
    game.sun.shadow.radius = isMobile ? 2 : 4; game.sun.shadow.blurSamples = 12;
    const sc = game.sun.shadow.camera; sc.left = -26; sc.right = 26; sc.top = 26; sc.bottom = -26; sc.updateProjectionMatrix();
  }
  // replaces the plain RenderPass target with a multisampled HDR one and adds AO + SMAA
  buildComposer(composer, renderPass) {
    const g = this.game, w = innerWidth, h = innerHeight;
    if (composer.renderTarget1.samples !== undefined) {
      const samples = this.isMobile ? 0 : 4;
      composer.renderTarget1.samples = samples; composer.renderTarget2.samples = samples;
    }
    this.gtao = new GTAOPass(g.scene, g.camera, w, h);
    this.gtao.output = GTAOPass.OUTPUT.Default;
    this.gtao.blendIntensity = 0.85;
    this.gtao.updateGtaoMaterial({ radius: 0.9, distanceExponent: 1.4, thickness: 1.2, scale: 1.1, samples: 12, distanceFallOff: 1.0 });
    this.gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
    this.gtao.enabled = !this.isMobile;
    composer.insertPass(this.gtao, composer.passes.indexOf(renderPass) + 1);
    this.smaa = new SMAAPass(w, h); this.smaa.enabled = this.isMobile; // MSAA covers desktop
    composer.addPass(this.smaa);
  }
  setQuality(q) {
    const hi = q === 'high', lo = q === 'low';
    if (this.gtao) this.gtao.enabled = hi && !this.isMobile || (hi && this.isMobile && devicePixelRatio < 2.5);
    if (this.smaa) this.smaa.enabled = this.isMobile ? !lo : lo;
    const s = lo ? 0 : this.isMobile ? (hi ? 2 : 0) : 4;
    const C = this.game.composer; C.renderTarget1.samples = s; C.renderTarget2.samples = s;
    this.game.renderer.toneMappingExposure = this.game.renderer.toneMappingExposure;
  }
  // soft contact shadows under characters: readable depth for every jump
  initBlobs() {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d');
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,0.7)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    const mat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
    this.blobs = new THREE.InstancedMesh(geo, mat, 64); this.blobs.frustumCulled = false; this.blobs.renderOrder = 1;
    this.game.scene.add(this.blobs); this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._sc = new THREE.Vector3();
  }
  blob(i, s, y, r) {
    const E = this.game.entities, gy = E.groundUnder(s, y + 0.4);
    if (gy < -1e5 || y - gy > 14) return i;
    const k = Math.max(0.3, 1 - (y - gy) / 10), w = this.game.path.world(s, gy + 0.04, 0);
    this._sc.set(r * 2 * k, 1, r * 1.6 * k);
    this._m.compose(w, this._q, this._sc); this.blobs.setMatrixAt(i, this._m); return i + 1;
  }
  updateBlobs() {
    if (!this.blobs) this.initBlobs();
    const g = this.game, p = g.player, E = g.entities; let i = 0;
    if (p.state !== 'dead' && !p.inWater && p.g === 1) i = this.blob(i, p.s, p.y, p.hw + 0.35);
    for (const e of E.enemies) { if (i >= 60) break; if (e.alive && Math.abs(e.s - p.s) < 45 && e.kind !== 'eel' && e.kind !== 'jelly') i = this.blob(i, e.s, e.y, e.hw + 0.2); }
    for (const c of E.companions || []) { if (i >= 63) break; if (c.model.visible && c.state !== 'ridden' && Math.abs(c.s - p.s) < 45) i = this.blob(i, c.s, c.y, 0.9); }
    this.blobs.count = i; this.blobs.instanceMatrix.needsUpdate = true;
  }
  // called every frame after the theme blend
  update(dt, c) {
    const g = this.game;
    this.updateBlobs();
    // stable shadows: snap the shadow camera to its texel grid so edges don't shimmer while scrolling
    const sun = g.sun, sc = sun.shadow.camera, size = sun.shadow.mapSize.x, texel = (sc.right - sc.left) / size;
    const t = sun.target.position, dir = new THREE.Vector3().subVectors(sun.position, t);
    t.x = Math.round(t.x / texel) * texel; t.y = Math.round(t.y / texel) * texel; t.z = Math.round(t.z / texel) * texel;
    sun.position.copy(t).add(dir);
    // re-bake the environment when the sky colour has drifted
    this.envT -= dt;
    const k = this.envKey, d = Math.abs(k.r - c.hor.r) + Math.abs(k.g - c.hor.g) + Math.abs(k.b - c.hor.b) + Math.abs(this._sunI - sun.intensity || 0) * 0.05;
    if (this.envT <= 0 && (d > 0.025 || !this.envRT)) {
      this.envT = 0.5; k.copy(c.hor); this._sunI = sun.intensity;
      const U = this.envU;
      U.top.value.copy(c.top); U.hor.value.copy(c.hor); U.gnd.value.copy(c.hg).multiplyScalar(0.8);
      U.sun.value.copy(c.sun).multiplyScalar(Math.min(1.5, sun.intensity / 2.2));
      const rt = this.pmrem.fromScene(this.envScene, 0.02, 0.1, 50);
      if (this.envRT) this.envRT.dispose();
      this.envRT = rt; g.scene.environment = rt.texture;
    }
  }
}
