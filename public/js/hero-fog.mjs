import * as THREE from '/js/three.module.js';

// ============================================================
// TWO-PASS PIPELINE:
// Pass 1: Render fog → fogRT (with tile displacement)
// Pass 2: Render scene: blit fogRT + glass tiles (sample fogRT blurred) + glow
// ============================================================

const canvas = document.getElementById('hero-canvas');
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x050508);

// Camera positioned so 40x22 grid fills entire viewport
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100);
const CAM_Z = 15;
camera.position.set(0, 0, CAM_Z);

// Render fog at half res — fog is blurry noise, LinearFilter upscale is invisible
const FOG_SCALE = 0.5;
const fogRT = new THREE.WebGLRenderTarget(Math.floor(innerWidth * FOG_SCALE), Math.floor(innerHeight * FOG_SCALE), {
  minFilter: THREE.LinearFilter,
  magFilter: THREE.LinearFilter,
  format: THREE.RGBAFormat,
});

// === GRID CONFIG ===
const COLS = 40;
const ROWS = 22;
const TOTAL = COLS * ROWS;
const TILE_W = 0.42;
const TILE_H = 0.42;
const GAP = 0.08;
const CELL_X = TILE_W + GAP;
const CELL_Y = TILE_H + GAP;

const brightness = new Float32Array(TOTAL);
const tileEnergy = new Float32Array(TOTAL);

// Tile brightness as a DataTexture (40x22) — passed to fog for displacement
const brightTex = new THREE.DataTexture(
  new Float32Array(COLS * ROWS * 4), COLS, ROWS,
  THREE.RGBAFormat, THREE.FloatType
);
brightTex.needsUpdate = true;

// ============================================================
// SCENE 1: FOG (rendered to fogRT)
// ============================================================
const fogScene = new THREE.Scene();
const fogCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const fogMat = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
    mouse: { value: new THREE.Vector2(0, 0) },
    resolution: { value: new THREE.Vector2(innerWidth, innerHeight) },
    brightTex: { value: brightTex },
    gridSize: { value: new THREE.Vector2(COLS, ROWS) },
  },
  vertexShader: `void main(){gl_Position=vec4(position.xy,0,1);}`,
  fragmentShader: `
    precision highp float;
    uniform float time;
    uniform vec2 mouse;
    uniform vec2 resolution;
    uniform sampler2D brightTex;
    uniform vec2 gridSize;

    vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
    vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
    vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}

    float snoise(vec3 v){
      const vec2 C=vec2(1./6.,1./3.);
      const vec4 D=vec4(0,.5,1,2);
      vec3 i=floor(v+dot(v,C.yyy));
      vec3 x0=v-i+dot(i,C.xxx);
      vec3 g=step(x0.yzx,x0.xyz);
      vec3 l=1.-g;
      vec3 i1=min(g.xyz,l.zxy);
      vec3 i2=max(g.xyz,l.zxy);
      vec3 x1=x0-i1+C.xxx;
      vec3 x2=x0-i2+C.yyy;
      vec3 x3=x0-D.yyy;
      i=mod289(i);
      vec4 p=permute(permute(permute(
        i.z+vec4(0,i1.z,i2.z,1))+i.y+vec4(0,i1.y,i2.y,1))+i.x+vec4(0,i1.x,i2.x,1));
      float n_=.142857142857;
      vec3 ns=n_*D.wyz-D.xzx;
      vec4 j=p-49.*floor(p*ns.z*ns.z);
      vec4 x_=floor(j*ns.z);
      vec4 y_=floor(j-7.*x_);
      vec4 x=x_*ns.x+ns.yyyy;
      vec4 y=y_*ns.x+ns.yyyy;
      vec4 h=1.-abs(x)-abs(y);
      vec4 b0=vec4(x.xy,y.xy);
      vec4 b1=vec4(x.zw,y.zw);
      vec4 s0=floor(b0)*2.+1.;
      vec4 s1=floor(b1)*2.+1.;
      vec4 sh=-step(h,vec4(0));
      vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
      vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
      vec3 p0=vec3(a0.xy,h.x);
      vec3 p1=vec3(a0.zw,h.y);
      vec3 p2=vec3(a1.xy,h.z);
      vec3 p3=vec3(a1.zw,h.w);
      vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
      vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
      m=m*m;
      return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }

    float fbm(vec3 p){
      float f=0.,amp=.5,freq=1.;
      for(int i=0;i<6;i++){f+=amp*snoise(p*freq);freq*=2.1;amp*=.48;}
      return f;
    }

    void main(){
      vec2 uv=(gl_FragCoord.xy-.5*resolution)/min(resolution.x,resolution.y);
      float t=time*.15;
      vec2 m=mouse*.15;
      uv+=m*.05*(1.-length(uv));

      // Sample tile brightness and displace fog slightly
      vec2 gridUV = gl_FragCoord.xy / resolution;
      float tileBright = texture2D(brightTex, gridUV).r;
      // Push fog noise coords outward from active tiles
      vec2 pushDir = normalize(uv + 0.001) * tileBright * 0.08;
      vec2 fogUV = uv + pushDir;

      vec3 p=vec3(fogUV*2.,t);
      float n1=fbm(p*.8+vec3(0,0,t*.3));
      float n2=fbm(p*1.6+vec3(t*.2,0,0)+n1*.5);
      float n3=fbm(p*3.2+vec3(0,t*.15,0)+n2*.3);
      float fog=n1*.5+n2*.35+n3*.15;
      fog=fog*.5+.5;

      float nodes=0.;
      for(int i=0;i<8;i++){
        float fi=float(i);
        vec2 nodePos=vec2(sin(fi*1.7+t*.4+cos(fi*.3))*.6,cos(fi*2.3+t*.3+sin(fi*.7))*.4);
        float dist=length(uv-nodePos);
        float pulse=sin(t*2.+fi*1.5)*.5+.5;
        nodes+=(.008+.004*pulse)/(dist*dist+.01);
      }

      float synapses=0.;
      for(int i=0;i<5;i++){
        float fi=float(i);
        vec2 a=vec2(sin(fi*1.7+t*.4)*.6,cos(fi*2.3+t*.3)*.4);
        vec2 b=vec2(sin((fi+1.)*1.7+t*.4)*.6,cos((fi+1.)*2.3+t*.3)*.4);
        vec2 pa=uv-a;
        vec2 ba=b-a;
        float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);
        float d=length(pa-ba*h);
        float fire=sin(t*3.+fi*2.-h*8.)*.5+.5;
        synapses+=fire*.002/(d+.005);
      }

      vec3 blue=vec3(.231,.510,.965);
      vec3 deepBlue=vec3(.10,.20,.45);
      vec3 dark=vec3(.02,.02,.03);

      vec3 col=dark;
      col=mix(col,deepBlue,fog*fog*.6);
      col+=blue*nodes*.15;
      col+=blue*synapses*.3;

      // Slight blue brightening where tiles are active
      col+=blue*tileBright*0.06;

      float centerGlow=exp(-length(uv)*1.8)*(.15+.05*sin(t*.5));
      col+=blue*centerGlow;

      float vig=1.-smoothstep(.4,1.4,length(uv));
      col*=vig;

      float grain=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
      col+=(grain-.5)*.015;

      col=col/(col+.8);
      col=pow(col,vec3(.95));

      gl_FragColor=vec4(col,1);
    }
  `,
  depthWrite: false,
  depthTest: false,
});

const fogQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), fogMat);
fogScene.add(fogQuad);

// ============================================================
// SCENE 2: MAIN — blit fog + tiles + glows
// ============================================================
const mainScene = new THREE.Scene();

// Fullscreen blit of fogRT
const blitMat = new THREE.ShaderMaterial({
  uniforms: { tex: { value: fogRT.texture } },
  vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.9999,1);}`,
  fragmentShader: `
    uniform sampler2D tex;
    varying vec2 vUv;
    void main(){ gl_FragColor=texture2D(tex,vUv); }
  `,
  depthWrite: false, depthTest: false,
});
const blitQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blitMat);
blitQuad.frustumCulled = false;
blitQuad.renderOrder = -1000;
mainScene.add(blitQuad);

// === FOGGY GLASS TILES ===
const GLOW_PAD = 0.06;
const tileGeo = new THREE.PlaneGeometry(TILE_W + GLOW_PAD * 2, TILE_H + GLOW_PAD * 2);

const tileMat = new THREE.ShaderMaterial({
  uniforms: {
    baseColor: { value: new THREE.Vector3(0.231, 0.510, 0.965) },
    fogTex: { value: fogRT.texture },
    resolution: { value: new THREE.Vector2(innerWidth, innerHeight) },
    tileHalf: { value: new THREE.Vector2(TILE_W * 0.5, TILE_H * 0.5) },
    cornerR: { value: 0.025 },
    time: { value: 0 },
  },
  vertexShader: `
    attribute float energy;
    attribute float tileId;
    varying float vEnergy;
    varying vec4 vClipPos;
    varying vec2 vLocal;
    varying float vId;
    void main() {
      vEnergy = energy;
      vId = tileId;
      vLocal = position.xy;
      vec4 worldPos = instanceMatrix * vec4(position, 1.0);
      worldPos.z += energy * 0.4;
      vec4 mvPos = modelViewMatrix * worldPos;
      vClipPos = projectionMatrix * mvPos;
      gl_Position = vClipPos;
    }
  `,
  fragmentShader: `
    precision highp float;
    uniform vec3 baseColor;
    uniform sampler2D fogTex;
    uniform vec2 resolution;
    uniform vec2 tileHalf;
    uniform float cornerR;
    uniform float time;
    varying float vEnergy;
    varying vec4 vClipPos;
    varying vec2 vLocal;
    varying float vId;

    float sdRoundRect(vec2 p, vec2 b, float r) {
      vec2 d = abs(p) - b + r;
      return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
    }

    // Simple hash for per-tile noise
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float fbm2(vec2 p) {
      float f = 0.0;
      f += 0.5 * noise(p); p *= 2.1;
      f += 0.25 * noise(p); p *= 2.3;
      f += 0.125 * noise(p);
      return f;
    }

    void main() {
      if (vEnergy < 0.015) discard;

      float d = sdRoundRect(vLocal, tileHalf, cornerR);

      // Very soft edge mask — fuzzy boundary, not a hard rectangle
      float edgeMask = 1.0 - smoothstep(-0.04, 0.02, d);
      float outerGlow = exp(-max(d, 0.0) * 10.0); // wider, softer glow

      // Screen UV for fog sampling
      vec2 screenUV = (vClipPos.xy / vClipPos.w) * 0.5 + 0.5;

      // Heavily blurred fog behind tile — wider sample radius
      float blur = 0.006;
      vec3 fogBehind = vec3(0.0);
      for(int x = -1; x <= 1; x++) {
        for(int y = -1; y <= 1; y++) {
          fogBehind += texture2D(fogTex, screenUV + vec2(float(x), float(y)) * blur).rgb;
        }
      }
      fogBehind /= 9.0;

      // === Per-tile fog/smoke texture ===
      // Denser, more turbulent noise — tiles are fog-filled panes
      float idSeed = vId * 7.31;
      vec2 noiseUV = vLocal * 6.0 + vec2(sin(time * 0.35 + idSeed) * 0.7, cos(time * 0.28 + idSeed) * 0.7);
      float tileFog = fbm2(noiseUV + time * 0.2);
      // Second turbulence layer
      float tileFog2 = fbm2(noiseUV * 0.6 + vec2(idSeed * 0.13, time * 0.12));
      tileFog = mix(tileFog, tileFog2, 0.4);
      tileFog = tileFog * 0.7 + 0.15;

      // Interior: dense fog-filled blue smoke
      vec3 smokeCol = fogBehind * 1.1 + baseColor * (0.04 + tileFog * 0.10);
      float interiorAlpha = edgeMask * vEnergy * (0.25 + tileFog * 0.2);

      // Edge: very soft diffuse glow — no hard border line
      vec3 edgeCol = mix(baseColor * 0.6, vec3(0.4, 0.65, 1.0), vEnergy * 0.25);
      float edgeSoft = exp(-abs(d) * 12.0) * edgeMask; // softer than before
      float edgeAlpha = (edgeSoft * 0.3 + outerGlow * 0.15) * vEnergy;

      // Combine
      vec3 col = smokeCol * interiorAlpha + edgeCol * edgeAlpha;
      float alpha = interiorAlpha + edgeAlpha;

      if (alpha < 0.003) discard;
      gl_FragColor = vec4(col, alpha);
    }
  `,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
});

const tileMesh = new THREE.InstancedMesh(tileGeo, tileMat, TOTAL);
const energyAttr = new THREE.InstancedBufferAttribute(new Float32Array(TOTAL), 1);
const tileIdAttr = new THREE.InstancedBufferAttribute(new Float32Array(TOTAL), 1);
tileMesh.geometry.setAttribute('energy', energyAttr);
tileMesh.geometry.setAttribute('tileId', tileIdAttr);
tileMesh.renderOrder = 1;

// Store world positions for mouse interaction
const tileWorldX = new Float32Array(TOTAL);
const tileWorldY = new Float32Array(TOTAL);

const dummy = new THREE.Object3D();
for (let row = 0; row < ROWS; row++) {
  for (let col = 0; col < COLS; col++) {
    const i = row * COLS + col;
    const x = (col - COLS / 2 + 0.5) * CELL_X;
    const y = (ROWS / 2 - row - 0.5) * CELL_Y;
    const z = (Math.random() - 0.5) * 0.1;
    tileWorldX[i] = x;
    tileWorldY[i] = y;
    tileIdAttr.array[i] = i;
    dummy.position.set(x, y, z);
    dummy.updateMatrix();
    tileMesh.setMatrixAt(i, dummy.matrix);
  }
}
tileMesh.instanceMatrix.needsUpdate = true;
mainScene.add(tileMesh);

// === GLOW SPRITES ===
const MAX_GLOWS = 25;
const glowGeo = new THREE.PlaneGeometry(1, 1);
const glowBaseMat = new THREE.ShaderMaterial({
  vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1);}`,
  fragmentShader: `
    varying vec2 vUv;
    uniform float opacity;
    void main(){
      float d=length(vUv-0.5)*2.0;
      float glow=exp(-d*d*2.0);
      vec3 col=vec3(0.231,0.510,0.965)*1.3;
      float a=glow*opacity;
      if(a<0.002) discard;
      gl_FragColor=vec4(col,a);
    }
  `,
  uniforms: { opacity: { value: 0 } },
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
});

const glows = [];
for (let i = 0; i < MAX_GLOWS; i++) {
  const mat = glowBaseMat.clone();
  const m = new THREE.Mesh(glowGeo, mat);
  m.visible = false;
  m.renderOrder = 0;
  mainScene.add(m);
  glows.push({ mesh: m, energy: 0 });
}
let nextGlow = 0;

// === GRADUAL WAVE ACTIVATION ===
// Expanding ring waves that slowly wash across the grid
const waves = [];
function spawnWave() {
  waves.push({
    cx: Math.random() * COLS,
    cy: Math.random() * ROWS,
    radius: 0,
    maxRadius: 3 + Math.random() * 4, // smaller waves — fewer tiles per spike
    speed: 2 + Math.random() * 2,      // slower spread
    strength: 0.25 + Math.random() * 0.35, // softer
    born: performance.now() * 0.001,
  });

  // Glow sprite at wave center
  const g = glows[nextGlow % MAX_GLOWS];
  const w = waves[waves.length - 1];
  g.energy = 0.8;
  g.mesh.position.set(
    (w.cx - COLS / 2 + 0.5) * CELL_X,
    (ROWS / 2 - w.cy - 0.5) * CELL_Y,
    -0.2
  );
  g.mesh.scale.set(w.maxRadius * CELL_X * 1.2, w.maxRadius * CELL_Y * 1.2, 1);
  g.mesh.visible = true;
  nextGlow++;
}

// Pre-warm with overlapping gentle waves
for (let k = 0; k < 6; k++) spawnWave();
function sched() {
  spawnWave();
  setTimeout(sched, 600 + Math.random() * 1200); // slower interval
}
sched();

// === MOUSE INTERACTION ===
// Mouse position in grid coordinates, smoothed
const mouse = { x: 0, y: 0 };         // raw normalized
const mouseSmooth = { x: 0, y: 0 };   // smoothed normalized
const mouseGrid = { x: -100, y: -100 }; // off-screen by default
let mouseActive = false;
let mouseMoving = false;
let mouseStillTimer = 0;
const MOUSE_RADIUS = 3.5;
const MOUSE_STRENGTH = 0.2;

window.addEventListener('mousemove', e => {
  mouse.x = (e.clientX / innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / innerHeight) * 2 + 1;
  mouseGrid.x = (e.clientX / innerWidth) * COLS;
  mouseGrid.y = (e.clientY / innerHeight) * ROWS;
  mouseActive = true;
  mouseMoving = true;
  clearTimeout(mouseStillTimer);
  mouseStillTimer = setTimeout(() => { mouseMoving = false; }, 120);
});
window.addEventListener('mouseleave', () => {
  mouseActive = false;
  mouseMoving = false;
  mouseGrid.x = -100;
  mouseGrid.y = -100;
});
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  fogRT.setSize(Math.floor(innerWidth * FOG_SCALE), Math.floor(innerHeight * FOG_SCALE));
  fogMat.uniforms.resolution.value.set(innerWidth, innerHeight);
  tileMat.uniforms.resolution.value.set(innerWidth, innerHeight);
});

// === VISIBILITY — pause when hero is off-screen ===
let heroVisible = true;
const heroObs = new IntersectionObserver(entries => {
  heroVisible = entries[0].isIntersecting;
}, { threshold: 0 });
heroObs.observe(canvas);

// === ANIMATION ===
let lastTick = 0;
let fogFrame = 0;

function animate(t) {
  requestAnimationFrame(animate);
  if (!heroVisible) return;

  const now = t || 0;
  const time = now * 0.001;
  const dt = 0.016;
  fogFrame++;

  mouseSmooth.x += (mouse.x - mouseSmooth.x) * 0.05;
  mouseSmooth.y += (mouse.y - mouseSmooth.y) * 0.05;

  // === Update waves (expanding rings) ===
  for (let i = waves.length - 1; i >= 0; i--) {
    const w = waves[i];
    w.radius += w.speed * dt;
    if (w.radius > w.maxRadius) {
      waves.splice(i, 1);
      continue;
    }
    // Apply wave energy — tight ring, no fill inside
    const fade = 1.0 - (w.radius / w.maxRadius);
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const d = Math.sqrt((x - w.cx) ** 2 + (y - w.cy) ** 2);
        const ringDist = Math.abs(d - w.radius);
        if (ringDist < 1.2) { // tighter ring — fewer tiles per wave
          const wave = Math.exp(-ringDist * 2.0) * fade * w.strength;
          brightness[y * COLS + x] = Math.min(1, brightness[y * COLS + x] + wave * 0.12);
        }
      }
    }
  }

  // === Mouse interaction: only adds energy while cursor is moving ===
  if (mouseActive && mouseMoving) {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const d = Math.sqrt((x - mouseGrid.x) ** 2 + (y - mouseGrid.y) ** 2);
        if (d < MOUSE_RADIUS) {
          const falloff = (1.0 - d / MOUSE_RADIUS);
          const mouseEnergy = falloff * falloff * MOUSE_STRENGTH * 0.04;
          brightness[y * COLS + x] = Math.min(1, brightness[y * COLS + x] + mouseEnergy);
        }
      }
    }
  }

  // Brightness decay (every 50ms)
  if (now - lastTick > 50) {
    for (let j = 0; j < TOTAL; j++) {
      brightness[j] *= 0.94; // slightly faster decay for smoother look
      if (brightness[j] < 0.01) brightness[j] = 0;
    }
    lastTick = now;
  }

  // Smooth tile energies + update DataTexture
  const btData = brightTex.image.data;
  for (let i = 0; i < TOTAL; i++) {
    tileEnergy[i] += (brightness[i] - tileEnergy[i]) * 0.14; // slightly faster follow
    energyAttr.array[i] = tileEnergy[i];
    btData[i * 4] = tileEnergy[i];
    btData[i * 4 + 1] = 0;
    btData[i * 4 + 2] = 0;
    btData[i * 4 + 3] = 1;
  }
  energyAttr.needsUpdate = true;
  brightTex.needsUpdate = true;

  // Glow sprite decay
  for (const g of glows) {
    g.energy *= 0.955; // slower decay for glows too
    if (g.energy < 0.01) { g.mesh.visible = false; g.energy = 0; }
    g.mesh.material.uniforms.opacity.value = g.energy * 0.12;
  }

  // Camera — very subtle drift, NO mouse-driven movement
  camera.position.x = Math.sin(time * 0.03) * 0.3;
  camera.position.y = Math.cos(time * 0.025) * 0.2;
  camera.position.z = CAM_Z + Math.sin(time * 0.015) * 0.1;
  camera.lookAt(0, 0, 0);

  // Fog uniforms — mouse affects fog displacement directly
  fogMat.uniforms.time.value = time;
  fogMat.uniforms.mouse.value.set(mouseSmooth.x, mouseSmooth.y);

  // Tile time uniform for per-tile fog animation
  tileMat.uniforms.time.value = time;

  // PASS 1: Render fog every 2nd frame — fog moves slowly, reuse last texture
  if (fogFrame % 2 === 0) {
    renderer.setRenderTarget(fogRT);
    renderer.render(fogScene, fogCamera);
  }

  // PASS 2: Render main scene (blit fog + tiles + glows) — every frame
  renderer.setRenderTarget(null);
  renderer.render(mainScene, camera);
}

animate(0);
