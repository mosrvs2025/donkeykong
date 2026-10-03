import * as THREE from 'three';
import { LEVELS } from './map.js';
import { surfMat } from './world.js';
// A goal gate at the end of every walking level: a carved arch with a glowing seed-light veil.
// Gates that lead to a guardian glow red-gold with a crown, so the hand-off to the boss reads.
export class Goals {
  constructor(game) {
    this.game = game; this.gates = []; const O = 80, P = game.path;
    for (const l of LEVELS) {
      if (l.end == null || l.mode || l.endY == null) continue;
      const boss = !!l.boss, col = boss ? 0xffa040 : 0x9fffd0, g = new THREE.Group();
      const stone = surfMat('ruin');
      for (const z of [-1.6, 1.6]) { const pil = new THREE.Mesh(new THREE.BoxGeometry(0.7, 5, 0.7), stone); pil.position.set(0, 2.5, z); pil.castShadow = true; g.add(pil);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(1, 0.4, 1), stone); cap.position.set(0, 5.1, z); g.add(cap); }
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 4.2), stone); lintel.position.y = 5.5; lintel.castShadow = true; g.add(lintel);
      const veil = new THREE.Mesh(new THREE.PlaneGeometry(3, 4.8), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
        uniforms: { t: { value: 0 }, c: { value: new THREE.Color(col) } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform float t; uniform vec3 c; varying vec2 vUv; void main(){ float e = smoothstep(0.0,0.25,vUv.x)*smoothstep(1.0,0.75,vUv.x)*smoothstep(1.0,0.7,vUv.y); float w = 0.5+0.5*sin(vUv.y*14.0 - t*3.0 + sin(vUv.x*9.0+t)*1.5); gl_FragColor = vec4(c*(0.35+w*0.5)*e, 1.0); }' }));
      veil.rotation.y = Math.PI / 2; veil.position.y = 2.45; g.add(veil);
      const gem = new THREE.Mesh(boss ? new THREE.CylinderGeometry(0.45, 0.6, 0.45, 6, 1, true) : new THREE.OctahedronGeometry(0.4), new THREE.MeshStandardMaterial({ color: 0, emissive: col, emissiveIntensity: 2.2, side: THREE.DoubleSide }));
      gem.position.y = 6.3; g.add(gem);
      P.place(g, l.end + O + 0.5, l.endY, 0); game.scene.add(g);
      this.gates.push({ l, g, veil, gem, s: l.end + O, y: l.endY, boss, told: false });
    }
  }
  update(dt, t) {
    const g = this.game, p = g.player, lv = g.currentLevel;
    for (const G of this.gates) {
      G.veil.material.uniforms.t.value = t; G.gem.rotation.y = t * 1.5; G.gem.position.y = 6.3 + Math.sin(t * 2) * 0.12;
      const near = lv && lv.id === G.l.id && Math.abs(p.s - G.s) < 22 && Math.abs(p.y - G.y) < 15;
      if (near && !G.told) { G.told = true; g.hud.toast(G.boss ? 'The gate ahead · <b>the guardian waits beyond it</b>' : 'The gate ahead · <b>level end</b>', 2.5); }
      if (!lv) G.told = false;
      if (near && Math.random() < dt * 12) g.fx.spawn(g.path.world(G.s + (Math.random() - 0.5) * 0.6, G.y + Math.random() * 5, (Math.random() - 0.5) * 3), new THREE.Vector3(0, 1.2, 0), G.boss ? 0xffc060 : 0xbfffe0, 0.4, 0.9, 0);
    }
  }
}
